import { SEATING_MODES } from "@app/shared/constants";
import { hallUpdateSchema, hallSchema } from "@app/shared/validation";
import { SelectField, TextField } from "@app/shared/ui";
import { useDialogForm } from "../../../app/forms.js";
import { FormDialog } from "../../../app/FormDialog.jsx";
import { useLayoutAction } from "../api.js";
import { categoryOptions } from "./categoryOptions.js";

const MODE_OPTIONS = [
  { value: SEATING_MODES.FIXED, label: "Fixed seats — every student gets their own seat number" },
  { value: SEATING_MODES.FLOATING, label: "Sit anywhere — any free seat, limited by seat count" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled — hidden from seat pickers" },
];

/** Add (hall = null) or edit a hall. `onSaved(layout)` lets the page select the new hall. */
export function HallDialog({ open, hall, categories, onClose, onSaved }) {
  const create = useLayoutAction("createHall");
  const update = useLayoutAction("updateHall");
  const { form, errors, formError, onSubmit } = useDialogForm(
    hall ? hallUpdateSchema : hallSchema,
    {
      open,
      onClose,
      defaultValues: hall
        ? {
            name: hall.name,
            seatingMode: hall.seatingMode,
            categoryId: hall.categoryId ?? "",
            status: hall.status,
          }
        : { name: "", seatingMode: SEATING_MODES.FIXED, categoryId: "" },
      submit: async (values) => {
        const { layout } = hall
          ? await update.mutateAsync({ id: hall.id, ...values })
          : await create.mutateAsync(values);
        onSaved?.(layout);
      },
    },
  );

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={hall ? `Edit ${hall.name}` : "Add hall"}
      submitLabel={hall ? "Save" : "Add hall"}
      busy={create.isPending || update.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <TextField
        label="Hall name"
        placeholder="Ground floor, Hall A…"
        error={errors.name?.message}
        {...form.register("name")}
      />
      <SelectField label="Seating" options={MODE_OPTIONS} {...form.register("seatingMode")} />
      <SelectField
        label="Seat category"
        hint="Fixed halls: default for new seats. Sit-anywhere halls: applies to every place."
        options={categoryOptions(categories, hall?.categoryId)}
        error={errors.categoryId?.message}
        {...form.register("categoryId")}
      />
      {hall && <SelectField label="Status" options={STATUS_OPTIONS} {...form.register("status")} />}
    </FormDialog>
  );
}
