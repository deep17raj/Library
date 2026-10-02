import { announceSchema } from "@app/shared/validation";
import { SelectField, TextField } from "@app/shared/ui";
import { useDialogForm } from "../../app/forms.js";
import { FormDialog } from "../../app/FormDialog.jsx";
import { useAudiencePreview, useSendNotification } from "./api.js";
import { useSlots } from "../slots/api.js";

export function ComposeDialog({ onClose }) {
  const send = useSendNotification();
  const { data: slots = [] } = useSlots();
  const active = slots.filter((s) => s.status === "active");

  const { form, errors, formError, onSubmit } = useDialogForm(announceSchema, {
    open: true,
    onClose,
    defaultValues: {
      title: "",
      body: "",
      url: "",
      audience: { type: "all" },
    },
    submit: (values) => send.mutateAsync(values),
    success: (result) =>
      `Notification sent to ${result.recipientsCount} student${result.recipientsCount !== 1 ? "s" : ""}`,
  });

  const audienceType = form.watch("audience.type");
  const slotId = form.watch("audience.slotId");
  const audience = { type: audienceType, slotId };
  const { data: preview } = useAudiencePreview(audience);

  return (
    <FormDialog
      open
      onClose={onClose}
      title="Send notification"
      submitLabel="Send"
      busy={send.isPending}
      formError={formError}
      onSubmit={onSubmit}
    >
      <SelectField
        label="Send to"
        options={[
          { value: "all", label: "All active students" },
          { value: "dues", label: "Students with dues" },
          ...active.map((s) => ({ value: `slot:${s.id}`, label: `${s.name} students` })),
        ]}
        error={errors.audience?.type?.message}
        value={audienceType === "slot" ? `slot:${slotId}` : audienceType}
        onChange={(e) => {
          const val = e.target.value;
          if (val.startsWith("slot:")) {
            form.setValue("audience", { type: "slot", slotId: val.slice(5) });
          } else {
            form.setValue("audience", { type: val });
          }
        }}
      />
      {preview && (
        <p className="text-sm text-slate-500">
          {preview.count} student{preview.count !== 1 ? "s" : ""} will receive this
        </p>
      )}
      <TextField
        label="Title"
        placeholder="Library closed tomorrow"
        error={errors.title?.message}
        {...form.register("title")}
      />
      <TextField
        label="Message"
        placeholder="The library will be closed on 15 Oct for maintenance."
        error={errors.body?.message}
        {...form.register("body")}
        multiline
        rows={3}
      />
    </FormDialog>
  );
}
