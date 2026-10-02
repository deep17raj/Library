import { useEffect, useRef, useState } from "react";
import { applyServerErrors, useSchemaForm } from "@app/shared/forms";
import { useToast } from "@app/shared/ui";

// The admin app's form module: the shared helpers, plus the dialog-form pattern.
export { applyServerErrors, useSchemaForm };

/**
 * Everything a dialog form needs: starts from `defaultValues` each time it opens,
 * submits through `submit(values)`, closes on success, and shows server errors on
 * the right fields (or above the form). `success` is the toast shown after saving —
 * a string, or a function of the server's answer returning a string or
 * `{ message, action: { label, onClick } }` (UI-GUIDE §6 "After a save").
 * @param {import("zod").ZodTypeAny} schema
 * @param {{ open: boolean, onClose: () => void, defaultValues: Record<string, unknown>,
 *   submit: (values: any) => Promise<unknown>, success?: string | ((result: any) => any) }} options
 */
export function useDialogForm(schema, { open, onClose, defaultValues, submit, success = "Saved" }) {
  const toast = useToast();
  const form = useSchemaForm(schema, defaultValues);
  const [formError, setFormError] = useState("");
  // Callers build defaultValues inline; keep the latest without re-running the reset.
  const defaultsRef = useRef(defaultValues);
  defaultsRef.current = defaultValues;

  useEffect(() => {
    if (!open) return;
    form.reset(defaultsRef.current);
    setFormError("");
  }, [open, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError("");
    try {
      const result = await submit(values);
      onClose();
      const said = typeof success === "function" ? success(result) : success;
      if (typeof said === "string") toast(said);
      else toast(said.message, { action: said.action });
    } catch (error) {
      setFormError(applyServerErrors(form, error));
    }
  });

  return { form, errors: form.formState.errors, formError, onSubmit };
}
