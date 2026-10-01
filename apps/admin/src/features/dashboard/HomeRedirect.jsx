import { Navigate } from "react-router-dom";
import { homePathFor } from "../../app/navigation.js";
import { useSession } from "../../app/session.js";

/** "/" goes to the right home for the signed-in role. */
export function HomeRedirect() {
  const { data: user } = useSession();
  return <Navigate to={homePathFor(user)} replace />;
}
