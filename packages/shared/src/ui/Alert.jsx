import { cx } from "./cx.js";

const TONES = {
  error: "bg-red-50 text-red-800 ring-red-200",
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  info: "bg-sky-50 text-sky-800 ring-sky-200",
  warning: "bg-amber-50 text-amber-900 ring-amber-200",
};

export function Alert({ tone = "info", children, className }) {
  if (!children) return null;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx("rounded-lg px-3 py-2 text-sm ring-1", TONES[tone], className)}
    >
      {children}
    </div>
  );
}
