import { execute, queryAll, queryOne } from "../../db/transaction.js";

const toExpense = (row) =>
  row && {
    id: row.id,
    category: row.category,
    title: row.title,
    amountPaise: row.amount_paise,
    spentOn: row.spent_on,
    mode: row.mode,
    status: row.status,
    voidReason: row.void_reason,
    createdBy: row.created_by_name ?? null,
    createdAt: row.created_at,
  };

const SELECT_EXPENSE = `SELECT e.*, u.name AS created_by_name FROM expenses e LEFT JOIN users u ON u.id = e.created_by`;

export async function listExpenses(db, tenantId, { from, to }) {
  const rows = await queryAll(
    db,
    `${SELECT_EXPENSE} WHERE e.tenant_id = ? AND e.spent_on BETWEEN ? AND ? ORDER BY e.spent_on DESC, e.created_at DESC`,
    [tenantId, from, to],
  );
  return rows.map(toExpense);
}

export async function findExpense(db, tenantId, id) {
  return toExpense(
    await queryOne(db, `${SELECT_EXPENSE} WHERE e.tenant_id = ? AND e.id = ?`, [tenantId, id]),
  );
}

export async function insertExpense(db, tenantId, e) {
  await execute(
    db,
    `INSERT INTO expenses (id, tenant_id, category, title, amount_paise, spent_on, mode, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [e.id, tenantId, e.category, e.title, e.amountPaise, e.spentOn, e.mode, e.createdBy],
  );
}

export async function voidExpense(db, tenantId, id, reason) {
  await execute(
    db,
    "UPDATE expenses SET status = 'void', void_reason = ? WHERE tenant_id = ? AND id = ?",
    [reason, tenantId, id],
  );
}
