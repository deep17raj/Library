# ledger

Read-only views over the library's money: the **day ledger**, the **dashboard**
numbers and **CSV exports**. It owns no tables; it reads payments, deposit refunds and
expenses, and asks the billing and expenses services for lists.

| Route | Who | Does |
|---|---|---|
| `GET /api/admin/ledger?date=` | `payments.collect` | one library-local day: collected by mode, spent by mode, deposit refunds, deposits received, earned, net, **cash in hand** |
| `GET /api/admin/dashboard` | any staff | today's collection, dues total + longest overdue, active members/bookings, waiting, seats, bookings per slot |
| `GET /api/admin/export/payments.csv?from=&to=` | `payments.collect` | receipts in the range |
| `GET /api/admin/export/expenses.csv?from=&to=` | `expenses.manage` | expenses in the range |
| `GET /api/admin/export/dues.csv` | `payments.collect` | who owes, how much, since when |
| `GET /api/admin/export/members.csv` | `members.manage` | all members |

Rules
- **Deposits are held, not earned:** `earnedPaise` = collected − deposits received.
- **Cash in hand** = cash payments − cash expenses − cash refunds for that day.
- CSVs (`lib/csv.js`): UTF-8 with BOM (Excel shows ₹ and names), rupees with two
  decimals, and text starting with `= + - @` prefixed with `'` so a member's name can't
  run as a spreadsheet formula.
