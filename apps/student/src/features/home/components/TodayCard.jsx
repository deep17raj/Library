import { Link } from "react-router-dom";
import { ICONS } from "@app/shared/icons";
import { displayTime } from "@app/shared/time";
import { Card, cx } from "@app/shared/ui";

/** Today at a glance: checked in or not, with the one button that matters. */
export function TodayCard({ checkIns, hasBooking, timeZone }) {
  const timeOf = (instant) => displayTime(instant, timeZone);
  const visit = checkIns[0];
  const inside = visit && !visit.checkOutAt;
  const title = !visit ? "Not checked in yet" : inside ? "You're checked in" : "Checked out";
  const detail = !visit
    ? hasBooking
      ? "Scan the QR at the desk when you arrive."
      : "You have no active booking. Ask at the desk."
    : inside
      ? `Since ${timeOf(visit.checkInAt)}${visit.seatLabel ? ` · Seat ${visit.seatLabel}` : ""}`
      : `${timeOf(visit.checkInAt)} – ${timeOf(visit.checkOutAt)}`;

  return (
    <Card
      className={cx(
        "flex items-center gap-4",
        inside && "ring-2 ring-emerald-400/60 bg-emerald-50/40",
      )}
    >
      <span
        className={cx(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
          inside ? "bg-emerald-100 text-emerald-600" : "bg-brand-light text-brand-dark",
        )}
      >
        <ICONS.checkedIn className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cx("font-semibold", inside ? "text-emerald-900" : "text-slate-900")}>
          {title}
        </p>
        <p className="text-sm text-slate-500">{detail}</p>
      </div>
      {hasBooking && (
        <Link
          to="/checkin"
          className={cx(
            "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-medium text-white shadow-sm",
            inside
              ? "bg-orange-500 shadow-orange-200 hover:bg-orange-600"
              : "bg-brand shadow-brand/20 hover:bg-brand-dark",
          )}
        >
          <ICONS.scan className="h-4 w-4" aria-hidden="true" />
          {inside ? "Check out" : "Check in"}
        </Link>
      )}
    </Card>
  );
}
