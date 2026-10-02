import { z } from "zod";
import { phoneField } from "./common.js";

/** Student app sign-in: the mobile number the library registered + password. */
export const studentLoginSchema = z.object({
  phone: phoneField.refine((digits) => digits !== "", "Enter your mobile number"),
  // Login only checks presence; strength rules apply when a password is set.
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
});

/** A browser's Web Push subscription (PushSubscription.toJSON()). */
export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url("Invalid push endpoint").max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(255),
    auth: z.string().min(1).max(255),
  }),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().url("Invalid push endpoint").max(2000),
});
