import { useNavigate } from "react-router-dom";
import { createLibrarySchema, suggestSlug } from "@app/shared/validation";
import { TextField } from "@app/shared/ui";
import { useDialogForm } from "../../../app/forms.js";
import { FormDialog } from "../../../app/FormDialog.jsx";
import { useCreateLibrary } from "../api.js";

const EMPTY = { name: "", slug: "", ownerName: "", ownerEmail: "", ownerPassword: "" };

/** Library + its first owner login in one step. */
export function CreateLibraryDialog({ open, onClose }) {
  const createLibrary = useCreateLibrary();
  const navigate = useNavigate();
  const { form, errors, formError, onSubmit } = useDialogForm(createLibrarySchema, {
    open,
    onClose,
    defaultValues: EMPTY,
    submit: async (values) => {
      const { library } = await createLibrary.mutateAsync(values);
      navigate(library.id);
    },
  });

  // Suggest the link name from the library name until the person edits it.
  const nameField = form.register("name", {
    onChange: (event) => {
      if (!form.getFieldState("slug").isDirty) {
        form.setValue("slug", suggestSlug(event.target.value));
      }
    },
  });

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title="New library"
      submitLabel="Create library"
      busy={createLibrary.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
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
        autoComplete="off"
        hint="Share it with the owner; they can change it after signing in."
        error={errors.ownerPassword?.message}
        {...form.register("ownerPassword")}
      />
    </FormDialog>
  );
}
