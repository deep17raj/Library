import { useState } from "react";
import { addDaysToDateKey, displayDate, displayDateTime } from "@app/shared/time";
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
} from "@app/shared/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { downloadFile } from "../../app/download.js";
import { ICONS } from "../../app/icons.js";
import { useToday } from "../../app/useToday.js";
import { useLibrarySettings } from "../settings/api.js";
import { useSlots } from "../slots/api.js";
import { useAttendance } from "./api.js";
import { MarkPresentDialog } from "./components/MarkPresentDialog.jsx";

/** Who was in on a given day (UI-GUIDE §10 Attendance): a date, an optional slot, a list. */
export function AttendancePage() {
  const today = useToday();
  const { data: settings } = useLibrarySettings();
  const { data: slots } = useSlots();
  const [date, setDate] = useState(today);
  const [slotId, setSlotId] = useState("");
  const [marking, setMarking] = useState(false);
  const { data, isLoading, error } = useAttendance({ date, slotId });

  const slotOptions = [
    { value: "", label: "All slots" },
    ...(slots ?? []).map((slot) => ({ value: slot.id, label: slot.name })),
  ];
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
        description="Who checked in, day by day. Mark walk-ins by hand."
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
            label="Previous day"
            variant="secondary"
            onClick={() => setDate(addDaysToDateKey(date, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <span className="min-w-44 text-center text-sm font-medium text-slate-900">
            {displayDate(date)}
            {date === today && <span className="ml-1 text-slate-400">· today</span>}
          </span>
          <IconButton
            label="Next day"
            variant="secondary"
            disabled={date >= today}
            onClick={() => setDate(addDaysToDateKey(date, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </div>
        <StatCard icon={ICONS.checkedIn} label="Checked in" value={data?.presentCount ?? 0} />
      </div>

      {slots?.length > 0 && (
        <div className="mb-5">
          <SegmentedControl value={slotId} onChange={setSlotId} options={slotOptions} />
        </div>
      )}

      {isLoading && <Skeleton rows={4} />}
      <Alert tone="error">{error?.message}</Alert>
      {data && data.present.length === 0 && (
        <EmptyState
          icon={ICONS.attendance}
          title="Nobody checked in yet"
          description="Check-ins from the desk, the kiosk and manual marks show up here."
          action={
            <Button icon={ICONS.add} onClick={() => setMarking(true)}>
              Mark present
            </Button>
          }
        />
      )}
      {data && data.present.length > 0 && (
        <Card className="divide-y divide-slate-100 p-0">
          {data.present.map((row) => (
            <AttendanceRow key={row.id} row={row} timezone={settings?.timezone} />
          ))}
        </Card>
      )}

      <MarkPresentDialog open={marking} onClose={() => setMarking(false)} />
    </>
  );
}

function AttendanceRow({ row, timezone }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
      <div>
        <p className="font-medium text-slate-900">{row.memberName}</p>
        <p className="text-sm text-slate-500">
          {row.slotName}
          {row.seatLabel ? ` · Seat ${row.seatLabel}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-3 text-sm">
        {row.outsideSlot && <Badge tone="amber">Outside slot</Badge>}
        {row.hadDues && <Badge tone="red">Dues</Badge>}
        <span className="text-slate-500">
          In {displayDateTime(row.checkInAt, timezone)}
          {row.checkOutAt ? ` · Out ${displayDateTime(row.checkOutAt, timezone)}` : ""}
        </span>
      </div>
    </div>
  );
}
