import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PERMISSIONS } from "@app/shared/constants";
import { displaySlotTimes, seatStatusForSlot } from "@app/shared/slots";
import { displayDate } from "@app/shared/time";
import { Button, Dialog } from "@app/shared/ui";
import { useCan } from "../../../app/permissions.js";
import { useSeatHistory } from "../../seating/api.js";
import { MoveDialog } from "../../seating/components/BookingDialogs.jsx";
import { EndBookingDialog } from "../../seating/components/EndBookingDialog.jsx";
import { SwapDialog } from "../../seating/components/SwapDialog.jsx";
import { ICONS } from "@app/shared/icons";

/** The booking shape the seating dialogs need, built from a seat-map occupant. */
function asBooking(occupant, seat, hall) {
  return {
    id: occupant.subscriptionId,
    slot: {
      id: occupant.slotId,
      name: occupant.slotName,
      startMin: occupant.startMin,
      endMin: occupant.endMin,
    },
    seat: { id: seat.id, label: seat.label },
    hall,
  };
}

/** Click on a seat: who sits there in each slot, what can be done, and its history. */
export function SeatPanel({ seat, hall, slot, onClose }) {
  const canAllocate = useCan(PERMISSIONS.SEATS_ALLOCATE);
  const navigate = useNavigate();
  const [action, setAction] = useState(null); // { kind, occupant }
  const { data: history = [] } = useSeatHistory(seat.id);
  const bookable =
    seat.status === "active" && slot && seatStatusForSlot(seat.occupants, slot) !== "taken";

  if (action) {
    const booking = asBooking(action.occupant, seat, hall);
    const done = () => setAction(null);
    if (action.kind === "move") return <MoveDialog subscription={booking} onClose={done} />;
    if (action.kind === "swap")
      return (
        <SwapDialog subscription={booking} memberName={action.occupant.memberName} onClose={done} />
      );
    return <EndBookingDialog subscription={booking} onClose={done} />;
  }

  return (
    <Dialog open onClose={onClose} title={`Seat ${seat.label}`}>
      <div className="flex flex-col gap-4 text-sm">
        {seat.status !== "active" && <p className="text-slate-500">This seat is disabled.</p>}
        {seat.occupants.length === 0 && seat.status === "active" && (
          <p className="text-slate-600">Nobody sits here yet.</p>
        )}
        <ul className="flex flex-col gap-2">
          {seat.occupants.map((occupant) => (
            <li key={occupant.subscriptionId} className="rounded-lg p-3 ring-1 ring-slate-200">
              <p>
                <span className="font-medium">{occupant.slotName}</span>{" "}
                <span className="text-slate-500">{displaySlotTimes(occupant)}</span>
              </p>
              <Link
                to={`/members/${occupant.memberId}`}
                className="text-brand-dark hover:underline"
              >
                {occupant.memberName} · {occupant.memberCode}
              </Link>
              {canAllocate && (
                <div className="mt-2 flex gap-1">
                  {["move", "swap", "end"].map((kind) => (
                    <Button
                      key={kind}
                      variant={kind === "end" ? "ghost" : "secondary"}
                      className="px-3 py-1 text-xs capitalize"
                      onClick={() => setAction({ kind, occupant })}
                    >
                      {kind}
                    </Button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
        {canAllocate && bookable && (
          <Button
            onClick={() =>
              navigate("/members/new", { state: { slotId: slot.id, seatId: seat.id } })
            }
            icon={ICONS.addMember}
          >
            Add a new member here for {slot.name}
          </Button>
        )}
        {canAllocate && seat.status === "active" && !slot && (
          <p className="text-xs text-slate-500">
            Pick a slot above to book this seat for a new member.
          </p>
        )}
        {history.length > 0 && (
          <details>
            <summary className="cursor-pointer text-slate-600">History ({history.length})</summary>
            <ul className="mt-2 flex flex-col gap-1 text-slate-600">
              {history.map((row) => (
                <li key={row.allocationId}>
                  {row.memberName} · {row.slotName} · {displayDate(row.startOn)} –{" "}
                  {row.status === "active" ? "now" : displayDate(row.endOn)}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Dialog>
  );
}
