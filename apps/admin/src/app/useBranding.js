import { useEffect } from "react";
import { useBrandColor } from "@app/shared/ui";

/**
 * Paint the admin app in the library's brand colour and title the tab with its name.
 * @param {{ brandColor?: string, displayName?: string } | undefined} settings
 */
export function useBranding(settings) {
  const displayName = settings?.displayName;
  useBrandColor(settings?.brandColor);
  useEffect(() => {
    document.title = displayName ? `${displayName} · Admin` : "Study Library Admin";
  }, [displayName]);
}
