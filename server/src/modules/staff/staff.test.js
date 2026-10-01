import { test } from "node:test";
import assert from "node:assert/strict";
import { fakeAudit, fakeDb, fakeUsersRepository } from "../../../testing/fakes.js";
import { createStaffService } from "./staff.service.js";

const LIB = "lib-1";
const owner = { id: "owner", role: "admin", tenantId: LIB, permissions: [] };
const manager = {
  id: "manager",
  role: "staff",
  tenantId: LIB,
  permissions: ["staff.manage", "members.manage"],
};

function setup() {
  const users = fakeUsersRepository([
    { ...owner, email: "owner@x.com", status: "active", tokenVersion: 0 },
    { ...manager, email: "manager@x.com", status: "active", tokenVersion: 0 },
    {
      id: "desk",
      role: "staff",
      tenantId: LIB,
      email: "desk@x.com",
      permissions: ["payments.collect"],
      status: "active",
      tokenVersion: 0,
    },
    {
      id: "elsewhere",
      role: "staff",
      tenantId: "lib-2",
      email: "e@x.com",
      permissions: [],
      status: "active",
      tokenVersion: 0,
    },
  ]);
  const service = createStaffService({ db: fakeDb(), users, audit: fakeAudit() });
  return { service, users, ctx: (actor) => ({ tenantId: LIB, actor }) };
}

const newStaff = (permissions) => ({
  name: "Asha",
  email: "asha@x.com",
  password: "temp-pass-1",
  permissions,
});

test("the owner can create staff with any permissions", async () => {
  const { service, ctx } = setup();
  const member = await service.createStaff(
    ctx(owner),
    newStaff(["layout.manage", "payments.void"]),
  );
  assert.equal(member.role, "staff");
  assert.deepEqual(member.permissions, ["layout.manage", "payments.void"]);
});

test("a staff manager can't grant permissions they don't have", async () => {
  const { service, ctx } = setup();
  await assert.rejects(service.createStaff(ctx(manager), newStaff(["payments.void"])), {
    status: 403,
  });
  const member = await service.createStaff(ctx(manager), newStaff(["members.manage"]));
  assert.deepEqual(member.permissions, ["members.manage"]);
});

test("a staff manager can't remove permissions they don't have either", async () => {
  const { service, ctx } = setup();
  await assert.rejects(service.updateStaff(ctx(manager), "desk", { permissions: [] }), {
    status: 403,
  });
  const updated = await service.updateStaff(ctx(manager), "desk", {
    permissions: ["payments.collect", "members.manage"],
  });
  assert.deepEqual(updated.permissions, ["payments.collect", "members.manage"]);
});

test("nobody changes their own permissions or status", async () => {
  const { service, ctx } = setup();
  await assert.rejects(service.updateStaff(ctx(manager), "manager", { status: "disabled" }), {
    status: 403,
  });
});

test("owners and other libraries' staff are out of reach (404)", async () => {
  const { service, ctx } = setup();
  await assert.rejects(service.updateStaff(ctx(owner), "owner", { name: "X Y" }), { status: 404 });
  await assert.rejects(service.updateStaff(ctx(owner), "elsewhere", { name: "X Y" }), {
    status: 404,
  });
  await assert.rejects(service.resetPassword(ctx(owner), "elsewhere", { password: "new-pass-1" }), {
    status: 404,
  });
});

test("disabling and password resets end the member's sessions", async () => {
  const { service, users, ctx } = setup();
  await service.updateStaff(ctx(owner), "desk", { status: "disabled" });
  assert.equal(users.users.get("desk").tokenVersion, 1);
  await service.resetPassword(ctx(owner), "desk", { password: "new-pass-1" });
  assert.equal(users.users.get("desk").tokenVersion, 2);
});

test("duplicate email is reported on the email field", async () => {
  const { service, ctx } = setup();
  await assert.rejects(
    service.createStaff(ctx(owner), { ...newStaff([]), email: "desk@x.com" }),
    (error) => error.code === "EMAIL_TAKEN" && Boolean(error.fields.email),
  );
});
