import { useEffect, useState } from "react";
import { localDateOf, localMinutesOf } from "@app/shared/time";

/**
 * The library's local date and minute of the day (not the phone's timezone), ticking
 * every minute — for "you're in your slot now" and "time left".
 * @param {string | undefined} timeZone
 */
export function useLibraryClock(timeZone) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  return { today: localDateOf(now, timeZone), minutes: localMinutesOf(now, timeZone) };
}
