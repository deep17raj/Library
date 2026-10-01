import { useState } from "react";
import { Button, Dialog, TextField, useToast } from "@app/shared/ui";
import { ICONS } from "../../../app/icons.js";
import { useMembers } from "../../members/api.js";
import { useMarkAttendance } from "../api.js";

/**
 * Staff marks a member present by searching for them. Overrides the slot and dues gates
 * (the server records the flags anyway), for walk-ins the kiosk can't handle.
 */
export function MarkPresentDialog({ open, onClose }) {
  const [q, setQ] = useState("");
  const { data } = useMembers({ q, status: "active", page: 1, pageSize: 8 });
  const mark = useMarkAttendance();
  const toast = useToast();

  const pick = async (member) => {
    try {
      const outcome = await mark.mutateAsync({ memberId: member.id });
      const verb = outcome.action === "checked_out" ? "Checked out" : "Marked present";
      toast(`${verb}: ${member.name}`, { tone: "success" });
      onClose();
    } catch (error) {
      toast(error.message, { tone: "error" });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Mark present" icon={ICONS.attendance}>
      <TextField
        label="Find a student"
        placeholder="Name, phone or code"
        icon={ICONS.search}
        autoFocus
        value={q}
        onChange={(event) => setQ(event.target.value)}
      />
      <ul className="mt-3 flex max-h-72 flex-col gap-1 overflow-y-auto">
        {(data?.members ?? []).map((member) => (
          <li key={member.id}>
            <button
              type="button"
              onClick={() => pick(member)}
              disabled={mark.isPending}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-100 disabled:opacity-50"
            >
              <span>
                <span className="font-medium text-slate-900">{member.name}</span>
                <span className="ml-2 text-slate-500">{member.phone}</span>
              </span>
              <span className="text-xs text-slate-400">{member.memberCode}</span>
            </button>
          </li>
        ))}
        {q && data?.members?.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-slate-500">No students match “{q}”.</li>
        )}
      </ul>
      <div className="mt-4 flex justify-end">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </Dialog>
  );
}
