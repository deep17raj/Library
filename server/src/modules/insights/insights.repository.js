import { queryAll, queryOne } from "../../db/transaction.js";

export async function occupancyBySlot(db, tenantId) {
  const totalRow = await queryOne(
    db,
    "SELECT COUNT(*) AS total FROM seats WHERE tenant_id = ? AND status = 'active'",
    [tenantId],
  );
  const totalSeats = Number(totalRow?.total ?? 0);
  const rows = await queryAll(
    db,
    `SELECT sl.id, sl.name, sl.start_min AS startMin, sl.end_min AS endMin,
            COUNT(s.id) AS bookings
       FROM slots sl
       LEFT JOIN subscriptions s ON s.slot_id = sl.id AND s.tenant_id = sl.tenant_id
         AND s.status = 'active'
      WHERE sl.tenant_id = ? AND sl.status = 'active'
      GROUP BY sl.id, sl.name, sl.start_min, sl.end_min
      ORDER BY sl.sort_order, sl.start_min`,
    [tenantId],
  );
  return {
    totalSeats,
    slots: rows.map((r) => ({
      id: r.id,
      name: r.name,
      startMin: r.startMin,
      endMin: r.endMin,
      bookings: Number(r.bookings),
      percent: totalSeats > 0 ? Math.round((Number(r.bookings) / totalSeats) * 100) : 0,
    })),
  };
}

export async function revenueByMonth(db, tenantId, months = 6) {
  const rows = await queryAll(
    db,
    `SELECT DATE_FORMAT(p.received_on, '%Y-%m') AS month,
            SUM(pa.amount_paise) AS totalPaise
       FROM payments p
       JOIN payment_allocations pa ON pa.payment_id = p.id AND pa.tenant_id = p.tenant_id
       JOIN invoices i ON i.id = pa.invoice_id AND i.tenant_id = pa.tenant_id
      WHERE p.tenant_id = ? AND p.status = 'valid' AND i.kind != 'deposit'
      GROUP BY month
      ORDER BY month DESC
      LIMIT ?`,
    [tenantId, months],
  );
  return rows.map((r) => ({ month: r.month, totalPaise: Number(r.totalPaise) })).reverse();
}

export async function duesAgeing(db, tenantId, today) {
  const rows = await queryAll(
    db,
    `SELECT
        SUM(CASE WHEN DATEDIFF(?, i.due_on) BETWEEN 0 AND 7 THEN i.amount_paise - i.discount_paise - i.paid_paise ELSE 0 END) AS bucket_0_7,
        SUM(CASE WHEN DATEDIFF(?, i.due_on) BETWEEN 8 AND 30 THEN i.amount_paise - i.discount_paise - i.paid_paise ELSE 0 END) AS bucket_8_30,
        SUM(CASE WHEN DATEDIFF(?, i.due_on) > 30 THEN i.amount_paise - i.discount_paise - i.paid_paise ELSE 0 END) AS bucket_30_plus,
        COUNT(DISTINCT CASE WHEN DATEDIFF(?, i.due_on) BETWEEN 0 AND 7 THEN i.member_id END) AS members_0_7,
        COUNT(DISTINCT CASE WHEN DATEDIFF(?, i.due_on) BETWEEN 8 AND 30 THEN i.member_id END) AS members_8_30,
        COUNT(DISTINCT CASE WHEN DATEDIFF(?, i.due_on) > 30 THEN i.member_id END) AS members_30_plus
       FROM invoices i
      WHERE i.tenant_id = ? AND i.status = 'open' AND i.due_on <= ?`,
    [today, today, today, today, today, today, tenantId, today],
  );
  const r = rows[0] || {};
  return [
    { bucket: "0-7", paise: Number(r.bucket_0_7 ?? 0), members: Number(r.members_0_7 ?? 0) },
    { bucket: "8-30", paise: Number(r.bucket_8_30 ?? 0), members: Number(r.members_8_30 ?? 0) },
    {
      bucket: "30+",
      paise: Number(r.bucket_30_plus ?? 0),
      members: Number(r.members_30_plus ?? 0),
    },
  ];
}

export async function churnByMonth(db, tenantId, months = 6) {
  const rows = await queryAll(
    db,
    `SELECT DATE_FORMAT(s.start_on, '%Y-%m') AS month,
            SUM(CASE WHEN s.previous_subscription_id IS NULL THEN 1 ELSE 0 END) AS newSubs,
            0 AS churned
       FROM subscriptions s
      WHERE s.tenant_id = ?
      GROUP BY month
     UNION ALL
     SELECT DATE_FORMAT(s.ended_at, '%Y-%m') AS month,
            0 AS newSubs,
            COUNT(*) AS churned
       FROM subscriptions s
      WHERE s.tenant_id = ? AND s.status IN ('ended','lapsed')
        AND s.end_reason IN ('left','unpaid')
      GROUP BY month
      ORDER BY month DESC
      LIMIT ?`,
    [tenantId, tenantId, months * 2],
  );
  const byMonth = {};
  for (const r of rows) {
    if (!r.month) continue;
    if (!byMonth[r.month]) byMonth[r.month] = { month: r.month, newSubs: 0, churned: 0 };
    byMonth[r.month].newSubs += Number(r.newSubs);
    byMonth[r.month].churned += Number(r.churned);
  }
  return Object.values(byMonth)
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-months);
}

export async function attendanceBySlot(db, tenantId, month) {
  const monthStart = `${month}-01`;
  const rows = await queryAll(
    db,
    `SELECT sl.id, sl.name,
            COUNT(DISTINCT a.id) AS presentDays,
            COUNT(DISTINCT CONCAT(s.id, ':', a.local_date)) AS expectedDays
       FROM slots sl
       JOIN subscriptions s ON s.slot_id = sl.id AND s.tenant_id = sl.tenant_id
         AND s.status = 'active'
       LEFT JOIN attendance a ON a.subscription_id = s.id AND a.tenant_id = sl.tenant_id
         AND a.local_date >= ? AND a.local_date < DATE_ADD(?, INTERVAL 1 MONTH)
      WHERE sl.tenant_id = ? AND sl.status = 'active'
      GROUP BY sl.id, sl.name
      ORDER BY sl.sort_order, sl.start_min`,
    [monthStart, monthStart, tenantId],
  );
  return rows.map((r) => {
    const present = Number(r.presentDays);
    const expected = Number(r.expectedDays);
    return {
      id: r.id,
      name: r.name,
      presentDays: present,
      expectedDays: expected,
      rate: expected > 0 ? Math.round((present / expected) * 100) : 0,
    };
  });
}
