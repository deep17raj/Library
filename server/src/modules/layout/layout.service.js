import { bindDeps } from "../../lib/bindDeps.js";
import { recordAudit } from "../audit/audit.repository.js";
import * as layoutRepository from "./layout.repository.js";
import * as seatCategoriesRepository from "./seatCategories.repository.js";
import * as allocationsRepository from "../subscriptions/allocations.repository.js";
import * as subscriptionsRepository from "../subscriptions/subscriptions.repository.js";
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
  occupancy = {
    countActiveAllocationsOnSeat: allocationsRepository.countActiveAllocationsOnSeat,
    listActiveSlotsInHall: subscriptionsRepository.listActiveSlotsInHall,
    countActiveSubscriptionsInHall: subscriptionsRepository.countActiveSubscriptionsInHall,
  },
}) {
  return bindDeps(
    { db, repo, categories, audit, occupancy },
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
