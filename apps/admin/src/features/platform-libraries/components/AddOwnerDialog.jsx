import { addOwnerSchema } from "@app/shared/validation";
import { TextField } from "@app/shared/ui";
import { useDialogForm } from "../../../app/forms.js";
import { FormDialog } from "../../../app/FormDialog.jsx";
import { useAddOwner } from "../api.js";

export function AddOwnerDialog({ libraryId, open, onClose }) {
  const addOwner = useAddOwner(libraryId);
  const { form, errors, formError, onSubmit } = useDialogForm(addOwnerSchema, {
    open,
    onClose,
    defaultValues: { name: "", email: "", password: "" },
    submit: (values) => addOwner.mutateAsync(values),
  });

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Add owner login"
      submitLabel="Add owner"
      busy={addOwner.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <TextField label="Name" error={errors.name?.message} {...form.register("name")} />
      <TextField
        label="Email"
        type="email"
        error={errors.email?.message}
        {...form.register("email")}
      />
      <TextField
        label="Temporary password"
        autoComplete="off"
        error={errors.password?.message}
        {...form.register("password")}
      />
    </FormDialog>
  );
}
