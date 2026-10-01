import { hasPermission } from "@app/shared/constants";
import { useSession } from "./session.js";

/**
 * Whether the signed-in user may do something — used to hide buttons they can't
 * use. The server checks the same permission; this is only for a tidy screen.
 * @param {string} permission one of PERMISSIONS
 */
export function useCan(permission) {
  const { data: user } = useSession();
  return hasPermission(user, permission);
}
