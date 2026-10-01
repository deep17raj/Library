import { useState } from "react";
import { formatRupees } from "@app/shared/money";
import { Badge, Button, Card } from "@app/shared/ui";
import { CategoryDialog } from "./CategoryDialog.jsx";
import { ICONS } from "../../../app/icons.js";

/** Price tiers for seats (e.g. "AC +₹300/month"), added to the slot fee. */
export function CategoriesCard({ categories, canEdit }) {
  const [editing, setEditing] = useState({ open: false, category: null });
  const close = () => setEditing({ open: false, category: null });

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Seat categories</h2>
          <p className="text-sm text-slate-600">
            Extra monthly charge for better seats, on top of the slot fee.
          </p>
        </div>
        {canEdit && (
          <Button
            variant="secondary"
            onClick={() => setEditing({ open: true, category: null })}
            icon={ICONS.add}
          >
            Add category
          </Button>
        )}
      </div>
      {categories.length === 0 ? (
        <p className="text-sm text-slate-500">None yet — every seat costs the same.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                disabled={!canEdit}
                onClick={() => setEditing({ open: true, category })}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-default"
              >
                <span className="font-medium">{category.name}</span>
                <span className="text-slate-600">
                  +{formatRupees(category.monthlySurchargePaise)}/month
                </span>
                {category.status === "archived" && <Badge>Archived</Badge>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <CategoryDialog open={editing.open} category={editing.category} onClose={close} />
    </Card>
  );
}
