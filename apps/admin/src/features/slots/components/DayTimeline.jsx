import { displaySlotTimes, MINUTES_PER_DAY } from "@app/shared/slots";
import { slotColor } from "../slotDisplay.js";

const HOURS = [0, 6, 12, 18, 24];

/** Pieces of a slot on a 0–24h bar; an overnight slot is drawn as two pieces. */
function segments({ startMin, endMin }) {
  if (endMin > startMin) return [[startMin, endMin]];
  return [
    [startMin, MINUTES_PER_DAY],
    [0, endMin],
  ];
}

const percent = (minutes) => `${(minutes / MINUTES_PER_DAY) * 100}%`;

/** One row per active slot across the day, so overlaps (Morning vs Full Day) are obvious. */
export function DayTimeline({ slots }) {
  const active = slots.filter((slot) => slot.status === "active");
  if (active.length === 0) return null;
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="relative mb-2 h-4 text-[10px] text-slate-500">
        {HOURS.map((hour) => (
          <span
            key={hour}
            className="absolute -translate-x-1/2"
            style={{ left: percent(hour * 60) }}
          >
            {hour === 24 ? "24:00" : `${String(hour).padStart(2, "0")}:00`}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        {active.map((slot, index) => (
          <div key={slot.id} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-xs text-slate-700">{slot.name}</span>
            <div
              className="relative h-5 flex-1 rounded bg-slate-100"
              title={displaySlotTimes(slot)}
            >
              {segments(slot).map(([from, to]) => (
                <span
                  key={from}
                  className="absolute inset-y-0 rounded"
                  style={{
                    left: percent(from),
                    width: percent(to - from),
                    background: slotColor(slot, index),
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
