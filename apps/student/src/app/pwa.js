import { registerServiceWorker as register } from "@app/shared/pwa";
import { APP_BASE } from "./library.js";

// The install/offline plumbing lives in @app/shared/pwa (shared with the admin app).
// Here we only pin it to this app: the worker is served at /sw.js and controls /s/<slug>/.
export {
  isStandalone,
  isIos,
  iosVersion,
  IOS_PUSH_MIN_VERSION,
  useInstallPrompt,
} from "@app/shared/pwa";

/** Register the student service worker (scope = this library's app). */
export function registerServiceWorker() {
  register("/sw.js", `${APP_BASE}/`);
}
