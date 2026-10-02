import { queryAll, queryOne } from "../db/transaction.js";
import { libraryToday, billingSettings } from "../modules/settings/librarySettings.js";

const SYSTEM_ACTOR = { id: null, role: "system", tenantId: null, name: "System" };

async function activeLibraryIds(db) {
  const rows = await queryAll(db, "SELECT id FROM libraries WHERE status = 'active'");
  return rows.map((row) => row.id);
}

/**
 * @param {{ db: import("mysql2/promise").Pool,
 *   billingService: *, subscriptionsService: *, notificationsService: * }} deps
 * @returns {import("./scheduler.js").Job[]}
 */
export function createJobs({ db, billingService, subscriptionsService, notificationsService }) {
  const forAll = (fn) => async () => {
    let n = 0;
    for (const id of await activeLibraryIds(db)) n += await fn(id);
    return n;
  };
  return [
    {
      name: "generate-invoices",
      everyMinutes: 60,
      run: wrap(
        forAll((t) => billingService.syncLibraryInvoices({ tenantId: t, actor: SYSTEM_ACTOR })),
        (n) => `new invoices for ${n} member(s)`,
      ),
    },
    {
      name: "end-finished-subscriptions",
      everyMinutes: 60,
      run: wrap(
        forAll((t) => endFinishedSubs(db, t, subscriptionsService)),
        (n) => `ended ${n} subscription(s)`,
      ),
    },
    {
      name: "release-unpaid-seats",
      everyMinutes: 60,
      run: wrap(
        forAll((t) => releaseUnpaid(db, t, subscriptionsService, notificationsService)),
        (n) => `released ${n} seat(s)`,
      ),
    },
    {
      name: "send-fee-reminders",
      everyMinutes: 60,
      run: wrap(
        forAll((t) => feeReminders(db, t, notificationsService)),
        (n) => `sent ${n} reminder(s)`,
      ),
    },
    {
      name: "send-seat-expiry-reminders",
      everyMinutes: 60,
      run: wrap(
        forAll((t) => seatExpiryReminders(db, t, notificationsService)),
        (n) => `sent ${n} expiry notice(s)`,
      ),
    },
  ];
}

function wrap(fn, fmt) {
  return async () => fmt(await fn());
}

async function endFinishedSubs(db, tenantId, subscriptionsService) {
  const today = await libraryToday(db, tenantId);
  const subs = await queryAll(
    db,
    `SELECT id FROM subscriptions
      WHERE tenant_id = ? AND status = 'active'
        AND end_on IS NOT NULL AND end_on <= ?`,
    [tenantId, today],
  );
  let count = 0;
  for (const sub of subs) {
    try {
      await subscriptionsService.endSubscription({ tenantId, actor: SYSTEM_ACTOR }, sub.id, {
        reason: "admin",
      });
      count++;
    } catch {
      // already ended or state changed
    }
  }
  return count;
}

async function releaseUnpaid(db, tenantId, subscriptionsService, notificationsService) {
  const settings = await billingSettings(db, tenantId);
  if (!settings.autoReleaseUnpaid) return 0;
  const today = await libraryToday(db, tenantId);
  const rows = await queryAll(
    db,
    `SELECT DISTINCT s.id AS subscriptionId, s.member_id AS memberId
       FROM subscriptions s
       JOIN invoices i ON i.member_id = s.member_id AND i.tenant_id = s.tenant_id
      WHERE s.tenant_id = ? AND s.status = 'active'
        AND i.status = 'open' AND i.due_on <= ?
        AND DATEDIFF(?, i.due_on) > ?`,
    [tenantId, today, today, settings.graceDays],
  );
  let count = 0;
  for (const row of rows) {
    try {
      await subscriptionsService.endSubscription(
        { tenantId, actor: SYSTEM_ACTOR },
        row.subscriptionId,
        { reason: "admin" },
      );
      await notificationsService.sendSystemNotification(tenantId, {
        kind: "seat_expiry",
        title: "Seat released",
        body: `Your seat was released because fees were overdue for more than ${settings.graceDays} days. Visit the library to resolve.`,
        memberIds: [row.memberId],
        dedupeKey: `auto_release:${row.subscriptionId}`,
      });
      count++;
    } catch {
      // skip individual failures
    }
  }
  return count;
}

async function feeReminders(db, tenantId, notificationsService) {
  const row = await queryOne(
    db,
    "SELECT fee_reminder_days_before FROM library_settings WHERE tenant_id = ?",
    [tenantId],
  );
  const daysBefore = row?.fee_reminder_days_before ?? 3;
  if (daysBefore <= 0) return 0;

  const today = await libraryToday(db, tenantId);
  const invoices = await queryAll(
    db,
    `SELECT i.id AS invoiceId, i.member_id AS memberId, i.due_on AS dueOn
       FROM invoices i
       JOIN members m ON m.id = i.member_id AND m.tenant_id = i.tenant_id
      WHERE i.tenant_id = ? AND i.status = 'open' AND m.status = 'active'
        AND DATEDIFF(i.due_on, ?) BETWEEN 0 AND ?`,
    [tenantId, today, daysBefore],
  );
  let sent = 0;
  for (const inv of invoices) {
    const diff = Math.max(0, Math.round((new Date(inv.dueOn) - new Date(today)) / 86400000));
    const when = diff === 0 ? "today" : `in ${diff} day${diff > 1 ? "s" : ""}`;
    const result = await notificationsService.sendSystemNotification(tenantId, {
      kind: "fee_due",
      title: "Fee reminder",
      body: `Your fee is due ${when}. Please pay at the desk to avoid any disruption.`,
      memberIds: [inv.memberId],
      dedupeKey: `fee_due:${inv.invoiceId}:d-${diff}`,
    });
    if (result) sent++;
  }
  return sent;
}

async function seatExpiryReminders(db, tenantId, notificationsService) {
  const today = await libraryToday(db, tenantId);
  const subs = await queryAll(
    db,
    `SELECT s.id, s.member_id AS memberId, s.end_on AS endOn, sl.name AS slotName
       FROM subscriptions s
       JOIN slots sl ON sl.id = s.slot_id
      WHERE s.tenant_id = ? AND s.status = 'active'
        AND s.end_on IS NOT NULL AND DATEDIFF(s.end_on, ?) BETWEEN 0 AND 3`,
    [tenantId, today],
  );
  let sent = 0;
  for (const sub of subs) {
    const diff = Math.max(0, Math.round((new Date(sub.endOn) - new Date(today)) / 86400000));
    const when = diff === 0 ? "today" : `in ${diff} day${diff > 1 ? "s" : ""}`;
    const result = await notificationsService.sendSystemNotification(tenantId, {
      kind: "seat_expiry",
      title: "Booking ending soon",
      body: `Your ${sub.slotName} booking ends ${when}. Renew at the desk to keep your seat.`,
      memberIds: [sub.memberId],
      dedupeKey: `seat_expiry:${sub.id}:d-${diff}`,
    });
    if (result) sent++;
  }
  return sent;
}
