import { useState } from "react";
import { SEATING_MODES } from "@app/shared/constants";
import { Alert, EmptyState, PageHeader, Spinner, cx } from "@app/shared/ui";
import { useLayout } from "../layout/api.js";
import { useSeatMap } from "../seating/api.js";
import { useSlots } from "../slots/api.js";
import { FloatingHallView } from "./components/FloatingHallView.jsx";
import { SeatGrid } from "./components/SeatGrid.jsx";
import { SeatPanel } from "./components/SeatPanel.jsx";
import { SlotFilter } from "./components/SlotFilter.jsx";
import { ICONS } from "../../app/icons.js";

/** Who sits where: one hall at a time, filtered to a slot (or the whole day). */
export function SeatMapPage() {
  const { data: layout } = useLayout();
  const { data: slots = [] } = useSlots();
  const [hallId, setHallId] = useState(null);
  const [slotId, setSlotId] = useState("");
  const [openSeatId, setOpenSeatId] = useState(null);

  const halls = (layout?.halls ?? []).filter((hall) => hall.status === "active");
  const hall = halls.find((h) => h.id === hallId) ?? halls[0];
  const { data: seatMap, isLoading, error } = useSeatMap(hall?.id);
  const activeSlots = slots.filter((slot) => slot.status === "active");
  const slot = activeSlots.find((s) => s.id === slotId) ?? null;
  const openSeat = seatMap?.tables.flatMap((t) => t.seats).find((s) => s.id === openSeatId);

  if (layout && halls.length === 0) {
    return (
      <EmptyState
        icon={ICONS.seatMap}
        title="No halls yet"
        description="Build your layout under Halls & seats first."
      />
    );
  }
  return (
    <>
      <PageHeader
        icon={ICONS.seatMap}
        title="Seat map"
        description="Pick a slot to see which seats are free at that time."
      />
      <div className="mb-3 flex gap-2 overflow-x-auto border-b border-slate-200" role="tablist">
        {halls.map((h) => (
          <button
            key={h.id}
            type="button"
            role="tab"
            aria-selected={h.id === hall?.id}
            onClick={() => setHallId(h.id)}
            className={cx(
              "whitespace-nowrap border-b-2 px-4 py-2 text-sm",
              h.id === hall?.id
                ? "border-brand font-medium text-brand-dark"
                : "border-transparent text-slate-600",
            )}
          >
            {h.name}
          </button>
        ))}
      </div>
      <SlotFilter slots={activeSlots} value={slotId} onChange={setSlotId} />
      <Alert tone="error">{error?.message}</Alert>
      {isLoading && <Spinner />}
      {seatMap && seatMap.hall.seatingMode === SEATING_MODES.FIXED && (
        <SeatGrid seatMap={seatMap} slot={slot} onOpenSeat={setOpenSeatId} />
      )}
      {seatMap && seatMap.hall.seatingMode === SEATING_MODES.FLOATING && (
        <FloatingHallView seatMap={seatMap} slot={slot} slots={activeSlots} />
      )}
      {openSeat && (
        <SeatPanel
          seat={openSeat}
          hall={seatMap.hall}
          slot={slot}
          onClose={() => setOpenSeatId(null)}
        />
      )}
    </>
  );
}
