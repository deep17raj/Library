import { useEffect, useState } from "react";
import { addDaysToDateKey, displayDate, displayDateTime, localMinutesOf } from "@app/shared/time";
import { DAY_PERIODS, periodOfMinutes } from "@app/shared/slots";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  PageHeader,
  SegmentedControl,
  Skeleton,
  StatCard,
  useToast,
} from "@app/shared/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { downloadFile } from "../../app/download.js";
import { ICONS } from "../../app/icons.js";
import { useToday } from "../../app/useToday.js";
import { useLibrarySettings } from "../settings/api.js";
import { useSlots } from "../slots/api.js";
import { useAttendanceRoster, useMarkAbsent, useMarkAttendance } from "./api.js";
import { MarkPresentDialog } from "./components/MarkPresentDialog.jsx";

const PERIOD_OPTIONS = [{ value: "all", label: "All" }, ...DAY_PERIODS];

/** Who's booked today, present or not (UI-GUIDE §10 Attendance): a date, a batch, a
 * time-of-day filter, and a present/absent toggle per student. */
export function AttendancePage() {
  const today = useToday();
  const { data: settings } = useLibrarySettings();
  const { data: slots } = useSlots();
  const [date, setDate] = useState(today);
  const [slotId, setSlotId] = useState("");
  const [period, setPeriod] = useState(null); // null = not yet defaulted to "now"
  const [marking, setMarking] = useState(false);
  const { data, isLoading, error } = useAttendanceRoster({ date, slotId });

  // Default the time-of-day filter to whatever period it is right now, once settings
  // (and so the library's timezone) are available — saves the admin a click.
  useEffect(() => {
    if (period === null && settings?.timezone) {
      setPeriod(periodOfMinutes(localMinutesOf(new Date(), settings.timezone)));
    }
  }, [period, settings?.timezone]);
  const activePeriod = period ?? "all";

  const slotOptions = [
    { value: "", label: "All batches" },
    ...(slots ?? []).map((slot) => ({ value: slot.id, label: slot.name })),
  ];
  const members = (data?.members ?? []).filter(
    (m) => activePeriod === "all" || periodOfMinutes(m.startMin) === activePeriod,
  );
  const presentCount = members.filter((m) => m.status === "present").length;

  const exportCsv = () =>
    downloadFile(
      `/admin/export/attendance.csv?date=${date}${slotId ? `&slotId=${slotId}` : ""}`,
      `attendance-${date}.csv`,
    );

  return (
    <>
      <PageHeader
        icon={ICONS.attendance}
        title="Attendance"
        description="Who's booked today, and whether they're in. Mark walk-ins by hand."
        actions={
          <>
            <Button variant="secondary" icon={ICONS.export} onClick={exportCsv}>
              Export CSV
            </Button>
            <Button icon={ICONS.add} onClick={() => setMarking(true)}>
              Mark present
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <IconButton
            icon={ChevronLeft}
            label="Previous day"
            variant="secondary"
            onClick={() => setDate(addDaysToDateKey(date, -1))}
          />
          <span className="min-w-44 text-center text-sm font-medium text-slate-900">
            {displayDate(date)}
            {date === today && <span className="ml-1 text-slate-400">· today</span>}
          </span>
          <IconButton
            icon={ChevronRight}
            label="Next day"
            variant="secondary"
            disabled={date >= today}
            onClick={() => setDate(addDaysToDateKey(date, 1))}
          />
        </div>
        <StatCard icon={ICONS.checkedIn} label="Checked in" value={presentCount} />
      </div>

      <div className="mb-5 flex flex-wrap items-end gap-4">
        <SegmentedControl label="When" value={activePeriod} onChange={setPeriod} options={PERIOD_OPTIONS} />
        {slots?.length > 0 && (
          <SegmentedControl label="Batch" value={slotId} onChange={setSlotId} options={slotOptions} />
        )}
      </div>

      {isLoading && <Skeleton rows={4} />}
      <Alert tone="error">{error?.message}</Alert>
      {data && members.length === 0 && (
        <EmptyState
          icon={ICONS.attendance}
          title="No one booked for this filter"
          description="Try a different batch or time of day, or mark a walk-in present by hand."
          action={
            <Button icon={ICONS.add} onClick={() => setMarking(true)}>
              Mark present
            </Button>
          }
        />
      )}
      {members.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((row) => (
            <RosterCard key={row.subscriptionId} row={row} timezone={settings?.timezone} />
          ))}
        </div>
      )}

      <MarkPresentDialog open={marking} onClose={() => setMarking(false)} />
    </>
  );
}

function RosterCard({ row, timezone }) {
  const markPresent = useMarkAttendance();
  const markAbsent = useMarkAbsent();
  const toast = useToast();
  const busy = markPresent.isPending || markAbsent.isPending;

  const present = async () => {
    try {
      await markPresent.mutateAsync({ memberId: row.memberId, subscriptionId: row.subscriptionId });
      toast(`Marked present: ${row.memberName}`, { tone: "success" });
    } catch (err) {
      toast(err.message, { tone: "error" });
    }
  };
  const absent = async () => {
    try {
      await markAbsent.mutateAsync({ memberId: row.memberId, subscriptionId: row.subscriptionId });
      toast(`Marked absent: ${row.memberName}`, { tone: "success" });
    } catch (err) {
      toast(err.message, { tone: "error" });
    }
  };

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-slate-900">{row.memberName}</p>
          <p className="text-sm text-slate-500">
            {row.slotName}
            {row.seatLabel ? ` · Seat ${row.seatLabel}` : ""}
          </p>
        </div>
        <StatusBadge status={row.status} />
      </div>
      {row.status === "present" && row.checkInAt && (
        <p className="text-xs text-slate-500">In {displayDateTime(row.checkInAt, timezone)}</p>
      )}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={row.status === "present" ? "primary" : "secondary"}
          icon={ICONS.markPresent}
          disabled={busy}
          onClick={present}
        >
          Present
        </Button>
        <Button
          size="sm"
          variant={row.status === "absent" ? "danger" : "danger-ghost"}
          icon={ICONS.markAbsent}
          disabled={busy}
          onClick={absent}
        >
          Absent
        </Button>
      </div>
    </Card>
  );
}

function StatusBadge({ status }) {
  if (status === "present") return <Badge tone="green">Present</Badge>;
  if (status === "absent") return <Badge tone="red">Absent</Badge>;
  return <Badge tone="slate">Not marked</Badge>;
}
