import { bpsToPercentInput, libraryEditFormSchema } from "@app/shared/validation";
import { TextField } from "@app/shared/ui";
import { useDialogForm } from "../../../app/forms.js";
import { FormDialog } from "../../../app/FormDialog.jsx";
import { useUpdateLibrary } from "../api.js";

export function EditLibraryDialog({ library, open, onClose }) {
  const updateLibrary = useUpdateLibrary(library.id);
  const { form, errors, formError, onSubmit } = useDialogForm(libraryEditFormSchema, {
    open,
    onClose,
    defaultValues: {
      name: library.name,
      sharePercent: bpsToPercentInput(library.mocktestShareBps),
    },
    submit: (values) => updateLibrary.mutateAsync(values),
  });

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="Edit library"
      submitLabel="Save"
      busy={updateLibrary.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <TextField label="Library name" error={errors.name?.message} {...form.register("name")} />
      <TextField
        label="Mock-test revenue share (%)"
        inputMode="decimal"
        hint="Leave empty to use the platform default."
        error={errors.sharePercent?.message}
        {...form.register("sharePercent")}
      />
    </FormDialog>
  );
}
