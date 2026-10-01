import { useId } from "react";
import { Alert, Button, Dialog } from "@app/shared/ui";

/**
 * A dialog holding one form, with Cancel + submit buttons in the footer.
 * Pair with useDialogForm (app/forms.js).
 * @param {{ open: boolean, onClose: () => void, title: string, submitLabel: string,
 *   busy?: boolean, formError?: string, onSubmit: (event: any) => void,
 *   danger?: boolean, icon?: React.ComponentType, size?: "md" | "lg",
 *   children: React.ReactNode }} props
 */
export function FormDialog({
  open,
  onClose,
  title,
  submitLabel,
  busy,
  formError,
  onSubmit,
  danger,
  icon,
  size,
  children,
}) {
  const formId = useId();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      icon={icon}
      size={size}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId} busy={busy} variant={danger ? "danger" : "primary"}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Alert tone="error">{formError}</Alert>
        {children}
      </form>
    </Dialog>
  );
}
