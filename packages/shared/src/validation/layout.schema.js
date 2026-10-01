import { z } from "zod";
import { ALL_SEAT_FEATURES, SEATING_MODES } from "../constants/seatFeatures.js";
import { nullableIdField, paiseField, rupeesField, sortOrderField } from "./common.js";

const shortName = (max) =>
  z.string({ required_error: "Name is required" }).trim().min(1, "Name is required").max(max);

const seatPrefixField = z
  .string()
  .max(10, "Use at most 10 characters")
  .regex(/^[A-Za-z0-9-]*$/, "Use letters, numbers or hyphens");

const seatLabelField = z
  .string()
  .trim()
  .min(1, "Seat number is required")
  .max(20, "Use at most 20 characters")
  .regex(/^[A-Za-z0-9-/]+$/, "Use letters, numbers, - or /");

const startNumberField = z.coerce.number().int().min(1, "Start from 1 or more").max(9999);

// ── Seat categories (price tiers, decision D6) ─────────────────────────
export const seatCategorySchema = z.object({
  name: shortName(60),
  monthlySurchargePaise: paiseField,
});

export const seatCategoryUpdateSchema = seatCategorySchema.partial().extend({
  status: z.enum(["active", "archived"]).optional(),
});

/** Category form: surcharge typed in rupees, sent as paise (status only when editing). */
export const seatCategoryFormSchema = z
  .object({
    name: shortName(60),
    monthlySurcharge: rupeesField,
    status: z.enum(["active", "archived"]).optional(),
  })
  .transform(({ monthlySurcharge, ...rest }) => ({
    ...rest,
    monthlySurchargePaise: monthlySurcharge,
  }));

// ── Halls ──────────────────────────────────────────────────────────────
export const hallSchema = z.object({
  name: shortName(80),
  seatingMode: z.enum([SEATING_MODES.FIXED, SEATING_MODES.FLOATING]),
  categoryId: nullableIdField,
});

export const hallUpdateSchema = hallSchema.partial().extend({
  status: z.enum(["active", "disabled"]).optional(),
  sortOrder: sortOrderField.optional(),
});

/** "Add N tables with M seats" in one go. */
export const bulkTablesSchema = z
  .object({
    tableCount: z.coerce.number().int().min(1, "At least 1 table").max(100, "At most 100 tables"),
    seatsPerTable: z.coerce.number().int().min(1, "At least 1 seat").max(50, "At most 50 seats"),
    seatPrefix: seatPrefixField,
    startNumber: startNumberField,
  })
  .refine((plan) => plan.tableCount * plan.seatsPerTable <= 500, {
    path: ["seatsPerTable"],
    message: "Add at most 500 seats at a time",
  });

// ── Tables & seats ─────────────────────────────────────────────────────
export const tableUpdateSchema = z.object({
  label: shortName(40).optional(),
  sortOrder: sortOrderField.optional(),
});

export const addSeatsSchema = z.object({
  count: z.coerce.number().int().min(1, "At least 1 seat").max(50, "At most 50 seats"),
  seatPrefix: seatPrefixField,
  startNumber: startNumberField,
});

export const seatUpdateSchema = z.object({
  label: seatLabelField.optional(),
  categoryId: nullableIdField.optional(),
  features: z
    .array(z.enum(/** @type {[string, ...string[]]} */ ([...ALL_SEAT_FEATURES])))
    .transform((features) => [...new Set(features)])
    .optional(),
  status: z.enum(["active", "disabled"]).optional(),
  sortOrder: sortOrderField.optional(),
});
