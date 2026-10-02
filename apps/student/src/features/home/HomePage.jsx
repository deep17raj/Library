import { Link } from "react-router-dom";
import { ICONS } from "@app/shared/icons";
import { Card } from "@app/shared/ui";
import { useMe } from "../../app/session.js";
import { useLibraryClock } from "../../app/useLibraryClock.js";
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

function greeting(minutes) {
  if (minutes < 12 * 60) return "Good morning";
  if (minutes < 17 * 60) return "Good afternoon";
  return "Good evening";
}
