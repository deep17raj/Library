import { NavLink } from "react-router-dom";
import { cx } from "@app/shared/ui";
import { visibleBottomNav } from "./navigation.js";

/**
 * The phone tab bar that makes the installed app feel native: a fixed row of the five
 * most-used destinations. Hidden on desktop (the sidebar is always there) and for the
 * super admin (no library tabs). Sits above the home-indicator via the safe-area inset.
 */
export function BottomNav({ user }) {
  const tabs = visibleBottomNav(user);
  if (tabs.length === 0) return null;
  return (
    <nav
      aria-label="Primary"
      className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="flex">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === "/dashboard"}
              className={({ isActive }) =>
                cx(
                  "flex flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium transition-colors",
                  isActive ? "text-brand-dark" : "text-slate-500 hover:text-slate-700",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cx(
                      "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                      isActive && "bg-brand-light",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
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
