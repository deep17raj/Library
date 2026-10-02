import { api, platformApi } from "./api.js";

// Turning notifications on/off for this phone. The browser makes a push subscription
// with the server's public key; the server stores it (sending starts in milestone 8).

export const pushSupported = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

async function appRegistration() {
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    throw new Error(
      "Open the app from your home screen (install it first) to turn on notifications.",
    );
  }
  return registration;
}

/** This phone's current subscription, or null. */
export async function currentSubscription() {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return registration ? registration.pushManager.getSubscription() : null;
}

/** Ask permission, subscribe and tell the server. Returns the updated device list. */
export async function enablePush() {
  const registration = await appRegistration();
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notifications are blocked. Allow them for this app in your phone's settings.");
  }
  const { publicKey } = await platformApi.get("/push/public-key");
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToBytes(publicKey),
  });
  return (await api.post("/push/subscribe", subscription.toJSON())).devices;
}

/** Stop notifications on this phone. Returns the updated device list. */
export async function disablePush() {
  const subscription = await currentSubscription();
  if (!subscription) return (await api.get("/push/devices")).devices;
  const { devices } = await api.post("/push/unsubscribe", { endpoint: subscription.endpoint });
  await subscription.unsubscribe();
  return devices;
}

/** SHA-256 of an endpoint, to find "this phone" in the device list. */
export async function endpointHash(endpoint) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function base64UrlToBytes(base64Url) {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (ch) => ch.charCodeAt(0));
}
