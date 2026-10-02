import { useEffect } from "react";
import { brandPalette, DEFAULT_BRAND_COLOR } from "../theme/index.js";

/**
 * Paint the app in a library's brand colour: sets the CSS variables Tailwind's `brand`
 * colours read (see each app's tailwind.config.js) and the browser's theme colour.
 * @param {string | undefined} brandColor "#rrggbb"
 */
export function useBrandColor(brandColor) {
  const color = brandColor || DEFAULT_BRAND_COLOR;
  useEffect(() => {
    const palette = brandPalette(color);
    const root = document.documentElement.style;
    root.setProperty("--brand", palette.brand);
    root.setProperty("--brand-dark", palette.brandDark);
    root.setProperty("--brand-light", palette.brandLight);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
  }, [color]);
}
