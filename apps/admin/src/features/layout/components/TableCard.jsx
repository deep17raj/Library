import { useState } from "react";
import { SEAT_FEATURE_LABELS } from "@app/shared/constants";
import { Alert, Button, Card, cx, useConfirm } from "@app/shared/ui";
import { useLayoutAction } from "../api.js";
import { AddSeatsDialog } from "./AddSeatsDialog.jsx";
import { RenameTableDialog } from "./RenameTableDialog.jsx";
import { SeatDialog } from "./SeatDialog.jsx";
import { ICONS } from "@app/shared/icons";

/** A table with its seat chips; clicking a seat opens its editor. */
export function TableCard({ table, hall, layout, canEdit }) {
  const [dialog, setDialog] = useState(null); // { kind: "seat", seat } | { kind: "rename" } | { kind: "seats" }
  const remove = useLayoutAction("deleteTable");
  const close = () => setDialog(null);

  const confirm = useConfirm();
  const onDelete = async () => {
    const ok = await confirm({
      title: `Delete ${table.label}?`,
      message: `Its ${table.seats.length} seats are removed too.`,
      confirmLabel: "Delete table",
    });
    if (ok) remove.mutate({ id: table.id });
  };

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{table.label}</h3>
        {canEdit && (
          <div className="flex gap-1 text-xs">
            <Button
              variant="ghost"
              className="px-2 py-1"
              onClick={() => setDialog({ kind: "seats" })}
              icon={ICONS.add}
            >
              Seats
            </Button>
            <Button
              variant="ghost"
              className="px-2 py-1"
              onClick={() => setDialog({ kind: "rename" })}
            >
              Rename
            </Button>
            <Button variant="ghost" className="px-2 py-1 text-red-700" onClick={onDelete}>
              Delete
            </Button>
          </div>
        )}
      </div>
      <Alert tone="error">{remove.error?.message}</Alert>
      <div className="flex flex-wrap gap-2">
        {table.seats.map((seat) => (
          <SeatChip
            key={seat.id}
            seat={seat}
            disabled={!canEdit}
            onClick={() => setDialog({ kind: "seat", seat })}
          />
        ))}
        {table.seats.length === 0 && <p className="text-sm text-slate-500">No seats</p>}
      </div>

      {dialog?.kind === "seat" && (
        <SeatDialog seat={dialog.seat} hall={hall} categories={layout.categories} onClose={close} />
      )}
      {dialog?.kind === "rename" && <RenameTableDialog table={table} onClose={close} />}
      {dialog?.kind === "seats" && (
        <AddSeatsDialog table={table} hall={hall} layout={layout} onClose={close} />
      )}
    </Card>
  );
}

function SeatChip({ seat, disabled, onClick }) {
  const inactive = seat.status !== "active";
  const tooltip = [
    inactive && "Disabled",
    ...seat.features.map((feature) => SEAT_FEATURE_LABELS[feature]),
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={tooltip || undefined}
      className={cx(
        "min-w-14 rounded-md px-2 py-1.5 font-mono text-xs ring-1 disabled:cursor-default",
        inactive
          ? "bg-slate-100 text-slate-400 line-through ring-slate-200"
          : "bg-brand-light text-brand-dark ring-brand/30 hover:ring-brand",
      )}
    >
      {seat.label}
      {seat.features.length > 0 && <span className="ml-1 text-[10px]">•</span>}
    </button>
  );
}
