import { formatRupees } from "@app/shared/money";
import { displayDate } from "@app/shared/time";
import { cx } from "@app/shared/ui";

/** Three numbers at the top of a member's account: owes now, next due, credit. */
export function AccountSummary({ account }) {
  const { summary, creditPaise } = account;
  const owes = summary.outstandingPaise > 0;
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Figure
        label={
          owes
            ? `Owes now${summary.daysOverdue ? ` · ${summary.daysOverdue} days late` : ""}`
            : "Owes now"
        }
        value={formatRupees(summary.outstandingPaise)}
        tone={owes ? "red" : "green"}
      />
      <Figure
        label={summary.nextDueOn ? `Next due ${displayDate(summary.nextDueOn)}` : "Next due"}
        value={summary.nextDueOn ? formatRupees(summary.nextDueAmountPaise) : "—"}
        tone="slate"
      />
      <Figure
        label="Credit (paid ahead)"
        value={formatRupees(creditPaise)}
        tone={creditPaise > 0 ? "brand" : "slate"}
      />
    </div>
  );
}

const TONES = {
  red: "bg-red-50 text-red-700",
  green: "bg-emerald-50 text-emerald-700",
  brand: "bg-brand-light text-brand-dark",
  slate: "bg-slate-50 text-slate-800",
};

function Figure({ label, value, tone }) {
  return (
    <div className={cx("rounded-xl px-4 py-3", TONES[tone])}>
      <p className="text-xs opacity-80">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
