// Same schema the admin app's Settings form uses (packages/shared/src/validation).
export {
  billingSettingsSchema,
  checkinSettingsSchema,
  librarySettingsSchema,
} from "@app/shared/validation";

export const LOGO_FIELD = "logo";
export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
