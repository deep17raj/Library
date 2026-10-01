// Same schemas the admin app's member screens use (packages/shared/src/validation).
export {
  createMemberSchema,
  memberListQuerySchema,
  updateMemberSchema,
} from "@app/shared/validation";

export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const ID_PROOF_MAX_BYTES = 8 * 1024 * 1024;
