import { useState } from "react";
import { Link } from "react-router-dom";
import { PAYMENT_MODE_LABELS, PAYMENT_MODES } from "@app/shared/constants";
import { formatRupees } from "@app/shared/money";
import { displayDate, monthRange } from "@app/shared/time";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  SelectField,
  Skeleton,
  StatCard,
  TextField,
  useToast,
} from "@app/shared/ui";
import { downloadFile } from "../../app/download.js";
import { ICONS, PAYMENT_MODE_ICONS } from "@app/shared/icons";
import { useToday } from "../../app/useToday.js";
import { usePayments } from "./api.js";

/** Every receipt in a date range, with totals per payment mode (UI-GUIDE §11 Payments). */
export function PaymentsPage() {
  const today = useToday();
  const [from, to] = monthRange(today);
  const [filters, setFilters] = useState({ from, to, mode: "" });
  const { data, isLoading, error } = usePayments(filters);
  const toast = useToast();
  const set = (key) => (event) => setFilters({ ...filters, [key]: event.target.value });
  const exportCsv = () =>
    downloadFile(
      `/admin/export/payments.csv?from=${filters.from}&to=${filters.to}`,
      `payments-${filters.from}-to-${filters.to}.csv`,
    ).catch((e) => toast(e.message, { tone: "error" }));

  return (
    <>
      <PageHeader
        icon={ICONS.payment}
        title="Payments"
        description="Every receipt, newest first. Open one to print it."
        actions={
          <Button variant="secondary" icon={ICONS.export} onClick={exportCsv}>
            Export CSV
          </Button>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <TextField
          label="From"
          type="date"
          value={filters.from}
          max={filters.to}
          onChange={set("from")}
        />
        <TextField
          label="To"
          type="date"
          value={filters.to}
          min={filters.from}
          onChange={set("to")}
        />
        <SelectField
          label="Paid by"
          value={filters.mode}
          onChange={set("mode")}
          options={[
            { value: "", label: "Any way" },
            ...PAYMENT_MODES.map((m) => ({ value: m, label: PAYMENT_MODE_LABELS[m] })),
          ]}
        />
      </div>
      <Alert tone="error">{error?.message}</Alert>
      {isLoading && <Skeleton rows={4} />}
      {data && (
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={ICONS.payment}
              tone="green"
              label="Collected"
              value={formatRupees(data.totalPaise)}
              hint={`${data.payments.filter((p) => p.status === "valid").length} receipts`}
            />
            {Object.entries(data.byMode).map(([mode, paise]) => (
              <StatCard
                key={mode}
                icon={PAYMENT_MODE_ICONS[mode]}
                tone="slate"
                label={PAYMENT_MODE_LABELS[mode]}
                value={formatRupees(paise)}
              />
            ))}
          </div>
          {data.payments.length === 0 ? (
            <EmptyState
              icon={ICONS.receipt}
              title="No payments in these dates"
              description="Payments are collected from a student's page or from Dues."
            />
          ) : (
            <Card className="p-0">
              <ul className="divide-y divide-slate-100 text-sm">
                {data.payments.map((p) => (
                  <PaymentRow key={p.id} payment={p} />
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </>
  );
}

function PaymentRow({ payment: p }) {
  const ModeIcon = PAYMENT_MODE_ICONS[p.mode] ?? ICONS.payment;
  const voided = p.status === "void";
  return (
    <li>
      <Link
        to={`/payments/${p.id}/receipt`}
        className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-slate-50"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <ModeIcon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-900">{p.memberName}</p>
          <p className="text-slate-500">
            {p.receiptLabel} · {displayDate(p.receivedOn)} · {PAYMENT_MODE_LABELS[p.mode]}
            {p.reference && ` · ${p.reference}`}
          </p>
        </div>
        {voided && <Badge tone="slate">Void</Badge>}
        <span
          className={
            voided
              ? "tabular-nums text-slate-400 line-through"
              : "font-semibold tabular-nums text-emerald-700"
          }
        >
          {formatRupees(p.amountPaise)}
        </span>
      </Link>
    </li>
  );
}
