import { Router } from "express";
import { PERMISSIONS } from "@app/shared/constants";
import { asyncHandler } from "../../http/asyncHandler.js";
import { validateBody } from "../../http/validate.js";
import { requirePermission } from "../../middleware/libraryContext.js";
import { createLayoutController } from "./layout.controller.js";
import {
  addSeatsSchema,
  bulkTablesSchema,
  hallSchema,
  hallUpdateSchema,
  seatCategorySchema,
  seatCategoryUpdateSchema,
  seatUpdateSchema,
  tableUpdateSchema,
} from "./layout.validation.js";

/** Mounted at /api/admin (library context already resolved). */
export function createLayoutRouter({ layoutService }) {
  const c = createLayoutController({ layoutService });
  const canEdit = requirePermission(PERMISSIONS.LAYOUT_MANAGE);
  const router = Router();
  const edit = (method, path, schema, handler) =>
    router[method](path, canEdit, ...(schema ? [validateBody(schema)] : []), asyncHandler(handler));

  // Any staff member may see the layout (seat map, seat picker).
  router.get("/layout", asyncHandler(c.getLayout));

  edit("post", "/seat-categories", seatCategorySchema, c.postCategory);
  edit("patch", "/seat-categories/:id", seatCategoryUpdateSchema, c.patchCategory);
  edit("post", "/halls", hallSchema, c.postHall);
  edit("patch", "/halls/:id", hallUpdateSchema, c.patchHall);
  edit("delete", "/halls/:id", null, c.deleteHall);
  edit("post", "/halls/:id/tables", bulkTablesSchema, c.postTables);
  edit("patch", "/tables/:id", tableUpdateSchema, c.patchTable);
  edit("delete", "/tables/:id", null, c.deleteTable);
  edit("post", "/tables/:id/seats", addSeatsSchema, c.postSeats);
  edit("patch", "/seats/:id", seatUpdateSchema, c.patchSeat);
  edit("delete", "/seats/:id", null, c.deleteSeat);
  return router;
}
