// How slots and plans are shown in the admin app.

// Slots get a colour so the timeline and (later) the seat map tell them apart.
// A slot without a chosen colour takes one from this list by its position.
const PALETTE = ["#f59e0b", "#0ea5e9", "#8b5cf6", "#10b981", "#ef4444", "#64748b"];

export function slotColor(slot, index) {
  return slot.color || PALETTE[index % PALETTE.length];
}

/** "1 month", "3 months", "15 days" */
export function planLength({ periodUnit, periodCount }) {
  const unit = periodUnit === "month" ? "month" : "day";
  return `${periodCount} ${unit}${periodCount === 1 ? "" : "s"}`;
}
