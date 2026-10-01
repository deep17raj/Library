import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { TEST_DATABASE_URL } from "./testDatabase.js";
import { startTestApp, SUPER_ADMIN } from "./testApp.js";
import { createTestBrowser } from "./httpClient.js";

// End-to-end through HTTP + real MySQL: proves the routes, middleware order,
// error format, cookies and SQL work together. Skipped without TEST_DATABASE_URL.
const skip = !TEST_DATABASE_URL && "set TEST_DATABASE_URL to run integration tests";

let app;
before(async () => {
  if (!skip) app = await startTestApp("platform");
});
after(async () => app?.stop());

test(
  "super admin creates a library; its owner signs in; suspension locks them out",
  { skip },
  async () => {
    const boss = await app.signedIn(SUPER_ADMIN.email, SUPER_ADMIN.password);
    const { library, owner } = await app.createLibraryWithOwner("sardar-patel");
    assert.equal(library.users[0].email, "owner@sardar-patel.test");

    const me = await owner.get("/auth/me");
    assert.equal(me.status, 200);
    assert.equal(me.body.user.library.slug, "sardar-patel");
    assert.equal(
      (await owner.get("/platform/libraries")).status,
      403,
      "owners can't reach platform routes",
    );

    await boss.patch(`/platform/libraries/${library.id}/status`, { status: "suspended" });
    const locked = await owner.get("/auth/me");
    assert.equal(locked.status, 403);
    assert.equal(locked.body.error.code, "LIBRARY_SUSPENDED");
  },
);

test("errors use the { error: { code, message, fields } } format", { skip }, async () => {
  const boss = await app.signedIn(SUPER_ADMIN.email, SUPER_ADMIN.password);

  const invalid = await boss.post("/platform/libraries", { name: "X", slug: "bad slug" });
  assert.equal(invalid.status, 422);
  assert.equal(invalid.body.error.code, "VALIDATION_FAILED");
  assert.ok(invalid.body.error.fields.slug);
  assert.ok(invalid.body.error.fields.ownerEmail);

  const duplicate = await boss.post("/platform/libraries", {
    name: "Copy",
    slug: "sardar-patel",
    ownerName: "Someone",
    ownerEmail: "someone@example.com",
    ownerPassword: "owner-password",
  });
  assert.equal(duplicate.status, 409);
  assert.equal(duplicate.body.error.code, "SLUG_TAKEN");

  const noHeader = await boss.post("/auth/logout", undefined, { appHeader: false });
  assert.equal(noHeader.status, 403, "writes without X-Requested-With are refused");

  const unknown = await boss.get("/does-not-exist");
  assert.equal(unknown.body.error.code, "NOT_FOUND");
});

test("wrong passwords are rate-limited per IP and email", { skip }, async () => {
  const browser = createTestBrowser(app.baseUrl);
  const statuses = [];
  for (let i = 0; i < 9; i += 1) {
    const attempt = { email: "owner@sardar-patel.test", password: "nope" };
    statuses.push((await browser.post("/auth/login", attempt)).status);
  }
  assert.deepEqual(statuses.slice(0, 8), Array(8).fill(401));
  assert.equal(statuses[8], 429);
});
