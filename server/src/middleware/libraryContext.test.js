import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequireLibrary, requirePermission } from "./libraryContext.js";

const LIBRARY_A = "11111111-1111-4111-8111-111111111111";

function run(middleware, req) {
  return new Promise((resolve) => middleware(req, {}, (error) => resolve({ error, req })));
}

function request(actor, headers = {}) {
  return { actor, get: (name) => headers[name] };
}

const requireLibrary = createRequireLibrary({
  findLibraryById: async (id) => (id === LIBRARY_A ? { id } : null),
});

test("owners and staff always work in their own library, whatever headers say", async () => {
  const owner = { role: "admin", tenantId: LIBRARY_A };
  const { error, req } = await run(
    requireLibrary,
    request(owner, { "X-Library-Id": "22222222-2222-4222-8222-222222222222" }),
  );
  assert.equal(error, undefined);
  assert.equal(req.ctx.tenantId, LIBRARY_A);
});

test("a super admin must name an existing library", async () => {
  const boss = { role: "super_admin", tenantId: null };
  assert.equal((await run(requireLibrary, request(boss))).error.code, "LIBRARY_REQUIRED");
  const unknown = request(boss, { "X-Library-Id": "22222222-2222-4222-8222-222222222222" });
  assert.equal((await run(requireLibrary, unknown)).error.status, 404);
  const { req } = await run(requireLibrary, request(boss, { "X-Library-Id": LIBRARY_A }));
  assert.equal(req.ctx.tenantId, LIBRARY_A);
});

test("requirePermission lets owners through and checks staff permissions", async () => {
  const guard = requirePermission("layout.manage");
  assert.equal((await run(guard, { actor: { role: "admin" } })).error, undefined);
  const allowed = { actor: { role: "staff", permissions: ["layout.manage"] } };
  assert.equal((await run(guard, allowed)).error, undefined);
  const denied = { actor: { role: "staff", permissions: ["members.manage"] } };
  assert.equal((await run(guard, denied)).error.status, 403);
});
