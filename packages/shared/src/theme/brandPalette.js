// A library picks one brand colour; both apps derive a darker shade (text, hover)
// and a light tint (selected backgrounds) from it, so branding is one setting.

export const DEFAULT_BRAND_COLOR = "#4f46e5";
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** @param {string} value */
export function isHexColor(value) {
  return HEX_COLOR.test(String(value));
}

function toRgb(hex) {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function mix([r, g, b], [r2, g2, b2], amount) {
  const blend = (from, to) => Math.round(from + (to - from) * amount);
  return [blend(r, r2), blend(g, g2), blend(b, b2)];
}

/**
 * "R G B" triplets for the Tailwind colour variables (`rgb(var(--brand) / <alpha>)`).
 * @param {string} hex e.g. "#4f46e5"
 */
export function brandPalette(hex) {
  const base = toRgb(isHexColor(hex) ? hex : DEFAULT_BRAND_COLOR);
  const triplet = (rgb) => rgb.join(" ");
  return {
    brand: triplet(base),
    brandDark: triplet(mix(base, [0, 0, 0], 0.2)),
    brandLight: triplet(mix(base, [255, 255, 255], 0.85)),
  };
}
