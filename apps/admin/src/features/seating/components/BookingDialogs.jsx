import {
  changeSlotSchema,
  createSubscriptionSchema,
  moveSubscriptionSchema,
} from "@app/shared/validation";
import { useDialogForm } from "../../../app/forms.js";
import { FormDialog } from "../../../app/FormDialog.jsx";
import { useBookingAction } from "../api.js";
import { placeName } from "../places.js";
import { BookingFields } from "./BookingFields.jsx";

// Dialogs that change where a student sits. Each is rendered only while open.

/** Another booking for an existing member (e.g. they add an evening slot). */
export function AddBookingDialog({ memberId, onClose, defaults = {} }) {
  const add = useBookingAction("addBooking");
  const { form, errors, formError, onSubmit } = useDialogForm(createSubscriptionSchema, {
    open: true,
    onClose,
    defaultValues: { slotId: "", planId: "", ...defaults },
    submit: (values) => add.mutateAsync({ memberId, ...values }),
  });
  return (
    <FormDialog
      open
      onClose={onClose}
      title="Add a seat booking"
      submitLabel="Book seat"
      busy={add.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <BookingFields form={form} errors={errors} />
    </FormDialog>
  );
}

/** Same slot, another seat or sit-anywhere hall. */
export function MoveDialog({ subscription, onClose }) {
  const move = useBookingAction("move");
  const { form, errors, formError, onSubmit } = useDialogForm(moveSubscriptionSchema, {
    open: true,
    onClose,
    defaultValues: {},
    submit: (values) => move.mutateAsync({ id: subscription.id, ...values }),
  });
  return (
    <FormDialog
      open
      onClose={onClose}
      title={`Move from ${placeName(subscription)}`}
      submitLabel="Move"
      busy={move.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <p className="text-sm text-slate-600">
        {subscription.slot.name} stays the same. A seat with a different price starts a new booking,
        billed at the new price from the next period.
      </p>
      <BookingFields form={form} errors={errors} fixedSlotId={subscription.slot.id} />
    </FormDialog>
  );
}

/** New slot (and plan, and place). The new price applies from the next billing period. */
export function ChangeSlotDialog({ subscription, onClose }) {
  const change = useBookingAction("changeSlot");
  const { form, errors, formError, onSubmit } = useDialogForm(changeSlotSchema, {
    open: true,
    onClose,
    defaultValues: { slotId: "", planId: "" },
    submit: (values) => change.mutateAsync({ id: subscription.id, ...values }),
  });
  return (
    <FormDialog
      open
      onClose={onClose}
      title={`Change slot (now ${subscription.slot.name})`}
      submitLabel="Change slot"
      busy={change.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <p className="text-sm text-slate-600">
        The student moves today; the new fee starts from their next billing period.
      </p>
      <BookingFields form={form} errors={errors} keepSeatId={subscription.seat?.id} />
    </FormDialog>
  );
}
