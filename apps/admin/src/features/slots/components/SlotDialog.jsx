import { minutesToClock } from "@app/shared/slots";
import { slotFormSchema } from "@app/shared/validation";
import { SelectField, TextField } from "@app/shared/ui";
import { useDialogForm } from "../../../app/forms.js";
import { FormDialog } from "../../../app/FormDialog.jsx";
import { useSlotAction } from "../api.js";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived — current students stay, no new bookings" },
];

/** Add (slot = null) or edit a slot. The fee is asked only when adding (later it's a plan). */
export function SlotDialog({ open, slot, onClose }) {
  const create = useSlotAction("createSlot");
  const update = useSlotAction("updateSlot");
  const { form, errors, formError, onSubmit } = useDialogForm(slotFormSchema, {
    open,
    onClose,
    defaultValues: slot
      ? {
          name: slot.name,
          startTime: minutesToClock(slot.startMin),
          endTime: minutesToClock(slot.endMin),
          color: slot.color || "#0ea5e9",
          status: slot.status,
        }
      : { name: "", startTime: "06:00", endTime: "12:00", monthlyFee: "", color: "#0ea5e9" },
    submit: (values) =>
      slot ? update.mutateAsync({ id: slot.id, ...values }) : create.mutateAsync(values),
  });
  const timeError = errors.endTime?.message || errors.endMin?.message || errors.startTime?.message;

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={slot ? `Edit ${slot.name}` : "Add time slot"}
      submitLabel={slot ? "Save" : "Add slot"}
      busy={create.isPending || update.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <TextField
        label="Name"
        placeholder="Morning, Evening, Full Day…"
        error={errors.name?.message}
        {...form.register("name")}
      />
      <div className="grid grid-cols-2 gap-3">
        <TextField label="Starts" type="time" step={1800} {...form.register("startTime")} />
        <TextField label="Ends" type="time" step={1800} {...form.register("endTime")} />
      </div>
      <p className={timeError ? "text-xs text-red-600" : "text-xs text-slate-500"}>
        {timeError ||
          "On the hour or half hour. An end before the start runs past midnight (e.g. 22:00–06:00)."}
      </p>
      {slot && (
        <p className="text-xs text-slate-500">
          Changing the times moves everyone in this slot; it&apos;s refused if anyone would then
          clash.
        </p>
      )}
      {!slot && (
        <TextField
          label="Monthly fee (₹)"
          inputMode="decimal"
          error={errors.monthlyFee?.message}
          {...form.register("monthlyFee")}
        />
      )}
      <div className="flex items-center gap-3">
        <label htmlFor="slot-color" className="text-sm font-medium text-slate-700">
          Colour
        </label>
        <input
          id="slot-color"
          type="color"
          className="h-8 w-14 rounded border border-slate-300"
          {...form.register("color")}
        />
      </div>
      {slot && <SelectField label="Status" options={STATUS_OPTIONS} {...form.register("status")} />}
    </FormDialog>
  );
}
