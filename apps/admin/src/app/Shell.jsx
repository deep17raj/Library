import { useEffect, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { ROLE_LABELS } from "@app/shared/constants";
import { IconButton, Spinner, cx } from "@app/shared/ui";
import { useLogout } from "../features/auth/api.js";
import { useLibrarySettings } from "../features/settings/api.js";
import { ICONS } from "@app/shared/icons";
import { visibleNav } from "./navigation.js";
import { useSession } from "./session.js";
import { useBranding } from "./useBranding.js";

/** The library's own display name once settings load; the platform name before. */
function libraryTitle(user, settings) {
  return settings?.displayName || user.library?.name || "Study Library";
}

/** Signed-in layout: sidebar (slide-in drawer on phones) + page. Sends signed-out people to /login. */
export function Shell() {
  const { data: user, isLoading } = useSession();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: settings } = useLibrarySettings();
  useBranding(settings);
  useEffect(() => setDrawerOpen(false), [location.pathname]);

  if (isLoading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  const title = libraryTitle(user, settings);

  return (
    <div className="min-h-screen md:flex">
      <header className="no-print sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur md:hidden">
        <Brand title={title} logoUrl={settings?.logoUrl} />
        <IconButton icon={Menu} label="Open menu" onClick={() => setDrawerOpen(true)} />
      </header>
      {drawerOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-slate-900/40 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <aside
        className={cx(
          "no-print fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Brand title={title} logoUrl={settings?.logoUrl} subtitle={ROLE_LABELS[user.role]} />
          <IconButton
            icon={X}
            label="Close menu"
            className="md:hidden"
            onClick={() => setDrawerOpen(false)}
          />
        </div>
        <SidebarNav user={user} />
        <UserCard user={user} />
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function Brand({ title, logoUrl, subtitle }) {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2.5">
      {logoUrl ? (
        <img src={logoUrl} alt="" className="h-9 w-9 shrink-0 rounded-xl object-contain" />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
          <ICONS.library className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-semibold text-slate-900">{title}</span>
        {subtitle && <span className="block text-xs text-slate-500">{subtitle}</span>}
      </span>
    </Link>
  );
}

function SidebarNav({ user }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 pb-4">
      {visibleNav(user).map((group) => (
        <div key={group.label} className="mt-4 first:mt-1">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {group.label}
          </p>
          {group.items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cx(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-brand-light font-medium text-brand-dark"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

function UserCard({ user }) {
  const logout = useLogout();
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
  const link =
    "flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-600 hover:bg-slate-100";
  return (
    <div className="border-t border-slate-200 p-3">
      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-700">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-800">{user.name}</p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
        </div>
      </div>
      <div className="mt-1 flex gap-1">
        <NavLink to="/account/password" className={link}>
          <ICONS.password className="h-4 w-4" aria-hidden="true" /> Password
        </NavLink>
        <button type="button" onClick={() => logout.mutate()} className={link}>
          <ICONS.signOut className="h-4 w-4" aria-hidden="true" /> Sign out
        </button>
      </div>
    </div>
  );
}
