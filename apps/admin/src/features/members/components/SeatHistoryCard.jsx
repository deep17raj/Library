import { displayDate } from "@app/shared/time";
import { Card } from "@app/shared/ui";

const REASONS = {
  seat_change: "moved",
  swap: "swapped",
  slot_change: "slot changed",
  released: "released",
  left: "left",
  unpaid: "unpaid",
};

/** Every seat this member has held (numbered seats only). */
export function SeatHistoryCard({ history }) {
  if (history.length === 0) return null;
  return (
    <Card>
      <h2 className="mb-3 font-semibold">Seat history</h2>
      <ul className="divide-y divide-slate-100 text-sm">
        {history.map((row) => (
          <li key={row.allocationId} className="flex justify-between gap-3 py-2">
            <span>
              Seat <span className="font-mono">{row.seatLabel}</span> · {row.slotName}
            </span>
            <span className="text-slate-500">
              {displayDate(row.startOn)} –{" "}
              {row.status === "active"
                ? "now"
                : `${displayDate(row.endOn)} (${REASONS[row.endReason] ?? row.endReason})`}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
