import { useEffect, useState } from "react";
import { bpsToPercentInput, libraryEditFormSchema } from "@app/shared/validation";
import { Alert, Button, Dialog, TextField } from "@app/shared/ui";
import { applyServerErrors, useSchemaForm } from "../../../app/forms.js";
import { useUpdateLibrary } from "../api.js";

function valuesFrom(library) {
  return { name: library.name, sharePercent: bpsToPercentInput(library.mocktestShareBps) };
}

export function EditLibraryDialog({ library, open, onClose }) {
  const updateLibrary = useUpdateLibrary(library.id);
  const form = useSchemaForm(libraryEditFormSchema, valuesFrom(library));
  const [formError, setFormError] = useState("");
  const { errors } = form.formState;

  // Start from the saved values each time the dialog opens.
  useEffect(() => {
    if (open) form.reset(valuesFrom(library));
  }, [open, library, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError("");
    try {
      await updateLibrary.mutateAsync(values);
      onClose();
    } catch (error) {
      setFormError(applyServerErrors(form, error));
    }
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit library"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="edit-library" busy={updateLibrary.isPending}>
            Save
          </Button>
        </>
      }
    >
      <form id="edit-library" onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
        <Alert tone="error">{formError}</Alert>
        <TextField label="Library name" error={errors.name?.message} {...form.register("name")} />
        <TextField
          label="Mock-test revenue share (%)"
          inputMode="decimal"
          hint="Leave empty to use the platform default."
          error={errors.sharePercent?.message}
          {...form.register("sharePercent")}
        />
      </form>
    </Dialog>
  );
}
