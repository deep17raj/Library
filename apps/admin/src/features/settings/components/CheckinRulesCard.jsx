import { useEffect, useState } from "react";
import { checkinSettingsSchema } from "@app/shared/validation";
import {
  Alert,
  Button,
  Checkbox,
  SectionCard,
  SegmentedControl,
  TextField,
  useToast,
} from "@app/shared/ui";
import { applyServerErrors, useSchemaForm } from "../../../app/forms.js";
import { ICONS } from "../../../app/icons.js";
import { useSaveCheckinRules } from "../api.js";

const SLOT_MODES = [
  { value: "off", label: "Allow any time" },
  { value: "warn", label: "Warn only" },
  { value: "block", label: "Block" },
];

const EXPLAIN = {
  off: "Students can check in at any time; nothing is flagged.",
  warn: "Students can check in outside their slot, but it's flagged on the register.",
  block: "Check-in is refused outside the booked slot (plus the early window below).",
};

/** Check-in rules: the slot-time gate and the dues gate. Take effect on the next check-in. */
export function CheckinRulesCard({ settings }) {
  const save = useSaveCheckinRules();
  const toast = useToast();
  const form = useSchemaForm(checkinSettingsSchema, settings.checkin);
  const [formError, setFormError] = useState("");
  const mode = form.watch("slotCheckMode");

  useEffect(() => form.reset(settings.checkin), [settings.checkin, form]);

  const onSubmit = form.handleSubmit(async (data) => {
    setFormError("");
    try {
      await save.mutateAsync(data);
      toast("Check-in rules saved");
    } catch (error) {
      setFormError(applyServerErrors(form, error));
    }
  });

  return (
    <SectionCard
      icon={ICONS.checkin}
      title="Check-in rules"
      description="How the desk and kiosk treat the booked slot and unpaid fees."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <Alert tone="error">{formError}</Alert>
        <div>
          <SegmentedControl
            label="Checking in outside the booked slot"
            options={SLOT_MODES}
            value={mode}
            onChange={(value) => form.setValue("slotCheckMode", value, { shouldDirty: true })}
          />
          <p className="mt-1.5 text-xs text-slate-500">{EXPLAIN[mode]}</p>
        </div>
        <TextField
          className="sm:max-w-xs"
          label="Allow entry this many minutes early"
          type="number"
          min={0}
          max={120}
          hint="A student may check in this long before their slot starts."
          error={form.formState.errors.slotEarlyMinutes?.message}
          {...form.register("slotEarlyMinutes")}
        />
        <Checkbox
          label="Allow check-in when fees are overdue"
          description="Turn off to stop students with dues until they pay."
          {...form.register("allowOverdueCheckin")}
        />
        <div>
          <Button type="submit" busy={save.isPending}>
            Save check-in rules
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
