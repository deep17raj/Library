import { useState } from "react";
import { EXPENSE_CATEGORY_LABELS, PAYMENT_MODE_LABELS } from "@app/shared/constants";
import { formatRupees } from "@app/shared/money";
import { displayDate, displayMonth, monthRange } from "@app/shared/time";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  PageHeader,
  Skeleton,
  StatCard,
  TextField,
  useToast,
} from "@app/shared/ui";
import { downloadFile } from "../../app/download.js";
import { ICONS } from "@app/shared/icons";
import { useToday } from "../../app/useToday.js";
import { VoidDialog } from "../billing/components/MoneyDialogs.jsx";
import { useExpenses, useVoidExpense } from "./api.js";
import { ExpenseDialog } from "./components/ExpenseDialog.jsx";

/** Money spent, one month at a time, with totals per category (UI-GUIDE §11 Expenses). */
export function ExpensesPage() {
  const today = useToday();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [from, to] = monthRange(`${month}-01`);
  const { data, isLoading, error } = useExpenses({ from, to });
  const voidExpense = useVoidExpense();
  const toast = useToast();
  const [dialog, setDialog] = useState(null); // "add" | { void: expense }
  const exportCsv = () =>
    downloadFile(`/admin/export/expenses.csv?from=${from}&to=${to}`, `expenses-${month}.csv`).catch(
      (e) => toast(e.message, { tone: "error" }),
    );
  const add = (
    <Button icon={ICONS.add} onClick={() => setDialog("add")}>
      Add expense
    </Button>
  );

  return (
    <>
      <PageHeader
        icon={ICONS.expenses}
        title="Expenses"
        description="What the library spends: rent, electricity, salaries…"
        actions={
          <>
            <Button variant="secondary" icon={ICONS.export} onClick={exportCsv}>
              Export CSV
            </Button>
            {add}
          </>
        }
      />
      <div className="mb-5 max-w-xs">
        <TextField
          label="Month"
          type="month"
          value={month}
          onChange={(e) => e.target.value && setMonth(e.target.value)}
        />
      </div>
      <Alert tone="error">{error?.message}</Alert>
      {isLoading && <Skeleton rows={4} />}
      {data && (
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={ICONS.expenses}
              tone="red"
              label={`Spent in ${displayMonth(from)}`}
              value={formatRupees(data.totalPaise)}
            />
            {Object.entries(data.byCategory)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)
              .map(([category, paise]) => (
                <StatCard
                  key={category}
                  tone="slate"
                  label={EXPENSE_CATEGORY_LABELS[category]}
                  value={formatRupees(paise)}
                />
              ))}
          </div>
          {data.expenses.length === 0 ? (
            <EmptyState
              icon={ICONS.expenses}
              title={`No expenses in ${displayMonth(from)}`}
              description="Record what you spend so the day ledger shows the real cash in hand."
              action={add}
            />
          ) : (
            <Card className="p-0">
              <ul className="divide-y divide-slate-100 text-sm">
                {data.expenses.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p
                        className={
                          e.status === "void"
                            ? "text-slate-400 line-through"
                            : "font-medium text-slate-900"
                        }
                      >
                        {e.title}
                      </p>
                      <p className="text-slate-500">
                        {displayDate(e.spentOn)} · {PAYMENT_MODE_LABELS[e.mode]}
                        {e.status === "void" && ` · void: ${e.voidReason}`}
                      </p>
                    </div>
                    <Badge tone="slate">{EXPENSE_CATEGORY_LABELS[e.category]}</Badge>
                    <span
                      className={
                        e.status === "void"
                          ? "tabular-nums text-slate-400"
                          : "font-semibold tabular-nums"
                      }
                    >
                      {formatRupees(e.amountPaise)}
                    </span>
                    {e.status === "valid" && (
                      <IconButton
                        icon={ICONS.void}
                        variant="danger-ghost"
                        label="Void expense"
                        onClick={() => setDialog({ void: e })}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
      {dialog === "add" && <ExpenseDialog today={today} onClose={() => setDialog(null)} />}
      {dialog?.void && (
        <VoidDialog
          title="Void this expense"
          consequence={`${dialog.void.title} (${formatRupees(dialog.void.amountPaise)}) will no longer count. It stays on record as void.`}
          confirmLabel="Void expense"
          busy={voidExpense.isPending}
          onVoid={(v) => voidExpense.mutateAsync({ id: dialog.void.id, ...v })}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
