import { TextField } from "@app/shared/ui";

/** Name, phone, address, exam and notes — shared by the add form and the edit dialog. */
export function MemberProfileFields({ form, errors }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TextField label="Full name" error={errors.name?.message} {...form.register("name")} />
      <TextField
        label="Mobile number"
        inputMode="tel"
        error={errors.phone?.message}
        {...form.register("phone")}
      />
      <TextField
        className="sm:col-span-2"
        label="Address"
        error={errors.address?.message}
        {...form.register("address")}
      />
      <TextField
        label="Preparing for (optional)"
        placeholder="UPSC, SSC CGL, NEET…"
        error={errors.examTarget?.message}
        {...form.register("examTarget")}
      />
      <TextField
        label="Notes (optional)"
        error={errors.notes?.message}
        {...form.register("notes")}
      />
    </div>
  );
}
