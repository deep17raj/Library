# @app/shared

Code used by the **server and both apps**. One home per rule: if the server and a UI
both need it, it lives here.

| Folder | What |
|---|---|
| `constants/` | Roles, staff permissions (+ labels), API error codes, seat features, seating modes, payment modes, invoice kinds, expense categories (+ labels). |
| `money/` | Integer-paise helpers: parse rupee input, format for display, sum. |
| `time/` | Library-timezone helpers: "what is today's date in this library". |
| `slots/` | Slot time maths in 30-minute cells: overlap, overnight wrap, in-slot check, sit-anywhere capacity; clock formatting. |
| `attendance/` | `evaluateCheckin` — which booking a check-in belongs to and whether the time is allowed (off/warn/block). |
| `billing/` | `subscriptionPrice` (plan + category surcharge), billing periods, `plannedInvoices` (which fee invoices a booking owes, first-month proration), dues (`summariseDues`, `ageingBucket`, `invoiceBalance`) and `planAllocation` (which invoices a payment clears). |
| `layout/` | Seat/table numbering for bulk adds (`planTablesWithSeats`, `nextSeatNumber`). |
| `theme/` | `brandPalette(hex)` — one brand colour → the shades both apps use. |
| `validation/` | zod schemas — the same schema validates a form and its API route. |
| `api/` | `createApiClient` (fetch wrapper) + `ApiError`; used by both apps. |
| `ui/` | React + Tailwind primitives: Button/IconButton, TextField/MoneyField, SelectField, SegmentedControl, Checkbox, Alert, Badge, Card/SectionCard/PageHeader/EmptyState/StatCard/Skeleton, Dialog, FeedbackProvider (`useToast`, `useConfirm`). Browser only. How to use them: `docs/UI-GUIDE.md`. |

Rules: no Node-only or DOM-only APIs outside `ui/`; pure functions; tests next to code
(`*.test.js`, run with `npm test`).
