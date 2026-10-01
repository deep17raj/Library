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

/** What the owner sees next to each checkbox on the Staff screen. */
export const PERMISSION_LABELS = Object.freeze({
  [PERMISSIONS.MEMBERS_MANAGE]: "Add and edit members",
  [PERMISSIONS.SEATS_ALLOCATE]: "Allocate, change and release seats",
  [PERMISSIONS.PAYMENTS_COLLECT]: "Collect payments",
  [PERMISSIONS.PAYMENTS_VOID]: "Void payments and refund deposits",
  [PERMISSIONS.EXPENSES_MANAGE]: "Record expenses",
  [PERMISSIONS.ATTENDANCE_MANAGE]: "Mark attendance",
  [PERMISSIONS.LAYOUT_MANAGE]: "Edit halls, tables and seats",
  [PERMISSIONS.SLOTS_MANAGE]: "Edit time slots and fees",
  [PERMISSIONS.NOTIFICATIONS_SEND]: "Send notifications",
  [PERMISSIONS.INSIGHTS_VIEW]: "View insights and exports",
  [PERMISSIONS.MOCKTESTS_VIEW]: "View mock-test sales",
  [PERMISSIONS.SETTINGS_MANAGE]: "Change library settings",
  [PERMISSIONS.STAFF_MANAGE]: "Manage staff logins",
});

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
