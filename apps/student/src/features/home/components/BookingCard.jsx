import { ICONS } from "@app/shared/icons";
import { displaySlotTimes, isWithinSlot, MINUTES_PER_DAY } from "@app/shared/slots";
import { displayDate } from "@app/shared/time";
import { Badge, Card } from "@app/shared/ui";

/** Minutes until the slot ends (handles slots that run past midnight). */
function minutesLeft(minutes, { endMin }) {
  return (endMin - minutes + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

const hoursAndMinutes = (total) =>
  total >= 60 ? `${Math.floor(total / 60)} h ${total % 60} min` : `${total} min`;

/** "Your seat": the seat number big, then the slot and its times; "Now" while it runs. */
export function BookingCard({ booking, minutes }) {
  const now = isWithinSlot(minutes, booking);
  return (
    <Card className="flex items-center gap-4">
      <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-slate-900 text-white">
        {booking.seatLabel ? (
          <>
            <span className="text-[10px] uppercase tracking-wider text-white/60">Seat</span>
            <span className="text-lg font-semibold leading-tight">{booking.seatLabel}</span>
          </>
        ) : (
          <ICONS.seatMap className="h-7 w-7" aria-label="Any free seat" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-slate-900">{booking.slotName}</p>
          {now && (
            <Badge tone="green" dot>
              Now
            </Badge>
          )}
        </div>
        <p className="text-sm text-slate-600">{displaySlotTimes(booking)}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {booking.seatLabel ? booking.hallName : `${booking.hallName} · sit at any free seat`}
          {now && ` · ${hoursAndMinutes(minutesLeft(minutes, booking))} left`}
          {booking.endOn && ` · until ${displayDate(booking.endOn)}`}
        </p>
      </div>
    </Card>
  );
}
