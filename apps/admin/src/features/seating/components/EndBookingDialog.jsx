import { endSubscriptionSchema } from "@app/shared/validation";
import { SelectField } from "@app/shared/ui";
import { useDialogForm } from "../../../app/forms.js";
import { FormDialog } from "../../../app/FormDialog.jsx";
import { useBookingAction } from "../api.js";
import { placeName } from "../places.js";

const REASONS = [
  { value: "left", label: "The student left" },
  { value: "admin", label: "Released by the library" },
];

/** End a booking today and free the seat. Rendered only while open. */
export function EndBookingDialog({ subscription, onClose }) {
  const end = useBookingAction("end");
  const { form, formError, onSubmit } = useDialogForm(endSubscriptionSchema, {
    open: true,
    onClose,
    defaultValues: { reason: "left" },
    submit: (values) => end.mutateAsync({ id: subscription.id, ...values }),
  });
  return (
    <FormDialog
      open
      danger
      onClose={onClose}
      title={`End ${subscription.slot.name} booking`}
      submitLabel="End booking"
      busy={end.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <p className="text-sm text-slate-600">
        This frees {placeName(subscription)} from today. The history is kept.
      </p>
      <SelectField label="Why" options={REASONS} {...form.register("reason")} />
    </FormDialog>
  );
}
