# Insights module

Read-only analytics for library owners and staff with `insights.view` permission.

## Charts

Each endpoint answers one question with labelled numbers:

- **Occupancy** (`/insights/occupancy`) — "How full is each slot?" — active
  bookings per slot as a percentage of total active seats.
- **Revenue** (`/insights/revenue`) — "How much did we collect each month?" —
  payments allocated to non-deposit invoices, last 6 months.
- **Dues ageing** (`/insights/dues`) — "How old are the unpaid bills?" — buckets
  0–7, 8–30, 30+ days with amounts and member counts.
- **Churn** (`/insights/churn`) — "Are we growing or shrinking?" — new
  subscriptions vs left/unpaid endings, per month.
- **Attendance** (`/insights/attendance?month=`) — "How regularly do students
  come?" — present days vs expected for each slot in the given month.
