import { z } from "zod";
import { ALL_SEAT_FEATURES } from "../constants/seatFeatures.js";
import { dateKeyField, idField, nameField, paiseField, phoneField } from "./common.js";
import { optionalRupeesField } from "./money.schema.js";

const requiredPhone = phoneField.refine((digits) => digits !== "", "Mobile number is required");
const optionalText = (max, label) => z.string().trim().max(max, `${label} is too long`);

const profileShape = {
  name: nameField,
  phone: requiredPhone,
  address: optionalText(400, "Address").default(""),
  examTarget: optionalText(80, "Exam").default(""),
  notes: optionalText(500, "Notes").default(""),
};

const placeShape = {
  slotId: idField,
  planId: idField,
  seatId: idField.optional(),
  hallId: idField.optional(),
};
const onePlace = [
  (booking) => Boolean(booking.seatId) !== Boolean(booking.hallId),
  { path: ["seatId"], message: "Choose a seat, or a sit-anywhere hall" },
];

/** One seat booking: slot, plan, a seat or sit-anywhere hall, optional locker fee. */
export const bookingSchema = z
  .object({ ...placeShape, lockerFeePaise: paiseField.default(0) })
  .refine(...onePlace);

const joiningShape = {
  ...profileShape,
  joinedOn: dateKeyField.optional(),
  waitlistEntryId: idField.optional(),
};

/**
 * A new member with their seat bookings and joining charges, saved together. No
 * bookings is allowed (e.g. someone joining later). `waitlistEntryId` marks that
 * waitlist entry converted.
 */
export const createMemberSchema = z.object({
  ...joiningShape,
  bookings: z.array(bookingSchema).max(4, "At most 4 bookings at once").default([]),
  admissionFeePaise: paiseField.default(0),
  depositPaise: paiseField.default(0),
});

/** The add-member form: money typed in rupees (empty = none), sent as createMemberSchema. */
export const memberFormSchema = z
  .object({
    ...joiningShape,
    bookings: z
      .array(
        z
          .object({ ...placeShape, lockerFee: optionalRupeesField.default("") })
          .refine(...onePlace)
          .transform(({ lockerFee, ...booking }) => ({ ...booking, lockerFeePaise: lockerFee })),
      )
      .max(4, "At most 4 bookings at once")
      .default([]),
    admissionFee: optionalRupeesField.default(""),
    deposit: optionalRupeesField.default(""),
  })
  .transform(({ admissionFee, deposit, ...member }) => ({
    ...member,
    admissionFeePaise: admissionFee,
    depositPaise: deposit,
  }));

export const updateMemberSchema = z.object({
  name: profileShape.name.optional(),
  phone: requiredPhone.optional(),
  address: profileShape.address.optional(),
  examTarget: profileShape.examTarget.optional(),
  notes: profileShape.notes.optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export const memberListQuerySchema = z.object({
  q: z.string().trim().max(80).default(""),
  status: z.enum(["active", "inactive", "all"]).default("active"),
  slotId: idField.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(25),
});

// ── Waitlist ───────────────────────────────────────────────────────────
export const waitlistEntrySchema = z.object({
  slotId: idField,
  name: nameField,
  phone: requiredPhone,
  preferredFeatures: z
    .array(z.enum(/** @type {[string, ...string[]]} */ ([...ALL_SEAT_FEATURES])))
    .default([]),
  note: optionalText(300, "Note").default(""),
});

export const waitlistUpdateSchema = z.object({
  status: z.enum(["waiting", "offered", "cancelled"]).optional(),
  note: optionalText(300, "Note").optional(),
});
