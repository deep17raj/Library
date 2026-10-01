import { z } from "zod";
import { basisPointsField, emailField, nameField, passwordField, slugField } from "./common.js";

/** Super admin creates a library together with its owner's login. */
export const createLibrarySchema = z.object({
  name: nameField,
  slug: slugField,
  ownerName: nameField,
  ownerEmail: emailField,
  ownerPassword: passwordField,
});

export const updateLibrarySchema = z.object({
  name: nameField.optional(),
  // null = use the platform default share.
  mocktestShareBps: basisPointsField.nullable().optional(),
});

/**
 * The edit form shows the share as a percentage ("" = platform default) and
 * produces exactly what updateLibrarySchema accepts.
 */
export const libraryEditFormSchema = z
  .object({
    name: nameField,
    sharePercent: z.union([
      z.literal(""),
      z.coerce
        .number({ invalid_type_error: "Enter a number" })
        .min(0, "Cannot be negative")
        .max(100, "Cannot be more than 100"),
    ]),
  })
  .transform(({ name, sharePercent }) => ({
    name,
    mocktestShareBps: sharePercent === "" ? null : Math.round(sharePercent * 100),
  }));

/** Basis points → the edit form's percentage text. */
export function bpsToPercentInput(bps) {
  return bps === null || bps === undefined ? "" : String(bps / 100);
}

export const libraryStatusSchema = z.object({
  status: z.enum(["active", "suspended"], { message: "Status must be active or suspended" }),
});

/** An extra owner login for an existing library. */
export const addOwnerSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordField,
});

export const userStatusSchema = z.object({
  status: z.enum(["active", "disabled"], { message: "Status must be active or disabled" }),
});

export const platformSettingsSchema = z.object({
  mocktestDefaultShareBps: basisPointsField,
});

/** Platform settings form: percentage in, basis points out (what the API takes). */
export const platformSettingsFormSchema = z
  .object({
    sharePercent: z.coerce
      .number({ invalid_type_error: "Enter a number" })
      .min(0, "Cannot be negative")
      .max(100, "Cannot be more than 100"),
  })
  .transform(({ sharePercent }) => ({ mocktestDefaultShareBps: Math.round(sharePercent * 100) }));
