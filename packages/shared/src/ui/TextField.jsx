import { forwardRef, useId } from "react";
import { cx } from "./cx.js";

// 16 px text on phones: iOS Safari zooms the page into any smaller input on focus.
export const INPUT_CLASS =
  "w-full rounded-xl border bg-white px-3 py-2 text-base sm:text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-brand focus:ring-2 focus:ring-brand/30 disabled:bg-slate-50";

/** Label above, hint below; an error replaces the hint. Shared by every field. */
export function FieldFrame({ id, label, hint, error, className, children }) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      {children}
      {(error || hint) && (
        <p
          id={`${id}-message`}
          className={cx("text-xs", error ? "text-red-600" : "text-slate-500")}
        >
          {error || hint}
        </p>
      )}
    </div>
  );
}

/**
 * Labelled input with optional leading icon or text (e.g. "₹") and an optional
 * `trailing` element inside the right edge (e.g. a show-password button). forwardRef
 * so react-hook-form's register() reaches the real <input>.
 */
export const TextField = forwardRef(function TextField(
  { label, error, hint, className, id, icon: Icon, prefix, trailing, ...inputProps },
  ref,
) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const lead = Icon || prefix;
  return (
    <FieldFrame id={inputId} label={label} hint={hint} error={error} className={className}>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        )}
        {prefix && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
            {prefix}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? `${inputId}-message` : undefined}
          className={cx(
            INPUT_CLASS,
            lead && "pl-9",
            trailing && "pr-11",
            error ? "border-red-400" : "border-slate-300",
          )}
          {...inputProps}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
    </FieldFrame>
  );
});

/** Rupee amount input: shows ₹, opens the numeric keypad on phones. Value stays rupees text. */
export const MoneyField = forwardRef(function MoneyField(props, ref) {
  return <TextField ref={ref} prefix="₹" inputMode="decimal" autoComplete="off" {...props} />;
});
