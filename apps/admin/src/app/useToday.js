import { localDateOf } from "@app/shared/time";
import { useLibrarySettings } from "../features/settings/api.js";

/**
 * Today's date in the library's timezone (not the browser's) — the same "today" the
 * server bills and checks in with.
 */
export function useToday() {
  const { data: settings } = useLibrarySettings();
  return localDateOf(new Date(), settings?.timezone);
}
