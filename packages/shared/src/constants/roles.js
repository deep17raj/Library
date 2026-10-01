/** Staff-side roles. Students are not users; they authenticate separately. */
export const ROLES = Object.freeze({
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  STAFF: "staff",
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.SUPER_ADMIN]: "Super admin",
  [ROLES.ADMIN]: "Owner",
  [ROLES.STAFF]: "Staff",
});
