import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Lock, Mail } from "lucide-react";
import { staffLoginSchema } from "@app/shared/validation";
import { Alert, Button, TextField } from "@app/shared/ui";
import { applyServerErrors, useSchemaForm } from "../../app/forms.js";
import { ICONS } from "@app/shared/icons";
import { homePathFor } from "../../app/navigation.js";
import { useSession } from "../../app/session.js";
import { useLogin } from "./api.js";

const HIGHLIGHTS = [
  { icon: ICONS.seatMap, text: "See every seat and who sits there, slot by slot" },
  { icon: ICONS.payment, text: "Collect fees, print receipts, know who owes" },
  { icon: ICONS.ledger, text: "Close the day with the cash in hand" },
];

/** Sign in: brand panel (what this is) + one short form (UI-GUIDE §10 Login). */
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
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-gradient-to-br from-brand to-brand-dark p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
            <ICONS.library className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold">Study Library</span>
        </div>
        <div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
            Run your reading room without the register book.
          </h2>
          <ul className="mt-8 flex flex-col gap-4">
            {HIGHLIGHTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-white/90">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-sm text-white/70">Seats · Fees · Attendance · Mock tests</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <span className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white lg:hidden">
            <ICONS.library className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">Sign in to manage your library.</p>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <Alert tone="error">{formError}</Alert>
            <TextField
              label="Email"
              type="email"
              icon={Mail}
              autoComplete="username"
              error={errors.email?.message}
              {...form.register("email")}
            />
            <TextField
              label="Password"
              type="password"
              icon={Lock}
              autoComplete="current-password"
              error={errors.password?.message}
              {...form.register("password")}
            />
            <Button type="submit" busy={login.isPending} className="mt-2 w-full">
              Sign in
            </Button>
          </form>
          <p className="mt-6 text-center text-xs text-slate-500">
            Forgot your password? Ask your library owner to reset it.
          </p>
        </div>
      </main>
    </div>
  );
}
