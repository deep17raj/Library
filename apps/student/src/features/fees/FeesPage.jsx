import { Link } from "react-router-dom";
import { invoiceStatus } from "@app/shared/billing";
import { PAYMENT_MODE_LABELS } from "@app/shared/constants";
import { ICONS } from "@app/shared/icons";
import { formatRupees } from "@app/shared/money";
import { displayDate } from "@app/shared/time";
import {
  Alert,
  Badge,
  EmptyState,
  PageHeader,
  SectionCard,
  Skeleton,
  StatCard,
} from "@app/shared/ui";
import { useMe } from "../../app/session.js";
import { useMyAccount } from "./api.js";

/** What I owe and what I've paid (UI-GUIDE §10 Student fees). Payment is at the desk. */
export function FeesPage() {
  const { data: me } = useMe();
  const { data: account, isLoading, error } = useMyAccount();

  return (
    <>
      <PageHeader
        icon={ICONS.payment}
        title="Fees"
        description="Your bills and receipts. Fees are paid at the library desk."
      />
      {isLoading && <Skeleton rows={4} />}
      <Alert tone="error">{error?.message}</Alert>
      {account && (
        <div className="flex flex-col gap-4">
          <Summary summary={account.summary} creditPaise={account.creditPaise} />
          <Bills invoices={account.invoices} today={me.today} />
          <Receipts payments={account.payments} />
        </div>
      )}
    </>
  );
}

function Summary({ summary, creditPaise }) {
  if (summary.outstandingPaise > 0) {
    return (
      <StatCard
        icon={ICONS.dues}
        tone="red"
        label={summary.daysOverdue > 0 ? `Overdue ${summary.daysOverdue} days` : "Due today"}
        value={formatRupees(summary.outstandingPaise)}
        hint="Please pay at the desk. Ask for a receipt."
      />
    );
  }
  if (summary.nextDueOn) {
    return (
      <StatCard
        icon={ICONS.date}
        tone="amber"
        label={`Next fee on ${displayDate(summary.nextDueOn)}`}
        value={formatRupees(summary.nextDueAmountPaise)}
        hint={creditPaise > 0 ? `${formatRupees(creditPaise)} already paid in advance` : undefined}
      />
    );
  }
  return (
    <StatCard
      icon={ICONS.checkedIn}
      tone="green"
      label="All paid"
      value={formatRupees(0)}
      hint="Nothing to pay right now."
    />
  );
}

function Bills({ invoices, today }) {
  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={ICONS.charge}
        title="No bills yet"
        description="Your monthly fee bills will show up here."
      />
    );
  }
  return (
    <SectionCard icon={ICONS.charge} title="Bills">
      <ul className="divide-y divide-slate-100 text-sm">
        {invoices.map((invoice) => {
          const status = invoiceStatus(invoice, today);
          return (
            <li key={invoice.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-slate-800">{invoice.description}</p>
                <p className="text-xs text-slate-500">
                  Due {displayDate(invoice.dueOn)}
                  {invoice.balancePaise > 0 &&
                    invoice.paidPaise > 0 &&
                    ` · ${formatRupees(invoice.balancePaise)} left`}
                </p>
              </div>
              <span className="tabular-nums text-slate-900">
                {formatRupees(invoice.amountPaise - invoice.discountPaise)}
              </span>
              <Badge tone={status.tone}>{status.label}</Badge>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function Receipts({ payments }) {
  if (payments.length === 0) return null;
  return (
    <SectionCard icon={ICONS.receipt} title="Receipts" description="Tap one to view or save it.">
      <ul className="divide-y divide-slate-100 text-sm">
        {payments.map((p) => (
          <li key={p.id}>
            <Link to={`/fees/receipts/${p.id}`} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-slate-800">
                  Receipt #{p.receiptNo} · {displayDate(p.receivedOn)}
                </p>
                <p className="text-xs text-slate-500">{PAYMENT_MODE_LABELS[p.mode]}</p>
              </div>
              <span
                className={
                  p.status === "void"
                    ? "tabular-nums text-slate-400 line-through"
                    : "tabular-nums text-emerald-700"
                }
              >
                {formatRupees(p.amountPaise)}
              </span>
              {p.status === "void" && <Badge tone="slate">Void</Badge>}
            </Link>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
