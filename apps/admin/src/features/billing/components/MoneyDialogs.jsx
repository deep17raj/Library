import { formatRupees, paiseToInput } from "@app/shared/money";
import {
  chargeFormSchema,
  depositRefundFormSchema,
  discountFormSchema,
  voidSchema,
} from "@app/shared/validation";
import { MoneyField, TextField } from "@app/shared/ui";
import { useDialogForm } from "../../../app/forms.js";
import { FormDialog } from "../../../app/FormDialog.jsx";
import { ICONS } from "../../../app/icons.js";
import { useAddCharge, useDiscount, useRefundDeposit } from "../api.js";
import { PaymentModeField } from "./PaymentModeField.jsx";

// Small money dialogs used on the member page. Each is rendered only while open.

/** Any other charge: late fee, lost key, printing… */
export function ChargeDialog({ member, onClose }) {
  const charge = useAddCharge();
  const { form, errors, formError, onSubmit } = useDialogForm(chargeFormSchema, {
    open: true,
    onClose,
    defaultValues: { memberId: member.id, description: "", amount: "" },
    submit: (values) => charge.mutateAsync(values),
    success: "Charge added",
  });
  return (
    <FormDialog
      open
      onClose={onClose}
      icon={ICONS.charge}
      title={`Add a charge · ${member.name}`}
      submitLabel="Add charge"
      busy={charge.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <TextField
        label="What for"
        placeholder="Late fee, lost key, printing…"
        error={errors.description?.message}
        {...form.register("description")}
      />
      <MoneyField label="Amount" error={errors.amount?.message} {...form.register("amount")} />
    </FormDialog>
  );
}

/** Waive part or all of a charge, with the reason kept on record. */
export function DiscountDialog({ invoice, onClose }) {
  const discount = useDiscount();
  const { form, errors, formError, onSubmit } = useDialogForm(discountFormSchema, {
    open: true,
    onClose,
    defaultValues: {
      discount: invoice.discountPaise ? paiseToInput(invoice.discountPaise) : "",
      reason: invoice.discountReason || "",
    },
    submit: (values) => discount.mutateAsync({ id: invoice.id, ...values }),
    success: "Discount saved",
  });
  return (
    <FormDialog
      open
      onClose={onClose}
      icon={ICONS.discount}
      title="Give a discount"
      submitLabel="Save discount"
      busy={discount.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <p className="text-sm text-slate-600">
        {invoice.description} · {formatRupees(invoice.amountPaise)}
      </p>
      <MoneyField
        label="Discount"
        hint={`Up to ${formatRupees(invoice.amountPaise - invoice.paidPaise)} (the unpaid part). Empty removes it.`}
        error={errors.discount?.message || errors.discountPaise?.message}
        {...form.register("discount")}
      />
      <TextField
        label="Reason"
        placeholder="Sibling discount, seat issue…"
        error={errors.reason?.message}
        {...form.register("reason")}
      />
    </FormDialog>
  );
}

/** Give back (part of) a paid deposit. */
export function RefundDialog({ invoice, refundedPaise, onClose }) {
  const refund = useRefundDeposit();
  const refundable = invoice.paidPaise - refundedPaise;
  const { form, errors, formError, onSubmit } = useDialogForm(depositRefundFormSchema, {
    open: true,
    onClose,
    defaultValues: { amount: paiseToInput(refundable), mode: "cash", note: "" },
    submit: (values) => refund.mutateAsync({ id: invoice.id, ...values }),
    success: "Deposit refund recorded",
  });
  return (
    <FormDialog
      open
      onClose={onClose}
      icon={ICONS.refund}
      title="Refund deposit"
      submitLabel="Record refund"
      busy={refund.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <MoneyField
        label="Amount to give back"
        hint={`Up to ${formatRupees(refundable)}`}
        error={errors.amount?.message || errors.amountPaise?.message}
        {...form.register("amount")}
      />
      <PaymentModeField form={form} label="Given back as" error={errors.mode?.message} />
      <TextField label="Note (optional)" error={errors.note?.message} {...form.register("note")} />
    </FormDialog>
  );
}

/**
 * Void with a reason (payments, charges, expenses). The record stays, marked void.
 * @param {{ title: string, consequence: string, confirmLabel: string,
 *   onVoid: (values: { reason: string }) => Promise<unknown>, busy: boolean, onClose: () => void }} props
 */
export function VoidDialog({ title, consequence, confirmLabel, onVoid, busy, onClose }) {
  const { form, errors, formError, onSubmit } = useDialogForm(voidSchema, {
    open: true,
    onClose,
    defaultValues: { reason: "" },
    submit: onVoid,
    success: "Voided — kept on record",
  });
  return (
    <FormDialog
      open
      danger
      onClose={onClose}
      icon={ICONS.void}
      title={title}
      submitLabel={confirmLabel}
      busy={busy}
      formError={formError}
      onSubmit={onSubmit}
    >
      <p className="text-sm text-slate-600">{consequence}</p>
      <TextField
        label="Reason"
        placeholder="Wrong amount, cheque bounced…"
        error={errors.reason?.message}
        {...form.register("reason")}
      />
    </FormDialog>
  );
}
