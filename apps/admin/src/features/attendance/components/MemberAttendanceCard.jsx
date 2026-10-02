import { displayDate, displayMonth } from "@app/shared/time";
import { Badge, SectionCard } from "@app/shared/ui";
import { ICONS } from "@app/shared/icons";
import { useMemberAttendance } from "../api.js";

/** This month's check-ins for one student, on the member page. Read-only. */
export function MemberAttendanceCard({ memberId }) {
  const { data } = useMemberAttendance(memberId);
  const rows = data?.attendance ?? [];
  // A staff "absent" mark wins over a check-in on the roster; the row stays as history.
  const daysPresent = new Set(rows.filter((r) => !r.absent).map((r) => r.localDate)).size;

  return (
    <SectionCard
      icon={ICONS.attendance}
      title="Attendance"
      description={
        data
          ? `${displayMonth(data.month)} · ${daysPresent} day${daysPresent === 1 ? "" : "s"} present`
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
                {row.absent && <Badge tone="red">Marked absent</Badge>}
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
