import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { testConfig } from "./fakes.js";
import { createFreshTestDatabase, TEST_DATABASE_URL } from "./testDatabase.js";
import { createTestBrowser } from "./httpClient.js";

// End-to-end through HTTP + real MySQL: proves the routes, middleware order,
// error format, cookies and SQL work together. Skipped without TEST_DATABASE_URL.
const skip = !TEST_DATABASE_URL && "set TEST_DATABASE_URL to run integration tests";

let server;
let pool;
let baseUrl;

before(async () => {
  if (skip) return;
  ({ pool } = await createFreshTestDatabase());
  const { app, services } = createApp({ db: pool, config: testConfig() });
  await services.authService.ensureSuperAdmin({
    email: "boss@example.com",
    password: "boss-password",
    name: "Boss",
  });
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  server?.close();
  await pool?.end();
});

test(
  "super admin creates a library; its owner signs in; suspension locks them out",
  { skip },
  async () => {
    const boss = createTestBrowser(baseUrl);
    assert.equal(
      (await boss.post("/auth/login", { email: "boss@example.com", password: "boss-password" }))
        .status,
      200,
    );

    const created = await boss.post("/platform/libraries", {
      name: "Sardar Patel Library",
      slug: "sardar-patel",
      ownerName: "Ravi",
      ownerEmail: "ravi@example.com",
      ownerPassword: "owner-password",
    });
    assert.equal(created.status, 201);
    const libraryId = created.body.library.id;
    assert.equal(created.body.library.users[0].email, "ravi@example.com");

    const owner = createTestBrowser(baseUrl);
    await owner.post("/auth/login", { email: "ravi@example.com", password: "owner-password" });
    const me = await owner.get("/auth/me");
    assert.equal(me.status, 200);
    assert.equal(me.body.user.library.slug, "sardar-patel");

    assert.equal(
      (await owner.get("/platform/libraries")).status,
      403,
      "owners can't reach platform routes",
    );

    await boss.patch(`/platform/libraries/${libraryId}/status`, { status: "suspended" });
    const locked = await owner.get("/auth/me");
    assert.equal(locked.status, 403);
    assert.equal(locked.body.error.code, "LIBRARY_SUSPENDED");
  },
);

test("errors use the { error: { code, message, fields } } format", { skip }, async () => {
  const boss = createTestBrowser(baseUrl);
  await boss.post("/auth/login", { email: "boss@example.com", password: "boss-password" });

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
  const browser = createTestBrowser(baseUrl);
  const statuses = [];
  for (let i = 0; i < 9; i += 1) {
    statuses.push(
      (await browser.post("/auth/login", { email: "ravi@example.com", password: "nope" })).status,
    );
  }
  assert.deepEqual(statuses.slice(0, 8), Array(8).fill(401));
  assert.equal(statuses[8], 429);
});
