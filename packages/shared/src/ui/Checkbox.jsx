import { forwardRef } from "react";

/** Checkbox with its label to the right; forwardRef for react-hook-form. */
export const Checkbox = forwardRef(function Checkbox({ label, description, ...inputProps }, ref) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm">
      <input
        ref={ref}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-[rgb(var(--brand))]"
        {...inputProps}
      />
      <span>
        <span className="text-slate-800">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
    </label>
  );
});
