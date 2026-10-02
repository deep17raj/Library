import { hasPermission, PERMISSIONS, ROLES } from "@app/shared/constants";
import { ICONS } from "@app/shared/icons";

const isSuperAdmin = (user) => user.role === ROLES.SUPER_ADMIN;
const inLibrary = (user) => !isSuperAdmin(user);
const inLibraryWith = (permission) => (user) => inLibrary(user) && hasPermission(user, permission);

/**
 * Sidebar, in groups. Each feature adds its own line; `visible` decides who sees it.
 * The API enforces the same rules — hiding a link is only convenience.
 */
export const NAV_GROUPS = [
  {
    label: "Today",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: ICONS.dashboard, visible: inLibrary },
      { to: "/checkin", label: "Check-in desk", icon: ICONS.checkin, visible: inLibrary },
      {
        to: "/attendance",
        label: "Attendance",
        icon: ICONS.attendance,
        visible: inLibraryWith(PERMISSIONS.ATTENDANCE_MANAGE),
      },
    ],
  },
  {
    label: "Students",
    items: [
      { to: "/seat-map", label: "Seat map", icon: ICONS.seatMap, visible: inLibrary },
      { to: "/members", label: "Members", icon: ICONS.members, visible: inLibrary },
      { to: "/waitlist", label: "Waitlist", icon: ICONS.waitlist, visible: inLibrary },
    ],
  },
  {
    label: "Money",
    items: [
      { to: "/dues", label: "Dues", icon: ICONS.dues, visible: inLibrary },
      {
        to: "/payments",
        label: "Payments",
        icon: ICONS.payment,
        visible: inLibraryWith(PERMISSIONS.PAYMENTS_COLLECT),
      },
      {
        to: "/expenses",
        label: "Expenses",
        icon: ICONS.expenses,
        visible: inLibraryWith(PERMISSIONS.EXPENSES_MANAGE),
      },
      {
        to: "/ledger",
        label: "Day ledger",
        icon: ICONS.ledger,
        visible: inLibraryWith(PERMISSIONS.PAYMENTS_COLLECT),
      },
    ],
  },
  {
    label: "Setup",
    items: [
      { to: "/layout", label: "Halls & seats", icon: ICONS.layout, visible: inLibrary },
      { to: "/slots", label: "Slots & fees", icon: ICONS.slots, visible: inLibrary },
      {
        to: "/staff",
        label: "Staff",
        icon: ICONS.staff,
        visible: inLibraryWith(PERMISSIONS.STAFF_MANAGE),
      },
      {
        to: "/settings",
        label: "Settings",
        icon: ICONS.settings,
        visible: inLibraryWith(PERMISSIONS.SETTINGS_MANAGE),
      },
    ],
  },
  {
    label: "Platform",
    items: [
      {
        to: "/platform/libraries",
        label: "Libraries",
        icon: ICONS.libraries,
        visible: isSuperAdmin,
      },
      {
        to: "/platform/settings",
        label: "Platform settings",
        icon: ICONS.platformSettings,
        visible: isSuperAdmin,
      },
    ],
  },
];

/** The groups (and items) this user can see; empty groups are dropped. */
export function visibleNav(user) {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.visible(user)),
  })).filter((group) => group.items.length > 0);
}

/** Where each kind of user lands after signing in. */
export function homePathFor(user) {
  return isSuperAdmin(user) ? "/platform/libraries" : "/dashboard";
}
