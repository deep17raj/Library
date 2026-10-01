import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createLibrarySchema, suggestSlug } from "@app/shared/validation";
import { Alert, Button, Dialog, TextField } from "@app/shared/ui";
import { applyServerErrors, useSchemaForm } from "../../../app/forms.js";
import { useCreateLibrary } from "../api.js";

const EMPTY = { name: "", slug: "", ownerName: "", ownerEmail: "", ownerPassword: "" };

/** Library + its first owner login in one step. */
export function CreateLibraryDialog({ open, onClose }) {
  const createLibrary = useCreateLibrary();
  const navigate = useNavigate();
  const form = useSchemaForm(createLibrarySchema, EMPTY);
  const [formError, setFormError] = useState("");
  const { errors } = form.formState;

  // Suggest the link name from the library name until the person edits it.
  const nameField = form.register("name", {
    onChange: (event) => {
      if (!form.getFieldState("slug").isDirty)
        form.setValue("slug", suggestSlug(event.target.value));
    },
  });

  const close = () => {
    form.reset(EMPTY);
    setFormError("");
    onClose();
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError("");
    try {
      const { library } = await createLibrary.mutateAsync(values);
      close();
      navigate(library.id);
    } catch (error) {
      setFormError(applyServerErrors(form, error));
    }
  });

  return (
    <Dialog
      open={open}
      onClose={close}
      title="New library"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="create-library" busy={createLibrary.isPending}>
            Create library
          </Button>
        </>
      }
    >
      <form id="create-library" onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
        <Alert tone="error">{formError}</Alert>
        <TextField label="Library name" error={errors.name?.message} {...nameField} />
        <TextField
          label="Short link name"
          hint="Students open the app at /s/<this name>. Can't be changed later."
          error={errors.slug?.message}
          {...form.register("slug")}
        />
        <p className="pt-2 text-sm font-medium text-slate-800">Owner login</p>
        <TextField
          label="Owner's name"
          error={errors.ownerName?.message}
          {...form.register("ownerName")}
        />
        <TextField
          label="Owner's email"
          type="email"
          error={errors.ownerEmail?.message}
          {...form.register("ownerEmail")}
        />
        <TextField
          label="Temporary password"
          type="text"
          autoComplete="off"
          hint="Share it with the owner; they can change it after signing in."
          error={errors.ownerPassword?.message}
          {...form.register("ownerPassword")}
        />
      </form>
    </Dialog>
  );
}
