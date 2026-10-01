import { paiseToInput } from "@app/shared/money";
import { seatCategoryFormSchema } from "@app/shared/validation";
import { SelectField, TextField } from "@app/shared/ui";
import { useDialogForm } from "../../../app/forms.js";
import { FormDialog } from "../../../app/FormDialog.jsx";
import { useLayoutAction } from "../api.js";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived — can't be given to new seats" },
];

/** Add (category = null) or edit a seat category. */
export function CategoryDialog({ open, category, onClose }) {
  const create = useLayoutAction("createCategory");
  const update = useLayoutAction("updateCategory");
  const { form, errors, formError, onSubmit } = useDialogForm(seatCategoryFormSchema, {
    open,
    onClose,
    defaultValues: category
      ? {
          name: category.name,
          monthlySurcharge: paiseToInput(category.monthlySurchargePaise),
          status: category.status,
        }
      : { name: "", monthlySurcharge: "" },
    submit: (values) =>
      category ? update.mutateAsync({ id: category.id, ...values }) : create.mutateAsync(values),
  });

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={category ? `Edit ${category.name}` : "Add seat category"}
      submitLabel={category ? "Save" : "Add category"}
      busy={create.isPending || update.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <TextField
        label="Name"
        placeholder="AC, Premium cabin…"
        error={errors.name?.message}
        {...form.register("name")}
      />
      <TextField
        label="Extra per month (₹)"
        inputMode="decimal"
        hint="Added to the slot's monthly fee. Use 0 for no extra charge."
        error={errors.monthlySurcharge?.message || errors.monthlySurchargePaise?.message}
        {...form.register("monthlySurcharge")}
      />
      {category && (
        <SelectField label="Status" options={STATUS_OPTIONS} {...form.register("status")} />
      )}
    </FormDialog>
  );
}
