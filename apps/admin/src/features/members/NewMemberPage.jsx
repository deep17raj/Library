import { useState } from "react";
import { useFieldArray } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { memberFormSchema } from "@app/shared/validation";
import {
  Alert,
  Button,
  IconButton,
  MoneyField,
  PageHeader,
  SectionCard,
  TextField,
  useToast,
} from "@app/shared/ui";
import { applyServerErrors, useSchemaForm } from "../../app/forms.js";
import { ICONS } from "../../app/icons.js";
import { useToday } from "../../app/useToday.js";
import { BookingFields } from "../seating/components/BookingFields.jsx";
import { useCreateMember, useUploadIdProof, useUploadPhoto } from "./api.js";
import { MemberProfileFields } from "./components/MemberProfileFields.jsx";
import { FilePick } from "./components/FilePick.jsx";

const EMPTY_BOOKING = { slotId: "", planId: "", lockerFee: "" };

/**
 * Add a member with their seat bookings and joining charges in one save (a page, not a
 * dialog: UI-GUIDE §10). Can open pre-filled from the seat map (seat + slot) or the
 * waitlist (name, phone, slot, entry to convert).
 */
export function NewMemberPage() {
  const prefill = useLocation().state ?? {};
  const navigate = useNavigate();
  const toast = useToast();
  const today = useToday();
  const create = useCreateMember();
  const uploadPhoto = useUploadPhoto();
  const uploadIdProof = useUploadIdProof();
  const [files, setFiles] = useState({ photo: null, idProof: null });
  const [formError, setFormError] = useState("");

  const form = useSchemaForm(memberFormSchema, {
    name: prefill.name ?? "",
    phone: prefill.phone ?? "",
    address: "",
    examTarget: "",
    notes: "",
    joinedOn: today,
    admissionFee: "",
    deposit: "",
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
      toast(`${member.name} added as ${member.memberCode}`);
      navigate(`/members/${member.id}`, { replace: true, state: { collect: true } });
    } catch (error) {
      setFormError(applyServerErrors(form, error));
    }
  });

  return (
    <div className="max-w-3xl">
      <PageHeader
        back={
          <Link to="/members" className="text-sm text-brand-dark hover:underline">
            ← Members
          </Link>
        }
        icon={ICONS.addMember}
        title="Add member"
        description={
          prefill.name
            ? `From the waitlist: ${prefill.name}`
            : "Student details, their seat and slot, and any joining charges."
        }
      />
      <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
        <Alert tone="error">{formError}</Alert>
        <SectionCard icon={ICONS.member} title="Student">
          <div className="flex flex-col gap-4">
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
          </div>
        </SectionCard>

        <SectionCard
          icon={ICONS.seatMap}
          title="Seat bookings"
          description="A student can have several slots (e.g. Morning and Night) as long as they don't overlap."
        >
          <div className="flex flex-col gap-4">
            {bookings.fields.map((booking, index) => (
              <div key={booking.id} className="rounded-xl p-4 ring-1 ring-slate-200">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Booking {index + 1}</span>
                  <IconButton
                    icon={ICONS.delete}
                    variant="danger-ghost"
                    label={`Remove booking ${index + 1}`}
                    onClick={() => bookings.remove(index)}
                  />
                </div>
                <BookingFields
                  form={form}
                  prefix={`bookings.${index}.`}
                  errors={errors.bookings?.[index]}
                  showLockerFee
                />
              </div>
            ))}
            <div>
              <Button
                variant="subtle"
                icon={ICONS.add}
                onClick={() => bookings.append(EMPTY_BOOKING)}
                disabled={bookings.fields.length >= 4}
              >
                Add a slot and seat
              </Button>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          icon={ICONS.payment}
          title="Joining charges"
          description="Charged once today. Leave empty if you don't charge them."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <MoneyField
              label="Admission fee"
              error={errors.admissionFee?.message}
              {...form.register("admissionFee")}
            />
            <MoneyField
              label="Security deposit"
              hint="Refundable — shown separately from income."
              error={errors.deposit?.message}
              {...form.register("deposit")}
            />
          </div>
        </SectionCard>

        <div className="flex gap-2">
          <Button
            type="submit"
            icon={ICONS.addMember}
            busy={create.isPending || uploadPhoto.isPending || uploadIdProof.isPending}
          >
            Save member
          </Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Cancel
          </Button>
        </div>
        <p className="text-xs text-slate-500">
          After saving you can collect the first payment straight away.
        </p>
      </form>
    </div>
  );
}
