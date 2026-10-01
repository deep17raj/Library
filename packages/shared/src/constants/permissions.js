import { ROLES } from "./roles.js";

/**
 * Staff permission keys. An `admin` (owner) implicitly has all of them; a `staff`
 * account has the subset its owner ticked. Routes check these, never the role name,
 * so a permission can be granted to staff without code changes.
 */
export const PERMISSIONS = Object.freeze({
  MEMBERS_MANAGE: "members.manage",
  SEATS_ALLOCATE: "seats.allocate",
  PAYMENTS_COLLECT: "payments.collect",
  PAYMENTS_VOID: "payments.void",
  EXPENSES_MANAGE: "expenses.manage",
  ATTENDANCE_MANAGE: "attendance.manage",
  LAYOUT_MANAGE: "layout.manage",
  SLOTS_MANAGE: "slots.manage",
  NOTIFICATIONS_SEND: "notifications.send",
  INSIGHTS_VIEW: "insights.view",
  MOCKTESTS_VIEW: "mocktests.view",
  SETTINGS_MANAGE: "settings.manage",
  STAFF_MANAGE: "staff.manage",
});

export const ALL_PERMISSIONS = Object.freeze(Object.values(PERMISSIONS));

export const DEFAULT_STAFF_PERMISSIONS = Object.freeze([
  PERMISSIONS.MEMBERS_MANAGE,
  PERMISSIONS.SEATS_ALLOCATE,
  PERMISSIONS.PAYMENTS_COLLECT,
  PERMISSIONS.ATTENDANCE_MANAGE,
]);

/**
 * @param {{ role: string, permissions?: string[] | null }} user
 * @param {string} permission
 */
export function hasPermission(user, permission) {
  if (!user) return false;
  if (user.role === ROLES.ADMIN || user.role === ROLES.SUPER_ADMIN) return true;
  return Array.isArray(user.permissions) && user.permissions.includes(permission);
}
