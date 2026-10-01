import { useEffect } from "react";
import { formatRupees } from "@app/shared/money";
import { displaySlotTimes } from "@app/shared/slots";
import { SelectField } from "@app/shared/ui";
import { useLayout } from "../../layout/api.js";
import { useSlots } from "../../slots/api.js";
import { planLength } from "../../slots/slotDisplay.js";
import { previewPrice } from "../places.js";
import { PlacePicker } from "./PlacePicker.jsx";

/**
 * Slot → plan → place, with a live price, bound to a react-hook-form form. `prefix`
 * is the field path ("bookings.0." in the add-member form, "" in dialogs).
 * @param {{ form: any, prefix?: string, errors?: Record<string, any>, keepSeatId?: string,
 *   fixedSlotId?: string }} props  fixedSlotId: slot can't be changed (move dialog)
 */
export function BookingFields({ form, prefix = "", errors = {}, keepSeatId, fixedSlotId }) {
  const { data: slots = [] } = useSlots();
  const { data: layout } = useLayout();
  const field = (name) => `${prefix}${name}`;
  const slotId = fixedSlotId ?? form.watch(field("slotId"));
  const planId = form.watch(field("planId"));
  const place = { seatId: form.watch(field("seatId")), hallId: form.watch(field("hallId")) };

  const activeSlots = slots.filter((slot) => slot.status === "active");
  const slot = slots.find((s) => s.id === slotId);
  const plans = (slot?.plans ?? []).filter((plan) => plan.status === "active");
  const plan = plans.find((p) => p.id === planId);
  const price = previewPrice(layout, plan, place);

  // A pre-filled slot (from the seat map or waitlist) starts on its default plan.
  useEffect(() => {
    if (!slot || planId) return;
    const fallback = slot.plans.find((p) => p.isDefault && p.status === "active");
    if (fallback) form.setValue(`${prefix}planId`, fallback.id);
  }, [slot, planId, form, prefix]);

  const setPlace = ({ seatId, hallId }) => {
    form.setValue(field("seatId"), seatId, { shouldValidate: true });
    form.setValue(field("hallId"), hallId, { shouldValidate: true });
  };
  const onSlotChange = (event) => {
    const next = slots.find((s) => s.id === event.target.value);
    form.setValue(field("planId"), next?.plans.find((p) => p.isDefault)?.id ?? "");
    setPlace({}); // a seat free in one slot may be taken in another
  };

  return (
    <div className="flex flex-col gap-3">
      {!fixedSlotId && (
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Time slot"
            options={[
              { value: "", label: "Choose a slot" },
              ...activeSlots.map((s) => ({
                value: s.id,
                label: `${s.name} · ${displaySlotTimes(s)}`,
              })),
            ]}
            error={errors.slotId?.message}
            {...form.register(field("slotId"), { onChange: onSlotChange })}
          />
          <SelectField
            label="Plan"
            options={plans.map((p) => ({
              value: p.id,
              label: `${p.name} · ${planLength(p)} · ${formatRupees(p.pricePaise)}`,
            }))}
            error={errors.planId?.message}
            {...form.register(field("planId"))}
          />
        </div>
      )}
      <PlacePicker
        slotId={slotId}
        value={place}
        onChange={setPlace}
        keepSeatId={keepSeatId}
        error={errors.seatId?.message || errors.hallId?.message}
      />
      {price && (
        <p className="text-sm text-slate-700">
          Fee: <strong>{formatRupees(price.pricePaise)}</strong> per {planLength(plan)}
          {price.surchargePaise > 0 &&
            ` (includes ${formatRupees(price.surchargePaise)} seat category)`}
        </p>
      )}
    </div>
  );
}
