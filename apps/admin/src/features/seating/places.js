import { subscriptionPrice } from "@app/shared/billing";
import { SEATING_MODES } from "@app/shared/constants";

// Reading the layout from the seating point of view: where a seat is, what it costs.

/** @returns {Map<string, { seat: object, table: object, hall: object }>} */
export function indexSeats(layout) {
  const index = new Map();
  for (const hall of layout?.halls ?? []) {
    for (const table of hall.tables) {
      for (const seat of table.seats) index.set(seat.id, { seat, table, hall });
    }
  }
  return index;
}

/**
 * Monthly surcharge of a place: the seat's category in a fixed hall, the hall's
 * category in a sit-anywhere hall — the same rule the server prices with.
 */
export function placeSurcharge(layout, { seatId, hallId }) {
  const categories = new Map((layout?.categories ?? []).map((c) => [c.id, c]));
  if (seatId) {
    const found = indexSeats(layout).get(seatId);
    if (!found || found.hall.seatingMode !== SEATING_MODES.FIXED) return 0;
    return categories.get(found.seat.categoryId)?.monthlySurchargePaise ?? 0;
  }
  const hall = layout?.halls.find((h) => h.id === hallId);
  return categories.get(hall?.categoryId)?.monthlySurchargePaise ?? 0;
}

/** What the booking will cost per period, or null until a plan and place are chosen. */
export function previewPrice(layout, plan, place) {
  if (!plan || (!place.seatId && !place.hallId)) return null;
  return subscriptionPrice(plan, placeSurcharge(layout, place));
}

/** "Seat A-12, Hall A" / "Open Hall (sit anywhere)" */
export function describePlace(layout, { seatId, hallId }) {
  if (seatId) {
    const found = indexSeats(layout).get(seatId);
    return found ? `Seat ${found.seat.label}, ${found.hall.name}` : "Seat";
  }
  const hall = layout?.halls.find((h) => h.id === hallId);
  return hall ? `${hall.name} (sit anywhere)` : "";
}

/** Does a seat pass the seat picker's category / feature filters? ("none" = no category) */
export function seatMatches(seat, { categoryId, features }) {
  if (categoryId === "none" && seat.categoryId) return false;
  if (categoryId && categoryId !== "none" && seat.categoryId !== categoryId) return false;
  return features.every((feature) => seat.features.includes(feature));
}

/** Where a booking sits, for headings: "seat A-12" / "Open Hall (sit anywhere)". */
export function placeName(subscription) {
  return subscription.seat
    ? `seat ${subscription.seat.label}`
    : `${subscription.hall.name} (sit anywhere)`;
}
