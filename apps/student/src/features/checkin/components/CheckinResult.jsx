import { Link } from "react-router-dom";
import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";
import { ERROR_CODES } from "@app/shared/constants";
import { displayTime } from "@app/shared/time";
import { Button, cx } from "@app/shared/ui";

const TONES = {
  success: { icon: CircleCheck, ring: "bg-emerald-50 text-emerald-600" },
  warning: { icon: TriangleAlert, ring: "bg-amber-50 text-amber-600" },
  info: { icon: Info, ring: "bg-sky-50 text-sky-600" },
  error: { icon: CircleX, ring: "bg-red-50 text-red-600" },
};

/**
 * What a check-in did, said plainly: green welcome, amber "noted", red "not allowed".
 * Times are shown in the library's timezone.
 */
export function describeOutcome(outcome, timeZone) {
  const timeOf = (instant) => displayTime(instant, timeZone);
  const visit = outcome.attendance ?? {};
  const where = [visit.slotName, visit.seatLabel && `Seat ${visit.seatLabel}`]
    .filter(Boolean)
    .join(" · ");
  if (outcome.action === "checked_out") {
    return {
      tone: "info",
      title: "Checked out",
      message: `At ${timeOf(visit.checkOutAt)}. See you next time!`,
    };
  }
  if (outcome.action === "already_done") {
    return {
      tone: "info",
      title: "Already done for today",
      message: "You've checked in and out today.",
    };
  }
  const notes = [];
  if (outcome.outsideSlot) notes.push("this is outside your booked time");
  if (outcome.hadDues) notes.push("you have fees due");
  return {
    tone: notes.length ? "warning" : "success",
    title: `Welcome, ${outcome.member?.name?.split(" ")[0] ?? ""}!`,
    message: `Checked in at ${timeOf(visit.checkInAt)}${where ? ` · ${where}` : ""}.${
      notes.length ? ` Note: ${notes.join(" and ")}.` : ""
    }`,
    showFees: outcome.hadDues,
  };
}

/** Why a check-in was refused, and what to do about it. */
export function describeError(error) {
  const byCode = {
    [ERROR_CODES.INVALID_CODE]: {
      title: "That code didn't match",
      message: "Scan the QR at the desk again — the code changes every day.",
    },
    [ERROR_CODES.OUTSIDE_SLOT]: { title: "Not your time slot", message: error.message },
    [ERROR_CODES.DUES_OVERDUE]: {
      title: "Fees due first",
      message: "Please clear your fees at the desk to check in.",
      showFees: true,
    },
    [ERROR_CODES.NO_ACTIVE_BOOKING]: {
      title: "No active booking",
      message: "Ask at the desk to book your seat.",
    },
  };
  return {
    tone: "error",
    ...(byCode[error.code] ?? { title: "Couldn't check in", message: error.message }),
  };
}

/** Full-screen result after a scan (UI-GUIDE §10 Student check-in). */
export function CheckinResult({ result, onAgain }) {
  const { icon: Icon, ring } = TONES[result.tone];
  return (
    <div className="flex flex-col items-center px-2 py-8 text-center">
      <span className={cx("flex h-24 w-24 items-center justify-center rounded-full", ring)}>
        <Icon className="h-12 w-12" aria-hidden="true" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight">{result.title}</h1>
      <p className="mt-2 max-w-xs text-slate-600">{result.message}</p>
      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        {result.showFees && (
          <Link
            to="/fees"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-white text-sm font-medium text-slate-800 ring-1 ring-slate-300"
          >
            See my fees
          </Link>
        )}
        <Link
          to="/"
          className="inline-flex h-12 items-center justify-center rounded-xl bg-brand text-sm font-medium text-white shadow-sm"
        >
          Done
        </Link>
        {result.tone === "error" && (
          <Button variant="ghost" onClick={onAgain}>
            Try again
          </Button>
        )}
      </div>
    </div>
  );
}
