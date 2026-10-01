# @app/shared

Code used by the **server and both apps**. One home per rule: if the server and a UI
both need it, it lives here.

| Folder | What |
|---|---|
| `constants/` | Roles, staff permissions, API error codes. |
| `money/` | Integer-paise helpers: parse rupee input, format for display, sum. |
| `time/` | Library-timezone helpers: "what is today's date in this library". |
| `validation/` | zod schemas — the same schema validates a form and its API route. |
| `api/` | `createApiClient` (fetch wrapper) + `ApiError`; used by both apps. |
| `ui/` | React + Tailwind primitives (Button, TextField, Dialog, …). Browser only. |

Rules: no Node-only or DOM-only APIs outside `ui/`; pure functions; tests next to code
(`*.test.js`, run with `npm test`).
