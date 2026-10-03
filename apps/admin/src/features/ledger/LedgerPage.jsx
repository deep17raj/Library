import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PAYMENT_MODE_LABELS } from "@app/shared/constants";
import { formatRupees } from "@app/shared/money";
import { addDaysToDateKey, displayDate } from "@app/shared/time";
import {
  Alert,
  Button,
  Card,
  IconButton,
  PageHeader,
  SectionCard,
  Skeleton,
  StatCard,
} from "@app/shared/ui";
import { ICONS, PAYMENT_MODE_ICONS } from "@app/shared/icons";
import { useToday } from "../../app/useToday.js";
import { useDayLedger } from "./api.js";

/** One day's money in and out, and the cash that should be in the drawer (UI-GUIDE §11). */
export function LedgerPage() {
  const today = useToday();
  const [date, setDate] = useState(today);
  const { data, isLoading, error } = useDayLedger(date);

  return (
    <>
      <PageHeader
        icon={ICONS.ledger}
        title="Day ledger"
        description="Close the day: what came in, what went out, and the cash in hand."
      />
      <div className="mb-5 flex items-center gap-2">
        <IconButton
          icon={ChevronLeft}
          variant="secondary"
          label="Previous day"
          onClick={() => setDate(addDaysToDateKey(date, -1))}
        />
        <input
          type="date"
          aria-label="Day"
          value={date}
          max={today}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
        />
        <IconButton
          icon={ChevronRight}
          variant="secondary"
          label="Next day"
          disabled={date >= today}
          onClick={() => setDate(addDaysToDateKey(date, 1))}
        />
        {date !== today && (
          <Button variant="ghost" size="sm" onClick={() => setDate(today)}>
            Today
          </Button>
        )}
      </div>
      <Alert tone="error">{error?.message}</Alert>
      {isLoading && <Skeleton rows={3} />}
      {data && <LedgerDay ledger={data} />}
    </>
  );
}

function LedgerDay({ ledger }) {
  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-br from-brand to-brand-dark text-white ring-0">
        <div>
          <p className="text-sm opacity-80">Cash in hand for {displayDate(ledger.date)}</p>
          <p className="text-3xl font-semibold tabular-nums">
            {formatRupees(ledger.cashInHandPaise)}
          </p>
          <p className="mt-1 text-xs opacity-80">Cash received − cash spent − cash refunded</p>
        </div>
        <ICONS.payment className="h-10 w-10 opacity-40" aria-hidden="true" />
      </Card>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={ICONS.payment}
          tone="green"
          label="Collected"
          value={formatRupees(ledger.collected.totalPaise)}
          hint={`${ledger.payments.length} receipts`}
        />
        <StatCard
          icon={ICONS.expenses}
          tone="red"
          label="Spent"
          value={formatRupees(ledger.spent.totalPaise)}
          hint={`${ledger.expenses.length} expenses`}
        />
        <StatCard
          icon={ICONS.deposit}
          tone="slate"
          label="Deposits in / refunded"
          value={`${formatRupees(ledger.depositsInPaise)} / ${formatRupees(ledger.refunded.totalPaise)}`}
          hint="Held for students, not income"
        />
        <StatCard
          icon={ICONS.ledger}
          tone="brand"
          label="Net for the day"
          value={formatRupees(ledger.netPaise)}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ModeBreakdown
          title="Money in, by mode"
          byMode={ledger.collected.byMode}
          tone="text-emerald-700"
        />
        <ModeBreakdown
          title="Money out, by mode"
          byMode={mergeModes(ledger.spent.byMode, ledger.refunded.byMode)}
          tone="text-red-700"
        />
      </div>
    </div>
  );
}

function mergeModes(a, b) {
  const merged = { ...a };
  for (const [mode, paise] of Object.entries(b)) merged[mode] = (merged[mode] ?? 0) + paise;
  return merged;
}

function ModeBreakdown({ title, byMode, tone }) {
  const rows = Object.entries(byMode);
  return (
    <SectionCard title={title}>
      {rows.length === 0 && <p className="text-sm text-slate-500">Nothing on this day.</p>}
      <ul className="divide-y divide-slate-100 text-sm">
        {rows.map(([mode, paise]) => {
          const Icon = PAYMENT_MODE_ICONS[mode] ?? ICONS.payment;
          return (
            <li key={mode} className="flex items-center gap-3 py-2">
              <Icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span className="flex-1">{PAYMENT_MODE_LABELS[mode] ?? mode}</span>
              <span className={`font-medium tabular-nums ${tone}`}>{formatRupees(paise)}</span>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
