// CSV for spreadsheet exports. A cell starting with = + - @ (or tab/CR) would run as
// a formula in Excel/Sheets — a member could name themselves "=HYPERLINK(...)" — so
// such text cells get a leading apostrophe. Numbers are left as numbers.

const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return String(value);
  let text = String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * @param {string[]} headers
 * @param {unknown[][]} rows
 * @returns {string} with a UTF-8 BOM so Excel shows ₹ and Indian names correctly
 */
export function toCsv(headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(cell).join(","));
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/** Send a CSV download. */
export function sendCsv(res, filename, csv) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}
