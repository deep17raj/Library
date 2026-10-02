import { z } from "zod";
import { idField } from "./common.js";

const audienceSchema = z.object({
  type: z.enum(["all", "dues", "slot", "members"]),
  slotId: idField.optional(),
  memberIds: z.array(idField).optional(),
});

export const announceSchema = z.object({
  title: z
    .string({ required_error: "Title is required" })
    .trim()
    .min(1, "Title is required")
    .max(80, "Title is too long"),
  body: z
    .string({ required_error: "Message is required" })
    .trim()
    .min(1, "Message is required")
    .max(300, "Message is too long"),
  url: z.string().max(255, "URL is too long").optional(),
  audience: audienceSchema,
});

export const audiencePreviewSchema = z.object({
  type: z.enum(["all", "dues", "slot", "members"]).default("all"),
  slotId: idField.optional(),
  memberIds: z.preprocess(
    (v) => (typeof v === "string" ? v.split(",").filter(Boolean) : v),
    z.array(idField).optional(),
  ),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
