# expenses

Money the library spends (rent, electricity, internet, salaries, cleaning…). Every
route needs `expenses.manage`. Routes are thin enough that the router calls the
service directly (no separate controller file).

| Route | Does |
|---|---|
| `GET /api/admin/expenses?from=&to=` | expenses in the range, total and per-category totals (valid ones) |
| `POST /api/admin/expenses` | `{ category, title, amountPaise, spentOn, mode }` |
| `POST /api/admin/expenses/:id/void` | `{ reason }` — the row stays, marked void (money is never deleted) |

Categories and payment modes are shared constants (`@app/shared/constants`). The day
ledger (ledger module) reads expenses by `spent_on`.
