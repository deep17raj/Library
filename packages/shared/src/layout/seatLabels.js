// Seat and table naming for the layout editor. The admin app uses it to preview
// "10 tables × 6 seats" before saving; the server uses it to create the same rows.

/**
 * "A-" + 7 → "A-7". Labels are what people say out loud ("seat A-7").
 * @param {string} prefix
 * @param {number} number
 */
export function seatLabel(prefix, number) {
  return `${prefix}${number}`;
}

/**
 * Smallest number after every existing "<prefix><n>" label, so new seats continue
 * the sequence instead of clashing ("A-1…A-24" exist → 25).
 * @param {string[]} existingLabels
 * @param {string} prefix
 */
export function nextSeatNumber(existingLabels, prefix) {
  let highest = 0;
  for (const label of existingLabels) {
    if (!label.startsWith(prefix)) continue;
    const rest = label.slice(prefix.length);
    if (/^\d+$/.test(rest)) highest = Math.max(highest, Number(rest));
  }
  return highest + 1;
}

/**
 * Tables with their seat labels, numbered on from what the hall already has.
 * @param {{ existingTableCount: number, tableCount: number, seatsPerTable: number,
 *   seatPrefix: string, startNumber: number }} plan
 * @returns {{ label: string, seatLabels: string[] }[]}
 */
export function planTablesWithSeats({
  existingTableCount,
  tableCount,
  seatsPerTable,
  seatPrefix,
  startNumber,
}) {
  const tables = [];
  let number = startNumber;
  for (let index = 0; index < tableCount; index += 1) {
    const seatLabels = [];
    for (let seat = 0; seat < seatsPerTable; seat += 1) {
      seatLabels.push(seatLabel(seatPrefix, number));
      number += 1;
    }
    tables.push({ label: `Table ${existingTableCount + index + 1}`, seatLabels });
  }
  return tables;
}

/** @param {string[]} labels @returns {string[]} labels that appear more than once */
export function duplicateLabels(labels) {
  const seen = new Set();
  const duplicates = new Set();
  for (const label of labels) {
    const key = label.toLowerCase();
    if (seen.has(key)) duplicates.add(label);
    seen.add(key);
  }
  return [...duplicates];
}
