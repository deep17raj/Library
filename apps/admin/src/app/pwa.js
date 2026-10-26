import { registerServiceWorker as register } from "@app/shared/pwa";

// The install/offline plumbing lives in @app/shared/pwa (shared with the student app).
// Here we only pin it to this app: the worker is served at /admin/sw.js and controls /admin/.
export { useInstallPrompt } from "@app/shared/pwa";

/** Register the admin service worker (scope = the whole admin app). */
export function registerServiceWorker() {
  register("/admin/sw.js", "/admin/");
}
