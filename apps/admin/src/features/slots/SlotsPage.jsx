import { useState } from "react";
import { PERMISSIONS } from "@app/shared/constants";
import { Alert, Button, EmptyState, PageHeader, Spinner } from "@app/shared/ui";
import { useCan } from "../../app/permissions.js";
import { useSlots } from "./api.js";
import { DayTimeline } from "./components/DayTimeline.jsx";
import { SlotCard } from "./components/SlotCard.jsx";
import { SlotDialog } from "./components/SlotDialog.jsx";
import { ICONS } from "../../app/icons.js";

/** Time slots, their fees and plans. */
export function SlotsPage() {
  const { data: slots, isLoading, error } = useSlots();
  const canEdit = useCan(PERMISSIONS.SLOTS_MANAGE);
  const [creating, setCreating] = useState(false);
  const add = canEdit && (
    <Button onClick={() => setCreating(true)} icon={ICONS.add}>
      Add slot
    </Button>
  );

  return (
    <>
      <PageHeader
        icon={ICONS.slots}
        title="Slots & fees"
        description="Time slots students can book, each with its monthly fee and optional packages."
        actions={add}
      />
      {isLoading && <Spinner />}
      <Alert tone="error">{error?.message}</Alert>
      {slots?.length === 0 && (
        <EmptyState
          icon={ICONS.slots}
          title="No time slots yet"
          description="For example Morning 6:00 am – 12:00 pm, Evening 12:00 pm – 6:00 pm, Full Day."
          action={add}
        />
      )}
      {slots?.length > 0 && (
        <div className="flex flex-col gap-6">
          <DayTimeline slots={slots} />
          <div className="grid gap-4 lg:grid-cols-2">
            {slots.map((slot, index) => (
              <SlotCard key={slot.id} slot={slot} index={index} canEdit={canEdit} />
            ))}
          </div>
        </div>
      )}
      <SlotDialog open={creating} slot={null} onClose={() => setCreating(false)} />
    </>
  );
}
