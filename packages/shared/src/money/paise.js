// All money is integer paise (₹1 = 100 paise) so sums never drift the way
// floating-point rupees do. Convert only at the edges: user input → paise,
// paise → display text.

const RUPEE_INPUT = /^\d{1,9}(\.\d{1,2})?$/;

/**
 * Parse what a person typed ("1,250", "99.5", 800) into paise.
 * Returns null when it isn't a non-negative amount with at most 2 decimals.
 * @param {string | number} input
 * @returns {number | null}
 */
export function toPaise(input) {
  const text = String(input ?? "")
    .replace(/[,\s₹]/g, "")
    .trim();
  if (!RUPEE_INPUT.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

const wholeRupees = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const withPaise = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * "₹1,25,000" — paise are shown only when the amount has them.
 * @param {number} paise
 */
export function formatRupees(paise) {
  const value = Math.round(Number(paise) || 0);
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  const text =
    absolute % 100 === 0 ? wholeRupees.format(absolute / 100) : withPaise.format(absolute / 100);
  return `${sign}₹${text}`;
}

/** Plain rupee number for form inputs: 125050 → "1250.5". */
export function paiseToInput(paise) {
  const value = Math.round(Number(paise) || 0);
  return String(value / 100);
}

/** @param {number[]} amounts */
export function sumPaise(amounts) {
  return amounts.reduce((total, amount) => total + Math.round(Number(amount) || 0), 0);
}
