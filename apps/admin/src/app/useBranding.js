import { useEffect } from "react";
import { brandPalette, DEFAULT_BRAND_COLOR } from "@app/shared/theme";

/**
 * Paint the app in the library's brand colour (CSS variables read by Tailwind's
 * `brand` colours) and title the tab with its name.
 * @param {{ brandColor?: string, displayName?: string } | undefined} settings
 */
export function useBranding(settings) {
  const brandColor = settings?.brandColor || DEFAULT_BRAND_COLOR;
  const displayName = settings?.displayName;

  useEffect(() => {
    const palette = brandPalette(brandColor);
    const root = document.documentElement.style;
    root.setProperty("--brand", palette.brand);
    root.setProperty("--brand-dark", palette.brandDark);
    root.setProperty("--brand-light", palette.brandLight);
  }, [brandColor]);

  useEffect(() => {
    document.title = displayName ? `${displayName} · Admin` : "Study Library Admin";
  }, [displayName]);
}
