import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { TEST_DATABASE_URL } from "./testDatabase.js";
import { startTestApp } from "./testApp.js";
import { seatIdByLabel } from "./seed.js";

// Milestone 5 end-to-end: joining charges, generated fees, partial payments, credit,
// voiding, discounts, deposit refunds, dues, day ledger, CSV and the cron endpoint.
const skip = !TEST_DATABASE_URL && "set TEST_DATABASE_URL to run integration tests";

let app;
let owner;
const ids = {};

before(async () => {
  if (skip) return;
  app = await startTestApp("money");
  ({ owner } = await app.createLibraryWithOwner("money"));
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
  const { body } = await owner.post("/admin/slots", {
    name: "Morning",
    startMin: 360,
    endMin: 720,
    monthlyFeePaise: 80000,
  });
  const slot = body.slots[0];
  const created = await owner.post("/admin/members", {
    name: "Ravi Kumar",
    phone: "9876500001",
    admissionFeePaise: 50000,
    depositPaise: 100000,
    bookings: [
      {
        slotId: slot.id,
        planId: slot.plans[0].id,
        seatId: seatIdByLabel(layout, "A-1"),
        lockerFeePaise: 10000,
      },
    ],
  });
  ids.member = created.body.member.id;
});
after(async () => app?.stop());

const account = async () => (await owner.get(`/admin/members/${ids.member}/account`)).body.account;
const pay = (amountPaise, extra = {}) =>
  owner.post("/admin/payments", { memberId: ids.member, amountPaise, mode: "cash", ...extra });

test("joining creates admission, deposit, first fee and locker invoices", { skip }, async () => {
  const { invoices, summary } = await account();
  assert.deepEqual(invoices.map((i) => i.kind).sort(), [
    "admission",
    "deposit",
    "locker",
    "seat_fee",
  ]);
  assert.equal(summary.outstandingPaise, 50000 + 100000 + 80000 + 10000);
});

test(
  "a partial payment clears the oldest dues first and gets a receipt number",
  { skip },
  async () => {
    const first = await pay(60000);
    assert.equal(first.status, 201);
    assert.equal(first.body.receipt.payment.receiptLabel, "R-000001");
    assert.equal(
      first.body.receipt.allocations.reduce((s, a) => s + a.amountPaise, 0),
      60000,
    );
    const { summary } = await account();
    assert.equal(summary.outstandingPaise, 240000 - 60000);
    const second = await pay(1000);
    assert.equal(second.body.receipt.payment.receiptLabel, "R-000002");
    ids.secondPayment = second.body.receipt.payment.id;
  },
);

test("paying more than owed leaves credit; voiding brings dues back", { skip }, async () => {
  const big = await pay(200000, { mode: "upi", reference: "UPI123" });
  assert.equal(big.body.receipt.creditPaise, 200000 - (240000 - 61000));
  let state = await account();
  assert.equal(state.summary.outstandingPaise, 0);
  assert.equal(state.creditPaise, 21000);

  const voided = await owner.post(`/admin/payments/${big.body.receipt.payment.id}/void`, {
    reason: "Wrong member",
  });
  assert.equal(voided.body.receipt.payment.status, "void");
  state = await account();
  assert.equal(state.summary.outstandingPaise, 179000, "owed again");
  assert.equal(state.creditPaise, 0);
});

test("discounts reduce what is owed; a paid charge can't be voided", { skip }, async () => {
  const { invoices } = await account();
  const locker = invoices.find((i) => i.kind === "locker");
  const discounted = await owner.patch(`/admin/invoices/${locker.id}/discount`, {
    discountPaise: locker.balancePaise,
    reason: "Locker broken",
  });
  assert.equal(discounted.body.account.invoices.find((i) => i.id === locker.id).status, "paid");
  const admission = invoices.find((i) => i.kind === "admission");
  const refused = await owner.post(`/admin/invoices/${admission.id}/void`, { reason: "Mistake" });
  assert.equal(refused.status, 422);
});

test("deposits are refunded up to what was paid", { skip }, async () => {
  await pay(500000);
  const deposit = (await account()).invoices.find((i) => i.kind === "deposit");
  const tooMuch = await owner.post(`/admin/invoices/${deposit.id}/refund`, {
    amountPaise: 100001,
    mode: "cash",
  });
  assert.equal(tooMuch.status, 422);
  const refunded = await owner.post(`/admin/invoices/${deposit.id}/refund`, {
    amountPaise: 100000,
    mode: "cash",
  });
  assert.equal(refunded.body.account.refunds.length, 1);
});

test("dues, day ledger and CSV agree", { skip }, async () => {
  const dues = (await owner.get("/admin/dues")).body;
  assert.equal(dues.totals.all, 0, "everything is paid by now");
  const ledger = (await owner.get("/admin/ledger")).body;
  assert.equal(ledger.collected.totalPaise, 60000 + 1000 + 500000, "void payment not counted");
  assert.equal(ledger.depositsInPaise, 100000);
  assert.equal(ledger.refunded.totalPaise, 100000);
  assert.equal(ledger.cashInHandPaise, 561000 - 100000);

  const csv = await fetch(
    `${app.baseUrl}/admin/export/payments.csv?from=${ledger.date}&to=${ledger.date}`,
    {
      headers: { Cookie: await owner.cookie() },
    },
  );
  const text = await csv.text();
  assert.match(text, /R-000001,.*Ravi Kumar,600,Cash/);
});

test("expenses are listed with totals and voided, not deleted", { skip }, async () => {
  const today = (await owner.get("/admin/ledger")).body.date;
  const created = await owner.post("/admin/expenses", {
    category: "electricity",
    title: "October bill",
    amountPaise: 230000,
    spentOn: today,
    mode: "upi",
  });
  assert.equal(created.status, 201);
  await owner.post(`/admin/expenses/${created.body.expense.id}/void`, { reason: "Entered twice" });
  const list = (await owner.get(`/admin/expenses?from=${today}&to=${today}`)).body;
  assert.equal(list.expenses[0].status, "void");
  assert.equal(list.totalPaise, 0);
});

test("the cron endpoint needs the secret", { skip }, async () => {
  const denied = await fetch(`${app.baseUrl}/internal/jobs/run`, { method: "POST" });
  assert.equal(denied.status, 403);
  const allowed = await fetch(`${app.baseUrl}/internal/jobs/run`, {
    method: "POST",
    headers: { "X-Cron-Secret": "test-cron-secret" },
  });
  assert.equal(allowed.status, 200);
  assert.deepEqual((await allowed.json()).ran, ["generate-invoices"]);
});
