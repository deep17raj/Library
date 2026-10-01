import { ALL_SEAT_FEATURES, SEAT_FEATURE_LABELS } from "@app/shared/constants";
import { formatRupees } from "@app/shared/money";
import { cx } from "@app/shared/ui";

/** Narrow the seat picker by price category and seat features. */
export function PlaceFilters({ categories, filters, onChange }) {
  const active = categories.filter((c) => c.status === "active");
  const toggleFeature = (feature) =>
    onChange({
      ...filters,
      features: filters.features.includes(feature)
        ? filters.features.filter((f) => f !== feature)
        : [...filters.features, feature],
    });

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {active.length > 0 && (
        <select
          aria-label="Seat category"
          value={filters.categoryId}
          onChange={(event) => onChange({ ...filters, categoryId: event.target.value })}
          className="rounded-md border border-slate-300 bg-white px-2 py-1"
        >
          <option value="">Any category</option>
          <option value="none">Standard (no extra)</option>
          {active.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name} (+{formatRupees(category.monthlySurchargePaise)})
            </option>
          ))}
        </select>
      )}
      {ALL_SEAT_FEATURES.map((feature) => (
        <button
          key={feature}
          type="button"
          onClick={() => toggleFeature(feature)}
          className={cx(
            "rounded-full px-2.5 py-1 ring-1",
            filters.features.includes(feature)
              ? "bg-brand-light text-brand-dark ring-brand"
              : "text-slate-600 ring-slate-300",
          )}
        >
          {SEAT_FEATURE_LABELS[feature]}
        </button>
      ))}
    </div>
  );
}
