import { ROLES } from "@app/shared/constants";

/**
 * Sidebar entries. Each feature adds its own line here; `visible` decides who sees
 * it (role now, permissions from milestone 2). The routes enforce the same rules on
 * the server — hiding a link is only convenience.
 */
export const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", visible: (user) => user.role !== ROLES.SUPER_ADMIN },
  {
    to: "/platform/libraries",
    label: "Libraries",
    visible: (user) => user.role === ROLES.SUPER_ADMIN,
  },
  {
    to: "/platform/settings",
    label: "Platform settings",
    visible: (user) => user.role === ROLES.SUPER_ADMIN,
  },
  { to: "/account/password", label: "Change password", visible: () => true },
];

/** Where each kind of user lands after signing in. */
export function homePathFor(user) {
  return user.role === ROLES.SUPER_ADMIN ? "/platform/libraries" : "/dashboard";
}
