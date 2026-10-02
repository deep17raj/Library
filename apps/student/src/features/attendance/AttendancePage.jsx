import { useState } from "react";
import { ICONS } from "@app/shared/icons";
import { displayDate, displayMonth, displayTime, shiftMonth } from "@app/shared/time";
import { Alert, Badge, Card, IconButton, PageHeader, Skeleton, StatCard } from "@app/shared/ui";
import { useMe } from "../../app/session.js";
import { useMyAttendance } from "./api.js";
import { MonthCalendar } from "./components/MonthCalendar.jsx";

/** My attendance, a month at a time, with my streak (UI-GUIDE §10 Student attendance). */
export function AttendancePage() {
  const { data: me } = useMe();
  const thisMonth = `${me.today.slice(0, 7)}-01`;
  const [monthStart, setMonthStart] = useState(thisMonth);
  const { data, isLoading, error } = useMyAttendance(monthStart);
  const timeZone = me.library.timezone;

  const visits = data?.visits ?? [];
  const present = new Set(visits.filter((v) => !v.absent).map((v) => v.date));
  const absent = new Set(visits.filter((v) => v.absent).map((v) => v.date));

  return (
    <>
      <PageHeader
        icon={ICONS.attendance}
        title="Attendance"
        description="The days you came in. Every visit counts."
      />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <StatCard
          icon={ICONS.streak}
          tone="amber"
          label="In a row"
          value={`${data?.streak ?? 0} d`}
        />
        <StatCard icon={ICONS.checkedIn} label="This month" value={`${data?.presentDays ?? 0} d`} />
      </div>
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <IconButton
            icon={ICONS.previous}
            label="Previous month"
            onClick={() => setMonthStart(shiftMonth(monthStart, -1))}
          />
          <p className="font-semibold">{displayMonth(monthStart)}</p>
          <IconButton
            icon={ICONS.next}
            label="Next month"
            disabled={monthStart >= thisMonth}
            onClick={() => setMonthStart(shiftMonth(monthStart, 1))}
          />
        </div>
        {isLoading ? (
          <Skeleton rows={5} />
        ) : (
          <MonthCalendar
            monthStart={monthStart}
            today={me.today}
            present={present}
            absent={absent}
          />
        )}
      </Card>
      <Alert tone="error" className="mt-4">
        {error?.message}
      </Alert>
      {visits.length > 0 && (
        <Card className="mt-4 divide-y divide-slate-100 p-0">
          {visits.map((visit) => (
            <div
              key={visit.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-slate-900">{displayDate(visit.date)}</p>
                <p className="text-slate-500">
                  {visit.slotName} · {displayTime(visit.checkInAt, timeZone)}
                  {visit.checkOutAt ? ` – ${displayTime(visit.checkOutAt, timeZone)}` : ""}
                </p>
              </div>
              {visit.absent ? (
                <Badge tone="red">Marked absent</Badge>
              ) : visit.outsideSlot ? (
                <Badge tone="amber">Outside slot</Badge>
              ) : null}
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
