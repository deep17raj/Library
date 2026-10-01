import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

/**
 * react-hook-form wired to a shared zod schema — the same schema the API route
 * validates with, so the form and the server agree on every rule.
 * @param {import("zod").ZodTypeAny} schema
 * @param {Record<string, unknown>} [defaultValues]
 */
export function useSchemaForm(schema, defaultValues) {
  return useForm({ resolver: zodResolver(schema), defaultValues, mode: "onTouched" });
}

/**
 * Put the server's per-field messages onto the form's inputs. Returns the
 * message to show above the form when the error isn't about one field.
 * @param {ReturnType<typeof useForm>} form
 * @param {import("@app/shared/api").ApiError} error
 */
export function applyServerErrors(form, error) {
  const fields = Object.entries(error?.fields || {});
  for (const [name, message] of fields) form.setError(name, { type: "server", message });
  return fields.length > 0 ? "" : error?.message || "Something went wrong";
}

/**
 * Everything a dialog form needs: starts from `defaultValues` each time it opens,
 * submits through `submit(values)`, closes on success, and shows server errors on
 * the right fields (or above the form).
 * @param {import("zod").ZodTypeAny} schema
 * @param {{ open: boolean, onClose: () => void, defaultValues: Record<string, unknown>,
 *   submit: (values: any) => Promise<unknown> }} options
 */
export function useDialogForm(schema, { open, onClose, defaultValues, submit }) {
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
      await submit(values);
      onClose();
    } catch (error) {
      setFormError(applyServerErrors(form, error));
    }
  });

  return { form, errors: form.formState.errors, formError, onSubmit };
}
