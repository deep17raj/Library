import { z } from "zod";
import { toPaise } from "../money/paise.js";

// Building blocks reused by the per-form schemas. Messages are written for the
// person filling the form, because they are shown next to the field as-is.

export const nameField = z
  .string({ required_error: "Name is required" })
  .trim()
  .min(2, "Name is too short")
  .max(160, "Name is too long");

export const emailField = z
  .string({ required_error: "Email is required" })
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(190, "Email is too long");

export const passwordField = z
  .string({ required_error: "Password is required" })
  .min(8, "Use at least 8 characters")
  .max(128, "Password is too long");

export const slugField = z
  .string({ required_error: "Short link name is required" })
  .trim()
  .toLowerCase()
  .min(3, "Use at least 3 characters")
  .max(60, "Use at most 60 characters")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens");

/** Basis points (1% = 100). */
export const basisPointsField = z.coerce
  .number({ invalid_type_error: "Enter a number" })
  .int("Use a whole number")
  .min(0, "Cannot be negative")
  .max(10000, "Cannot be more than 100%");

/** Database ids are UUIDs; anything else is rejected before it reaches SQL. */
export const idField = z.string({ required_error: "Required" }).uuid("Invalid id");

/** An optional reference chosen in a <select>: "" (the "none" option) means null. */
export const nullableIdField = z.preprocess(
  (value) => (value === "" ? null : value),
  idField.nullable(),
);

/** Indian mobile number, stored as its 10 digits. "" allowed — wrap with .optional() for absence. */
export const phoneField = z
  .string()
  .transform((value) => value.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, ""))
  .refine(
    (digits) => digits === "" || /^[6-9]\d{9}$/.test(digits),
    "Enter a 10-digit mobile number",
  );

/** What a person types as rupees ("1,250.50") → integer paise for the API. */
export const rupeesField = z.union([z.string(), z.number()]).transform((value, ctx) => {
  const paise = toPaise(value);
  if (paise === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter an amount like 800 or 799.50" });
    return z.NEVER;
  }
  return paise;
});

export const paiseField = z.coerce
  .number({ invalid_type_error: "Enter an amount" })
  .int("Amount must be in whole paise")
  .min(0, "Cannot be negative")
  .max(100_000_000, "Amount is too large");

export const sortOrderField = z.coerce.number().int().min(0).max(30000);

/** "Sardar Patel Library" → "sardar-patel-library" — a suggestion for slugField. */
export function suggestSlug(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Flatten a zod error into { "field.path": "first message" } — the `fields`
 * object of the API error format, and what forms use to mark inputs.
 * @param {import("zod").ZodError} error
 */
export function issuesToFields(error) {
  /** @type {Record<string, string>} */
  const fields = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}
