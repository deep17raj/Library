import { useState } from "react";
import { SEATING_MODES } from "@app/shared/constants";
import { Spinner, cx } from "@app/shared/ui";
import { useLayout } from "../../layout/api.js";
import { useAvailability } from "../api.js";
import { seatMatches } from "../places.js";
import { PlaceFilters } from "./PlaceFilters.jsx";

/**
 * Pick where a student sits for a slot: a free numbered seat, or a sit-anywhere hall
 * with room. Only places free for that slot are offered (the server checks again).
 * @param {{ slotId: string, value: { seatId?: string, hallId?: string },
 *   onChange: (place: { seatId?: string, hallId?: string }) => void,
 *   error?: string, keepSeatId?: string }} props  keepSeatId: shown even if taken (current seat)
 */
export function PlacePicker({ slotId, value, onChange, error, keepSeatId }) {
  const { data: layout } = useLayout();
  const { data: availability, isLoading } = useAvailability(slotId);
  const [filters, setFilters] = useState({ categoryId: "", features: [] });

  if (!slotId) return <p className="text-sm text-slate-500">Choose a slot to see free seats.</p>;
  if (isLoading || !layout) return <Spinner label="Finding free seats…" />;

  const free = new Set(availability.freeSeatIds);
  const roomByHall = new Map(availability.floatingHalls.map((hall) => [hall.hallId, hall]));
  const halls = layout.halls.filter((hall) => hall.status === "active");

  return (
    <div className="flex flex-col gap-3">
      <PlaceFilters categories={layout.categories} filters={filters} onChange={setFilters} />
      {halls.map((hall) =>
        hall.seatingMode === SEATING_MODES.FIXED ? (
          <FixedHallSeats
            key={hall.id}
            hall={hall}
            isFree={(seat) => free.has(seat.id) && seatMatches(seat, filters)}
            selectedSeatId={value.seatId}
            keepSeatId={keepSeatId}
            onPick={(seatId) => onChange({ seatId })}
          />
        ) : (
          <FloatingHallButton
            key={hall.id}
            hall={hall}
            room={roomByHall.get(hall.id)}
            selected={value.hallId === hall.id}
            onPick={() => onChange({ hallId: hall.id })}
          />
        ),
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function FixedHallSeats({ hall, isFree, selectedSeatId, keepSeatId, onPick }) {
  const seats = hall.tables
    .flatMap((table) => table.seats)
    .filter((seat) => isFree(seat) || seat.id === keepSeatId);
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-slate-600">
        {hall.name} · {seats.length} free
      </p>
      <div className="flex flex-wrap gap-1.5">
        {seats.map((seat) => (
          <button
            key={seat.id}
            type="button"
            onClick={() => onPick(seat.id)}
            className={cx(
              "min-w-12 rounded-md px-2 py-1 font-mono text-xs ring-1",
              seat.id === selectedSeatId
                ? "bg-brand text-white ring-brand"
                : "bg-white text-slate-800 ring-slate-300 hover:ring-brand",
            )}
          >
            {seat.label}
          </button>
        ))}
        {seats.length === 0 && <span className="text-xs text-slate-400">No free seats</span>}
      </div>
    </div>
  );
}

function FloatingHallButton({ hall, room, selected, onPick }) {
  const free = room?.free ?? 0;
  return (
    <button
      type="button"
      disabled={free === 0}
      onClick={onPick}
      className={cx(
        "flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm ring-1 disabled:opacity-50",
        selected ? "bg-brand-light ring-brand" : "bg-white ring-slate-300 hover:ring-brand",
      )}
    >
      <span>
        <span className="font-medium">{hall.name}</span>
        <span className="text-slate-500"> · sit anywhere</span>
      </span>
      <span className="text-xs text-slate-600">
        {free} of {room?.capacity ?? 0} places free
      </span>
    </button>
  );
}
