import crypto from "node:crypto";
import { changeLayout } from "./layoutRules.js";
import { getLayout } from "./layoutTree.js";
import { notFound } from "../../http/AppError.js";

// Seat categories are price tiers (decision D6): "AC +₹300/month". They are
// archived, never deleted, because subscriptions will record the price they used.

/** @param {import("./layoutRules.js").LayoutDeps} deps */
export async function createCategory(deps, ctx, input) {
  const existing = await deps.categories.listCategories(deps.db, ctx.tenantId);
  const category = { id: crypto.randomUUID(), ...input, sortOrder: existing.length };
  await changeLayout(deps, ctx, ["category.create", "seat_category", category.id, input], (tx) =>
    deps.categories.insertCategory(tx, ctx.tenantId, category),
  );
  return getLayout(deps, ctx);
}

/** @param {import("./layoutRules.js").LayoutDeps} deps */
export async function updateCategory(deps, ctx, id, patch) {
  if (!(await deps.categories.findCategory(deps.db, ctx.tenantId, id))) {
    throw notFound("Seat category not found");
  }
  await changeLayout(deps, ctx, ["category.update", "seat_category", id, patch], (tx) =>
    deps.categories.updateCategory(tx, ctx.tenantId, id, patch),
  );
  return getLayout(deps, ctx);
}
