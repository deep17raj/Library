import { bindDeps } from "../../lib/bindDeps.js";
import { recordAudit } from "../audit/audit.repository.js";
import * as layoutRepository from "./layout.repository.js";
import * as seatCategoriesRepository from "./seatCategories.repository.js";
import { getLayout } from "./layoutTree.js";
import { createCategory, updateCategory } from "./seatCategories.service.js";
import { addTables, createHall, deleteHall, updateHall } from "./halls.service.js";
import {
  addSeats,
  deleteSeat,
  deleteTable,
  updateSeat,
  updateTable,
} from "./tablesAndSeats.service.js";

/**
 * The library's physical layout: seat categories, halls, tables, seats.
 * Every function answers with the full layout (see layoutTree.js).
 */
export function createLayoutService({
  db,
  repo = layoutRepository,
  categories = seatCategoriesRepository,
  audit = { recordAudit },
}) {
  return bindDeps(
    { db, repo, categories, audit },
    {
      getLayout,
      createCategory,
      updateCategory,
      createHall,
      updateHall,
      deleteHall,
      addTables,
      updateTable,
      deleteTable,
      addSeats,
      updateSeat,
      deleteSeat,
    },
  );
}
