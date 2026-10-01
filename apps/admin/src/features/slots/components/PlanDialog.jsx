import { paiseToInput } from "@app/shared/money";
import { planFormSchema } from "@app/shared/validation";
import { SelectField, TextField } from "@app/shared/ui";
import { useDialogForm } from "../../../app/forms.js";
import { FormDialog } from "../../../app/FormDialog.jsx";
import { useSlotAction } from "../api.js";
import { planLength } from "../slotDisplay.js";

const UNIT_OPTIONS = [
  { value: "month", label: "Months" },
  { value: "day", label: "Days" },
];
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived — no new bookings" },
];

/**
 * Add a package plan (plan = null) or edit one. Length can't change after creation:
 * students who bought it keep its terms. Rendered only while open.
 */
export function PlanDialog({ slot, plan, onClose }) {
  const create = useSlotAction("createPlan");
  const update = useSlotAction("updatePlan");
  const { form, errors, formError, onSubmit } = useDialogForm(planFormSchema, {
    open: true,
    onClose,
    defaultValues: plan
      ? { ...plan, price: paiseToInput(plan.pricePaise) }
      : { name: "", periodUnit: "month", periodCount: 3, price: "" },
    submit: ({ name, pricePaise, status, ...newPlanOnly }) =>
      plan
        ? update.mutateAsync({ id: plan.id, name, pricePaise, status })
        : create.mutateAsync({ slotId: slot.id, name, pricePaise, ...newPlanOnly }),
  });

  return (
    <FormDialog
      open
      onClose={onClose}
      title={plan ? `Edit ${plan.name}` : `New plan for ${slot.name}`}
      submitLabel={plan ? "Save" : "Add plan"}
      busy={create.isPending || update.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <TextField
        label="Name"
        placeholder="Quarterly, 15 days…"
        error={errors.name?.message}
        {...form.register("name")}
      />
      {plan ? (
        <p className="text-sm text-slate-600">Length: {planLength(plan)} (fixed once created)</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Length"
            inputMode="numeric"
            error={errors.periodCount?.message}
            {...form.register("periodCount")}
          />
          <SelectField label="Unit" options={UNIT_OPTIONS} {...form.register("periodUnit")} />
        </div>
      )}
      <TextField
        label="Price for the whole period (₹)"
        inputMode="decimal"
        hint="Seat category surcharges are added on top."
        error={errors.price?.message || errors.pricePaise?.message}
        {...form.register("price")}
      />
      {plan && !plan.isDefault && (
        <SelectField label="Status" options={STATUS_OPTIONS} {...form.register("status")} />
      )}
    </FormDialog>
  );
}
