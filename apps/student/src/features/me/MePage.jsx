import { Link } from "react-router-dom";
import { ICONS } from "@app/shared/icons";
import { Button, Card } from "@app/shared/ui";
import { useInstallPrompt } from "../../app/pwa.js";
import { useMe } from "../../app/session.js";
import { useLogout } from "../auth/api.js";
import { IdCard } from "./components/IdCard.jsx";
import { NotificationsCard } from "./components/NotificationsCard.jsx";

/** Me (UI-GUIDE §10 Student profile): my card, my settings, the library's contact. */
export function MePage() {
  const { data: me } = useMe();
  const logout = useLogout();
  const { library } = me;

  return (
    <div className="flex flex-col gap-4">
      <IdCard student={me.student} library={library} bookings={me.bookings} />
      <Card className="divide-y divide-slate-100 p-0">
        <Row to="/attendance" icon={ICONS.attendance} label="My attendance" />
        <Row to="/password" icon={ICONS.password} label="Change password" />
        <InstallRow />
      </Card>
      <NotificationsCard />
      {(library.address || library.contactPhone) && (
        <Card className="flex flex-col gap-2 text-sm">
          <p className="font-semibold text-slate-900">{library.name}</p>
          {library.address && (
            <p className="flex gap-2 text-slate-600">
              <ICONS.location
                className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                aria-hidden="true"
              />
              {library.address}
            </p>
          )}
          {library.contactPhone && (
            <a
              href={`tel:${library.contactPhone}`}
              className="flex gap-2 font-medium text-brand-dark"
            >
              <ICONS.phone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {library.contactPhone}
            </a>
          )}
        </Card>
      )}
      <Button
        variant="danger-ghost"
        icon={ICONS.signOut}
        busy={logout.isPending}
        onClick={() => logout.mutate()}
      >
        Sign out
      </Button>
    </div>
  );
}

function Row({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="flex min-h-14 items-center gap-3 px-5 text-sm font-medium text-slate-800"
    >
      <Icon className="h-5 w-5 text-slate-400" aria-hidden="true" />
      <span className="flex-1">{label}</span>
      <ICONS.next className="h-4 w-4 text-slate-300" aria-hidden="true" />
    </Link>
  );
}

/** Install the app on this phone: a button where the browser offers it, steps on iPhone. */
function InstallRow() {
  const { canInstall, installed, ios, install } = useInstallPrompt();
  if (!installed && !canInstall && !ios) return null;
  return (
    <div className="flex min-h-14 items-center gap-3 px-5 py-3 text-sm">
      <ICONS.installApp className="h-5 w-5 text-slate-400" aria-hidden="true" />
      <span className="flex-1 font-medium text-slate-800">
        {installed ? "Installed on this phone" : "Install the app"}
        {!installed && ios && (
          <span className="block font-normal text-slate-500">Share → “Add to Home Screen”</span>
        )}
      </span>
      {canInstall && (
        <Button size="sm" onClick={install}>
          Install
        </Button>
      )}
    </div>
  );
}
