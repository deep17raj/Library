import { occupantsDuringSlot, seatStatusForSlot } from "@app/shared/slots";
import { Card, cx } from "@app/shared/ui";

const TILE = {
  free: "bg-emerald-50 text-emerald-900 ring-emerald-300",
  partial: "bg-amber-50 text-amber-900 ring-amber-300",
  taken: "bg-brand-light text-brand-dark ring-brand/40",
  disabled: "bg-slate-100 text-slate-400 ring-slate-200 line-through",
};

const LEGEND = [
  ["free", "Free"],
  ["partial", "Free now, used in other slots"],
  ["taken", "Taken"],
  ["disabled", "Disabled"],
];

/** Fixed-seat hall: tables with seat tiles coloured for the chosen slot. */
export function SeatGrid({ seatMap, slot, onOpenSeat }) {
  const statusOf = (seat) =>
    seat.status !== "active" ? "disabled" : seatStatusForSlot(seat.occupants, slot);
  const counts = { free: 0, partial: 0, taken: 0, disabled: 0 };
  seatMap.tables.flatMap((t) => t.seats).forEach((seat) => (counts[statusOf(seat)] += 1));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        {LEGEND.filter(([key]) => slot || key !== "partial").map(([key, label]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={cx("h-3 w-3 rounded ring-1", TILE[key])} /> {label} ({counts[key]})
          </span>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {seatMap.tables.map((table) => (
          <Card key={table.id} className="p-4">
            <h3 className="mb-2 text-sm font-medium text-slate-700">{table.label}</h3>
            <div className="flex flex-wrap gap-2">
              {table.seats.map((seat) => (
                <SeatTile
                  key={seat.id}
                  seat={seat}
                  slot={slot}
                  status={statusOf(seat)}
                  onOpen={() => onOpenSeat(seat.id)}
                />
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SeatTile({ seat, slot, status, onOpen }) {
  const during = occupantsDuringSlot(seat.occupants, slot);
  const title = seat.occupants.map((o) => `${o.slotName}: ${o.memberName}`).join("\n") || "Free";
  return (
    <button
      type="button"
      onClick={onOpen}
      title={title}
      className={cx(
        "flex w-24 flex-col items-start rounded-lg px-2 py-1.5 text-left ring-1 hover:ring-2",
        TILE[status],
      )}
    >
      <span className="font-mono text-xs font-semibold">{seat.label}</span>
      <span className="w-full truncate text-[11px]">
        {during.length === 1
          ? during[0].memberName
          : during.length > 1
            ? `${during.length} students`
            : "—"}
      </span>
    </button>
  );
}
