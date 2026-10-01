import { Link, useNavigate } from "react-router-dom";
import { PERMISSIONS } from "@app/shared/constants";
import { displaySlotTimes, occupantsDuringSlot, peakDuringSlot } from "@app/shared/slots";
import { Button, Card } from "@app/shared/ui";
import { useCan } from "../../../app/permissions.js";

/**
 * Sit-anywhere hall: no seat numbers, so show how full it is per slot (at its busiest
 * moment) and who is booked.
 */
export function FloatingHallView({ seatMap, slot, slots }) {
  const navigate = useNavigate();
  const canAllocate = useCan(PERMISSIONS.SEATS_ALLOCATE);
  const { hall, floatingOccupants } = seatMap;
  const shown = occupantsDuringSlot(floatingOccupants, slot);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <h2 className="mb-3 font-semibold">
          {hall.name} · {hall.capacity} seats, sit anywhere
        </h2>
        <ul className="flex flex-col gap-2 text-sm">
          {slots.map((s) => {
            const used = peakDuringSlot(floatingOccupants, s);
            return (
              <li key={s.id} className="flex items-center gap-3">
                <span className="w-28 shrink-0">{s.name}</span>
                <span className="h-2 flex-1 overflow-hidden rounded bg-slate-100">
                  <span
                    className="block h-full bg-brand"
                    style={{
                      width: `${hall.capacity ? Math.min(100, (used / hall.capacity) * 100) : 0}%`,
                    }}
                  />
                </span>
                <span className="w-24 text-right text-slate-600">
                  {used} / {hall.capacity}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">
            {slot ? `Booked for ${slot.name}` : "Everyone booked here"}
          </h2>
          {canAllocate && slot && (
            <Button
              variant="secondary"
              disabled={peakDuringSlot(floatingOccupants, slot) >= hall.capacity}
              onClick={() =>
                navigate("/members/new", { state: { slotId: slot.id, hallId: hall.id } })
              }
            >
              Add a member here
            </Button>
          )}
        </div>
        {shown.length === 0 && <p className="text-sm text-slate-500">Nobody yet.</p>}
        <ul className="divide-y divide-slate-100 text-sm">
          {shown.map((o) => (
            <li key={o.subscriptionId} className="flex justify-between py-2">
              <Link to={`/members/${o.memberId}`} className="text-brand-dark hover:underline">
                {o.memberName} · {o.memberCode}
              </Link>
              <span className="text-slate-500">
                {o.slotName} · {displaySlotTimes(o)}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
