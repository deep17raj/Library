import { ageingBucket, daysBetween } from "@app/shared/billing";
import { syncLibraryInvoices } from "./invoicing.js";

/**
 * Who owes money now, oldest debt first, with how late they are and an ageing bucket
 * (0–7, 8–30, 30+ days) — the "Dues" screen and its CSV.
 * @param {import("./billing.service.js").BillingDeps} deps
 */
export async function listDues(deps, ctx) {
  await syncLibraryInvoices(deps, ctx);
  const today = await deps.calendar.today(deps.db, ctx.tenantId);
  const rows = await deps.invoices.listMembersWithDues(deps.db, ctx.tenantId, today);
  const members = rows.map((row) => {
    const daysOverdue = row.overdueSince < today ? daysBetween(row.overdueSince, today) : 0;
    return {
      ...row,
      outstandingPaise: Number(row.outstandingPaise),
      daysOverdue,
      bucket: ageingBucket(daysOverdue),
    };
  });
  const totals = { all: 0, "0-7": 0, "8-30": 0, "30+": 0 };
  for (const member of members) {
    totals.all += member.outstandingPaise;
    totals[member.bucket] += member.outstandingPaise;
  }
  return { today, members, totals };
}
