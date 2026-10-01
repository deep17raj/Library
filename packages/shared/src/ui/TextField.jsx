import { forwardRef, useId } from "react";
import { cx } from "./cx.js";

/**
 * Labelled input with its error message. forwardRef so react-hook-form's
 * register() can attach to the real <input>.
 */
export const TextField = forwardRef(function TextField(
  { label, error, hint, className, id, ...inputProps },
  ref,
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const messageId = `${inputId}-message`;
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? messageId : undefined}
        className={cx(
          "rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand",
          error ? "border-red-500" : "border-slate-300",
        )}
        {...inputProps}
      />
      {(error || hint) && (
        <p id={messageId} className={cx("text-xs", error ? "text-red-600" : "text-slate-500")}>
          {error || hint}
        </p>
      )}
    </div>
  );
});
