import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cx } from "./cx.js";

/**
 * Modal built on the native <dialog> element (focus trap, Esc, backdrop for free).
 * @param {{ open: boolean, title: string, onClose: () => void, children: React.ReactNode,
 *   footer?: React.ReactNode, icon?: React.ComponentType<{ className?: string }>,
 *   size?: "md" | "lg" }} props
 */
export function Dialog({ open, title, onClose, children, footer, icon: Icon, size = "md" }) {
  const ref = useRef(/** @type {HTMLDialogElement | null} */ (null));

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={cx(
        "w-[calc(100%-2rem)] rounded-2xl p-0 shadow-2xl ring-1 ring-slate-200 backdrop:bg-slate-900/50 backdrop:backdrop-blur-[2px]",
        size === "lg" ? "max-w-2xl" : "max-w-lg",
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
      {footer && (
        <div className="flex justify-end gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50/70 px-5 py-3">
          {footer}
        </div>
      )}
    </dialog>
  );
}
