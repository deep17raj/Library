import { Link } from "react-router-dom";
import { formatRupees } from "@app/shared/money";
import { displayDate } from "@app/shared/time";
import { displaySlotTimes } from "@app/shared/slots";
import { PERMISSIONS } from "@app/shared/constants";
import { Alert, Card, SectionCard, Skeleton, StatCard } from "@app/shared/ui";
import { ICONS } from "@app/shared/icons";
import { useCan } from "../../app/permissions.js";
import { useSession } from "../../app/session.js";
import { useDashboard } from "../ledger/api.js";

/** Today at a glance + the things people do most (UI-GUIDE §10 Dashboard). */
export function DashboardPage() {
  const { data: user } = useSession();
  const { data, isLoading, error } = useDashboard();
  const firstName = user.name.split(" ")[0];

  return (
    <div className="flex flex-col gap-6">
      <Hero firstName={firstName} today={data?.today} data={data} />
      <Alert tone="error">{error?.message}</Alert>
      {isLoading && <Skeleton rows={3} />}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard
              icon={ICONS.dues}
              tone={data.outstandingPaise ? "red" : "green"}
              label="Owed now"
              value={formatRupees(data.outstandingPaise)}
              hint={`${data.membersOwing} students`}
            />
            <StatCard
              icon={ICONS.members}
              label="Active members"
              value={data.activeMembers}
              hint={`${data.activeBookings} seat bookings`}
            />
            <StatCard
              icon={ICONS.waitlist}
              tone="amber"
              label="Waiting for a seat"
              value={data.waiting}
              hint={`${data.seats} seats in the library`}
            />
            <StatCard
              icon={ICONS.receipt}
              tone="green"
              label="Receipts today"
              value={data.paymentsToday}
              hint={`${formatRupees(data.collectedTodayPaise)} collected`}
            />
          </div>
          <QuickActions />
          <div className="grid gap-6 lg:grid-cols-2">
            <SlotFill slots={data.slots} seats={data.seats} />
            <LongestOverdue members={data.longestOverdue} />
          </div>
        </>
      )}
    </div>
  );
}

/** The app-style header: a brand gradient card with the greeting and today's takings. */
function Hero({ firstName, today, data }) {
  return (
    <Card className="bg-gradient-to-br from-brand to-brand-dark text-white ring-0">
      <p className="text-sm text-white/80">
        Hello, {firstName}
        {today && ` · ${displayDate(today)}`}
      </p>
      <p className="mt-3 text-xs font-medium uppercase tracking-wider text-white/70">
        Collected today
      </p>
      <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight">
        {data ? formatRupees(data.collectedTodayPaise) : "—"}
      </p>
      {data && (
        <p className="mt-1 text-sm text-white/80">
          {data.paymentsToday} {data.paymentsToday === 1 ? "receipt" : "receipts"} ·{" "}
          {formatRupees(data.outstandingPaise)} still owed
        </p>
      )}
    </Card>
  );
}

const QUICK_ACTIONS = [
  { to: "/checkin", label: "Check-in", icon: ICONS.checkin, permission: null },
  {
    to: "/members/new",
    label: "Add member",
    icon: ICONS.addMember,
    permission: PERMISSIONS.MEMBERS_MANAGE,
  },
  { to: "/seat-map", label: "Seat map", icon: ICONS.seatMap, permission: null },
  { to: "/dues", label: "Dues", icon: ICONS.dues, permission: null },
];

/** The four big tap targets for what staff do most — the app's home-screen shortcuts. */
function QuickActions() {
  const canManageMembers = useCan(PERMISSIONS.MEMBERS_MANAGE);
  const actions = QUICK_ACTIONS.filter(
    (action) => action.permission !== PERMISSIONS.MEMBERS_MANAGE || canManageMembers,
  );
  return (
    <Card className="p-3">
      <div className="grid grid-cols-4 gap-1">
        {actions.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-2 rounded-xl px-1 py-3 text-center text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-light text-brand-dark">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            {label}
          </Link>
        ))}
      </div>
    </Card>
  );
}

function SlotFill({ slots, seats }) {
  return (
    <SectionCard
      icon={ICONS.slots}
      title="How full is each slot?"
      description="Seat bookings per slot against all seats."
    >
      {slots.length === 0 && (
        <p className="text-sm text-slate-500">No slots yet — add them under Slots & fees.</p>
      )}
      <ul className="flex flex-col gap-3 text-sm">
        {slots.map((slot) => {
          const percent = seats ? Math.min(100, Math.round((slot.bookings / seats) * 100)) : 0;
          return (
            <li key={slot.id}>
              <div className="mb-1 flex justify-between">
                <span>
                  <span className="font-medium">{slot.name}</span>{" "}
                  <span className="text-slate-500">{displaySlotTimes(slot)}</span>
                </span>
                <span className="tabular-nums text-slate-600">
                  {slot.bookings} / {seats} · {percent}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}

function LongestOverdue({ members }) {
  return (
    <SectionCard
      icon={ICONS.dues}
      title="Longest overdue"
      description="Collect these first."
      actions={
        <Link to="/dues" className="text-sm font-medium text-brand-dark hover:underline">
          All dues
        </Link>
      }
    >
      {members.length === 0 && <p className="text-sm text-slate-500">Nobody owes money. 🎉</p>}
      <ul className="divide-y divide-slate-100 text-sm">
        {members.map((m) => (
          <li key={m.memberId} className="flex items-center justify-between gap-3 py-2">
            <Link to={`/members/${m.memberId}`} className="min-w-0 truncate hover:text-brand-dark">
              {m.name}{" "}
              <span className="text-slate-500">
                · {m.daysOverdue ? `${m.daysOverdue} days late` : "due today"}
              </span>
            </Link>
            <span className="font-medium tabular-nums text-red-700">
              {formatRupees(m.outstandingPaise)}
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
