import { useState } from "react";
import { NavLink, Outlet, Navigate, useLocation } from "react-router-dom";
import { ROLE_LABELS } from "@app/shared/constants";
import { Button, Spinner, cx } from "@app/shared/ui";
import { useSession } from "./session.js";
import { NAV_ITEMS } from "./navigation.js";
import { useLogout } from "../features/auth/api.js";

/** Signed-in layout: sidebar (drawer on phones) + page. Sends signed-out people to /login. */
export function Shell() {
  const { data: user, isLoading } = useSession();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (isLoading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  return (
    <div className="min-h-screen md:flex">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <span className="font-semibold">{user.library?.name || "Study Library"}</span>
        <Button variant="ghost" onClick={() => setDrawerOpen((open) => !open)} aria-label="Menu">
          ☰
        </Button>
      </header>
      <Sidebar user={user} open={drawerOpen} onNavigate={() => setDrawerOpen(false)} />
      <main className="flex-1 px-4 py-6 md:px-8">
        <Outlet />
      </main>
    </div>
  );
}

function Sidebar({ user, open, onNavigate }) {
  const logout = useLogout();
  return (
    <aside
      className={cx(
        "flex-col border-r border-slate-200 bg-white md:flex md:min-h-screen md:w-60",
        open ? "flex" : "hidden",
      )}
    >
      <div className="hidden px-5 py-5 md:block">
        <p className="font-semibold text-slate-900">{user.library?.name || "Study Library"}</p>
        <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {NAV_ITEMS.filter((item) => item.visible(user)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              cx(
                "rounded-lg px-3 py-2 text-sm",
                isActive
                  ? "bg-brand-light font-medium text-brand-dark"
                  : "text-slate-700 hover:bg-slate-100",
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-slate-200 px-5 py-4 text-sm">
        <p className="truncate text-slate-700">{user.name}</p>
        <p className="truncate text-xs text-slate-500">{user.email}</p>
        <Button
          variant="secondary"
          className="mt-3 w-full"
          busy={logout.isPending}
          onClick={() => logout.mutate()}
        >
          Sign out
        </Button>
      </div>
    </aside>
  );
}
