import { displayDate, displayMonth } from "@app/shared/time";
import { Badge, SectionCard } from "@app/shared/ui";
import { ICONS } from "../../../app/icons.js";
import { useMemberAttendance } from "../api.js";

/** This month's check-ins for one student, on the member page. Read-only. */
export function MemberAttendanceCard({ memberId }) {
  const { data } = useMemberAttendance(memberId);
  const rows = data?.attendance ?? [];

  return (
    <SectionCard
      icon={ICONS.attendance}
      title="Attendance"
      description={
        data
          ? `${displayMonth(data.month)} · ${rows.length} day${rows.length === 1 ? "" : "s"}`
          : "This month"
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No check-ins this month.</p>
      ) : (
        <ul className="flex flex-col gap-1.5 text-sm">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center justify-between">
              <span className="text-slate-700">{displayDate(row.localDate)}</span>
              <span className="flex items-center gap-2 text-slate-500">
                {row.outsideSlot && <Badge tone="amber">Outside slot</Badge>}
                {row.method === "staff" && <Badge tone="slate">Manual</Badge>}
                {row.slotName}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
