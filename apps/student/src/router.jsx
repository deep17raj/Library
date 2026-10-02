import { createBrowserRouter, Navigate } from "react-router-dom";
import { APP_BASE } from "./app/library.js";
import { Shell } from "./app/Shell.jsx";
import { LoginPage } from "./features/auth/LoginPage.jsx";
import { HomePage } from "./features/home/HomePage.jsx";

/**
 * Each screen beyond Home is its own download, fetched when first opened — a phone on
 * a slow connection gets sign-in and Home without the rest.
 * @param {() => Promise<Record<string, unknown>>} load dynamic import of the page module
 * @param {string} name the page component's export name
 */
const page = (load, name) => () => load().then((module) => ({ Component: module[name] }));

export const router = createBrowserRouter(
  [
    { path: "/login", element: <LoginPage /> },
    {
      path: "/password",
      lazy: page(() => import("./features/auth/ChangePasswordPage.jsx"), "ChangePasswordPage"),
    },
    {
      element: <Shell />,
      children: [
        { index: true, element: <HomePage /> },
        {
          path: "checkin",
          lazy: page(() => import("./features/checkin/CheckinPage.jsx"), "CheckinPage"),
        },
        {
          path: "attendance",
          lazy: page(() => import("./features/attendance/AttendancePage.jsx"), "AttendancePage"),
        },
        { path: "fees", lazy: page(() => import("./features/fees/FeesPage.jsx"), "FeesPage") },
        {
          path: "fees/receipts/:id",
          lazy: page(() => import("./features/fees/ReceiptPage.jsx"), "ReceiptPage"),
        },
        { path: "me", lazy: page(() => import("./features/me/MePage.jsx"), "MePage") },
        { path: "*", element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: APP_BASE },
);
