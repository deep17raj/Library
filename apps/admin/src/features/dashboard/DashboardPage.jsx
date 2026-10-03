import { Link, useNavigate } from "react-router-dom";
import { formatRupees } from "@app/shared/money";
import { displaySlotTimes } from "@app/shared/slots";
import { Alert, Button, PageHeader, SectionCard, Skeleton, StatCard } from "@app/shared/ui";
import { ICONS } from "@app/shared/icons";
import { useSession } from "../../app/session.js";
import { useDashboard } from "../ledger/api.js";

/** Today at a glance + the things people do most (UI-GUIDE §10 Dashboard). */
export function DashboardPage() {
  const { data: user } = useSession();
  const { data, isLoading, error } = useDashboard();
  const navigate = useNavigate();
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeader
        icon={ICONS.dashboard}
        title={`Hello, ${firstName}`}
        description="Today at your library."
        actions={
          <>
            <Button variant="secondary" icon={ICONS.checkin} onClick={() => navigate("/checkin")}>
              Check-in desk
            </Button>
            <Button variant="secondary" icon={ICONS.seatMap} onClick={() => navigate("/seat-map")}>
              Seat map
            </Button>
            <Button icon={ICONS.addMember} onClick={() => navigate("/members/new")}>
              Add member
            </Button>
          </>
        }
      />
      <Alert tone="error">{error?.message}</Alert>
      {isLoading && <Skeleton rows={3} />}
      {data && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard
              icon={ICONS.payment}
              tone="green"
              label="Collected today"
              value={formatRupees(data.collectedTodayPaise)}
              hint={`${data.paymentsToday} receipts`}
            />
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
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <SlotFill slots={data.slots} seats={data.seats} />
            <LongestOverdue members={data.longestOverdue} />
          </div>
        </div>
      )}
    </>
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
