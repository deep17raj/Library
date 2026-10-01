import { z } from "zod";
import { dateKeyField, idField, paiseField } from "./common.js";

/**
 * Where the student sits: a numbered seat (fixed hall) or a place in a "sit
 * anywhere" hall — exactly one of the two.
 */
const placementShape = { seatId: idField.optional(), hallId: idField.optional() };
const exactlyOnePlacement = [
  (value) => Boolean(value.seatId) !== Boolean(value.hallId),
  { path: ["seatId"], message: "Choose a seat, or a sit-anywhere hall" },
];

export const createSubscriptionSchema = z
  .object({
    slotId: idField,
    planId: idField,
    ...placementShape,
    startOn: dateKeyField.optional(),
    collection: z.enum(["advance", "arrears"]).optional(),
    lockerFeePaise: paiseField.default(0),
  })
  .refine(...exactlyOnePlacement);

/** Same slot and price terms, different seat or hall. */
export const moveSubscriptionSchema = z.object(placementShape).refine(...exactlyOnePlacement);

/** New slot (and plan, and place); the new price starts next billing period (D4). */
export const changeSlotSchema = z
  .object({ slotId: idField, planId: idField, ...placementShape })
  .refine(...exactlyOnePlacement);

export const swapSeatsSchema = z
  .object({ subscriptionA: idField, subscriptionB: idField })
  .refine((value) => value.subscriptionA !== value.subscriptionB, {
    path: ["subscriptionB"],
    message: "Choose two different students",
  });

export const endSubscriptionSchema = z.object({
  reason: z.enum(["left", "admin"], { message: "Choose why the seat is being released" }),
});
