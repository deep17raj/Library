import { useEffect, useState } from "react";
import { billingSettingsSchema } from "@app/shared/validation";
import { Alert, Button, SectionCard, SegmentedControl, TextField, useToast } from "@app/shared/ui";
import { applyServerErrors, useSchemaForm } from "../../../app/forms.js";
import { ICONS } from "@app/shared/icons";
import { useSaveBillingRules } from "../api.js";

// Each choice explains what it means with an example (UI-GUIDE §10 Settings).
const ANCHORS = [
  { value: "join_date", label: "From the joining date" },
  { value: "month_start", label: "Calendar months" },
];
const FIRST_PERIOD = [
  { value: "full", label: "Full fee" },
  { value: "prorated", label: "Only the days used" },
];
const COLLECTION = [
  { value: "advance", label: "In advance" },
  { value: "arrears", label: "At the end" },
];

const EXPLAIN = {
  join_date: "Joined on 10 Oct → fees due 10 Oct, 10 Nov, 10 Dec…",
  month_start: "Fees due on the 1st of every month.",
  full: "Joined on 20 Oct → pays the whole October fee.",
  prorated: "Joined on 20 Oct → pays 12 of 31 days for October.",
  advance: "The fee is due when the month starts.",
  arrears: "The fee is due when the month ends.",
};

/** Billing rules: when fees fall due. Changes apply to fees created from now on. */
export function BillingRulesCard({ settings }) {
  const save = useSaveBillingRules();
  const toast = useToast();
  const form = useSchemaForm(billingSettingsSchema, settings.billing);
  const [formError, setFormError] = useState("");
  const values = form.watch();
  const set = (name) => (value) => form.setValue(name, value, { shouldDirty: true });

  useEffect(() => form.reset(settings.billing), [settings.billing, form]);

  const onSubmit = form.handleSubmit(async (data) => {
    setFormError("");
    try {
      await save.mutateAsync(data);
      toast("Billing rules saved");
    } catch (error) {
      setFormError(applyServerErrors(form, error));
    }
  });

  return (
    <SectionCard
      icon={ICONS.payment}
      title="Billing rules"
      description="When fees fall due. Changes apply to new fees; fees already created keep their amounts."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <Alert tone="error">{formError}</Alert>
        <Choice
          label="Monthly fees run"
          options={ANCHORS}
          value={values.billingAnchor}
          onChange={set("billingAnchor")}
        />
        {values.billingAnchor === "month_start" && (
          <Choice
            label="Joining mid-month, the first month costs"
            options={FIRST_PERIOD}
            value={values.firstPeriodBilling}
            onChange={set("firstPeriodBilling")}
          />
        )}
        <Choice
          label="Fees are collected"
          options={COLLECTION}
          value={values.defaultCollection}
          onChange={set("defaultCollection")}
        />
        <TextField
          className="sm:max-w-xs"
          label="Grace days after a fee is due"
          type="number"
          min={0}
          max={90}
          hint="Used for reminders and seat release (coming with notifications)."
          error={form.formState.errors.graceDays?.message}
          {...form.register("graceDays")}
        />
        <div>
          <Button type="submit" busy={save.isPending}>
            Save billing rules
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

function Choice({ label, options, value, onChange }) {
  return (
    <div>
      <SegmentedControl label={label} options={options} value={value} onChange={onChange} />
      <p className="mt-1.5 text-xs text-slate-500">{EXPLAIN[value]}</p>
    </div>
  );
}
