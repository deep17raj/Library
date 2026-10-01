import { nextSeatNumber } from "@app/shared/layout";

/** Every seat label in the library (labels are unique library-wide). */
export function allSeatLabels(layout) {
  return layout.halls.flatMap((hall) =>
    hall.tables.flatMap((table) => table.seats.map((s) => s.label)),
  );
}

/** "Hall A" → "A-", "Ground floor" → "G-": a sensible first guess for the seat prefix. */
export function suggestSeatPrefix(hallName) {
  const words = hallName.trim().split(/\s+/);
  const last = words.at(-1) || "";
  const letter = /^[A-Za-z]$/.test(last) ? last : (words[0]?.[0] ?? "S");
  return `${letter.toUpperCase()}-`;
}

/** Defaults for the numbering fields: continue after the highest existing number. */
export function numberingDefaults(layout, hallName) {
  const seatPrefix = suggestSeatPrefix(hallName);
  return { seatPrefix, startNumber: nextSeatNumber(allSeatLabels(layout), seatPrefix) };
}
