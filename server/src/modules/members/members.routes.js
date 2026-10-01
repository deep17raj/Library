import { Router } from "express";
import { PERMISSIONS } from "@app/shared/constants";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody, validateQuery } from "../../http/validate.js";
import { requirePermission } from "../../middleware/libraryContext.js";
import { requireFile, singleImageUpload } from "../../middleware/upload.js";
import { createMembersController } from "./members.controller.js";
import {
  createMemberSchema,
  ID_PROOF_MAX_BYTES,
  memberListQuerySchema,
  PHOTO_MAX_BYTES,
  updateMemberSchema,
} from "./members.validation.js";

/** Mounted at /api/admin/members. Seat bookings of a member live in the subscriptions router. */
export function createMembersRouter({ membersService }) {
  const c = createMembersController({ membersService });
  const canManage = requirePermission(PERMISSIONS.MEMBERS_MANAGE);
  const image = (field, maxBytes) => [
    canManage,
    singleImageUpload(field, { maxBytes }),
    requireFile(field),
  ];
  const router = Router();

  router.get("/", validateQuery(memberListQuerySchema), asyncHandler(c.list));
  router.post("/", canManage, validateBody(createMemberSchema), asyncHandler(c.create));
  router.get("/:id", asyncHandler(c.detail));
  router.patch("/:id", canManage, validateBody(updateMemberSchema), asyncHandler(c.update));
  router.post("/:id/photo", ...image("photo", PHOTO_MAX_BYTES), asyncHandler(c.postPhoto));
  router.delete("/:id/photo", canManage, asyncHandler(c.deletePhoto));
  router.post(
    "/:id/id-proof",
    ...image("idProof", ID_PROOF_MAX_BYTES),
    asyncHandler(c.postIdProof),
  );
  router.get("/:id/id-proof", canManage, asyncHandler(c.getIdProof));
  return router;
}
