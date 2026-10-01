import { ALL_SEAT_FEATURES, SEAT_FEATURE_LABELS } from "@app/shared/constants";
import { waitlistEntrySchema } from "@app/shared/validation";
import { Checkbox, SelectField, TextField } from "@app/shared/ui";
import { useDialogForm } from "../../../app/forms.js";
import { FormDialog } from "../../../app/FormDialog.jsx";
import { useAddToWaitlist } from "../api.js";

export function AddWaitlistDialog({ open, slots, onClose }) {
  const add = useAddToWaitlist();
  const active = slots.filter((slot) => slot.status === "active");
  const { form, errors, formError, onSubmit } = useDialogForm(waitlistEntrySchema, {
    open,
    onClose,
    defaultValues: {
      slotId: active[0]?.id ?? "",
      name: "",
      phone: "",
      preferredFeatures: [],
      note: "",
    },
    submit: (values) => add.mutateAsync(values),
  });

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Add to waitlist"
      submitLabel="Add"
      busy={add.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <SelectField
        label="Slot they want"
        options={active.map((s) => ({ value: s.id, label: s.name }))}
        error={errors.slotId?.message}
        {...form.register("slotId")}
      />
      <TextField label="Name" error={errors.name?.message} {...form.register("name")} />
      <TextField
        label="Mobile number"
        inputMode="tel"
        error={errors.phone?.message}
        {...form.register("phone")}
      />
      <fieldset className="flex flex-wrap gap-x-5 gap-y-2">
        <legend className="mb-1 text-sm font-medium text-slate-700">Would like (optional)</legend>
        {ALL_SEAT_FEATURES.map((feature) => (
          <Checkbox
            key={feature}
            value={feature}
            label={SEAT_FEATURE_LABELS[feature]}
            {...form.register("preferredFeatures")}
          />
        ))}
      </fieldset>
      <TextField label="Note (optional)" error={errors.note?.message} {...form.register("note")} />
    </FormDialog>
  );
}
