import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Dialog, TextField, cx } from "@app/shared/ui";
import { api } from "../../../app/api.js";
import { useBookingAction } from "../api.js";

/**
 * Swap seats with another student on a numbered seat. Search by name, phone or
 * member code, then pick their booking. Rendered only while open.
 */
export function SwapDialog({ subscription, memberName, onClose }) {
  const [query, setQuery] = useState("");
  const [otherId, setOtherId] = useState(null);
  const swap = useBookingAction("swap");
  const { data: candidates = [] } = useQuery({
    queryKey: ["library", "members", "swap", query],
    queryFn: async () =>
      (await api.get(`/admin/members?q=${encodeURIComponent(query)}&pageSize=20`)).members,
    enabled: query.trim().length >= 2,
  });
  const seated = candidates.flatMap((member) =>
    member.placements
      .filter((p) => p.seatLabel && p.subscriptionId !== subscription.id)
      .map((p) => ({ ...p, memberName: member.name })),
  );

  const onSwap = async () => {
    await swap.mutateAsync({ subscriptionA: subscription.id, subscriptionB: otherId });
    onClose();
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Swap seat ${subscription.seat.label} (${memberName})`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!otherId} busy={swap.isPending} onClick={onSwap}>
            Swap seats
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Alert tone="error">{swap.error?.message}</Alert>
        <TextField
          label="Find the other student"
          placeholder="Name, phone or member code"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {seated.map((placement) => (
            <li key={placement.subscriptionId}>
              <button
                type="button"
                onClick={() => setOtherId(placement.subscriptionId)}
                className={cx(
                  "w-full rounded-lg px-3 py-2 text-left text-sm ring-1",
                  otherId === placement.subscriptionId
                    ? "bg-brand-light ring-brand"
                    : "ring-slate-200 hover:bg-slate-50",
                )}
              >
                <span className="font-medium">{placement.memberName}</span> · seat{" "}
                {placement.seatLabel} · {placement.slotName}
              </button>
            </li>
          ))}
          {query.trim().length >= 2 && seated.length === 0 && (
            <li className="text-sm text-slate-500">No student on a numbered seat matches.</li>
          )}
        </ul>
        <p className="text-xs text-slate-500">
          Each student keeps their own slot. If the seats are priced differently, the new price
          starts next period.
        </p>
      </div>
    </Dialog>
  );
}
