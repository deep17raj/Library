import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { TEST_DATABASE_URL } from "./testDatabase.js";
import { startTestApp, SUPER_ADMIN } from "./testApp.js";

// Milestone 2 end-to-end: settings + logo, staff permissions, layout editor rules,
// and library isolation, through HTTP against real MySQL.
const skip = !TEST_DATABASE_URL && "set TEST_DATABASE_URL to run integration tests";

let app;
let libraryA;
let ownerA;
before(async () => {
  if (skip) return;
  app = await startTestApp("library_admin");
  ({ library: libraryA, owner: ownerA } = await app.createLibraryWithOwner("alpha"));
});
after(async () => app?.stop());

const seatsOf = (layout) => layout.halls.flatMap((hall) => hall.tables.flatMap((t) => t.seats));

test("owner saves settings and uploads a logo that is served as WebP", { skip }, async () => {
  const initial = await ownerA.get("/admin/settings");
  assert.equal(initial.body.settings.timezone, "Asia/Kolkata");

  const saved = await ownerA.put("/admin/settings", {
    ...initial.body.settings,
    displayName: "Alpha Study Point",
    contactPhone: "+91 98765 43210",
    brandColor: "#0f766e",
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.body.settings.contactPhone, "9876543210");
  assert.equal(saved.body.settings.brandColor, "#0f766e");

  const png = await sharp({
    create: { width: 900, height: 300, channels: 3, background: "#0f766e" },
  })
    .png()
    .toBuffer();
  const uploaded = await ownerA.upload("/admin/settings/logo", "logo", png);
  assert.equal(uploaded.status, 200);
  const file = await fetch(`${app.origin}${uploaded.body.settings.logoUrl}`);
  assert.equal(file.status, 200);
  const stored = await sharp(Buffer.from(await file.arrayBuffer())).metadata();
  assert.equal(stored.format, "webp");
  assert.equal(stored.width, 512, "resized to the 512px limit");

  const notImage = await ownerA.upload("/admin/settings/logo", "logo", Buffer.from("hello"), {
    type: "image/png",
  });
  assert.equal(notImage.status, 422);
  assert.ok(notImage.body.error.fields.logo);
});

test("layout: categories, halls and bulk tables with clash detection", { skip }, async () => {
  const withCategory = await ownerA.post("/admin/seat-categories", {
    name: "AC",
    monthlySurchargePaise: 30000,
  });
  const ac = withCategory.body.layout.categories[0];
  assert.equal(ac.monthlySurchargePaise, 30000);

  const withHall = await ownerA.post("/admin/halls", {
    name: "Hall A",
    seatingMode: "fixed",
    categoryId: ac.id,
  });
  const hall = withHall.body.layout.halls[0];

  const plan = { tableCount: 3, seatsPerTable: 4, seatPrefix: "A-", startNumber: 1 };
  const first = await ownerA.post(`/admin/halls/${hall.id}/tables`, plan);
  assert.equal(first.status, 201);
  const seats = seatsOf(first.body.layout);
  assert.equal(seats.length, 12);
  assert.ok(
    seats.every((seat) => seat.categoryId === ac.id),
    "fixed hall seats get the hall category",
  );

  const clash = await ownerA.post(`/admin/halls/${hall.id}/tables`, plan);
  assert.equal(clash.status, 409);
  assert.equal(clash.body.error.code, "LABEL_TAKEN");
  assert.match(clash.body.error.fields.seatPrefix, /A-1/);

  const more = await ownerA.post(`/admin/halls/${hall.id}/tables`, {
    ...plan,
    tableCount: 1,
    startNumber: 13,
  });
  const tables = more.body.layout.halls[0].tables.map((table) => table.label);
  assert.deepEqual(tables, ["Table 1", "Table 2", "Table 3", "Table 4"]);

  const rename = await ownerA.patch(`/admin/seats/${seats[0].id}`, { label: "a-2" });
  assert.equal(rename.status, 409, "labels are unique ignoring case");

  const tagged = await ownerA.patch(`/admin/seats/${seats[0].id}`, {
    features: ["window"],
    status: "disabled",
  });
  const seat = seatsOf(tagged.body.layout).find((s) => s.id === seats[0].id);
  assert.deepEqual(seat.features, ["window"]);
  assert.equal(seat.status, "disabled");

  const floating = await ownerA.post("/admin/halls", {
    name: "Open Hall",
    seatingMode: "floating",
    categoryId: ac.id,
  });
  const openHall = floating.body.layout.halls.find((h) => h.name === "Open Hall");
  const placed = await ownerA.post(`/admin/halls/${openHall.id}/tables`, {
    ...plan,
    seatPrefix: "F-",
  });
  const floatingSeats = placed.body.layout.halls.find((h) => h.id === openHall.id).tables[0].seats;
  assert.equal(floatingSeats[0].categoryId, null, "floating hall: the hall's category applies");

  const archived = await ownerA.patch(`/admin/seat-categories/${ac.id}`, { status: "archived" });
  assert.equal(archived.status, 200);
  const reuse = await ownerA.patch(`/admin/seats/${seats[1].id}`, { categoryId: ac.id });
  assert.equal(reuse.status, 422, "archived categories can't be assigned");
});

test("staff permissions are enforced on the server", { skip }, async () => {
  const created = await ownerA.post("/admin/staff", {
    name: "Desk Staff",
    email: "desk@alpha.test",
    password: "desk-password",
    permissions: ["members.manage"],
  });
  assert.equal(created.status, 201);
  const desk = await app.signedIn("desk@alpha.test", "desk-password");

  assert.equal((await desk.get("/admin/layout")).status, 200, "any staff can view the layout");
  assert.equal(
    (await desk.post("/admin/halls", { name: "X", seatingMode: "fixed", categoryId: null })).status,
    403,
  );
  assert.equal((await desk.get("/admin/staff")).status, 403);
  assert.equal((await desk.put("/admin/settings", {})).status, 403);

  await ownerA.patch(`/admin/staff/${created.body.member.id}`, {
    permissions: ["members.manage", "layout.manage"],
  });
  const allowed = await desk.post("/admin/halls", {
    name: "Desk Hall",
    seatingMode: "fixed",
    categoryId: null,
  });
  assert.equal(allowed.status, 201, "new permissions apply without signing in again");
});

test("libraries are isolated from each other", { skip }, async () => {
  const { owner: ownerB } = await app.createLibraryWithOwner("beta");
  const layoutA = (await ownerA.get("/admin/layout")).body.layout;
  const seatOfA = seatsOf(layoutA)[0];

  assert.deepEqual((await ownerB.get("/admin/layout")).body.layout.halls, []);
  assert.equal((await ownerB.patch(`/admin/seats/${seatOfA.id}`, { label: "Z-1" })).status, 404);
  assert.equal((await ownerB.delete(`/admin/halls/${layoutA.halls[0].id}`)).status, 404);
  const foreignCategory = await ownerB.post("/admin/halls", {
    name: "Sneaky",
    seatingMode: "fixed",
    categoryId: layoutA.categories[0].id,
  });
  assert.equal(foreignCategory.status, 422, "another library's category is not assignable");

  const boss = await app.signedIn(SUPER_ADMIN.email, SUPER_ADMIN.password);
  assert.equal((await boss.get("/admin/layout")).body.error.code, "LIBRARY_REQUIRED");
  const asA = boss.withHeaders({ "X-Library-Id": libraryA.id });
  assert.equal((await asA.get("/admin/layout")).body.layout.halls.length, layoutA.halls.length);
});
