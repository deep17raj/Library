import { z } from "zod";
import { isValidSlotTimes } from "../slots/slotCells.js";
import { clockToMinutes } from "../slots/clock.js";
import { paiseField, rupeesField, sortOrderField } from "./common.js";

const SLOT_TIMES_MESSAGE =
  "Use times on the hour or half hour, with the end different from the start";

const nameField = z.string().trim().min(1, "Name is required").max(60, "Use at most 60 characters");
const minuteField = z.coerce.number().int();
const colorField = z
  .string()
  .regex(/^(#[0-9a-fA-F]{6})?$/, "Pick a colour")
  .optional();
const statusField = z.enum(["active", "archived"]).optional();

// ── Slots ──────────────────────────────────────────────────────────────
/** New slot; its default "Monthly" plan is created with `monthlyFeePaise`. */
export const slotSchema = z
  .object({
    name: nameField,
    startMin: minuteField,
    endMin: minuteField,
    monthlyFeePaise: paiseField,
    color: colorField,
  })
  .refine(isValidSlotTimes, { path: ["endMin"], message: SLOT_TIMES_MESSAGE });

/** Times change together (or not at all), so a half-edited slot can't slip through. */
export const slotUpdateSchema = z
  .object({
    name: nameField.optional(),
    startMin: minuteField.optional(),
    endMin: minuteField.optional(),
    color: colorField,
    status: statusField,
    sortOrder: sortOrderField.optional(),
  })
  .refine((slot) => (slot.startMin === undefined) === (slot.endMin === undefined), {
    path: ["endMin"],
    message: "Give both the start and end time",
  })
  .refine((slot) => slot.startMin === undefined || isValidSlotTimes(slot), {
    path: ["endMin"],
    message: SLOT_TIMES_MESSAGE,
  });

const clockField = z.string().transform((text, ctx) => {
  const minutes = clockToMinutes(text);
  if (minutes === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a time like 06:30" });
    return z.NEVER;
  }
  return minutes;
});

/**
 * Slot form: "06:00"/"12:00" clock inputs and a rupee fee, turned into the API shape.
 * The fee is only asked for when creating (afterwards it lives on the plans).
 */
export const slotFormSchema = z
  .object({
    name: nameField,
    startTime: clockField,
    endTime: clockField,
    monthlyFee: rupeesField.optional(),
    color: colorField,
    status: statusField,
  })
  .transform(({ startTime, endTime, monthlyFee, ...rest }) => ({
    ...rest,
    startMin: startTime,
    endMin: endTime,
    ...(monthlyFee === undefined ? {} : { monthlyFeePaise: monthlyFee }),
  }))
  .refine(isValidSlotTimes, { path: ["endTime"], message: SLOT_TIMES_MESSAGE });

// ── Plans ──────────────────────────────────────────────────────────────
const planShape = {
  name: nameField,
  periodUnit: z.enum(["month", "day"]),
  periodCount: z.coerce.number().int().min(1, "At least 1").max(365, "Too long"),
};
const sensibleLength = (plan) => plan.periodUnit === "day" || plan.periodCount <= 24;
const LENGTH_MESSAGE = { path: ["periodCount"], message: "Monthly plans can be up to 24 months" };

export const planSchema = z
  .object({ ...planShape, pricePaise: paiseField })
  .refine(sensibleLength, LENGTH_MESSAGE);

/** Length and unit are fixed once created: subscriptions copy them, so they must keep meaning the same. */
export const planUpdateSchema = z.object({
  name: nameField.optional(),
  pricePaise: paiseField.optional(),
  status: statusField,
});

export const planFormSchema = z
  .object({ ...planShape, price: rupeesField, status: statusField })
  .transform(({ price, ...rest }) => ({ ...rest, pricePaise: price }))
  .refine(sensibleLength, LENGTH_MESSAGE);
