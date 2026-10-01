import { z } from "zod";
import { ALL_PERMISSIONS } from "../constants/permissions.js";
import { emailField, nameField, passwordField } from "./common.js";

const permissionsField = z
  .array(z.enum(/** @type {[string, ...string[]]} */ ([...ALL_PERMISSIONS])))
  .transform((permissions) => [...new Set(permissions)]);

export const createStaffSchema = z.object({
  name: nameField,
  email: emailField,
  password: passwordField,
  permissions: permissionsField,
});

export const updateStaffSchema = z.object({
  name: nameField.optional(),
  permissions: permissionsField.optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

export const resetStaffPasswordSchema = z.object({ password: passwordField });
