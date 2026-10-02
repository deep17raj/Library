import { Link } from "react-router-dom";
import { formatRupees } from "@app/shared/money";
import { ICONS } from "@app/shared/icons";
import { Card } from "@app/shared/ui";
import { useMe } from "../../app/session.js";
import { useLibraryClock } from "../../app/useLibraryClock.js";
import { useMockTests } from "../mock-tests/api.js";
import { BookingCard } from "./components/BookingCard.jsx";
import { DuesCard } from "./components/DuesCard.jsx";
import { InstallCard } from "./components/InstallCard.jsx";
import { TodayCard } from "./components/TodayCard.jsx";

/**
 * Home (UI-GUIDE §10 Student home): a greeting, today's check-in, where I sit, what I
 * owe — the four things a student opens the app for.
 */
export function HomePage() {
  const { data: me } = useMe();
  const clock = useLibraryClock(me.library.timezone);
  const firstName = me.student.name.split(" ")[0];
  const { data: mockTests = [] } = useMockTests();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-slate-500">{greeting(clock.minutes)},</p>
        <h1 className="text-2xl font-semibold tracking-tight">{firstName}</h1>
      </div>
      <TodayCard
        checkIns={me.checkIns}
        hasBooking={me.bookings.length > 0}
        timeZone={me.library.timezone}
      />
      {me.bookings.map((booking) => (
        <BookingCard key={booking.id} booking={booking} minutes={clock.minutes} />
      ))}
      <DuesCard dues={me.dues} creditPaise={me.creditPaise} />
      {mockTests.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Mock tests
          </p>
          {mockTests.map((t) => (
            <MockTestCard key={t.id} test={t} />
          ))}
        </div>
      )}
      <Link to="/attendance" className="block">
        <Card className="flex items-center gap-4 transition-shadow hover:shadow-md">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-light text-brand-dark">
            <ICONS.attendance className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">My attendance</p>
            <p className="text-sm text-slate-500">Calendar and your streak</p>
          </div>
          <ICONS.next className="h-4 w-4 text-slate-300" aria-hidden="true" />
        </Card>
      </Link>
      <InstallCard libraryName={me.library.name} />
    </div>
  );
}

function MockTestCard({ test }) {
  const price = test.pricePaise > 0 ? formatRupees(test.pricePaise) : "Free";
  return (
    <Link to={`/tests/${test.id}`} className="block">
      <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 px-5 py-4 shadow-lg shadow-violet-100/70 ring-1 ring-violet-200/60 transition-shadow hover:shadow-violet-200/80 active:scale-[0.99]">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
            <ICONS.mockTest className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900 leading-snug">{test.title}</p>
            {test.description && (
              <p className="mt-0.5 text-sm text-slate-500 line-clamp-2">{test.description}</p>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="rounded-full bg-violet-100 px-3 py-0.5 text-xs font-semibold text-violet-700">
            {price}
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-violet-600">
            Preview paper
            <ICONS.next className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function greeting(minutes) {
  if (minutes < 12 * 60) return "Good morning";
  if (minutes < 17 * 60) return "Good afternoon";
  return "Good evening";
}
