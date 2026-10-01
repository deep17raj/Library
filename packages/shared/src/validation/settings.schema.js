import { z } from "zod";
import { isValidTimeZone } from "../time/zonedDate.js";
import { isHexColor } from "../theme/brandPalette.js";
import { nameField, phoneField } from "./common.js";

const prefixField = z
  .string()
  .trim()
  .max(10, "Use at most 10 characters")
  .regex(/^[A-Za-z0-9-]*$/, "Use letters, numbers or hyphens");

/**
 * Library profile and branding (Settings screen, milestone 2). Billing and
 * attendance rules join this schema in their own milestones.
 */
export const librarySettingsSchema = z.object({
  displayName: nameField,
  address: z.string().trim().max(400, "Address is too long"),
  contactPhone: phoneField,
  timezone: z.string().refine(isValidTimeZone, "Choose a valid timezone"),
  brandColor: z.string().refine(isHexColor, "Pick a colour"),
  receiptPrefix: prefixField,
  memberCodePrefix: prefixField.min(1, "Enter a prefix such as S"),
});
