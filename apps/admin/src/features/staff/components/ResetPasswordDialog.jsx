import { resetStaffPasswordSchema } from "@app/shared/validation";
import { TextField } from "@app/shared/ui";
import { useDialogForm } from "../../../app/forms.js";
import { FormDialog } from "../../../app/FormDialog.jsx";
import { useResetStaffPassword } from "../api.js";

/** Rendered only while open, for one staff member. */
export function ResetPasswordDialog({ member, onClose }) {
  const reset = useResetStaffPassword(member.id);
  const { form, errors, formError, onSubmit } = useDialogForm(resetStaffPasswordSchema, {
    open: true,
    onClose,
    defaultValues: { password: "" },
    submit: (values) => reset.mutateAsync(values),
  });

  return (
    <FormDialog
      open
      onClose={onClose}
      title={`New password for ${member.name}`}
      submitLabel="Set password"
      busy={reset.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <p className="text-sm text-slate-600">
        They will be signed out everywhere and must use this password.
      </p>
      <TextField
        label="New password"
        autoComplete="off"
        error={errors.password?.message}
        {...form.register("password")}
      />
    </FormDialog>
  );
}
