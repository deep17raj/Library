import { updateMemberSchema } from "@app/shared/validation";
import { SelectField } from "@app/shared/ui";
import { useDialogForm } from "../../../app/forms.js";
import { FormDialog } from "../../../app/FormDialog.jsx";
import { useUpdateMember } from "../api.js";
import { MemberProfileFields } from "./MemberProfileFields.jsx";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive — left the library" },
];

export function EditMemberDialog({ open, member, onClose }) {
  const update = useUpdateMember(member.id);
  const { form, errors, formError, onSubmit } = useDialogForm(updateMemberSchema, {
    open,
    onClose,
    defaultValues: {
      name: member.name,
      phone: member.phone,
      address: member.address,
      examTarget: member.examTarget,
      notes: member.notes,
      status: member.status,
    },
    submit: (values) => update.mutateAsync(values),
  });

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={`Edit ${member.name}`}
      submitLabel="Save"
      busy={update.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <MemberProfileFields form={form} errors={errors} />
      <SelectField
        label="Status"
        options={STATUS_OPTIONS}
        error={errors.status?.message}
        {...form.register("status")}
      />
    </FormDialog>
  );
}
