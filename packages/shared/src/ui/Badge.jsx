import { cx } from "./cx.js";

const TONES = {
  green: { box: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  amber: { box: "bg-amber-50 text-amber-800 ring-amber-600/20", dot: "bg-amber-500" },
  red: { box: "bg-red-50 text-red-700 ring-red-600/20", dot: "bg-red-500" },
  slate: { box: "bg-slate-100 text-slate-700 ring-slate-500/20", dot: "bg-slate-400" },
  brand: { box: "bg-brand-light text-brand-dark ring-brand/20", dot: "bg-brand" },
};

/** Status pill. Tones are fixed per meaning (UI-GUIDE §6). */
export function Badge({ tone = "slate", dot = false, children, className }) {
  const look = TONES[tone];
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        look.box,
        className,
      )}
    >
      {dot && <span className={cx("h-1.5 w-1.5 rounded-full", look.dot)} aria-hidden="true" />}
      {children}
    </span>
  );
}
