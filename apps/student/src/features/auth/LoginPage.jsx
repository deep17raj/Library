import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ERROR_CODES } from "@app/shared/constants";
import { applyServerErrors, useSchemaForm } from "@app/shared/forms";
import { ICONS } from "@app/shared/icons";
import { studentLoginSchema } from "@app/shared/validation";
import { Alert, Button, PasswordField, TextField } from "@app/shared/ui";
import { useApplyBranding, useLibraryBranding } from "../../app/branding.js";
import { useMe } from "../../app/session.js";
import { LibraryMark, Splash } from "../../app/Shell.jsx";
import { useLogin } from "./api.js";

/**
 * Sign in with the mobile number the library has and the password (UI-GUIDE §10
 * Student sign-in). The library's own logo and colour, so it feels like their app.
 */
export function LoginPage() {
  const { data: me, isLoading } = useMe();
  const { data: library, error: libraryError } = useLibraryBranding();
  useApplyBranding(library);
  const location = useLocation();
  const navigate = useNavigate();
  const login = useLogin();
  const form = useSchemaForm(studentLoginSchema, { phone: "", password: "" });
  const [formError, setFormError] = useState("");
  const { errors } = form.formState;
  const goTo = location.state?.from || "/";

  if (isLoading) return <Splash />;
  if (me) return <Navigate to={me.student.mustChangePassword ? "/password" : goTo} replace />;
  if (libraryError) return <LibraryUnavailable error={libraryError} />;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError("");
    try {
      const signedIn = await login.mutateAsync(values);
      navigate(signedIn?.student.mustChangePassword ? "/password" : goTo, {
        replace: true,
        state: { from: goTo },
      });
    } catch (error) {
      setFormError(applyServerErrors(form, error));
    }
  });

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <LibraryMark library={library} size="lg" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{library?.name ?? " "}</h1>
        <p className="mt-1 text-sm text-slate-500">Your seat, check-in and fees in one place.</p>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Alert tone="error">{formError}</Alert>
        <TextField
          label="Mobile number"
          type="tel"
          inputMode="numeric"
          autoComplete="username"
          icon={ICONS.phone}
          placeholder="10-digit number"
          error={errors.phone?.message}
          {...form.register("phone")}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...form.register("password")}
        />
        <Button type="submit" busy={login.isPending} className="mt-2 h-12 w-full text-base">
          Sign in
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-slate-500">
        First time, or forgot your password? Ask at the library desk — they’ll give you a 6-digit
        code to sign in with.
        {library?.contactPhone && (
          <a
            href={`tel:${library.contactPhone}`}
            className="mt-2 block font-medium text-brand-dark"
          >
            Call {library.contactPhone}
          </a>
        )}
      </p>
    </div>
  );
}

function LibraryUnavailable({ error }) {
  const title =
    error.code === ERROR_CODES.NOT_FOUND ? "This library link isn’t right" : "App not available";
  const message =
    error.code === ERROR_CODES.NOT_FOUND
      ? "Check the link with your library, or scan the QR code at their desk."
      : error.message;
  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5">
      <Alert tone="error" title={title}>
        {message}
      </Alert>
    </div>
  );
}
