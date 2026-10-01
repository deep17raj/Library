import { forwardRef, useId } from "react";
import { cx } from "./cx.js";

/**
 * Labelled <select>. `options` are { value, label }; forwardRef for react-hook-form.
 */
export const SelectField = forwardRef(function SelectField(
  { label, error, hint, options, className, id, ...selectProps },
  ref,
) {
  const generatedId = useId();
  const selectId = id || generatedId;
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        aria-invalid={Boolean(error)}
        className={cx(
          "rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand",
          error ? "border-red-500" : "border-slate-300",
        )}
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {(error || hint) && (
        <p className={cx("text-xs", error ? "text-red-600" : "text-slate-500")}>{error || hint}</p>
      )}
    </div>
  );
});
