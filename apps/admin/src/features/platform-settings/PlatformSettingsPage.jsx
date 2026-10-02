import { useEffect, useState } from "react";
import { bpsToPercentInput, platformSettingsFormSchema } from "@app/shared/validation";
import { Alert, Button, Card, PageHeader, Spinner, TextField } from "@app/shared/ui";
import { applyServerErrors, useSchemaForm } from "../../app/forms.js";
import { usePlatformSettings, useSavePlatformSettings } from "./api.js";
import { ICONS } from "@app/shared/icons";

export function PlatformSettingsPage() {
  const { data: settings, isLoading } = usePlatformSettings();
  const save = useSavePlatformSettings();
  const form = useSchemaForm(platformSettingsFormSchema, { sharePercent: "" });
  const [message, setMessage] = useState({ tone: "info", text: "" });
  const { errors } = form.formState;

  useEffect(() => {
    if (settings) form.reset({ sharePercent: bpsToPercentInput(settings.mocktestDefaultShareBps) });
  }, [settings, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setMessage({ tone: "info", text: "" });
    try {
      await save.mutateAsync(values);
      setMessage({ tone: "success", text: "Saved." });
    } catch (error) {
      setMessage({ tone: "error", text: applyServerErrors(form, error) });
    }
  });

  return (
    <div className="max-w-md">
      <PageHeader icon={ICONS.platformSettings} title="Platform settings" />
      {isLoading ? (
        <Spinner />
      ) : (
        <Card>
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <Alert tone={message.tone}>{message.text}</Alert>
            <TextField
              label="Default library share of mock-test sales (%)"
              inputMode="decimal"
              hint="Applies to libraries without their own share. Past sales keep the share they were sold at."
              error={errors.sharePercent?.message}
              {...form.register("sharePercent")}
            />
            <Button type="submit" busy={save.isPending}>
              Save
            </Button>
          </form>
        </Card>
      )}
    </div>
  );
}
