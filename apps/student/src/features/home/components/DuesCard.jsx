import { Link } from "react-router-dom";
import { ICONS } from "@app/shared/icons";
import { formatRupees } from "@app/shared/money";
import { displayDate } from "@app/shared/time";
import { Card, cx } from "@app/shared/ui";

/**
 * Fees at a glance, in one of three moods (UI-GUIDE §6 tones): red when something is
 * overdue, amber when a fee is coming up, green when all paid.
 */
export function DuesCard({ dues, creditPaise }) {
  // outstandingPaise is money already due (today or earlier); upcoming fees are separate.
  const overdue = dues.outstandingPaise > 0;
  const look = overdue
    ? { tone: "bg-red-50 text-red-600", title: `${formatRupees(dues.outstandingPaise)} due` }
    : dues.nextDueOn
      ? {
          tone: "bg-amber-50 text-amber-600",
          title: `Next fee ${formatRupees(dues.nextDueAmountPaise)}`,
        }
      : { tone: "bg-emerald-50 text-emerald-600", title: "All fees paid" };
  const detail = overdue
    ? dues.daysOverdue > 0
      ? `Overdue for ${dues.daysOverdue} day${dues.daysOverdue === 1 ? "" : "s"}. Please pay at the desk.`
      : "Due today. Please pay at the desk."
    : dues.nextDueOn
      ? `Due on ${displayDate(dues.nextDueOn)}`
      : creditPaise > 0
        ? `${formatRupees(creditPaise)} paid in advance`
        : "Nothing to pay right now.";

  return (
    <Link to="/fees" className="block">
      <Card className="flex items-center gap-4 transition-shadow hover:shadow-md">
        <span
          className={cx(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
            look.tone,
          )}
        >
          <ICONS.payment className="h-6 w-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{look.title}</p>
          <p className="text-sm text-slate-500">{detail}</p>
        </div>
        <span className="text-sm font-medium text-brand-dark">Fees ›</span>
      </Card>
    </Link>
  );
}
