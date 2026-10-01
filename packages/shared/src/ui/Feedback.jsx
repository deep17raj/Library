import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CircleCheck, CircleX, TriangleAlert, X } from "lucide-react";
import { Button } from "./Button.jsx";
import { Dialog } from "./Dialog.jsx";
import { cx } from "./cx.js";

// "What just happened" (toasts) and "are you sure?" (confirm dialogs) for the whole
// app — so no screen reaches for window.alert / window.confirm (UI-GUIDE §5).

const FeedbackContext = createContext(null);

const TOAST_LOOK = {
  success: { icon: CircleCheck, color: "text-emerald-600" },
  error: { icon: CircleX, color: "text-red-600" },
};

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const nextId = useRef(0);

  const toast = useCallback((message, { tone = "success", action } = {}) => {
    const id = (nextId.current += 1);
    setToasts((list) => [...list, { id, message, tone, action }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 5000);
  }, []);

  /** Resolves true when confirmed, false when cancelled. */
  const confirm = useCallback(
    (options) => new Promise((resolve) => setConfirmState({ ...options, resolve })),
    [],
  );

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm]);
  const settle = (answer) => {
    confirmState?.resolve(answer);
    setConfirmState(null);
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <ToastStack
        toasts={toasts}
        onDismiss={(id) => setToasts((list) => list.filter((t) => t.id !== id))}
      />
      <Dialog
        open={Boolean(confirmState)}
        onClose={() => settle(false)}
        title={confirmState?.title ?? ""}
        icon={TriangleAlert}
        footer={
          <>
            <Button variant="secondary" onClick={() => settle(false)}>
              {confirmState?.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              variant={confirmState?.danger === false ? "primary" : "danger"}
              onClick={() => settle(true)}
            >
              {confirmState?.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">{confirmState?.message}</p>
      </Dialog>
    </FeedbackContext.Provider>
  );
}

function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6">
      {toasts.map((t) => {
        const { icon: Icon, color } = TOAST_LOOK[t.tone];
        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl bg-white px-4 py-3 text-sm shadow-lg ring-1 ring-slate-200"
          >
            <Icon className={cx("mt-0.5 h-5 w-5 shrink-0", color)} aria-hidden="true" />
            <p className="flex-1 text-slate-800">{t.message}</p>
            {t.action && (
              <button
                type="button"
                onClick={t.action.onClick}
                className="font-medium text-brand-dark hover:underline"
              >
                {t.action.label}
              </button>
            )}
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => onDismiss(t.id)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** toast("Saved") · toast("Could not save", { tone: "error" }) · toast(msg, { action: { label, onClick } }) */
export function useToast() {
  return useContext(FeedbackContext).toast;
}

/**
 * const ok = await confirm({ title, message, confirmLabel, danger })
 * The message states the consequence; the button names the action.
 */
export function useConfirm() {
  return useContext(FeedbackContext).confirm;
}
