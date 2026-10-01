import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "@app/shared/constants";
import { expenseFormSchema } from "@app/shared/validation";
import { MoneyField, SelectField, TextField } from "@app/shared/ui";
import { useDialogForm } from "../../../app/forms.js";
import { FormDialog } from "../../../app/FormDialog.jsx";
import { ICONS } from "../../../app/icons.js";
import { PaymentModeField } from "../../billing/components/PaymentModeField.jsx";
import { useAddExpense } from "../api.js";

/** Rendered only while open. */
export function ExpenseDialog({ today, onClose }) {
  const add = useAddExpense();
  const { form, errors, formError, onSubmit } = useDialogForm(expenseFormSchema, {
    open: true,
    onClose,
    defaultValues: { category: "electricity", title: "", amount: "", spentOn: today, mode: "cash" },
    submit: (values) => add.mutateAsync(values),
    success: "Expense recorded",
  });
  return (
    <FormDialog
      open
      onClose={onClose}
      icon={ICONS.expenses}
      title="Add expense"
      submitLabel="Save expense"
      busy={add.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Category"
          options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: EXPENSE_CATEGORY_LABELS[c] }))}
          {...form.register("category")}
        />
        <TextField
          label="Date"
          type="date"
          error={errors.spentOn?.message}
          {...form.register("spentOn")}
        />
      </div>
      <TextField
        label="What for"
        placeholder="October electricity bill"
        error={errors.title?.message}
        {...form.register("title")}
      />
      <MoneyField label="Amount" error={errors.amount?.message} {...form.register("amount")} />
      <PaymentModeField form={form} label="Paid with" error={errors.mode?.message} />
    </FormDialog>
  );
}
