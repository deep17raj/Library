import { useState } from "react";
import { PERMISSIONS } from "@app/shared/constants";
import { Alert, Button, EmptyState, PageHeader, Spinner, cx } from "@app/shared/ui";
import { useCan } from "../../app/permissions.js";
import { useLayout } from "./api.js";
import { CategoriesCard } from "./components/CategoriesCard.jsx";
import { HallDialog } from "./components/HallDialog.jsx";
import { HallView } from "./components/HallView.jsx";
import { ICONS } from "../../app/icons.js";

/** Layout editor: seat categories, then one tab per hall with its tables and seats. */
export function LayoutPage() {
  const { data: layout, isLoading, error } = useLayout();
  const canEdit = useCan(PERMISSIONS.LAYOUT_MANAGE);
  const [selectedHallId, setSelectedHallId] = useState(null);
  const [addingHall, setAddingHall] = useState(false);

  const halls = layout?.halls || [];
  const hall = halls.find((h) => h.id === selectedHallId) || halls[0];

  return (
    <>
      <PageHeader
        icon={ICONS.layout}
        title="Halls & seats"
        description="Build your library's layout: halls, tables and numbered seats."
        actions={
          canEdit && (
            <Button onClick={() => setAddingHall(true)} icon={ICONS.add}>
              Add hall
            </Button>
          )
        }
      />
      {isLoading && <Spinner />}
      <Alert tone="error">{error?.message}</Alert>
      {layout && (
        <div className="flex flex-col gap-6">
          <CategoriesCard categories={layout.categories} canEdit={canEdit} />
          {halls.length === 0 ? (
            <EmptyState
              icon={ICONS.layout}
              title="No halls yet"
              description="Add a hall, then add its tables and seats in one step."
              action={
                canEdit && (
                  <Button onClick={() => setAddingHall(true)} icon={ICONS.add}>
                    Add hall
                  </Button>
                )
              }
            />
          ) : (
            <>
              <HallTabs halls={halls} selectedId={hall.id} onSelect={setSelectedHallId} />
              <HallView hall={hall} layout={layout} canEdit={canEdit} />
            </>
          )}
        </div>
      )}
      {layout && (
        <HallDialog
          open={addingHall}
          hall={null}
          categories={layout.categories}
          onClose={() => setAddingHall(false)}
          onSaved={(newLayout) => setSelectedHallId(newLayout.halls.at(-1)?.id ?? null)}
        />
      )}
    </>
  );
}

function HallTabs({ halls, selectedId, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-slate-200" role="tablist">
      {halls.map((hall) => (
        <button
          key={hall.id}
          type="button"
          role="tab"
          aria-selected={hall.id === selectedId}
          onClick={() => onSelect(hall.id)}
          className={cx(
            "whitespace-nowrap border-b-2 px-4 py-2 text-sm",
            hall.id === selectedId
              ? "border-brand font-medium text-brand-dark"
              : "border-transparent text-slate-600 hover:text-slate-900",
            hall.status === "disabled" && "opacity-60",
          )}
        >
          {hall.name}
        </button>
      ))}
    </div>
  );
}
