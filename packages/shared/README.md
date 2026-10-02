# @app/shared

Code used by the **server and both apps**. One home per rule: if the server and a UI
both need it, it lives here.

| Folder | What |
|---|---|
| `constants/` | Roles, staff permissions (+ labels), API error codes, seat features, seating modes, payment modes, invoice kinds, expense categories (+ labels). |
| `money/` | Integer-paise helpers: parse rupee input, format for display, sum. |
| `time/` | Library-timezone helpers: "what is today's date in this library", display date/time/clock time, month grid for calendars. |
| `slots/` | Slot time maths in 30-minute cells: overlap, overnight wrap, in-slot check, sit-anywhere capacity; clock formatting. |
| `attendance/` | `evaluateCheckin` — which booking a check-in belongs to and whether the time is allowed (off/warn/block); `attendanceStreak`. |
| `billing/` | `subscriptionPrice` (plan + category surcharge), billing periods, `plannedInvoices` (which fee invoices a booking owes, first-month proration), dues (`summariseDues`, `ageingBucket`, `invoiceBalance`), `invoiceStatus` (label + tone) and `planAllocation` (which invoices a payment clears). |
| `layout/` | Seat/table numbering for bulk adds (`planTablesWithSeats`, `nextSeatNumber`). |
| `theme/` | `brandPalette(hex)` — one brand colour → the shades both apps use. |
| `validation/` | zod schemas — the same schema validates a form and its API route. |
| `api/` | `createApiClient` (fetch wrapper) + `ApiError`; used by both apps. |
| `icons/` | `ICONS` — the icon dictionary for both apps (one concept = one icon). Browser only. |
| `forms/` | `useSchemaForm` (react-hook-form + shared zod schema), `applyServerErrors`. Browser only. |
| `ui/` | React + Tailwind primitives: Button/IconButton, TextField (`trailing`)/MoneyField/PasswordField, SelectField, SegmentedControl, Checkbox, Alert, Badge, Card/SectionCard/PageHeader/EmptyState/StatCard/Skeleton, Dialog, ReceiptView, FeedbackProvider (`useToast`, `useConfirm`), `useBrandColor`. Browser only. How to use them: `docs/UI-GUIDE.md`. |

Rules: no Node-only or DOM-only APIs outside `ui/`, `icons/` and `forms/` (React, browser only); pure functions; tests next to code
(`*.test.js`, run with `npm test`).
