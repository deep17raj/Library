import { useState } from "react";
import { ALL_SEAT_FEATURES, SEAT_FEATURE_LABELS, SEATING_MODES } from "@app/shared/constants";
import { seatUpdateSchema } from "@app/shared/validation";
import { Alert, Button, Checkbox, SelectField, TextField, useConfirm } from "@app/shared/ui";
import { useDialogForm } from "../../../app/forms.js";
import { FormDialog } from "../../../app/FormDialog.jsx";
import { useLayoutAction } from "../api.js";
import { categoryOptions } from "./categoryOptions.js";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "disabled", label: "Disabled — broken or not in use" },
];

/** Edit one seat: number, category, features, status — or delete it. Rendered only while open. */
export function SeatDialog({ seat, hall, categories, onClose }) {
  const update = useLayoutAction("updateSeat");
  const remove = useLayoutAction("deleteSeat");
  const [deleteError, setDeleteError] = useState("");
  const fixedHall = hall.seatingMode === SEATING_MODES.FIXED;
  const { form, errors, formError, onSubmit } = useDialogForm(seatUpdateSchema, {
    open: true,
    onClose,
    defaultValues: {
      label: seat.label,
      categoryId: seat.categoryId ?? "",
      features: seat.features,
      status: seat.status,
    },
    submit: (values) => update.mutateAsync({ id: seat.id, ...values }),
  });

  const confirm = useConfirm();
  const onDelete = async () => {
    const ok = await confirm({
      title: `Delete seat ${seat.label}?`,
      message:
        "The seat disappears from the layout. If it has ever been booked, disable it instead.",
      confirmLabel: "Delete seat",
    });
    if (!ok) return;
    try {
      await remove.mutateAsync({ id: seat.id });
      onClose();
    } catch (error) {
      setDeleteError(error.message);
    }
  };

  return (
    <FormDialog
      open
      onClose={onClose}
      title={`Seat ${seat.label}`}
      submitLabel="Save"
      busy={update.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <TextField label="Seat number" error={errors.label?.message} {...form.register("label")} />
      {fixedHall && (
        <SelectField
          label="Category"
          options={categoryOptions(categories, seat.categoryId)}
          error={errors.categoryId?.message}
          {...form.register("categoryId")}
        />
      )}
      <fieldset className="flex flex-wrap gap-x-5 gap-y-2">
        <legend className="mb-1 text-sm font-medium text-slate-700">Features</legend>
        {ALL_SEAT_FEATURES.map((feature) => (
          <Checkbox
            key={feature}
            value={feature}
            label={SEAT_FEATURE_LABELS[feature]}
            {...form.register("features")}
          />
        ))}
      </fieldset>
      <SelectField label="Status" options={STATUS_OPTIONS} {...form.register("status")} />
      <Alert tone="error">{deleteError}</Alert>
      <div>
        <Button variant="ghost" className="text-red-700" busy={remove.isPending} onClick={onDelete}>
          Delete seat
        </Button>
      </div>
    </FormDialog>
  );
}
