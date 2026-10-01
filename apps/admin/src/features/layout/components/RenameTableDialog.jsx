import { tableUpdateSchema } from "@app/shared/validation";
import { TextField } from "@app/shared/ui";
import { useDialogForm } from "../../../app/forms.js";
import { FormDialog } from "../../../app/FormDialog.jsx";
import { useLayoutAction } from "../api.js";

/** Rendered only while open. */
export function RenameTableDialog({ table, onClose }) {
  const update = useLayoutAction("updateTable");
  const { form, errors, formError, onSubmit } = useDialogForm(tableUpdateSchema, {
    open: true,
    onClose,
    defaultValues: { label: table.label },
    submit: (values) => update.mutateAsync({ id: table.id, ...values }),
  });

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Rename table"
      submitLabel="Save"
      busy={update.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <TextField label="Table name" error={errors.label?.message} {...form.register("label")} />
    </FormDialog>
  );
}
