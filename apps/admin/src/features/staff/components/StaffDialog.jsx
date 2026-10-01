import { DEFAULT_STAFF_PERMISSIONS } from "@app/shared/constants";
import { createStaffSchema, updateStaffSchema } from "@app/shared/validation";
import { SelectField, TextField } from "@app/shared/ui";
import { useDialogForm } from "../../../app/forms.js";
import { FormDialog } from "../../../app/FormDialog.jsx";
import { useCreateStaff, useUpdateStaff } from "../api.js";
import { useSession } from "../../../app/session.js";
import { keepLockedPermissions, PermissionChecklist } from "./PermissionChecklist.jsx";

const STATUS_OPTIONS = [
  { value: "active", label: "Active — can sign in" },
  { value: "disabled", label: "Disabled — signed out, can't sign in" },
];

/** Add a staff login (member = null) or edit one. */
export function StaffDialog({ open, member, onClose }) {
  const creating = !member;
  const create = useCreateStaff();
  const update = useUpdateStaff(member?.id);
  const { data: me } = useSession();
  const save = (values) => {
    const permissions = keepLockedPermissions(values.permissions, member?.permissions || [], me);
    const payload = { ...values, permissions };
    return creating ? create.mutateAsync(payload) : update.mutateAsync(payload);
  };
  const { form, errors, formError, onSubmit } = useDialogForm(
    creating ? createStaffSchema : updateStaffSchema,
    {
      open,
      onClose,
      defaultValues: creating
        ? { name: "", email: "", password: "", permissions: [...DEFAULT_STAFF_PERMISSIONS] }
        : { name: member.name, permissions: member.permissions, status: member.status },
      submit: save,
    },
  );

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={creating ? "Add staff" : `Edit ${member.name}`}
      submitLabel={creating ? "Add staff" : "Save"}
      busy={create.isPending || update.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <TextField label="Name" error={errors.name?.message} {...form.register("name")} />
      {creating && (
        <>
          <TextField
            label="Email"
            type="email"
            error={errors.email?.message}
            {...form.register("email")}
          />
          <TextField
            label="Temporary password"
            autoComplete="off"
            hint="Share it with them; they can change it after signing in."
            error={errors.password?.message}
            {...form.register("password")}
          />
        </>
      )}
      {!creating && (
        <SelectField label="Status" options={STATUS_OPTIONS} {...form.register("status")} />
      )}
      <PermissionChecklist register={form.register} error={errors.permissions?.message} />
    </FormDialog>
  );
}
