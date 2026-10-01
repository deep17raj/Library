import { useState } from "react";
import { addOwnerSchema } from "@app/shared/validation";
import { Alert, Button, Dialog, TextField } from "@app/shared/ui";
import { applyServerErrors, useSchemaForm } from "../../../app/forms.js";
import { useAddOwner } from "../api.js";

const EMPTY = { name: "", email: "", password: "" };

export function AddOwnerDialog({ libraryId, open, onClose }) {
  const addOwner = useAddOwner(libraryId);
  const form = useSchemaForm(addOwnerSchema, EMPTY);
  const [formError, setFormError] = useState("");
  const { errors } = form.formState;

  const close = () => {
    form.reset(EMPTY);
    setFormError("");
    onClose();
  };

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError("");
    try {
      await addOwner.mutateAsync(values);
      close();
    } catch (error) {
      setFormError(applyServerErrors(form, error));
    }
  });

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Add owner login"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="add-owner" busy={addOwner.isPending}>
            Add owner
          </Button>
        </>
      }
    >
      <form id="add-owner" onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
        <Alert tone="error">{formError}</Alert>
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
      </form>
    </Dialog>
  );
}
