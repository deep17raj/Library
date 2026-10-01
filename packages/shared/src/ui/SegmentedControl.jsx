import { cx } from "./cx.js";

/**
 * 2–6 exclusive choices shown at once (payment mode, seating mode, filters).
 * @param {{ label?: string, value: string, onChange: (value: string) => void,
 *   options: { value: string, label: string, icon?: React.ComponentType<{ className?: string }> }[],
 *   error?: string }} props
 */
export function SegmentedControl({ label, value, onChange, options, error }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
        {options.map(({ value: optionValue, label: optionLabel, icon: Icon }) => {
          const selected = optionValue === value;
          return (
            <button
              key={optionValue}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(optionValue)}
              className={cx(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm ring-1 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand",
                selected
                  ? "bg-brand-light font-medium text-brand-dark ring-brand"
                  : "bg-white text-slate-700 ring-slate-300 hover:ring-slate-400",
              )}
            >
              {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
              {optionLabel}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
