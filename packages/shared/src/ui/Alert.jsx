import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";
import { cx } from "./cx.js";

const TONES = {
  error: { box: "bg-red-50 text-red-800 ring-red-200", icon: CircleX },
  success: { box: "bg-emerald-50 text-emerald-800 ring-emerald-200", icon: CircleCheck },
  info: { box: "bg-sky-50 text-sky-800 ring-sky-200", icon: Info },
  warning: { box: "bg-amber-50 text-amber-900 ring-amber-200", icon: TriangleAlert },
};

/** Inline notice with its tone's icon. Renders nothing without content. */
export function Alert({ tone = "info", title, children, className }) {
  if (!children && !title) return null;
  const { box, icon: Icon } = TONES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx("flex gap-2.5 rounded-xl px-3.5 py-3 text-sm ring-1", box, className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={title ? "mt-0.5 opacity-90" : ""}>{children}</div>}
      </div>
    </div>
  );
}
