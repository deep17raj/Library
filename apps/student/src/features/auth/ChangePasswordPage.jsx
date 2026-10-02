import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { applyServerErrors, useSchemaForm } from "@app/shared/forms";
import { ICONS } from "@app/shared/icons";
import { changePasswordSchema } from "@app/shared/validation";
import { Alert, Button, PasswordField, useToast } from "@app/shared/ui";
import { useApplyBranding } from "../../app/branding.js";
import { useMe } from "../../app/session.js";
import { Splash } from "../../app/Shell.jsx";
import { useChangePassword, useLogout } from "./api.js";

/**
 * Choose a password. On first sign-in this is required: the "current password" is the
 * 6-digit code the desk gave them [D10]. Later it is reached from Me.
 */
export function ChangePasswordPage() {
  const { data: me, isLoading } = useMe();
  useApplyBranding(me?.library);
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const change = useChangePassword();
  const logout = useLogout();
  const form = useSchemaForm(changePasswordSchema, { currentPassword: "", newPassword: "" });
  const [formError, setFormError] = useState("");
  const { errors } = form.formState;

  if (isLoading) return <Splash />;
  if (!me) return <Navigate to="/login" replace />;
  const firstTime = me.student.mustChangePassword;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError("");
    try {
      await change.mutateAsync(values);
      toast(firstTime ? "You're all set — welcome!" : "Password changed", { tone: "success" });
      navigate(firstTime ? location.state?.from || "/" : "/me", { replace: true });
    } catch (error) {
      setFormError(applyServerErrors(form, error));
    }
  });

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      {!firstTime && (
        <Link to="/me" className="mb-6 text-sm font-medium text-brand-dark">
          ← Back
        </Link>
      )}
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-light text-brand-dark">
        <ICONS.password className="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">
        {firstTime
          ? `Hi ${me.student.name.split(" ")[0]}, choose your password`
          : "Change password"}
      </h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        {firstTime
          ? "Enter the 6-digit code from the desk, then a new password only you know."
          : "Signs you out on your other phones."}
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Alert tone="error">{formError}</Alert>
        <PasswordField
          label={firstTime ? "Code from the desk" : "Current password"}
          autoComplete="current-password"
          inputMode={firstTime ? "numeric" : undefined}
          error={errors.currentPassword?.message}
          {...form.register("currentPassword")}
        />
        <PasswordField
          label="New password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={errors.newPassword?.message}
          {...form.register("newPassword")}
        />
        <Button type="submit" busy={change.isPending} className="mt-2 h-12 w-full text-base">
          {firstTime ? "Save and continue" : "Change password"}
        </Button>
      </form>
      {firstTime && (
        <Button variant="ghost" className="mt-4" onClick={() => logout.mutate()}>
          Not you? Sign out
        </Button>
      )}
    </div>
  );
}
