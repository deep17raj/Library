import { ICONS } from "@app/shared/icons";
import { Alert, Button, Dialog, useToast } from "@app/shared/ui";
import { QrImage } from "../../../app/QrImage.jsx";
import { useStudentAppUrl } from "../api.js";

/**
 * The temporary password, shown exactly once [D10], with the three steps to read out
 * to the student. It is not stored anywhere readable — closing this loses it (staff can
 * always reset again).
 */
export function TemporaryPasswordDialog({ open, onClose, member, temporaryPassword }) {
  const toast = useToast();
  const appUrl = useStudentAppUrl();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      toast("Code copied");
    } catch {
      toast("Couldn't copy — read the code out instead", { tone: "error" });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      icon={ICONS.password}
      title={`App sign-in for ${member.name}`}
      footer={<Button onClick={onClose}>Done</Button>}
    >
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-slate-50 py-5">
        <p className="text-xs uppercase tracking-wide text-slate-500">One-time code</p>
        <p className="font-mono text-4xl font-semibold tracking-[0.3em] text-slate-900">
          {temporaryPassword}
        </p>
        <Button size="sm" variant="ghost" onClick={copy}>
          Copy
        </Button>
      </div>
      <ol className="mt-4 flex list-decimal flex-col gap-1.5 pl-5 text-sm text-slate-700">
        <li>Open the library app{appUrl ? " (scan the QR below)" : ""}.</li>
        <li>
          Sign in with <strong>{member.phone}</strong> and this code.
        </li>
        <li>Choose their own password. The code then stops working.</li>
      </ol>
      {appUrl && (
        <div className="mt-4 flex items-center gap-4">
          <QrImage text={appUrl} size={112} />
          <p className="break-all text-xs text-slate-500">{appUrl}</p>
        </div>
      )}
      <Alert tone="info" className="mt-4">
        This code is shown only now. If it’s lost, use “Reset password” to make a new one.
      </Alert>
    </Dialog>
  );
}
