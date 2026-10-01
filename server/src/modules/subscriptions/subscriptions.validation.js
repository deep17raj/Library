import { z } from "zod";
import { idField } from "@app/shared/validation";

// Same schemas the admin app's seat forms use (packages/shared/src/validation).
export {
  changeSlotSchema,
  createSubscriptionSchema,
  endSubscriptionSchema,
  moveSubscriptionSchema,
  swapSeatsSchema,
} from "@app/shared/validation";

export const availabilityQuerySchema = z.object({ slotId: idField });
export const seatMapQuerySchema = z.object({ hallId: idField });
