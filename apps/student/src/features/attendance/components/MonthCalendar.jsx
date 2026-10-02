import { monthGrid, WEEKDAY_LABELS } from "@app/shared/time";
import { cx } from "@app/shared/ui";

/**
 * A wall-calendar month: days I came in are filled with the brand colour, days staff
 * marked absent get a red ring, today is outlined, days still to come are faded.
 * @param {{ monthStart: string, today: string, present: Set<string>, absent: Set<string> }} props
 */
export function MonthCalendar({ monthStart, today, present, absent }) {
  return (
    <table className="w-full table-fixed text-center text-sm">
      <thead>
        <tr>
          {WEEKDAY_LABELS.map((day) => (
            <th key={day} scope="col" className="pb-2 text-xs font-medium text-slate-400">
              {day.slice(0, 2)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {monthGrid(monthStart).map((week) => (
          <tr key={week.find(Boolean)}>
            {week.map((day, index) => (
              <td key={day ?? `blank-${index}`} className="py-1">
                {day && <Day day={day} today={today} present={present} absent={absent} />}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Day({ day, today, present, absent }) {
  const wasPresent = present.has(day);
  const wasAbsent = absent.has(day) && !wasPresent;
  const label = `${Number(day.slice(8))}${wasPresent ? ", present" : wasAbsent ? ", marked absent" : ""}`;
  return (
    <span
      aria-label={label}
      className={cx(
        "mx-auto flex h-9 w-9 items-center justify-center rounded-full tabular-nums",
        wasPresent && "bg-brand font-semibold text-white",
        wasAbsent && "text-red-600 ring-2 ring-red-300",
        !wasPresent && !wasAbsent && day > today && "text-slate-300",
        !wasPresent && !wasAbsent && day <= today && "text-slate-700",
        day === today && !wasPresent && "ring-2 ring-brand",
      )}
    >
      {Number(day.slice(8))}
    </span>
  );
}
