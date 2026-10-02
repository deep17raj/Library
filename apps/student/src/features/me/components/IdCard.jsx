import { displaySlotTimes } from "@app/shared/slots";
import { displayDate } from "@app/shared/time";
import { LibraryMark } from "../../../app/Shell.jsx";

/**
 * My membership card, to show at the desk instead of a printed one: library, photo,
 * name, member ID and where I sit.
 */
export function IdCard({ student, library, bookings }) {
  const initials = student.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <section
      aria-label="Membership card"
      className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand to-brand-dark text-white shadow-md"
    >
      <div className="flex items-center gap-2.5 bg-white/10 px-5 py-3">
        <LibraryMark library={library} />
        <p className="truncate text-sm font-semibold">{library.name}</p>
        <span className="ml-auto text-[10px] uppercase tracking-widest text-white/70">Member</span>
      </div>
      <div className="flex gap-4 px-5 py-5">
        {student.photoUrl ? (
          <img
            src={student.photoUrl}
            alt=""
            className="h-20 w-20 shrink-0 rounded-2xl object-cover ring-2 ring-white/60"
          />
        ) : (
          <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-semibold">
            {initials}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold leading-tight">{student.name}</p>
          <p className="mt-0.5 font-mono text-sm tracking-wider text-white/90">
            {student.memberCode}
          </p>
          <p className="mt-1 text-xs text-white/75">
            {student.examTarget ? `${student.examTarget} · ` : ""}since{" "}
            {displayDate(student.joinedOn)}
          </p>
        </div>
      </div>
      {bookings.length > 0 && (
        <ul className="border-t border-white/15 px-5 py-3 text-sm">
          {bookings.map((b) => (
            <li key={b.id} className="flex justify-between gap-3">
              <span>
                {b.slotName} <span className="text-white/70">{displaySlotTimes(b)}</span>
              </span>
              <span className="font-semibold">
                {b.seatLabel ? `Seat ${b.seatLabel}` : b.hallName}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
