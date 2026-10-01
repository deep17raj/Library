/**
 * Tags a seat can carry, used to filter the seat picker. Price tiers (AC,
 * premium…) are seat categories, not features (decision D6).
 */
export const SEAT_FEATURES = Object.freeze({
  WINDOW: "window",
  LOCKER: "locker",
  POWER: "power",
  ACCESSIBLE: "accessible",
});

export const SEAT_FEATURE_LABELS = Object.freeze({
  [SEAT_FEATURES.WINDOW]: "Near window",
  [SEAT_FEATURES.LOCKER]: "Locker",
  [SEAT_FEATURES.POWER]: "Power socket",
  [SEAT_FEATURES.ACCESSIBLE]: "Accessible",
});

export const ALL_SEAT_FEATURES = Object.freeze(Object.values(SEAT_FEATURES));

export const SEATING_MODES = Object.freeze({ FIXED: "fixed", FLOATING: "floating" });
