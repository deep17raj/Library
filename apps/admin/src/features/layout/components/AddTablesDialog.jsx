import { bulkTablesSchema } from "@app/shared/validation";
import { TextField } from "@app/shared/ui";
import { useDialogForm } from "../../../app/forms.js";
import { FormDialog } from "../../../app/FormDialog.jsx";
import { useLayoutAction } from "../api.js";
import { allSeatLabels, numberingDefaults } from "../layoutHelpers.js";
import { SeatNumberingFields } from "./SeatNumberingFields.jsx";

/** "Add N tables with M seats" for one hall, with a preview of the seat numbers. */
export function AddTablesDialog({ open, hall, layout, onClose }) {
  const addTables = useLayoutAction("addTables");
  const { form, errors, formError, onSubmit } = useDialogForm(bulkTablesSchema, {
    open,
    onClose,
    defaultValues: { tableCount: 5, seatsPerTable: 6, ...numberingDefaults(layout, hall.name) },
    submit: (values) => addTables.mutateAsync({ hallId: hall.id, ...values }),
  });
  const seatCount = Number(form.watch("tableCount")) * Number(form.watch("seatsPerTable"));

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={`Add tables to ${hall.name}`}
      submitLabel="Add tables"
      busy={addTables.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <div className="grid grid-cols-2 gap-3">
        <TextField
          label="Number of tables"
          inputMode="numeric"
          error={errors.tableCount?.message}
          {...form.register("tableCount")}
        />
        <TextField
          label="Seats per table"
          inputMode="numeric"
          error={errors.seatsPerTable?.message}
          {...form.register("seatsPerTable")}
        />
      </div>
      <SeatNumberingFields
        form={form}
        errors={errors}
        seatCount={seatCount}
        existingLabels={allSeatLabels(layout)}
      />
    </FormDialog>
  );
}
