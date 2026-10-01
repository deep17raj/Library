import { z } from "zod";
import { idField } from "@app/shared/validation";

// Same schemas the admin app's Waitlist screen uses (packages/shared/src/validation).
export { waitlistEntrySchema, waitlistUpdateSchema } from "@app/shared/validation";

export const waitlistQuerySchema = z
  .object({
    slotId: idField.optional(),
    // "all" includes converted and cancelled entries.
    view: z.enum(["open", "all"]).default("open"),
  })
  .transform(({ slotId, view }) => ({ slotId, open: view === "open" }));
