import { useEffect, useMemo, useState } from "react";
import { librarySettingsSchema } from "@app/shared/validation";
import { Alert, Button, Card, SelectField, TextField } from "@app/shared/ui";
import { applyServerErrors, useSchemaForm } from "../../../app/forms.js";
import { useSaveSettings } from "../api.js";

const FIELDS = [
  "displayName",
  "address",
  "contactPhone",
  "timezone",
  "brandColor",
  "receiptPrefix",
  "memberCodePrefix",
];
const pick = (settings) => Object.fromEntries(FIELDS.map((key) => [key, settings[key] ?? ""]));

/** Every IANA timezone the browser knows, keeping the saved one even if it doesn't. */
function useTimezoneOptions(current) {
  return useMemo(() => {
    const zones =
      typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
    const all = zones.includes(current) ? zones : [current, ...zones];
    return all.map((zone) => ({ value: zone, label: zone.replace(/_/g, " ") }));
  }, [current]);
}

export function ProfileForm({ settings }) {
  const save = useSaveSettings();
  const form = useSchemaForm(librarySettingsSchema, pick(settings));
  const [message, setMessage] = useState({ tone: "info", text: "" });
  const timezones = useTimezoneOptions(settings.timezone);
  const { errors } = form.formState;

  useEffect(() => form.reset(pick(settings)), [settings, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setMessage({ tone: "info", text: "" });
    try {
      await save.mutateAsync(values);
      setMessage({ tone: "success", text: "Settings saved." });
    } catch (error) {
      setMessage({ tone: "error", text: applyServerErrors(form, error) });
    }
  });

  return (
    <Card>
      <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Alert tone={message.tone} className="sm:col-span-2">
          {message.text}
        </Alert>
        <TextField
          className="sm:col-span-2"
          label="Library name (shown to students)"
          error={errors.displayName?.message}
          {...form.register("displayName")}
        />
        <TextField
          className="sm:col-span-2"
          label="Address"
          error={errors.address?.message}
          {...form.register("address")}
        />
        <TextField
          label="Contact phone"
          inputMode="tel"
          error={errors.contactPhone?.message}
          {...form.register("contactPhone")}
        />
        <SelectField
          label="Timezone"
          hint="Decides when your library's day starts and ends."
          options={timezones}
          error={errors.timezone?.message}
          {...form.register("timezone")}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="brand-color" className="text-sm font-medium text-slate-700">
            Brand colour
          </label>
          <input
            id="brand-color"
            type="color"
            className="h-10 w-20 cursor-pointer rounded border border-slate-300"
            {...form.register("brandColor")}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Receipt prefix"
            hint="R → R-000123"
            error={errors.receiptPrefix?.message}
            {...form.register("receiptPrefix")}
          />
          <TextField
            label="Member ID prefix"
            hint="S → S1042"
            error={errors.memberCodePrefix?.message}
            {...form.register("memberCodePrefix")}
          />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" busy={save.isPending}>
            Save settings
          </Button>
        </div>
      </form>
    </Card>
  );
}
