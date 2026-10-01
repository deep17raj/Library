import { z } from "zod";
import { dateKeyField, idField, phoneField } from "./common.js";

/** The daily check-in code shown on the desk screen (short, uppercase). */
export const dailyCodeField = z
  .string({ required_error: "Enter the code" })
  .trim()
  .min(4, "Enter the code")
  .max(12, "Enter the code");

/** Staff marks a member present (optionally for a specific booking). */
export const manualAttendanceSchema = z.object({
  memberId: idField,
  subscriptionId: idField.optional(),
});

/** Staff marks a booking absent (wins over an earlier check-in on the roster). */
export const markAbsentSchema = z.object({
  memberId: idField,
  subscriptionId: idField,
});

/** Kiosk on the desk: a student types their phone number and the day's code. */
export const kioskCheckinSchema = z.object({
  phone: phoneField,
  code: dailyCodeField,
});

/** Student app QR check-in (milestone 7): just the day's code. */
export const codeCheckinSchema = z.object({ code: dailyCodeField });

/** Attendance list for a day, optionally one slot. */
export const attendanceQuerySchema = z.object({
  date: dateKeyField.optional(),
  slotId: idField.optional(),
});

/** A month of a member's attendance, e.g. for the calendar. */
export const attendanceMonthQuerySchema = z.object({ month: dateKeyField.optional() });

/** Settings → Check-in: how the slot-time and dues gates behave. */
export const checkinSettingsSchema = z.object({
  slotCheckMode: z.enum(["off", "warn", "block"]),
  slotEarlyMinutes: z.coerce.number().int().min(0, "0 or more").max(120, "At most 120 minutes"),
  allowOverdueCheckin: z.boolean(),
});
