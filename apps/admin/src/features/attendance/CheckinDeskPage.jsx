import { useState } from "react";
import { displayDate } from "@app/shared/time";
import { Alert, Button, Card, PageHeader, Spinner, TextField } from "@app/shared/ui";
import { ICONS } from "../../app/icons.js";
import { useCheckinDesk, useKioskCheckin } from "./api.js";
import { QrImage } from "./components/QrImage.jsx";

/**
 * The shared desk screen (UI-GUIDE §10 Check-in desk): today's code + QR to scan, and a
 * phone box a student at the counter types into. The code on screen is sent with it, so
 * nobody has to read it out.
 */
export function CheckinDeskPage() {
  const { data: desk, isLoading, error } = useCheckinDesk();
  const checkin = useKioskCheckin(desk?.slug);
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState(null); // { tone, message }

  const submit = async (event) => {
    event.preventDefault();
    try {
      const outcome = await checkin.mutateAsync({ phone: phone.trim(), code: desk.code });
      setResult(describe(outcome));
      setPhone("");
    } catch (err) {
      setResult({ tone: "error", message: err.message });
    }
  };

  return (
    <>
      <PageHeader
        icon={ICONS.checkin}
        title="Check-in desk"
        description="Students scan the code to check in, or type their phone number here."
      />
      {isLoading && <Spinner />}
      <Alert tone="error">{error?.message}</Alert>
      {desk && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-slate-500">{displayDate(desk.today)}</p>
            <QrImage text={`${window.location.origin}${desk.checkinPath}`} />
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Today&rsquo;s code</p>
              <p className="font-mono text-4xl font-semibold tracking-[0.3em] text-slate-900">
                {desk.code}
              </p>
            </div>
            <p className="text-sm text-slate-500">
              <span className="font-semibold text-slate-900">{desk.presentCount}</span> checked in
              today
            </p>
          </Card>

          <Card className="flex flex-col gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                <ICONS.phone className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Check in by phone
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                For students without the app. A second check-in the same day checks them out.
              </p>
            </div>
            <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
              <TextField
                label="Phone number"
                inputMode="numeric"
                autoComplete="off"
                icon={ICONS.phone}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
              <Button type="submit" busy={checkin.isPending} disabled={phone.trim().length < 10}>
                Check in
              </Button>
            </form>
            {result && (
              <Alert tone={result.tone} title={result.title}>
                {result.message}
              </Alert>
            )}
          </Card>
        </div>
      )}
    </>
  );
}

/** Turn a check-in outcome into a desk banner. */
function describe(outcome) {
  const name = outcome.member?.name ?? "Student";
  if (outcome.action === "checked_out") {
    return {
      tone: "info",
      title: "Checked out",
      message: `${name} has checked out. See you soon!`,
    };
  }
  if (outcome.action === "already_done") {
    return { tone: "info", title: "Already done", message: `${name} already checked out today.` };
  }
  const notes = [];
  if (outcome.outsideSlot) notes.push("outside their booked time");
  if (outcome.hadDues) notes.push("fees are due");
  return {
    tone: notes.length ? "warning" : "success",
    title: `Welcome, ${name}!`,
    message: notes.length
      ? `Checked in — note: ${notes.join(" and ")}.`
      : "Checked in. Have a good study session!",
  };
}
