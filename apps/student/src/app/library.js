/**
 * Which library this app is for. The server serves one app for every library at
 * /s/<slug>/…, so the slug comes from the address bar.
 */
export const LIBRARY_SLUG = (window.location.pathname.match(/^\/s\/([a-z0-9-]+)/) || [])[1] || "";

/** The app's base path (the router's basename and the service worker's scope). */
export const APP_BASE = `/s/${LIBRARY_SLUG}`;
