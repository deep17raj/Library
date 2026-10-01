import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword } from "../../lib/password.js";
import { fakeAudit, fakeDb, fakeUsersRepository, testConfig } from "../../../testing/fakes.js";
import { createAuthService } from "./auth.service.js";

async function setup({ libraryStatus = "active", userStatus = "active" } = {}) {
  const users = fakeUsersRepository([
    {
      id: "owner-1",
      tenantId: "lib-1",
      email: "owner@example.com",
      passwordHash: await hashPassword("owner-password"),
      name: "Owner",
      role: "admin",
      permissions: [],
      status: userStatus,
      tokenVersion: 0,
      library: { id: "lib-1", slug: "lib", name: "Lib", status: libraryStatus },
    },
  ]);
  const audit = fakeAudit();
  const service = createAuthService({ db: fakeDb(), config: testConfig(), users, audit });
  return { service, users, audit };
}

test("login returns a session that resolves to the public user", async () => {
  const { service } = await setup();
  const { user, token } = await service.login({
    email: "owner@example.com",
    password: "owner-password",
  });
  assert.equal(user.role, "admin");
  assert.equal(user.passwordHash, undefined, "never exposes the hash");
  const actor = await service.resolveSession(token);
  assert.equal(actor.id, "owner-1");
  assert.equal(actor.library.slug, "lib");
});

test("wrong password and unknown email give the same error", async () => {
  const { service } = await setup();
  for (const credentials of [
    { email: "owner@example.com", password: "nope" },
    { email: "ghost@example.com", password: "nope" },
  ]) {
    await assert.rejects(service.login(credentials), { code: "INVALID_CREDENTIALS", status: 401 });
  }
});

test("suspended library and disabled account cannot sign in", async () => {
  const suspended = await setup({ libraryStatus: "suspended" });
  await assert.rejects(
    suspended.service.login({ email: "owner@example.com", password: "owner-password" }),
    { code: "LIBRARY_SUSPENDED" },
  );
  const disabled = await setup({ userStatus: "disabled" });
  await assert.rejects(
    disabled.service.login({ email: "owner@example.com", password: "owner-password" }),
    { code: "ACCOUNT_DISABLED" },
  );
});

test("an open session ends when the library is suspended or the user disabled", async () => {
  const { service, users } = await setup();
  const { token } = await service.login({ email: "owner@example.com", password: "owner-password" });

  users.users.get("owner-1").library.status = "suspended";
  await assert.rejects(service.resolveSession(token), { code: "LIBRARY_SUSPENDED" });

  users.users.get("owner-1").library.status = "active";
  await users.updateUserStatus(null, "owner-1", "disabled");
  await assert.rejects(service.resolveSession(token), { code: "UNAUTHENTICATED" });
});

test("changing the password ends old sessions and issues a working new one", async () => {
  const { service, audit } = await setup();
  const { user, token } = await service.login({
    email: "owner@example.com",
    password: "owner-password",
  });

  await assert.rejects(
    service.changePassword(user, { currentPassword: "wrong", newPassword: "brand-new-pass" }),
    (error) => error.fields.currentPassword !== undefined,
  );
  const { token: newToken } = await service.changePassword(user, {
    currentPassword: "owner-password",
    newPassword: "brand-new-pass",
  });

  await assert.rejects(service.resolveSession(token), { code: "UNAUTHENTICATED" });
  assert.equal((await service.resolveSession(newToken)).id, "owner-1");
  assert.equal(audit.entries[0].action, "user.password_change");
});

test("ensureSuperAdmin creates one super admin on first boot only", async () => {
  const { service, users } = await setup();
  const seed = { email: "boss@example.com", password: "boss-password", name: "Boss" };
  assert.equal(await service.ensureSuperAdmin(seed), true);
  assert.equal(await service.ensureSuperAdmin({ ...seed, email: "other@example.com" }), false);
  assert.equal(await users.countUsersWithRole(null, "super_admin"), 1);
  assert.equal(await service.ensureSuperAdmin({ email: "", password: "", name: "" }), false);
});
