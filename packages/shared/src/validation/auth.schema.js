import { z } from "zod";
import { emailField, passwordField } from "./common.js";

export const staffLoginSchema = z.object({
  email: emailField,
  // Login only checks presence; strength rules apply when a password is set.
  password: z.string({ required_error: "Password is required" }).min(1, "Password is required"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordField,
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    path: ["newPassword"],
    message: "Choose a password different from the current one",
  });
