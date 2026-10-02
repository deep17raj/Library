import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { TEST_DATABASE_URL } from "./testDatabase.js";
import { startTestApp } from "./testApp.js";
import { createTestBrowser } from "./httpClient.js";
import { seatIdByLabel } from "./seed.js";

// Milestone 7 end-to-end: staff give app access, the student signs in, must change the
// temporary password, sees their seat/fees/attendance, checks in by the desk code,
// only ever sees their own receipts; sessions are per library; push subscribe; the
// per-library manifest and icons.
const skip = !TEST_DATABASE_URL && "set TEST_DATABASE_URL to run integration tests";

let app;
let owner;
const ids = {};
const SLUG = "stud";

async function setUpLibrary() {
  ({ owner } = await app.createLibraryWithOwner(SLUG));
  const hall = (
    await owner.post("/admin/halls", { name: "Hall A", seatingMode: "fixed", categoryId: null })
  ).body;
  const layout = (
    await owner.post(`/admin/halls/${hall.layout.halls[0].id}/tables`, {
      tableCount: 1,
      seatsPerTable: 2,
      seatPrefix: "A-",
      startNumber: 1,
    })
  ).body.layout;
  const slot = (
    await owner.post("/admin/slots", {
      name: "Morning",
      startMin: 360,
      endMin: 720,
      monthlyFeePaise: 80000,
    })
  ).body.slots[0];
  // Check-in at any hour, so the test doesn't depend on the wall clock.
  await owner.put("/admin/settings/checkin", {
    slotCheckMode: "off",
    slotEarlyMinutes: 15,
    allowOverdueCheckin: true,
  });
  const add = async (name, phone, seat) =>
    (
      await owner.post("/admin/members", {
        name,
        phone,
        bookings: [
          { slotId: slot.id, planId: slot.plans[0].id, seatId: seatIdByLabel(layout, seat) },
        ],
      })
    ).body.member.id;
  ids.ravi = await add("Ravi Kumar", "9876500011", "A-1");
  ids.sia = await add("Sia Rao", "9876500012", "A-2");
}

before(async () => {
  if (skip) return;
  app = await startTestApp("student");
  await setUpLibrary();
});
after(async () => app?.stop());

const giveAccess = async (memberId) =>
  (await owner.post(`/admin/members/${memberId}/app-access`)).body;
const studentBrowser = () => createTestBrowser(app.baseUrl);
async function signIn(phone, password) {
  const browser = studentBrowser();
  const res = await browser.post(`/s/${SLUG}/auth/login`, { phone, password });
  return { browser, res };
}

test(
  "staff give access; the temporary password signs in and must be changed",
  { skip },
  async () => {
    const { temporaryPassword, appAccess } = await giveAccess(ids.ravi);
    assert.match(temporaryPassword, /^\d{6}$/);
    assert.equal(appAccess.mustChangePassword, true);

    const wrong = await signIn("9876500011", "000000");
    assert.equal(wrong.res.status, 401);
    assert.equal(wrong.res.body.error.code, "INVALID_CREDENTIALS");

    const raw = await fetch(`${app.baseUrl}/s/${SLUG}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Requested-With": "app" },
      body: JSON.stringify({ phone: "98765 00011", password: temporaryPassword }),
    });
    assert.equal(raw.status, 200);
    assert.match(raw.headers.get("set-cookie"), /sl_student=.+Path=\/api\/s\/stud;.*HttpOnly/i);

    const { browser } = await signIn("9876500011", temporaryPassword);
    const me = (await browser.get(`/s/${SLUG}/me`)).body;
    assert.equal(me.student.mustChangePassword, true);
    const blocked = await browser.get(`/s/${SLUG}/account`);
    assert.equal(blocked.status, 403);
    assert.equal(blocked.body.error.code, "PASSWORD_CHANGE_REQUIRED");

    const changed = await browser.post(`/s/${SLUG}/auth/password`, {
      currentPassword: temporaryPassword,
      newPassword: "ravi-secret-1",
    });
    assert.equal(changed.status, 200);
    assert.equal(changed.body.student.mustChangePassword, false);
    ids.raviBrowser = browser;
  },
);

test("home shows my seat, my dues and the library", { skip }, async () => {
  const me = (await ids.raviBrowser.get(`/s/${SLUG}/me`)).body;
  assert.equal(me.student.name, "Ravi Kumar");
  assert.equal(me.library.slug, SLUG);
  assert.equal(me.bookings.length, 1);
  assert.equal(me.bookings[0].seatLabel, "A-1");
  assert.equal(me.bookings[0].slotName, "Morning");
  assert.equal(me.dues.outstandingPaise, 80000);
  assert.deepEqual(me.checkIns, []);
});

test("the desk code checks me in; my calendar shows it", { skip }, async () => {
  const { code } = (await owner.get("/admin/checkin/desk")).body;
  const wrong = await ids.raviBrowser.post(`/s/${SLUG}/checkin`, { code: "ZZZZZZ" });
  assert.equal(wrong.body.error.code, "INVALID_CODE");
  const res = await ids.raviBrowser.post(`/s/${SLUG}/checkin`, { code });
  assert.equal(res.body.action, "checked_in");

  const att = (await ids.raviBrowser.get(`/s/${SLUG}/attendance`)).body;
  assert.equal(att.presentDays, 1);
  assert.equal(att.streak, 1);
  assert.equal(att.visits[0].slotName, "Morning");
  assert.equal((await ids.raviBrowser.get(`/s/${SLUG}/me`)).body.checkIns.length, 1);
});

test("I see my own receipts only", { skip }, async () => {
  const paid = await owner.post("/admin/payments", {
    memberId: ids.ravi,
    amountPaise: 30000,
    mode: "upi",
  });
  const paymentId = paid.body.receipt.payment.id;
  const account = (await ids.raviBrowser.get(`/s/${SLUG}/account`)).body.account;
  assert.equal(account.summary.outstandingPaise, 50000);
  assert.equal(account.payments[0].id, paymentId);
  assert.equal("note" in account.payments[0], false, "staff notes stay private");

  const mine = await ids.raviBrowser.get(`/s/${SLUG}/payments/${paymentId}/receipt`);
  assert.equal(mine.body.receipt.payment.receiptLabel, "R-000001");

  const { temporaryPassword } = await giveAccess(ids.sia);
  const { browser: sia } = await signIn("9876500012", temporaryPassword);
  await sia.post(`/s/${SLUG}/auth/password`, {
    currentPassword: temporaryPassword,
    newPassword: "sia-secret-1",
  });
  const theirs = await sia.get(`/s/${SLUG}/payments/${paymentId}/receipt`);
  assert.equal(theirs.status, 404);
});

test("a session belongs to one library, and a staff reset ends it", { skip }, async () => {
  await app.createLibraryWithOwner("stud2");
  const elsewhere = await ids.raviBrowser.get(`/s/stud2/me`);
  assert.equal(elsewhere.status, 401);

  const unknown = await ids.raviBrowser.get(`/s/no-such-lib/me`);
  assert.equal(unknown.status, 404);

  await giveAccess(ids.ravi);
  const ended = await ids.raviBrowser.get(`/s/${SLUG}/me`);
  assert.equal(ended.status, 401);
  const access = (await owner.get(`/admin/members/${ids.ravi}/app-access`)).body.appAccess;
  assert.equal(access.mustChangePassword, true);
  assert.ok(access.lastLoginAt, "last sign-in is shown to staff");
});

test("notifications: the public key and subscribing a browser", { skip }, async () => {
  const { publicKey } = (await owner.get("/push/public-key")).body;
  assert.equal(Buffer.from(publicKey, "base64url").length, 65);
  const { browser } = await signIn("9876500012", "sia-secret-1");
  const endpoint = "https://fcm.googleapis.com/fcm/send/test-endpoint";
  const sub = await browser.post(`/s/${SLUG}/push/subscribe`, {
    endpoint,
    keys: { p256dh: "BPkey", auth: "authkey" },
  });
  assert.equal(sub.body.devices.length, 1);
  const bad = await browser.post(`/s/${SLUG}/push/subscribe`, {
    endpoint: "https://example.com/hook",
    keys: { p256dh: "x", auth: "y" },
  });
  assert.equal(bad.status, 422);
  const off = await browser.post(`/s/${SLUG}/push/unsubscribe`, { endpoint });
  assert.equal(off.body.devices.length, 0);
});

test("each library gets its own installable manifest and icons", { skip }, async () => {
  const manifest = await fetch(`${app.origin}/s/${SLUG}/manifest.webmanifest`);
  assert.equal(manifest.status, 200);
  const body = await manifest.json();
  assert.equal(body.start_url, `/s/${SLUG}/`);
  assert.equal(body.name, `Library ${SLUG}`);

  const icon = await fetch(`${app.origin}/s/${SLUG}/icon-maskable-512.png`);
  assert.equal(icon.status, 200);
  assert.equal(icon.headers.get("content-type"), "image/png");
  const png = Buffer.from(await icon.arrayBuffer());
  assert.equal(png.readUInt32BE(16), 512, "512 px wide");

  const redirect = await fetch(`${app.origin}/s/${SLUG}?x=1`, { redirect: "manual" });
  assert.equal(redirect.status, 301);
  assert.equal(redirect.headers.get("location"), `/s/${SLUG}/?x=1`);

  // The page itself (no redirect loop); with a build present, the library's head tags.
  const shell = await fetch(`${app.origin}/s/${SLUG}/checkin?code=AB12CD`, { redirect: "manual" });
  assert.notEqual(shell.status, 301);
  if (shell.status === 200) {
    const html = await shell.text();
    assert.match(html, new RegExp(`<link rel="manifest" href="/s/${SLUG}/manifest.webmanifest"`));
    assert.match(html, new RegExp(`<title>Library ${SLUG}</title>`));
  } else {
    assert.equal(shell.status, 503, "only 'not built yet' is acceptable");
  }
  const root = await fetch(`${app.origin}/s/${SLUG}/`, { redirect: "manual" });
  assert.notEqual(root.status, 301);
  assert.equal((await fetch(`${app.origin}/s/nope/manifest.webmanifest`)).status, 404);
});
