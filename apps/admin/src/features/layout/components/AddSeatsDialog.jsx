import { addSeatsSchema } from "@app/shared/validation";
import { TextField } from "@app/shared/ui";
import { useDialogForm } from "../../../app/forms.js";
import { FormDialog } from "../../../app/FormDialog.jsx";
import { useLayoutAction } from "../api.js";
import { allSeatLabels, numberingDefaults } from "../layoutHelpers.js";
import { SeatNumberingFields } from "./SeatNumberingFields.jsx";

/** Add seats to the end of one table. Rendered only while open. */
export function AddSeatsDialog({ table, hall, layout, onClose }) {
  const addSeats = useLayoutAction("addSeats");
  const { form, errors, formError, onSubmit } = useDialogForm(addSeatsSchema, {
    open: true,
    onClose,
    defaultValues: { count: 1, ...numberingDefaults(layout, hall.name) },
    submit: (values) => addSeats.mutateAsync({ tableId: table.id, ...values }),
  });

  return (
    <FormDialog
      open
      onClose={onClose}
      title={`Add seats to ${table.label}`}
      submitLabel="Add seats"
      busy={addSeats.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <TextField
        label="How many seats"
        inputMode="numeric"
        error={errors.count?.message}
        {...form.register("count")}
      />
      <SeatNumberingFields
        form={form}
        errors={errors}
        seatCount={form.watch("count")}
        existingLabels={allSeatLabels(layout)}
      />
    </FormDialog>
  );
}
