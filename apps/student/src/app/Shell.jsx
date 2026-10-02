import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { ICONS } from "@app/shared/icons";
import { Alert, Button, cx } from "@app/shared/ui";
import { useApplyBranding } from "./branding.js";
import { useMe } from "./session.js";
import { useUnreadCount } from "../features/notifications/api.js";

// Bottom tabs (UI-GUIDE §3): one thumb-reachable bar. "Tests" joins in milestone 9–10.
const TABS = [
  { to: "/", label: "Home", icon: ICONS.home, end: true },
  { to: "/checkin", label: "Check-in", icon: ICONS.checkin },
  { to: "/notifications", label: "Notices", icon: ICONS.notifications },
  { to: "/fees", label: "Fees", icon: ICONS.payment },
  { to: "/me", label: "Me", icon: ICONS.profile },
];

/**
 * The signed-in frame: library header, the screen, bottom tabs. Signed out → sign-in
 * (remembering where they were going, e.g. a scanned check-in link); still on the
 * temporary password → choose a password first [D10].
 */
export function Shell() {
  const { data: me, isLoading, error, refetch } = useMe();
  const location = useLocation();
  useApplyBranding(me?.library);
  const from = location.pathname + location.search;

  if (isLoading) return <Splash />;
  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 px-4">
        <Alert tone="error" title="Couldn't open the app">
          {error.message}
        </Alert>
        <Button variant="secondary" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  if (!me) return <Navigate to="/login" replace state={{ from }} />;
  if (me.student.mustChangePassword) return <Navigate to="/password" replace state={{ from }} />;

  return (
    <div className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      <AppHeader library={me.library} />
      <main className="mx-auto max-w-lg px-4 pb-6 pt-4">
        <Outlet />
      </main>
      <BottomTabs />
    </div>
  );
}

/** The library's logo (or the library icon) and name, like a shop sign. */
export function LibraryMark({ library, size = "md" }) {
  const box = size === "lg" ? "h-16 w-16 rounded-3xl" : "h-9 w-9 rounded-xl";
  if (library?.logoUrl) {
    return (
      <img
        src={library.logoUrl}
        alt=""
        className={cx(box, "bg-white object-contain p-1 ring-1 ring-slate-200")}
      />
    );
  }
  return (
    <span className={cx(box, "flex items-center justify-center bg-brand text-white")}>
      <ICONS.library className={size === "lg" ? "h-8 w-8" : "h-5 w-5"} aria-hidden="true" />
    </span>
  );
}

function AppHeader({ library }) {
  return (
    <header className="no-print sticky top-0 z-10 border-b border-slate-200/70 bg-white/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-2.5">
        <LibraryMark library={library} />
        <p className="truncate font-semibold text-slate-900">{library.name}</p>
      </div>
    </header>
  );
}

function BottomTabs() {
  const { data: unread } = useUnreadCount();
  const unreadCount = unread?.count ?? 0;
  return (
    <nav
      aria-label="Main"
      className="no-print fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cx(
                  "flex min-h-[3.75rem] flex-col items-center justify-center gap-1 text-xs font-medium",
                  isActive ? "text-brand-dark" : "text-slate-500",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cx(
                      "relative flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                      isActive && "bg-brand-light",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                    {to === "/notifications" && unreadCount > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** First paint while the student's data loads. */
export function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading">
      <span className="h-10 w-10 animate-spin rounded-full border-4 border-brand-light border-t-brand" />
    </div>
  );
}
