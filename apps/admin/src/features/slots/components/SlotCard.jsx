import { useState } from "react";
import { formatRupees } from "@app/shared/money";
import { displaySlotTimes, slotDurationMinutes } from "@app/shared/slots";
import { Badge, Button, Card } from "@app/shared/ui";
import { planLength, slotColor } from "../slotDisplay.js";
import { PlanDialog } from "./PlanDialog.jsx";
import { SlotDialog } from "./SlotDialog.jsx";
import { ICONS } from "../../../app/icons.js";

/** A slot: times, fee, and its plans with add/edit. */
export function SlotCard({ slot, index, canEdit }) {
  const [dialog, setDialog] = useState(null); // { kind: "slot" } | { kind: "plan", plan }
  const close = () => setDialog(null);
  const hours = slotDurationMinutes(slot) / 60;

  return (
    <Card className={slot.status === "archived" ? "opacity-70" : ""}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: slotColor(slot, index) }} />
            <h2 className="font-semibold">{slot.name}</h2>
            {slot.status === "archived" && <Badge>Archived</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {displaySlotTimes(slot)} · {hours} hours
          </p>
        </div>
        {canEdit && (
          <Button variant="secondary" onClick={() => setDialog({ kind: "slot" })}>
            Edit
          </Button>
        )}
      </div>

      <ul className="mt-4 divide-y divide-slate-100 text-sm">
        {slot.plans.map((plan) => (
          <li key={plan.id} className="flex items-center justify-between gap-2 py-2">
            <span>
              {plan.name} <span className="text-slate-500">· {planLength(plan)}</span>
              {plan.status === "archived" && (
                <span className="ml-2 text-xs text-slate-400">archived</span>
              )}
            </span>
            <span className="flex items-center gap-2">
              <span className="font-medium">{formatRupees(plan.pricePaise)}</span>
              {canEdit && (
                <Button
                  variant="ghost"
                  className="px-2 py-1 text-xs"
                  onClick={() => setDialog({ kind: "plan", plan })}
                >
                  Edit
                </Button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {canEdit && (
        <Button
          variant="ghost"
          className="mt-2 px-2 text-sm"
          onClick={() => setDialog({ kind: "plan", plan: null })}
          icon={ICONS.add}
        >
          Add package plan
        </Button>
      )}

      <SlotDialog open={dialog?.kind === "slot"} slot={slot} onClose={close} />
      {dialog?.kind === "plan" && <PlanDialog slot={slot} plan={dialog.plan} onClose={close} />}
    </Card>
  );
}
