# @app/shared

Code used by the **server and both apps**. One home per rule: if the server and a UI
both need it, it lives here.

| Folder | What |
|---|---|
| `constants/` | Roles, staff permissions (+ labels), API error codes, seat features, seating modes. |
| `money/` | Integer-paise helpers: parse rupee input, format for display, sum. |
| `time/` | Library-timezone helpers: "what is today's date in this library". |
| `layout/` | Seat/table numbering for bulk adds (`planTablesWithSeats`, `nextSeatNumber`). |
| `theme/` | `brandPalette(hex)` — one brand colour → the shades both apps use. |
| `validation/` | zod schemas — the same schema validates a form and its API route. |
| `api/` | `createApiClient` (fetch wrapper) + `ApiError`; used by both apps. |
| `ui/` | React + Tailwind primitives (Button, TextField, Dialog, …). Browser only. |

Rules: no Node-only or DOM-only APIs outside `ui/`; pure functions; tests next to code
(`*.test.js`, run with `npm test`).
