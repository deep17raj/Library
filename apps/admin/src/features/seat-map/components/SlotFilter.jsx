import { displaySlotTimes } from "@app/shared/slots";
import { cx } from "@app/shared/ui";

/** "Whole day" + one chip per slot. */
export function SlotFilter({ slots, value, onChange }) {
  const chip = (id, label, title) => (
    <button
      key={id || "all"}
      type="button"
      title={title}
      onClick={() => onChange(id)}
      className={cx(
        "rounded-full px-3 py-1 text-sm ring-1",
        value === id
          ? "bg-brand text-white ring-brand"
          : "bg-white text-slate-700 ring-slate-300 hover:ring-brand",
      )}
    >
      {label}
    </button>
  );
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {chip("", "Whole day")}
      {slots.map((slot) => chip(slot.id, slot.name, displaySlotTimes(slot)))}
    </div>
  );
}
