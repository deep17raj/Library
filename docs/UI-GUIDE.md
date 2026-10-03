# UI guide — how every screen should look, read and feel

This is the design system for both apps (admin + student PWA). Read it before building
or changing any screen. CLAUDE.md requires every screen to pass the checklist in §9.

The people using this are library owners and desk staff — often on a phone, between
students, sometimes not fluent with software — and students on cheap Android phones.
"Premium" here means **calm, obvious and fast**, not decorative.

---

## 1. Principles

1. **Self-explanatory.** Every screen answers three questions without training:
   *Where am I?* (title + icon), *What can I do here?* (one obvious primary action),
   *What just happened?* (toast / inline result). A one-line description under the
   title says what the page is for.
2. **One primary action per view.** Filled brand button, top-right on desktop, full
   width at the bottom on phones. Everything else is secondary/ghost.
3. **Show, don't make them remember.** Show the price before saving, the seat numbers
   before creating them, the consequence before a destructive action ("This frees
   seat A-12 from today").
4. **Empty states teach.** A blank list explains what goes here and offers the action
   that fills it — never just "No data".
5. **Forgiving.** Server errors land on the field that caused them; nothing typed is
   lost on an error; destructive actions confirm with the exact consequence; money is
   voided, never deleted.
6. **Fast feel.** Skeletons/spinners only where loading is real; mutations show a busy
   button; lists keep old data while refreshing (`keepPreviousData`).
7. **Consistent words and icons.** One concept = one word = one icon, everywhere (§4).

## 2. Visual tokens

| Token | Value | Use |
|---|---|---|
| Font | Inter (variable, self-hosted via `@fontsource-variable/inter`) | everything; tabular numbers (`tabular-nums`) for money and counts |
| Page background | `slate-50` | behind cards |
| Surface | white card, `rounded-2xl`, `ring-1 ring-slate-200/70`, `shadow-sm` | grouping |
| Brand | library's colour → CSS vars `--brand`, `--brand-dark`, `--brand-light` | primary buttons, active nav, focus rings, selected items |
| Success | emerald | paid, free seat, saved |
| Warning | amber | due soon, partly used seat, offered |
| Danger | red | overdue, void, delete, errors |
| Info | sky | hints, neutral notices |
| Muted text | `slate-500` (hints), `slate-600` (secondary), `slate-900` (primary) |

Type scale: page title `text-2xl font-semibold tracking-tight`; section title
`text-base font-semibold`; body `text-sm`; hints `text-xs text-slate-500`; big numbers
on stat cards `text-2xl font-semibold tabular-nums`.

Spacing: 4-px grid. Page gutter `px-4 md:px-8`, sections `gap-6`, inside cards `p-5`,
form fields `gap-4`. Max readable width for forms `max-w-3xl`.

Radius: inputs/buttons `rounded-xl`; cards `rounded-2xl`; pills `rounded-full`.

Motion: 150 ms colour/opacity transitions only; no bouncing. Respect
`prefers-reduced-motion`.

## 3. Layout

- **Admin shell:** left sidebar (240 px) with the library logo/name, **grouped** nav
  with icons, and the signed-in user at the bottom. On phones: top bar with the
  library name + menu button; the sidebar slides in over a dimmed page.
- **Page:** `PageHeader` (icon tile + title + one-line description + actions), then
  content. Detail pages add a back link above the header.
- **Lists** on desktop are tables or rows inside one card; on phones rows stack
  (secondary details move under the name).
- **Dialogs** for short focused tasks (≤ 6 fields). Longer tasks get a page
  (Add member).
- **Student app shell:** sticky header with the library's logo (or library icon) and
  name; one column (max 512 px); bottom tab bar — Home, Check-in, Fees, Me (Tests joins
  in M9–10) — with the active tab's icon on a brand pill. Touch targets ≥ 44 px, inputs
  16 px (no iPhone zoom), safe-area padding top and bottom. Everything is in the
  library's brand colour (`useBrandColor`).

## 4. Icon dictionary (lucide-react)

Always use these icons for these concepts. Size 16 in buttons/inline, 18 in nav,
20 in page-header tiles. Icons accompany text; an icon alone needs an `aria-label`.

| Concept | Icon | Concept | Icon |
|---|---|---|---|
| Dashboard | `LayoutDashboard` | Payments / collect | `IndianRupee` |
| Seat map | `Armchair` | Receipt | `ReceiptText` |
| Members / student | `Users` / `User` | Dues / overdue | `AlarmClock` |
| Add member | `UserPlus` | Expenses | `Wallet` |
| Waitlist | `Hourglass` | Day ledger | `BookOpenCheck` |
| Halls & seats | `LayoutGrid` | Deposit | `ShieldCheck` |
| Time slots | `Clock` | Refund | `Undo2` |
| Staff | `UserCog` | Discount | `BadgePercent` |
| Settings | `Settings` | Charge / invoice | `FileText` |
| Libraries (platform) | `Building2` | Export CSV | `Download` |
| Platform settings | `SlidersHorizontal` | Print | `Printer` |
| Change password | `KeyRound` | Check-in desk | `QrCode` |
| Sign out | `LogOut` | Attendance / checked-in | `CalendarCheck` / `LogIn` |
| Mark present | `UserCheck` | Mark absent | `UserX` |
| Add | `Plus` | Notifications | `Bell` |
| Edit | `Pencil` | Insights | `TrendingUp` |
| Delete / void | `Trash2` / `Ban` | Mock tests (M9–10) | `GraduationCap` |
| Move seat | `MoveRight` | Timer (attempt) | `Timer` |
| Swap | `ArrowLeftRight` | Search | `Search` |
| End booking | `LogOut` (danger) | Filter | `Filter` |
| Phone | `Phone` | Calendar/date | `CalendarDays` |
| Cash | `Banknote` | UPI | `Smartphone` |
| Card | `CreditCard` | Bank | `Landmark` |
| Cheque | `FileCheck` | Other | `CircleDollarSign` |
| Success | `CircleCheck` | Warning | `TriangleAlert` |
| Error | `CircleX` | Info / help | `Info` |

The mapping lives in code at `packages/shared/src/icons/index.js`
(`import { ICONS } from "@app/shared/icons"`), used by **both** apps, so a concept's
icon is changed in one place. Student-app concepts: home `House`, profile/Me
`CircleUserRound`, scan `ScanLine`, streak `Flame`, membership card `IdCard`,
notifications `Bell` / `BellOff`, install app `Smartphone`, address `MapPin`;
`close` `X`, `previous`/`next` `ChevronLeft`/`ChevronRight`.

## 5. Components (`@app/shared/ui`)

| Component | Use it for | Notes |
|---|---|---|
| `Button` | actions | `variant`: primary · secondary · ghost · danger · subtle; `size`: sm · md; `icon` prop puts an icon before the label; `busy` disables + spins |
| `IconButton` | toolbars, row actions | requires `label` (becomes `aria-label` + tooltip) |
| `PageHeader` | top of every page | `icon`, `title`, `description`, `actions`, optional `back` link; inside the admin shell (`PageTitleContext`) the heading hides on phones and the title moves to the top bar |
| `Card` / `SectionCard` | grouping | `SectionCard` adds `title`, `icon`, `description`, `actions` header |
| `StatCard` | one number that matters | `label`, `value`, `icon`, `tone`, `hint`; numbers `tabular-nums`; rows of four use `grid-cols-2` on phones |
| `EmptyState` | empty lists | `icon`, `title`, `description` (what goes here + why), `action` |
| `Badge` | statuses | tones: green · amber · red · slate · brand; `dot` for a status dot |
| `Alert` | inline notices | tones with built-in icons; optional `title` |
| `TextField` / `SelectField` / `MoneyField` | forms | label above, `hint` below, error replaces hint; `MoneyField` shows ₹; `trailing` puts a small button inside the right edge; 16 px text on phones |
| `PasswordField` | any password | lock icon + show/hide button (seeing it beats typing twice) |
| `ReceiptView` | a receipt, admin and student | the one printable receipt layout; pages add only their own buttons (`no-print`) |
| `useBrandColor(color)` | app shells | paints the `brand` colours + browser theme colour from the library's colour |
| `Checkbox` | multi-choice | label right, optional description |
| `SegmentedControl` | 2–6 exclusive choices shown at once | payment mode, seating mode, filters |
| `Dialog` / `FormDialog` (admin app) | short tasks | title says the task ("Collect payment from Ravi") |
| `useConfirm()` | destructive/irreversible actions | never `window.confirm`; message states the consequence; danger button names the action ("Void receipt R-12") |
| `useToast()` | "what just happened" | success after every save; error only when not shown inline |
| `Spinner` / `Skeleton` | loading | skeleton for lists/cards, spinner for small areas |

## 6. Patterns

**Forms.** Label above every field; hints for anything non-obvious (format, effect);
validate on blur with the shared schema; server errors on the matching field;
primary submit at the end (dialogs: footer right). Default values that are usually
right (today's date, the slot's default plan, the outstanding amount).

**Money.** Always `formatRupees` (₹1,25,000; paise only when present). Inputs are
rupees (`MoneyField`), the API takes paise. Totals right-aligned, `tabular-nums`.
Owed amounts red, paid green, credit brand. Never show a raw paise number.

**Dates & times.** `displayDate` ("1 Oct 2026"), `displayDateTime`, slot times
`displaySlotTimes` ("6:00 am – 12:00 pm"). Relative words where they help
("due in 3 days", "12 days overdue").

**Statuses** are badges with fixed tones: active/paid/free → green; due/partial/
offered/waiting → amber; overdue/void/cancelled/disabled/suspended → red;
ended/archived/converted → slate.

**Destructive actions** (end booking, void payment, delete hall, suspend library):
`useConfirm` with the consequence and the reversibility ("The receipt stays on record
as void"). Danger button, specific label.

**After a save:** close the dialog, toast "Saved"/specific ("Payment of ₹800
received — receipt R-000123"), refresh affected lists automatically.

**Lists:** search box with `Search` icon first, filters next, count in the page
description ("24 members"), pagination at the bottom; rows link to detail pages.

**Seat colours** (seat map, pickers): free = emerald, used in other slots = amber,
taken = brand, disabled = slate with strike-through. Always with a legend + counts.

## 7. Words (copy)

- Plain words people say at the desk: "Collect payment", "Seat", "Slot", "Dues",
  "Receipt", "Release seat". Not "allocation", "subscription", "entity".
  (Code says *subscription*; screens say **booking**.)
- Buttons are verbs + object: "Add member", "Collect ₹800", "Void receipt".
- Errors say what to do: "Seat A-1 is taken at this time by Ravi (Morning). Pick
  another seat." — never "Error 409".
- Indian conventions: ₹, lakh grouping (`en-IN`), 12-hour times with am/pm,
  dates as "1 Oct 2026", mobile numbers as 10 digits.

## 8. Accessibility & responsiveness

- Text contrast ≥ 4.5:1; never rely on colour alone (badges have text, seats show a
  name or "—").
- Every input has a label; icon-only buttons have `aria-label`.
- Visible focus ring (`ring-brand`) on every interactive element; dialogs use the
  native `<dialog>` (focus trap + Esc).
- Works at 360 px wide: no horizontal scroll except intentional tab strips; tables
  collapse to stacked rows; touch targets ≥ 40 px.

## 9. Screen checklist (every new or changed screen)

- [ ] `PageHeader` with the concept's icon (§4), title and a one-line description
- [ ] One primary action; secondary actions visually quieter
- [ ] Empty state with icon, explanation and action
- [ ] Loading state (skeleton or spinner) and error state (`Alert`)
- [ ] Success toast after every save; destructive actions via `useConfirm`
- [ ] Money via `formatRupees`/`MoneyField`, dates via shared helpers
- [ ] Statuses as badges with the fixed tones (§6)
- [ ] Hints on non-obvious fields; server errors land on fields
- [ ] Checked at 360 px and desktop; keyboard reachable; icon buttons labelled
- [ ] Words from §7 (booking, seat, dues — not internal names)

## 10. Screen notes — built so far

| Screen | Key UX decisions |
|---|---|
| Login | Brand panel + form card; one field per line; error above the form |
| Dashboard | Today at a glance: stat cards (active members, today's collection, dues, free seats) + quick actions (Add member, Collect payment, Seat map) |
| Seat map | Hall tabs + slot chips; colour legend with counts; tile shows seat + who's in it now; click → panel with occupants per slot and actions |
| Members | Search-first; rows show photo/initials, code, phone, where they sit |
| Add member | Page, not dialog. Sections: Student → Seat bookings → Joining charges. Seat picker shows only seats free in the chosen slot, with filters; live fee; "Booking 2: …" errors on that row |
| Member page | Profile left; Bookings, Billing (dues summary, invoices, payments) and history right. Collect payment is the primary action when they owe |
| Waitlist | Queue position first (#1, #2); "Seat now" opens Add member pre-filled |
| Halls & seats | Hall tabs; "Add tables" shows a preview of seat numbers before saving |
| Slots & fees | Day timeline makes overlaps visible; each slot card lists its plans |
| Staff | Permission checklist in plain words; permissions you lack are locked |
| Settings | Profile, branding (live colour), billing rules and check-in rules, each choice with an example of what it means |
| Collect payment (dialog) | Amount pre-filled with what's due; payment-mode `SegmentedControl` with icons; reference only for non-cash; "what it clears" preview; success toast with receipt no. + Print |
| Dues | Total overdue as a stat; ageing buckets (0–7, 8–30, 30+) as a `SegmentedControl`; each row has Collect |
| Payments | Date range + mode filter; totals and by-mode at top; receipt and void per row; CSV |
| Receipt | Printable, thermal-friendly; logo/name/address, receipt no., what was paid for, balance after; VOID watermark when voided |
| Expenses | Month view, category stats, add dialog (category + mode), void (never delete) |
| Day ledger | Date stepper (‹ today ›); collected/spent by mode; **Cash in hand** as the hero card |
| Check-in desk | Two cards: the QR + today's code in large mono digits + present count; a phone box that sends the on-screen code. Result as a green/amber/red `Alert` (welcome / outside slot / dues) |
| Attendance | Date stepper + slot `SegmentedControl`; present count stat; rows show slot/seat, in/out times, Outside-slot and Dues badges; "Mark present" searches students; CSV |
| Member page → Student app card | Status badge (Not using / Waiting for first sign-in / Using, last signed in); "Give app access" or "Reset password" (confirm first). The one-time code is shown **once** in a dialog: huge mono digits, Copy, the 3 steps to read out, the app QR |
| Settings → Student app | The app link + QR to print for the notice board, Copy link |

**Student app** (milestone 7)

| Screen | Key UX decisions |
|---|---|
| Sign in | Library logo/name big at the top (it's *their* library's app); phone + password; footer says how to get a code at the desk + tap-to-call; a bad link says so plainly |
| Choose password | First time: "Hi Ravi, choose your password", the field is labelled "Code from the desk"; after saving → where they were going (e.g. a scanned check-in link) |
| Home | Greeting by library time; **Today** card (checked in or not + Check in/out button); a card per booking with the seat number big, "Now" + time left during the slot; Fees card in red/amber/green; Attendance link; dismissible Install card (never a pop-up) |
| Check-in | Best first: in-app scanner (Android) → phone camera link (`?code=`, checks in by itself, code then removed from the address) → typed code. Result fills the screen: green welcome / amber "noted: outside slot, fees due" / red with the reason and what to do |
| Attendance | Two stats (in a row 🔥, this month); wall calendar, present days filled, staff-marked absent ringed red, today outlined; visit list with in–out times |
| Fees | One stat that matches the mood (due now red / next fee amber / all paid green); Bills with status badges; Receipts → the shared receipt with Print / PDF. "Fees are paid at the desk" |
| Me | Digital membership card (logo, photo/initials, name, member ID, seats); attendance, change password, install rows; notifications on/off with this phone marked; library address + call; Sign out |

## 11. Screen notes — still to build (follow these)

**Notifications & insights (milestone 8)** ✅ Built.
- Admin: Notifications page lists history, ComposeDialog has audience picker + live count.
  Insights page shows occupancy by slot, revenue, dues ageing, new-vs-churned table.
- Student: Notices tab with unread badge; mark-read on tap; paginated inbox.
- Settings → Billing rules: auto-release toggle, fee reminder days, grace days.

**Mock tests (milestones 9–10)**
- Store: cards by exam with price (member price highlighted), "Free" badge.
- Attempt: distraction-free full screen, timer always visible (amber < 5 min, red
  < 1 min), question palette (answered / marked / not visited colours + legend),
  autosave indicator ("Saved"), confirm before submit showing unanswered count.
- Result: score ring, accuracy, rank, per-section bars, then solutions.
