import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeAudit, fakeDb, fakeUsersRepository } from "../../../testing/fakes.js";
import { createPlatformService } from "./platform.service.js";

const SUPER = { id: "super-1", role: "super_admin", tenantId: null };

function fakePlatformRepository() {
  const libraries = new Map();
  const settings = new Map();
  return {
    libraries,
    listLibraries: async () => [...libraries.values()],
    findLibraryById: async (db, id) => libraries.get(id) || null,
    findLibraryBySlug: async (db, slug) =>
      [...libraries.values()].find((l) => l.slug === slug) || null,
    insertLibrary: async (db, { id, slug, name }) => {
      libraries.set(id, { id, slug, name, status: "active", mocktestShareBps: null });
    },
    updateLibrary: async (db, id, patch) => Object.assign(libraries.get(id), patch),
    updateLibraryStatus: async (db, id, status) => (libraries.get(id).status = status),
    getLibraryUsage: async () => ({ ownerCount: 1, staffCount: 0, lastLoginAt: null }),
    getPlatformSetting: async (db, key, fallback) =>
      settings.has(key) ? settings.get(key) : fallback,
    setPlatformSetting: async (db, key, value) => settings.set(key, value),
  };
}

function setup() {
  const repo = fakePlatformRepository();
  const users = fakeUsersRepository();
  const audit = fakeAudit();
  const service = createPlatformService({ db: fakeDb(), repo, users, audit });
  return { service, repo, users, audit };
}

const newLibrary = {
  name: "Sardar Patel Library",
  slug: "sardar-patel",
  ownerName: "Ravi",
  ownerEmail: "ravi@example.com",
  ownerPassword: "owner-password",
};

test("createLibrary creates the library and an owner login with a hashed password", async () => {
  const { service, users, audit } = setup();
  const library = await service.createLibrary(SUPER, newLibrary);
  assert.equal(library.slug, "sardar-patel");
  const owner = await users.findUserByEmail(null, "ravi@example.com");
  assert.equal(owner.role, "admin");
  assert.equal(owner.tenantId, library.id);
  assert.match(owner.passwordHash, /^scrypt\$/);
  assert.equal(audit.entries[0].action, "library.create");
});

test("createLibrary rejects a used slug or email with a field-level message", async () => {
  const { service } = setup();
  await service.createLibrary(SUPER, newLibrary);
  await assert.rejects(
    service.createLibrary(SUPER, { ...newLibrary, ownerEmail: "x@example.com" }),
    (error) => {
      assert.equal(error.code, "SLUG_TAKEN");
      assert.ok(error.fields.slug);
      return true;
    },
  );
  await assert.rejects(
    service.createLibrary(SUPER, { ...newLibrary, slug: "another" }),
    (error) => {
      assert.equal(error.code, "EMAIL_TAKEN");
      assert.ok(error.fields.ownerEmail);
      return true;
    },
  );
});

test("suspending is audited once; repeating the same status is a no-op", async () => {
  const { service, audit } = setup();
  const library = await service.createLibrary(SUPER, newLibrary);
  await service.setLibraryStatus(SUPER, library.id, "suspended");
  await service.setLibraryStatus(SUPER, library.id, "suspended");
  assert.deepEqual(
    audit.entries.map((entry) => entry.action),
    ["library.create", "library.suspend"],
  );
  const updated = await service.getLibrary(library.id);
  assert.equal(updated.status, "suspended");
});

test("unknown library is a 404", async () => {
  const { service } = setup();
  await assert.rejects(service.getLibrary("missing"), { status: 404 });
});

test("super admins cannot be disabled through the library screens", async () => {
  const { service, users } = setup();
  await users.insertUser(null, {
    id: "super-1",
    tenantId: null,
    email: "boss@x.com",
    role: "super_admin",
  });
  await assert.rejects(service.setUserStatus(SUPER, "super-1", "disabled"), { status: 403 });
});

test("platform settings default to a 20% library share and can be changed", async () => {
  const { service } = setup();
  assert.deepEqual(await service.getSettings(), { mocktestDefaultShareBps: 2000 });
  await service.updateSettings(SUPER, { mocktestDefaultShareBps: 2500 });
  assert.deepEqual(await service.getSettings(), { mocktestDefaultShareBps: 2500 });
});
