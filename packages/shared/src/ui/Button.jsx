import { forwardRef } from "react";
import { cx } from "./cx.js";

const VARIANTS = {
  primary:
    "bg-brand text-white shadow-sm shadow-brand/20 hover:bg-brand-dark disabled:bg-slate-300 disabled:shadow-none",
  secondary:
    "bg-white text-slate-800 ring-1 ring-slate-300 hover:bg-slate-50 hover:ring-slate-400 disabled:text-slate-400",
  ghost: "text-slate-700 hover:bg-slate-100 disabled:text-slate-400",
  subtle: "bg-brand-light text-brand-dark hover:bg-brand/15 disabled:opacity-60",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 disabled:bg-red-300",
  "danger-ghost": "text-red-700 hover:bg-red-50 disabled:text-red-300",
};

const SIZES = {
  sm: "gap-1.5 rounded-lg px-2.5 py-1.5 text-xs",
  md: "gap-2 rounded-xl px-4 py-2 text-sm",
};

/**
 * @param {React.ButtonHTMLAttributes<HTMLButtonElement> & {
 *   variant?: keyof typeof VARIANTS, size?: keyof typeof SIZES, busy?: boolean,
 *   icon?: React.ComponentType<{ className?: string }> }} props
 */
export const Button = forwardRef(function Button(
  { variant = "primary", size = "md", busy = false, icon: Icon, className, children, ...rest },
  ref,
) {
  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      disabled={rest.disabled || busy}
      className={cx(
        "inline-flex items-center justify-center font-medium transition-colors duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
    >
      {busy ? (
        <span
          className={cx(
            iconSize,
            "animate-spin rounded-full border-2 border-current border-t-transparent",
          )}
        />
      ) : (
        Icon && <Icon className={iconSize} aria-hidden="true" />
      )}
      {children}
    </button>
  );
});

/**
 * Icon-only button. `label` is required: it is the accessible name and the tooltip.
 * @param {{ icon: React.ComponentType<{ className?: string }>, label: string,
 *   variant?: "ghost" | "secondary" | "danger-ghost" } & React.ButtonHTMLAttributes<HTMLButtonElement>} props
 */
export function IconButton({ icon: Icon, label, variant = "ghost", className, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-40",
        VARIANTS[variant],
        className,
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
