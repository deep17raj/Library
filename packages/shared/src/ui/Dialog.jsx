import { useEffect, useRef } from "react";

/**
 * Modal built on the native <dialog> element (focus trap, Esc, backdrop for free).
 * @param {{ open: boolean, title: string, onClose: () => void, children: React.ReactNode,
 *   footer?: React.ReactNode }} props
 */
export function Dialog({ open, title, onClose, children, footer }) {
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
      className="w-full max-w-lg rounded-xl p-0 shadow-xl backdrop:bg-slate-900/40"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded p-1 text-slate-500 hover:bg-slate-100"
        >
          ✕
        </button>
      </div>
      <div className="px-5 py-4">{children}</div>
      {footer && (
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">{footer}</div>
      )}
    </dialog>
  );
}
