import { useState } from "react";
import { SEATING_MODES } from "@app/shared/constants";
import { formatRupees } from "@app/shared/money";
import { Alert, Badge, Button, Card, EmptyState } from "@app/shared/ui";
import { useLayoutAction } from "../api.js";
import { AddTablesDialog } from "./AddTablesDialog.jsx";
import { HallDialog } from "./HallDialog.jsx";
import { TableCard } from "./TableCard.jsx";

/** One hall: its summary, actions and tables. */
export function HallView({ hall, layout, canEdit }) {
  const [dialog, setDialog] = useState(null); // "edit" | "tables" | null
  const remove = useLayoutAction("deleteHall");
  const seats = hall.tables.flatMap((table) => table.seats);
  const activeSeats = seats.filter((seat) => seat.status === "active").length;

  const onDelete = () => {
    if (
      window.confirm(
        `Delete ${hall.name} with its ${hall.tables.length} tables and ${seats.length} seats?`,
      )
    ) {
      remove.mutate({ id: hall.id });
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">{hall.name}</h2>
            <Badge tone={hall.seatingMode === SEATING_MODES.FIXED ? "slate" : "amber"}>
              {hall.seatingMode === SEATING_MODES.FIXED ? "Fixed seats" : "Sit anywhere"}
            </Badge>
            {hall.status === "disabled" && <Badge tone="red">Disabled</Badge>}
          </div>
          <p className="mt-1 text-slate-600">
            {hall.tables.length} tables · {activeSeats} active seats
            {seats.length > activeSeats && ` (${seats.length - activeSeats} disabled)`}
            {categoryNote(hall, layout.categories)}
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setDialog("tables")}>Add tables</Button>
            <Button variant="secondary" onClick={() => setDialog("edit")}>
              Edit hall
            </Button>
            <Button
              variant="ghost"
              className="text-red-700"
              busy={remove.isPending}
              onClick={onDelete}
            >
              Delete
            </Button>
          </div>
        )}
      </Card>
      <Alert tone="error">{remove.error?.message}</Alert>

      {hall.tables.length === 0 ? (
        <EmptyState
          title="No tables in this hall"
          description="Use “Add tables” to create tables with numbered seats."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {hall.tables.map((table) => (
            <TableCard key={table.id} table={table} hall={hall} layout={layout} canEdit={canEdit} />
          ))}
        </div>
      )}

      <HallDialog
        open={dialog === "edit"}
        hall={hall}
        categories={layout.categories}
        onClose={() => setDialog(null)}
      />
      <AddTablesDialog
        open={dialog === "tables"}
        hall={hall}
        layout={layout}
        onClose={() => setDialog(null)}
      />
    </section>
  );
}

function categoryNote(hall, categories) {
  const category = categories.find((c) => c.id === hall.categoryId);
  if (!category) return "";
  return ` · ${category.name} +${formatRupees(category.monthlySurchargePaise)}/month`;
}
