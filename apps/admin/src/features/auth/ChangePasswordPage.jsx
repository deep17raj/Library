import { useState } from "react";
import { changePasswordSchema } from "@app/shared/validation";
import { Alert, Button, Card, PageHeader, TextField } from "@app/shared/ui";
import { applyServerErrors, useSchemaForm } from "../../app/forms.js";
import { useChangePassword } from "./api.js";
import { ICONS } from "../../app/icons.js";

export function ChangePasswordPage() {
  const changePassword = useChangePassword();
  const form = useSchemaForm(changePasswordSchema, { currentPassword: "", newPassword: "" });
  const [message, setMessage] = useState({ tone: "info", text: "" });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setMessage({ tone: "info", text: "" });
    try {
      await changePassword.mutateAsync(values);
      form.reset();
      setMessage({
        tone: "success",
        text: "Password changed. You were signed out on your other devices.",
      });
    } catch (error) {
      setMessage({ tone: "error", text: applyServerErrors(form, error) });
    }
  });

  return (
    <div className="max-w-md">
      <PageHeader icon={ICONS.password} title="Change password" />
      <Card>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Alert tone={message.tone}>{message.text}</Alert>
          <TextField
            label="Current password"
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...form.register("currentPassword")}
          />
          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            hint="At least 8 characters"
            error={errors.newPassword?.message}
            {...form.register("newPassword")}
          />
          <Button type="submit" busy={changePassword.isPending}>
            Change password
          </Button>
        </form>
      </Card>
    </div>
  );
}
