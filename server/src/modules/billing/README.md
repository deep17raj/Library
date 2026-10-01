# billing

A member's money: **invoices** (what is owed), **payments** (what came in),
**allocations** (which payment paid which invoice), **credit** (paid in advance),
**discounts**, **deposit refunds** and the **dues** list. docs/ARCHITECTURE.md §8.

| Route | Who | Does |
|---|---|---|
| `GET /api/admin/members/:memberId/account` | any staff | `{ summary, creditPaise, invoices, payments, refunds }` (invoices synced first) |
| `GET /api/admin/dues` | any staff | members owing now, oldest first, days overdue + bucket, totals per bucket |
| `POST /api/admin/payments` | `payments.collect` | `{ memberId, amountPaise, mode, reference?, note?, invoiceIds?, receivedOn? }` → receipt |
| `GET /api/admin/payments?from=&to=&mode=` | `payments.collect` | receipts in range, total, per-mode totals |
| `GET /api/admin/payments/:id` | `payments.collect` | receipt: payment, what it paid, credit left, library header |
| `POST /api/admin/payments/:id/void` | `payments.void` | `{ reason }` — stays on record as void, its invoices are owed again |
| `POST /api/admin/invoices` | `payments.collect` | other charge `{ memberId, description, amountPaise, dueOn? }` |
| `PATCH /api/admin/invoices/:id/discount` | `payments.void` | `{ discountPaise, reason }` (≤ unpaid part) |
| `POST /api/admin/invoices/:id/void` | `payments.void` | cancel an **unpaid** charge |
| `POST /api/admin/invoices/:id/refund` | `payments.void` | refund (part of) a paid deposit |

## Rules
1. **Invoices are generated** from each subscription's terms with shared
   `plannedInvoices`: one seat-fee (+ locker) invoice per started period, `advance` due
   on the period's first day, `arrears` when it ends; month-start libraries charge the
   short first month in full or prorated (D5, to the rupee). Each has a `dedupe_key`,
   so generation can run any number of times (`invoicing.js`): when a member's
   account is opened, before a payment, from the dues list, and hourly (jobs).
2. **Admission fee and deposit** are invoiced when the member is added (same
   transaction, via `createJoiningInvoices`).
3. **Payments** take the next receipt number (`counters`, per library), then pay the
   invoices the staff picked, then the oldest due (shared `planAllocation`). Extra
   money is **credit**: unallocated payment money, applied automatically to new invoices
   (`applyCredit`).
4. **Voiding** never deletes: the payment is marked void, its allocations are removed
   (listed in the audit row) and those invoices are owed again; remaining credit is
   re-applied. A payment whose deposit was already refunded can't be voided.
5. `invoices.paid_paise`/`status` only change through `addPaid`, `setDiscount` and
   `voidInvoice`, always together with allocation rows.
6. Every change locks the **member** row first (same lock order as seating), so a
   payment and an invoice sync for one member never interleave.

## Files
`billing.service.js` (factory) · `invoicing.js` · `allocation.js` · `account.js`
(account view, charges, discounts, void invoice) · `payments.js` (collect, receipt,
list, void, deposit refund) · `dues.js` · SQL in `invoices.repository.js` and
`payments.repository.js`.
