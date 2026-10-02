import { test } from "node:test";
import assert from "node:assert/strict";
import { signToken } from "../../lib/jwt.js";
import { fakeAudit, fakeDb, testConfig } from "../../../testing/fakes.js";
import { createStudentsService } from "./students.service.js";

const TENANT = "lib-1";
const STAFF = { tenantId: TENANT, actor: { id: "staff-1", tenantId: TENANT, role: "admin" } };

/** Mirrors students.repository.js (members' login columns), in memory. */
function fakeAccounts(initial) {
  const rows = new Map(initial.map((a) => [a.id, { tokenVersion: 0, passwordHash: null, ...a }]));
  const find = (tenantId, pred) =>
    [...rows.values()].find((a) => a.tenantId === tenantId && pred(a)) || null;
  return {
    rows,
    findAccountByPhone: async (db, tenantId, phone) => find(tenantId, (a) => a.phone === phone),
    findAccountById: async (db, tenantId, id) => find(tenantId, (a) => a.id === id),
    setPassword: async (db, tenantId, id, { passwordHash, mustChangePassword }) => {
      Object.assign(rows.get(id), { passwordHash, mustChangePassword });
      rows.get(id).tokenVersion += 1;
    },
    touchAppLogin: async (db, tenantId, id) => {
      rows.get(id).lastLoginAt = "2026-10-02 10:00:00";
    },
  };
}

function setup() {
  const repo = fakeAccounts([
    {
      id: "m-1",
      tenantId: TENANT,
      name: "Ravi",
      phone: "9876500001",
      memberCode: "S1001",
      status: "active",
    },
    {
      id: "m-2",
      tenantId: TENANT,
      name: "Old",
      phone: "9876500002",
      memberCode: "S1002",
      status: "inactive",
    },
  ]);
  const audit = fakeAudit();
  let next = 0;
  const service = createStudentsService({
    db: fakeDb(),
    config: testConfig(),
    repo,
    audit,
    newTemporaryPassword: () => ["482913", "100200"][next++],
  });
  return { service, repo, audit };
}

const signIn = (service, password = "482913") =>
  service.login(TENANT, { phone: "9876500001", password });

test("giving app access creates a 6-digit temporary password the student must change", async () => {
  const { service, audit } = setup();
  const { temporaryPassword, appAccess } = await service.grantAppAccess(STAFF, "m-1");
  assert.match(temporaryPassword, /^\d{6}$/);
  assert.deepEqual(appAccess, { granted: true, mustChangePassword: true, lastLoginAt: null });
  assert.equal(audit.entries[0].action, "member.app_access_give");
  assert.equal(JSON.stringify(audit.entries).includes(temporaryPassword), false, "never logged");

  const { student, token } = await signIn(service);
  assert.equal(student.mustChangePassword, true);
  assert.equal((await service.resolveSession(TENANT, token)).id, "m-1");
});

test("wrong password, unknown phone and no app access all give the same error", async () => {
  const { service } = setup();
  const noAccess = await signIn(service).catch((e) => e);
  await service.grantAppAccess(STAFF, "m-1");
  const wrong = await signIn(service, "000000").catch((e) => e);
  const unknown = await service
    .login(TENANT, { phone: "9000000000", password: "482913" })
    .catch((e) => e);
  for (const error of [noAccess, wrong, unknown]) {
    assert.equal(error.code, "INVALID_CREDENTIALS");
    assert.equal(error.message, "Mobile number or password is incorrect");
  }
});

test("an inactive member can't be given access", async () => {
  const { service } = setup();
  await assert.rejects(service.grantAppAccess(STAFF, "m-2"), /inactive/);
});

test("a staff reset ends the old session; the student signs in with the new code", async () => {
  const { service, audit } = setup();
  await service.grantAppAccess(STAFF, "m-1");
  const { token } = await signIn(service);
  const reset = await service.grantAppAccess(STAFF, "m-1");
  assert.equal(audit.entries[1].action, "member.app_password_reset");
  await assert.rejects(service.resolveSession(TENANT, token), { code: "UNAUTHENTICATED" });
  await signIn(service, reset.temporaryPassword);
});

test("a session only works in its own library and can't be forged with the staff key", async () => {
  const { service } = setup();
  await service.grantAppAccess(STAFF, "m-1");
  const { token } = await signIn(service);
  await assert.rejects(service.resolveSession("lib-2", token), { code: "UNAUTHENTICATED" });
  const staffSigned = signToken(
    { sub: "m-1", tid: TENANT, tv: 1 },
    testConfig().auth.jwtSecret,
    3600,
  );
  await assert.rejects(service.resolveSession(TENANT, staffSigned), { code: "UNAUTHENTICATED" });
});

test("changing the password clears the must-change flag and re-issues the session", async () => {
  const { service } = setup();
  await service.grantAppAccess(STAFF, "m-1");
  const { token } = await signIn(service);
  const ctx = { tenantId: TENANT, actor: { kind: "student", id: "m-1" } };
  await assert.rejects(
    service.changePassword(ctx, { currentPassword: "111111", newPassword: "my-own-pass" }),
    /Current password is incorrect/,
  );
  const changed = await service.changePassword(ctx, {
    currentPassword: "482913",
    newPassword: "my-own-pass",
  });
  assert.equal(changed.student.mustChangePassword, false);
  await assert.rejects(service.resolveSession(TENANT, token), { code: "UNAUTHENTICATED" });
  assert.equal((await service.resolveSession(TENANT, changed.token)).mustChangePassword, false);
  await signIn(service, "my-own-pass");
});
