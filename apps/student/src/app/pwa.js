import { useEffect, useReducer } from "react";
import { APP_BASE } from "./library.js";

// "Install app": Chrome/Android offer it through `beforeinstallprompt`, which fires once,
// early — so it is caught here at start-up and kept until a screen offers the button.
// iPhones have no prompt: the app explains Share → "Add to Home Screen" instead.

let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((listener) => listener());

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault(); // we show our own card instead of the browser's mini bar
  deferredPrompt = event;
  notify();
});
window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  notify();
});

/** Register the service worker for this library's app (production builds only). */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js", { scope: `${APP_BASE}/` }).catch(() => {
    // Not fatal: the app works without it, it just can't be installed or notify.
  });
}

export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
export const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

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
