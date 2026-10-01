import { hasPermission, PERMISSIONS, ROLES } from "@app/shared/constants";

const isSuperAdmin = (user) => user.role === ROLES.SUPER_ADMIN;
const inLibrary = (user) => !isSuperAdmin(user);
const inLibraryWith = (permission) => (user) => inLibrary(user) && hasPermission(user, permission);

/**
 * Sidebar entries. Each feature adds its own line; `visible` decides who sees it.
 * The API enforces the same rules — hiding a link is only convenience.
 */
export const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", visible: inLibrary },
  { to: "/layout", label: "Halls & seats", visible: inLibrary },
  { to: "/slots", label: "Slots & fees", visible: inLibrary },
  { to: "/staff", label: "Staff", visible: inLibraryWith(PERMISSIONS.STAFF_MANAGE) },
  { to: "/settings", label: "Settings", visible: inLibraryWith(PERMISSIONS.SETTINGS_MANAGE) },
  { to: "/platform/libraries", label: "Libraries", visible: isSuperAdmin },
  { to: "/platform/settings", label: "Platform settings", visible: isSuperAdmin },
  { to: "/account/password", label: "Change password", visible: () => true },
];

/** Where each kind of user lands after signing in. */
export function homePathFor(user) {
  return isSuperAdmin(user) ? "/platform/libraries" : "/dashboard";
}
