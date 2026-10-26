import { useEffect, useReducer } from "react";

// Shared "install this app" plumbing for both PWAs (admin and student). Chrome/Android
// offer installation through `beforeinstallprompt`, which fires once and early — so it is
// caught here at module load and kept until a screen offers the button. iPhones have no
// such prompt: a screen explains Share → "Add to Home Screen" instead (see `isIos`).

let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault(); // we show our own button/card instead of the browser's mini bar
    deferredPrompt = event;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });
}

/**
 * Register a service worker in production builds only. Failure is not fatal: the app
 * works without it, it just can't be installed or run offline.
 * @param {string} scriptUrl where the worker file is served (e.g. "/admin/sw.js")
 * @param {string} scope the path it controls (e.g. "/admin/")
 */
export function registerServiceWorker(scriptUrl, scope) {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register(scriptUrl, { scope }).catch(() => {
    // Not fatal — see the note above.
  });
}

export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
export const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

/**
 * iOS/iPadOS major.minor as a number (e.g. 16.4), or null off iOS. Web Push on iPhone
 * needs 16.4+ AND the app installed to the home screen, so a notifications screen can use
 * this to explain the right next step instead of a dead "unsupported" message.
 */
export function iosVersion() {
  if (!isIos()) return null;
  const match = /OS (\d+)_(\d+)/.exec(window.navigator.userAgent);
  return match ? Number(`${match[1]}.${match[2]}`) : null;
}

export const IOS_PUSH_MIN_VERSION = 16.4;

/** `{ canInstall, installed, ios, install() }` for an "Install app" button or card. */
export function useInstallPrompt() {
  const [, rerender] = useReducer((n) => n + 1, 0);
  useEffect(() => {
    listeners.add(rerender);
    return () => listeners.delete(rerender);
  }, []);
  return {
    canInstall: Boolean(deferredPrompt),
    installed: isStandalone(),
    ios: isIos(),
    async install() {
      if (!deferredPrompt) return false;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      deferredPrompt = null;
      notify();
      return outcome === "accepted";
    },
  };
}
