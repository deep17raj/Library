import crypto from "node:crypto";
import { ERROR_CODES } from "@app/shared/constants";
import { AppError, notFound } from "../../http/AppError.js";
import { withTransaction } from "../../db/transaction.js";
import { bindDeps } from "../../lib/bindDeps.js";
import { byUser, recordAudit } from "../audit/audit.repository.js";
import * as expensesRepository from "./expenses.repository.js";

/**
 * @typedef {Object} ExpensesDeps
 * @property {import("mysql2/promise").Pool} db
 * @property {typeof expensesRepository} repo
 * @property {{ recordAudit: typeof recordAudit }} audit
 */

/** Money spent by the library (rent, electricity, salaries…). Voided, never deleted. */
export function createExpensesService({ db, repo = expensesRepository, audit = { recordAudit } }) {
  return bindDeps({ db, repo, audit }, { listExpenses, createExpense, voidExpense });
}

/** Expenses in a date range with totals (valid ones only) per category. @param {ExpensesDeps} deps */
async function listExpenses(deps, ctx, range) {
  const expenses = await deps.repo.listExpenses(deps.db, ctx.tenantId, range);
  const valid = expenses.filter((e) => e.status === "valid");
  const byCategory = {};
  for (const e of valid) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amountPaise;
  return { expenses, totalPaise: valid.reduce((sum, e) => sum + e.amountPaise, 0), byCategory };
}

/** @param {ExpensesDeps} deps */
async function createExpense(deps, ctx, input) {
  const id = crypto.randomUUID();
  await withTransaction(deps.db, async (tx) => {
    await deps.repo.insertExpense(tx, ctx.tenantId, { ...input, id, createdBy: ctx.actor.id });
    await deps.audit.recordAudit(
      tx,
      byUser(ctx.actor, "expense.create", "expense", id, { amountPaise: input.amountPaise }),
    );
  });
  return deps.repo.findExpense(deps.db, ctx.tenantId, id);
}

/** @param {ExpensesDeps} deps */
async function voidExpense(deps, ctx, id, { reason }) {
  const expense = await deps.repo.findExpense(deps.db, ctx.tenantId, id);
  if (!expense) throw notFound("Expense not found");
  if (expense.status === "void") {
    throw new AppError(422, ERROR_CODES.VALIDATION_FAILED, "Already void", {
      reason: "Already void",
    });
  }
  await withTransaction(deps.db, async (tx) => {
    await deps.repo.voidExpense(tx, ctx.tenantId, id, reason);
    await deps.audit.recordAudit(tx, byUser(ctx.actor, "expense.void", "expense", id, { reason }));
  });
  return deps.repo.findExpense(deps.db, ctx.tenantId, id);
}
