import { createBrowserRouter, Navigate } from "react-router-dom";
import { Shell } from "./app/Shell.jsx";
import { LoginPage } from "./features/auth/LoginPage.jsx";
import { HomeRedirect } from "./features/dashboard/HomeRedirect.jsx";

/**
 * Each page is its own download, fetched the first time it is opened, so a phone on a
 * slow connection loads the login screen and the dashboard without the whole app.
 * @param {() => Promise<Record<string, unknown>>} load dynamic import of the page module
 * @param {string} name the page component's export name
 */
const page = (load, name) => () => load().then((module) => ({ Component: module[name] }));

export const router = createBrowserRouter(
  [
    { path: "/login", element: <LoginPage /> },
    {
      element: <Shell />,
      children: [
        { index: true, element: <HomeRedirect /> },
        {
          path: "dashboard",
          lazy: page(() => import("./features/dashboard/DashboardPage.jsx"), "DashboardPage"),
        },
        {
          path: "seat-map",
          lazy: page(() => import("./features/seat-map/SeatMapPage.jsx"), "SeatMapPage"),
        },
        {
          path: "members",
          lazy: page(() => import("./features/members/MembersPage.jsx"), "MembersPage"),
        },
        {
          path: "members/new",
          lazy: page(() => import("./features/members/NewMemberPage.jsx"), "NewMemberPage"),
        },
        {
          path: "members/:id",
          lazy: page(() => import("./features/members/MemberDetailPage.jsx"), "MemberDetailPage"),
        },
        {
          path: "waitlist",
          lazy: page(() => import("./features/waitlist/WaitlistPage.jsx"), "WaitlistPage"),
        },
        {
          path: "checkin",
          lazy: page(() => import("./features/attendance/CheckinDeskPage.jsx"), "CheckinDeskPage"),
        },
        {
          path: "attendance",
          lazy: page(() => import("./features/attendance/AttendancePage.jsx"), "AttendancePage"),
        },
        { path: "dues", lazy: page(() => import("./features/billing/DuesPage.jsx"), "DuesPage") },
        {
          path: "payments",
          lazy: page(() => import("./features/billing/PaymentsPage.jsx"), "PaymentsPage"),
        },
        {
          path: "payments/:id/receipt",
          lazy: page(() => import("./features/billing/ReceiptPage.jsx"), "ReceiptPage"),
        },
        {
          path: "expenses",
          lazy: page(() => import("./features/expenses/ExpensesPage.jsx"), "ExpensesPage"),
        },
        {
          path: "ledger",
          lazy: page(() => import("./features/ledger/LedgerPage.jsx"), "LedgerPage"),
        },
        {
          path: "layout",
          lazy: page(() => import("./features/layout/LayoutPage.jsx"), "LayoutPage"),
        },
        { path: "slots", lazy: page(() => import("./features/slots/SlotsPage.jsx"), "SlotsPage") },
        { path: "staff", lazy: page(() => import("./features/staff/StaffPage.jsx"), "StaffPage") },
        {
          path: "notifications",
          lazy: page(
            () => import("./features/notifications/NotificationsPage.jsx"),
            "NotificationsPage",
          ),
        },
        {
          path: "insights",
          lazy: page(() => import("./features/insights/InsightsPage.jsx"), "InsightsPage"),
        },
        {
          path: "settings",
          lazy: page(() => import("./features/settings/SettingsPage.jsx"), "SettingsPage"),
        },
        {
          path: "account/password",
          lazy: page(() => import("./features/auth/ChangePasswordPage.jsx"), "ChangePasswordPage"),
        },
        {
          path: "platform/libraries",
          lazy: page(
            () => import("./features/platform-libraries/LibrariesPage.jsx"),
            "LibrariesPage",
          ),
        },
        {
          path: "platform/libraries/:id",
          lazy: page(
            () => import("./features/platform-libraries/LibraryDetailPage.jsx"),
            "LibraryDetailPage",
          ),
        },
        {
          path: "platform/mock-tests",
          lazy: page(
            () => import("./features/platform-mock-tests/MockTestsPage.jsx"),
            "MockTestsPage",
          ),
        },
        {
          path: "platform/settings",
          lazy: page(
            () => import("./features/platform-settings/PlatformSettingsPage.jsx"),
            "PlatformSettingsPage",
          ),
        },
        { path: "*", element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: "/admin" },
);
