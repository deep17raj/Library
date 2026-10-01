import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { staffLoginSchema } from "@app/shared/validation";
import { Alert, Button, Card, TextField } from "@app/shared/ui";
import { applyServerErrors, useSchemaForm } from "../../app/forms.js";
import { homePathFor } from "../../app/navigation.js";
import { useSession } from "../../app/session.js";
import { useLogin } from "./api.js";

export function LoginPage() {
  const { data: user } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const login = useLogin();
  const form = useSchemaForm(staffLoginSchema, { email: "", password: "" });
  const [formError, setFormError] = useState("");
  const { errors } = form.formState;

  if (user) return <Navigate to={homePathFor(user)} replace />;

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError("");
    try {
      const { user: signedIn } = await login.mutateAsync(values);
      navigate(location.state?.from || homePathFor(signedIn), { replace: true });
    } catch (error) {
      setFormError(applyServerErrors(form, error));
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <p className="mb-4 text-sm text-slate-600">Library owners, staff and platform admins.</p>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <Alert tone="error">{formError}</Alert>
          <TextField
            label="Email"
            type="email"
            autoComplete="username"
            error={errors.email?.message}
            {...form.register("email")}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...form.register("password")}
          />
          <Button type="submit" busy={login.isPending}>
            Sign in
          </Button>
        </form>
      </Card>
    </div>
  );
}
