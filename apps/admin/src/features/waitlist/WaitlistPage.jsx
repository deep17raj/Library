import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PERMISSIONS, SEAT_FEATURE_LABELS } from "@app/shared/constants";
import { displayDateTime } from "@app/shared/time";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  PageHeader,
  SelectField,
  Spinner,
} from "@app/shared/ui";
import { useCan } from "../../app/permissions.js";
import { useSlots } from "../slots/api.js";
import { useUpdateWaitlistEntry, useWaitlist } from "./api.js";
import { AddWaitlistDialog } from "./components/AddWaitlistDialog.jsx";
import { ICONS } from "@app/shared/icons";

const STATUS_TONE = { waiting: "amber", offered: "green", converted: "slate", cancelled: "red" };

/** People waiting for a seat, per slot, in arrival order. */
export function WaitlistPage() {
  const [filters, setFilters] = useState({ slotId: "", view: "open" });
  const [adding, setAdding] = useState(false);
  const { data: entries, isLoading, error } = useWaitlist(filters);
  const { data: slots = [] } = useSlots();
  const canManage = useCan(PERMISSIONS.MEMBERS_MANAGE);
  const update = useUpdateWaitlistEntry();
  const navigate = useNavigate();

  const seatNow = (entry) =>
    navigate("/members/new", {
      state: {
        slotId: entry.slotId,
        name: entry.name,
        phone: entry.phone,
        waitlistEntryId: entry.id,
      },
    });

  return (
    <>
      <PageHeader
        icon={ICONS.waitlist}
        title="Waitlist"
        description="When a slot is full, note who is waiting. Seat them when a place frees up."
        actions={
          canManage && (
            <Button onClick={() => setAdding(true)} icon={ICONS.add}>
              Add to waitlist
            </Button>
          )
        }
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <SelectField
          aria-label="Slot"
          value={filters.slotId}
          onChange={(e) => setFilters({ ...filters, slotId: e.target.value })}
          options={[
            { value: "", label: "All slots" },
            ...slots.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
        <SelectField
          aria-label="Show"
          value={filters.view}
          onChange={(e) => setFilters({ ...filters, view: e.target.value })}
          options={[
            { value: "open", label: "Still waiting" },
            { value: "all", label: "Everyone (incl. seated and cancelled)" },
          ]}
        />
      </div>
      <Alert tone="error">{error?.message || update.error?.message}</Alert>
      {isLoading && <Spinner />}
      {entries?.length === 0 && <EmptyState icon={ICONS.waitlist} title="Nobody is waiting" />}
      {entries?.length > 0 && (
        <Card className="p-0">
          <ul className="divide-y divide-slate-100">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {entry.position && (
                      <span className="mr-2 text-slate-400">#{entry.position}</span>
                    )}
                    {entry.name} <span className="font-normal text-slate-500">· {entry.phone}</span>
                  </p>
                  <p className="text-slate-500">
                    {entry.slotName} · added {displayDateTime(entry.createdAt)}
                    {entry.preferredFeatures.length > 0 &&
                      ` · wants ${entry.preferredFeatures.map((f) => SEAT_FEATURE_LABELS[f]).join(", ")}`}
                  </p>
                  {entry.note && <p className="italic text-slate-500">{entry.note}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={STATUS_TONE[entry.status]}>{entry.status}</Badge>
                  {canManage && entry.position && (
                    <EntryActions
                      entry={entry}
                      onSeat={() => seatNow(entry)}
                      onStatus={(status) => update.mutate({ id: entry.id, status })}
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <AddWaitlistDialog open={adding} slots={slots} onClose={() => setAdding(false)} />
    </>
  );
}

function EntryActions({ entry, onSeat, onStatus }) {
  return (
    <>
      <Button className="px-3 py-1 text-xs" onClick={onSeat} icon={ICONS.seatMap}>
        Seat now
      </Button>
      {entry.status === "waiting" ? (
        <Button
          variant="secondary"
          className="px-3 py-1 text-xs"
          onClick={() => onStatus("offered")}
        >
          Mark offered
        </Button>
      ) : (
        <Button
          variant="secondary"
          className="px-3 py-1 text-xs"
          onClick={() => onStatus("waiting")}
        >
          Back to waiting
        </Button>
      )}
      <Button
        variant="ghost"
        className="px-3 py-1 text-xs text-red-700"
        onClick={() => onStatus("cancelled")}
      >
        Cancel
      </Button>
    </>
  );
}
