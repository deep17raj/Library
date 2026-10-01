import { useState } from "react";
import { formatRupees } from "@app/shared/money";
import { displaySlotTimes } from "@app/shared/slots";
import { displayDate } from "@app/shared/time";
import { Badge, Button } from "@app/shared/ui";
import { planLength } from "../../slots/slotDisplay.js";
import { placeName } from "../places.js";
import { ChangeSlotDialog, MoveDialog } from "./BookingDialogs.jsx";
import { EndBookingDialog } from "./EndBookingDialog.jsx";
import { SwapDialog } from "./SwapDialog.jsx";

const END_REASONS = {
  left: "left",
  admin: "released",
  slot_change: "slot changed",
  seat_change: "seat changed",
  unpaid: "unpaid",
};

/**
 * A member's bookings: active ones with their actions, then past ones.
 * @param {{ subscriptions: object[], memberName: string, canAllocate: boolean }} props
 */
export function BookingList({ subscriptions, memberName, canAllocate }) {
  const [dialog, setDialog] = useState(null); // { kind, subscription }
  const close = () => setDialog(null);
  const active = subscriptions.filter((s) => s.status === "active");
  const past = subscriptions.filter((s) => s.status !== "active");
  const open = (kind, subscription) => () => setDialog({ kind, subscription });

  return (
    <div className="flex flex-col gap-3">
      {active.length === 0 && <p className="text-sm text-slate-500">No active seat booking.</p>}
      {active.map((subscription) => (
        <div key={subscription.id} className="rounded-lg p-3 ring-1 ring-slate-200">
          <BookingSummary subscription={subscription} />
          {canAllocate && (
            <div className="mt-2 flex flex-wrap gap-1">
              <Button
                variant="secondary"
                className="px-3 py-1 text-xs"
                onClick={open("move", subscription)}
              >
                Move seat
              </Button>
              <Button
                variant="secondary"
                className="px-3 py-1 text-xs"
                onClick={open("slot", subscription)}
              >
                Change slot
              </Button>
              {subscription.seat && (
                <Button
                  variant="secondary"
                  className="px-3 py-1 text-xs"
                  onClick={open("swap", subscription)}
                >
                  Swap
                </Button>
              )}
              <Button
                variant="ghost"
                className="px-3 py-1 text-xs text-red-700"
                onClick={open("end", subscription)}
              >
                End
              </Button>
            </div>
          )}
        </div>
      ))}
      {past.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-slate-600">Past bookings ({past.length})</summary>
          <ul className="mt-2 flex flex-col gap-1 text-slate-600">
            {past.map((s) => (
              <li key={s.id}>
                {s.slot.name} · {s.hall.name} · {displayDate(s.startOn)} – {displayDate(s.endOn)} (
                {END_REASONS[s.endReason] ?? s.endReason})
              </li>
            ))}
          </ul>
        </details>
      )}

      {dialog?.kind === "move" && <MoveDialog subscription={dialog.subscription} onClose={close} />}
      {dialog?.kind === "slot" && (
        <ChangeSlotDialog subscription={dialog.subscription} onClose={close} />
      )}
      {dialog?.kind === "swap" && (
        <SwapDialog subscription={dialog.subscription} memberName={memberName} onClose={close} />
      )}
      {dialog?.kind === "end" && (
        <EndBookingDialog subscription={dialog.subscription} onClose={close} />
      )}
    </div>
  );
}

function BookingSummary({ subscription: s }) {
  const startsLater = s.billsFrom > s.startOn;
  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{s.slot.name}</span>
        <span className="text-slate-500">{displaySlotTimes(s.slot)}</span>
        <Badge tone="green">{placeName(s)}</Badge>
      </div>
      <p className="mt-1 text-slate-600">
        {s.plan.name} · {formatRupees(s.pricePaise)} per {planLength(s)} · since{" "}
        {displayDate(s.startOn)}
        {startsLater && ` · billed from ${displayDate(s.billsFrom)}`}
      </p>
    </div>
  );
}
