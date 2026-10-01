/**
 * The whole layout of a library in one response: categories, and halls → tables →
 * seats in display order. Every layout change answers with this, so the editor
 * and the seat map always redraw from one consistent picture.
 * @param {import("./layoutRules.js").LayoutDeps} deps
 */
export async function getLayout(deps, ctx) {
  const [categories, halls, tables, seats] = await Promise.all([
    deps.categories.listCategories(deps.db, ctx.tenantId),
    deps.repo.listHalls(deps.db, ctx.tenantId),
    deps.repo.listTables(deps.db, ctx.tenantId),
    deps.repo.listSeats(deps.db, ctx.tenantId),
  ]);
  return { categories, halls: assembleHalls(halls, tables, seats) };
}

/** Pure: nest flat rows (already sorted by sort_order) into halls → tables → seats. */
export function assembleHalls(halls, tables, seats) {
  const seatsByTable = groupBy(seats, (seat) => seat.tableId);
  const tablesByHall = groupBy(tables, (table) => table.hallId);
  return halls.map((hall) => ({
    ...hall,
    tables: (tablesByHall.get(hall.id) || []).map((table) => ({
      ...table,
      seats: seatsByTable.get(table.id) || [],
    })),
  }));
}

function groupBy(items, keyOf) {
  const groups = new Map();
  for (const item of items) {
    const key = keyOf(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}
