import { createBrowserRouter, Navigate } from "react-router-dom";
import { Shell } from "./app/Shell.jsx";
import { LoginPage } from "./features/auth/LoginPage.jsx";
import { ChangePasswordPage } from "./features/auth/ChangePasswordPage.jsx";
import { DashboardPage } from "./features/dashboard/DashboardPage.jsx";
import { HomeRedirect } from "./features/dashboard/HomeRedirect.jsx";
import { LayoutPage } from "./features/layout/LayoutPage.jsx";
import { SettingsPage } from "./features/settings/SettingsPage.jsx";
import { StaffPage } from "./features/staff/StaffPage.jsx";
import { LibrariesPage } from "./features/platform-libraries/LibrariesPage.jsx";
import { LibraryDetailPage } from "./features/platform-libraries/LibraryDetailPage.jsx";
import { PlatformSettingsPage } from "./features/platform-settings/PlatformSettingsPage.jsx";

export const router = createBrowserRouter(
  [
    { path: "/login", element: <LoginPage /> },
    {
      element: <Shell />,
      children: [
        { index: true, element: <HomeRedirect /> },
        { path: "dashboard", element: <DashboardPage /> },
        { path: "layout", element: <LayoutPage /> },
        { path: "staff", element: <StaffPage /> },
        { path: "settings", element: <SettingsPage /> },
        { path: "account/password", element: <ChangePasswordPage /> },
        { path: "platform/libraries", element: <LibrariesPage /> },
        { path: "platform/libraries/:id", element: <LibraryDetailPage /> },
        { path: "platform/settings", element: <PlatformSettingsPage /> },
        { path: "*", element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: "/admin" },
);
