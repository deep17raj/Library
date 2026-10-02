import { bindDeps } from "../../lib/bindDeps.js";
import { libraryToday } from "../settings/librarySettings.js";
import * as insightsRepo from "./insights.repository.js";

export function createInsightsService({ db, repo = insightsRepo }) {
  return bindDeps(
    { db, repo },
    {
      getOccupancy,
      getRevenue,
      getDuesAgeing,
      getChurn,
      getAttendance,
    },
  );
}

async function getOccupancy(deps, ctx) {
  return deps.repo.occupancyBySlot(deps.db, ctx.tenantId);
}

async function getRevenue(deps, ctx) {
  return deps.repo.revenueByMonth(deps.db, ctx.tenantId);
}

async function getDuesAgeing(deps, ctx) {
  const today = await libraryToday(deps.db, ctx.tenantId);
  return deps.repo.duesAgeing(deps.db, ctx.tenantId, today);
}

async function getChurn(deps, ctx) {
  return deps.repo.churnByMonth(deps.db, ctx.tenantId);
}

async function getAttendance(deps, ctx, { month }) {
  return deps.repo.attendanceBySlot(deps.db, ctx.tenantId, month);
}
