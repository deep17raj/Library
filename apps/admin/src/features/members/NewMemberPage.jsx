import { useState } from "react";
import { useFieldArray } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { localDateOf } from "@app/shared/time";
import { createMemberSchema } from "@app/shared/validation";
import { Alert, Button, Card, PageHeader, TextField } from "@app/shared/ui";
import { applyServerErrors, useSchemaForm } from "../../app/forms.js";
import { useLibrarySettings } from "../settings/api.js";
import { BookingFields } from "../seating/components/BookingFields.jsx";
import { useCreateMember, useUploadIdProof, useUploadPhoto } from "./api.js";
import { MemberProfileFields } from "./components/MemberProfileFields.jsx";
import { FilePick } from "./components/FilePick.jsx";

const EMPTY_BOOKING = { slotId: "", planId: "" };

/**
 * Add a member with their seat bookings in one save. Can be opened pre-filled from the
 * seat map (a seat + slot) or the waitlist (name, phone, slot, entry to convert).
 */
export function NewMemberPage() {
  const prefill = useLocation().state ?? {};
  const navigate = useNavigate();
  const { data: settings } = useLibrarySettings();
  const create = useCreateMember();
  const uploadPhoto = useUploadPhoto();
  const uploadIdProof = useUploadIdProof();
  const [files, setFiles] = useState({ photo: null, idProof: null });
  const [formError, setFormError] = useState("");

  const form = useSchemaForm(createMemberSchema, {
    name: prefill.name ?? "",
    phone: prefill.phone ?? "",
    address: "",
    examTarget: "",
    notes: "",
    joinedOn: localDateOf(new Date(), settings?.timezone),
    bookings: prefill.slotId
      ? [
          {
            ...EMPTY_BOOKING,
            slotId: prefill.slotId,
            seatId: prefill.seatId,
            hallId: prefill.hallId,
          },
        ]
      : [],
    waitlistEntryId: prefill.waitlistEntryId,
  });
  const bookings = useFieldArray({ control: form.control, name: "bookings" });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError("");
    try {
      const { member } = await create.mutateAsync(values);
      // Files need the member to exist; a failed upload can be retried on the member page.
      if (files.photo)
        await uploadPhoto.mutateAsync({ id: member.id, file: files.photo }).catch(() => {});
      if (files.idProof)
        await uploadIdProof.mutateAsync({ id: member.id, file: files.idProof }).catch(() => {});
      navigate(`/members/${member.id}`, { replace: true });
    } catch (error) {
      setFormError(applyServerErrors(form, error));
    }
  });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Add member"
        description={prefill.name ? `From the waitlist: ${prefill.name}` : undefined}
      />
      <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
        <Alert tone="error">{formError}</Alert>
        <Card className="flex flex-col gap-4">
          <h2 className="font-semibold">Student</h2>
          <MemberProfileFields form={form} errors={errors} />
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField
              label="Joining date"
              type="date"
              error={errors.joinedOn?.message}
              {...form.register("joinedOn")}
            />
            <FilePick label="Photo" onPick={(photo) => setFiles({ ...files, photo })} />
            <FilePick
              label="ID proof (optional)"
              onPick={(idProof) => setFiles({ ...files, idProof })}
            />
          </div>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="font-semibold">Seat bookings</h2>
          {bookings.fields.map((booking, index) => (
            <div key={booking.id} className="rounded-lg p-3 ring-1 ring-slate-200">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Booking {index + 1}</span>
                <Button
                  variant="ghost"
                  className="px-2 py-1 text-xs"
                  onClick={() => bookings.remove(index)}
                >
                  Remove
                </Button>
              </div>
              <BookingFields
                form={form}
                prefix={`bookings.${index}.`}
                errors={errors.bookings?.[index]}
              />
            </div>
          ))}
          <div>
            <Button
              variant="secondary"
              onClick={() => bookings.append(EMPTY_BOOKING)}
              disabled={bookings.fields.length >= 4}
            >
              + Add a slot and seat
            </Button>
            <p className="mt-1 text-xs text-slate-500">
              A student can have several slots (e.g. Morning and Night) as long as they don&apos;t
              overlap.
            </p>
          </div>
        </Card>

        <div className="flex gap-2">
          <Button
            type="submit"
            busy={create.isPending || uploadPhoto.isPending || uploadIdProof.isPending}
          >
            Save member
          </Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
