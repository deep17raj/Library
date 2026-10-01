import { useNavigate } from "react-router-dom";
import { planAllocation } from "@app/shared/billing";
import { formatRupees, paiseToInput, toPaise } from "@app/shared/money";
import { collectPaymentFormSchema } from "@app/shared/validation";
import { MoneyField, TextField } from "@app/shared/ui";
import { useDialogForm } from "../../../app/forms.js";
import { FormDialog } from "../../../app/FormDialog.jsx";
import { ICONS } from "../../../app/icons.js";
import { useCollectPayment } from "../api.js";
import { PaymentModeField } from "./PaymentModeField.jsx";

/**
 * Take money from a member. The amount starts at what they owe now; the dialog shows
 * which dues it will clear before saving (UI-GUIDE §11 Collect payment).
 * Rendered only while open.
 */
export function CollectPaymentDialog({ member, account, onClose }) {
  const collect = useCollectPayment();
  const navigate = useNavigate();
  const owed = account.summary.outstandingPaise || account.summary.nextDueAmountPaise;
  const { form, errors, formError, onSubmit } = useDialogForm(collectPaymentFormSchema, {
    open: true,
    onClose,
    defaultValues: {
      memberId: member.id,
      amount: owed ? paiseToInput(owed) : "",
      mode: "cash",
      reference: "",
      note: "",
    },
    submit: (values) => collect.mutateAsync(values),
    success: ({ receipt }) => ({
      message: `${formatRupees(receipt.payment.amountPaise)} received — receipt ${receipt.payment.receiptLabel}`,
      action: {
        label: "Print",
        onClick: () => navigate(`/payments/${receipt.payment.id}/receipt`),
      },
    }),
  });
  const amountPaise = toPaise(form.watch("amount")) ?? 0;
  const mode = form.watch("mode");

  return (
    <FormDialog
      open
      onClose={onClose}
      icon={ICONS.payment}
      title={`Collect payment · ${member.name}`}
      submitLabel={amountPaise > 0 ? `Collect ${formatRupees(amountPaise)}` : "Collect"}
      busy={collect.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <MoneyField
        label="Amount"
        hint={
          owed ? `Owes ${formatRupees(owed)} now` : "Nothing due now — this will be kept as credit"
        }
        error={errors.amount?.message || errors.amountPaise?.message}
        {...form.register("amount")}
      />
      <PaymentModeField form={form} error={errors.mode?.message} />
      {mode !== "cash" && (
        <TextField
          label="Reference (optional)"
          placeholder="UPI ref, cheque no., last 4 digits…"
          error={errors.reference?.message}
          {...form.register("reference")}
        />
      )}
      <WhatItClears invoices={account.invoices} amountPaise={amountPaise} />
    </FormDialog>
  );
}

/** Preview of how the money will be used — the same rule the server applies. */
function WhatItClears({ invoices, amountPaise }) {
  if (amountPaise <= 0) return null;
  const open = invoices.filter((invoice) => invoice.balancePaise > 0);
  const { allocations, leftoverPaise } = planAllocation(open, amountPaise);
  const byId = new Map(open.map((invoice) => [invoice.id, invoice]));
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-sm ring-1 ring-slate-200">
      <p className="mb-1.5 font-medium text-slate-700">This payment covers</p>
      <ul className="flex flex-col gap-1 text-slate-600">
        {allocations.map(({ invoiceId, amountPaise: part }) => {
          const invoice = byId.get(invoiceId);
          const full = part === invoice.balancePaise;
          return (
            <li key={invoiceId} className="flex justify-between gap-3">
              <span className="truncate">{invoice.description}</span>
              <span className="tabular-nums">
                {full ? formatRupees(part) : `${formatRupees(part)} (part)`}
              </span>
            </li>
          );
        })}
        {leftoverPaise > 0 && (
          <li className="flex justify-between gap-3 text-brand-dark">
            <span>Kept as credit for next fees</span>
            <span className="tabular-nums">{formatRupees(leftoverPaise)}</span>
          </li>
        )}
      </ul>
    </div>
  );
}
