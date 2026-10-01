import { forwardRef, useId } from "react";
import { ChevronDown } from "lucide-react";
import { cx } from "./cx.js";
import { FieldFrame, INPUT_CLASS } from "./TextField.jsx";

/** Labelled <select>. `options` are { value, label }; forwardRef for react-hook-form. */
export const SelectField = forwardRef(function SelectField(
  { label, error, hint, options, className, id, ...selectProps },
  ref,
) {
  const generatedId = useId();
  const selectId = id || generatedId;
  return (
    <FieldFrame id={selectId} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={Boolean(error)}
          className={cx(
            INPUT_CLASS,
            "appearance-none pr-9",
            error ? "border-red-400" : "border-slate-300",
          )}
          {...selectProps}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    </FieldFrame>
  );
});
