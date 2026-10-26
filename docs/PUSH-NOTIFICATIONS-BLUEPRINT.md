# Web Push Notifications — Reusable Blueprint

A complete, framework-agnostic guide to building an **app-like push notification system**
for a PWA (Progressive Web App), as used in the Study Library project. Hand this file to a
new project and you can rebuild the whole system from it.

It covers: how web push works, the service worker, subscribing a browser, sending from the
server, VAPID keys, the database, security, the Android/iOS differences, and testing.
Code is shown as proven, copy-adaptable snippets (Node/Express + plain JS + React), but the
concepts apply to any stack.

---

## 1. What you are building (and its limits)

**Web Push** lets your server deliver a notification to a user's device **even when your app
and browser are closed**, through the browser vendor's push service (Google/Mozilla/Apple).
It is the same technology native apps use underneath, and on an installed PWA it feels like
a real app notification: appears on the lock screen, plays the phone's notification sound,
vibrates, and opens your app when tapped.

**Know these limits before you start — they drive the whole design:**

| Limit | Consequence |
|---|---|
| **No custom sound file.** The old `Notification.sound` was dropped from the spec. | The phone plays its **own** default notification sound. You control vibration, not audio. For a truly custom sound you need a native app or an Android TWA wrapper. |
| **You cannot play audio from the service worker.** | A push arriving while the app is closed can't `new Audio().play()`. Only a *foreground* page can. |
| **iOS needs the PWA installed to the home screen** and **iOS 16.4+**. | In the Safari *tab*, push is unavailable. Many users never install → they get nothing. |
| **Delivery is best-effort, not guaranteed.** | Battery savers / OEM killers can drop or delay pushes. For anything critical (money), add an SMS/WhatsApp/email fallback. |
| **HTTPS required** (or `localhost`). | Service workers and push don't register over plain `http://` on a LAN IP. Deploy behind HTTPS or use an HTTPS tunnel (ngrok/cloudflared) for phone testing. |

---

## 2. The end-to-end flow

```
┌─────────────┐   1. register SW + subscribe        ┌──────────────┐
│   Browser   │ ──────────────────────────────────▶ │ Your Server  │
│  (PWA +     │    {endpoint, keys} stored           │              │
│   Service   │                                      │              │
│   Worker)   │                                      │              │
└─────────────┘                                      └──────┬───────┘
      ▲                                                     │ 2. POST encrypted payload
      │ 4. SW 'push' event → showNotification()             │    signed with VAPID key
      │                                                     ▼
      │                                            ┌──────────────────┐
      └────────────────────────────────────────── │  Push Service    │
            3. push service wakes the SW           │ (FCM / Mozilla / │
                                                   │  Apple / WNS)    │
                                                   └──────────────────┘
```

1. **Subscribe** — The browser registers a service worker, asks the user's permission, and
   calls `pushManager.subscribe()` with your server's **VAPID public key**. It returns a
   `subscription` object `{ endpoint, keys: { p256dh, auth } }`. Send it to your server and
   store it.
2. **Send** — Your server POSTs an encrypted payload to that `endpoint`, signed with your
   VAPID private key. Use a library (`web-push` for Node) — it handles the encryption.
3. **Deliver** — The vendor's push service wakes the service worker on the device.
4. **Show** — The service worker's `push` event handler calls `showNotification()`. A tap
   fires `notificationclick`, which focuses/opens your app.

---

## 3. VAPID keys (server identity)

VAPID is an ECDSA **P-256** key pair that identifies your server to push services. Generate
it **once** and store it; every subsequent send uses the same pair. The **public** key goes
to the browser at subscribe time; the **private** key signs sends and never leaves the server.

Generate with the `web-push` CLI (`npx web-push generate-vapid-keys`) or in code:

```js
import crypto from "node:crypto";

/** @returns {{ publicKey: string, privateKey: string }} base64url, as every push lib expects */
export function generateVapidKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const pub = publicKey.export({ format: "jwk" });
  const point = Buffer.concat([
    Buffer.from([0x04]),                                 // uncompressed point marker
    Buffer.from(String(pub.x), "base64url"),
    Buffer.from(String(pub.y), "base64url"),
  ]);
  return {
    publicKey: point.toString("base64url"),              // 65-byte point
    privateKey: String(privateKey.export({ format: "jwk" }).d), // 32-byte scalar
  };
}
```

**Storage:** keep the pair in a single-row settings table (or a secret store). If you
generate on first use, make the insert **insert-if-absent** so two simultaneous first
requests can't create two different pairs ("first writer wins"). Cache it in memory after
the first read.

Expose the public key at a public endpoint, e.g. `GET /api/push/public-key`.

---

## 4. Database schema

Two concerns: **who to reach** (subscriptions) and **what was sent** (the notification log +
per-recipient inbox). MySQL shown; adapt types as needed.

### 4.1 Subscriptions — one row per browser

```sql
CREATE TABLE push_subscriptions (
  id            CHAR(36) PRIMARY KEY,
  tenant_id     CHAR(36) NOT NULL,          -- drop if single-tenant
  member_id     CHAR(36) NOT NULL,          -- the user who owns this browser
  endpoint      TEXT NOT NULL,              -- the push service URL we POST to
  endpoint_hash CHAR(64) NOT NULL,          -- SHA-256 of endpoint; one browser = one row
  p256dh        VARCHAR(255) NOT NULL,      -- client public key (for payload encryption)
  auth          VARCHAR(255) NOT NULL,      -- client auth secret
  user_agent    VARCHAR(255) NOT NULL DEFAULT '',  -- to label devices ("Chrome on Android")
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_push_endpoint (endpoint_hash),      -- idempotent re-subscribe
  KEY ix_push_member (tenant_id, member_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- `endpoint_hash` is unique **globally** so the same browser re-subscribing (new keys, or a
  different user on a shared phone) **updates** its one row instead of piling up.
- Store the full `endpoint` (needed to send) but **never return it or the keys to the
  client** — only ever send back a device label + the hash.

### 4.2 Notifications log + inbox (optional but recommended)

If you want an in-app "inbox" with unread counts (not just transient pushes):

```sql
CREATE TABLE notifications (
  id               CHAR(36) PRIMARY KEY,
  tenant_id        CHAR(36) NOT NULL,
  kind             ENUM('announcement','fee_due','seat_expiry','system') NOT NULL,
  title            VARCHAR(80) NOT NULL,
  body             VARCHAR(300) NOT NULL,
  url              VARCHAR(255) NOT NULL DEFAULT '',   -- where a tap should open
  audience         JSON NULL,                          -- who it targeted (for the log)
  dedupe_key       VARCHAR(120) NULL,                  -- "send exactly once" guard
  recipients_count INT UNSIGNED NOT NULL DEFAULT 0,
  push_sent        INT UNSIGNED NOT NULL DEFAULT 0,
  push_failed      INT UNSIGNED NOT NULL DEFAULT 0,
  created_by       CHAR(36) NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_notif_dedupe (tenant_id, dedupe_key),  -- dedupe automated sends
  KEY ix_notif_tenant_time (tenant_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE notification_recipients (
  notification_id CHAR(36) NOT NULL,
  member_id       CHAR(36) NOT NULL,
  tenant_id       CHAR(36) NOT NULL,
  read_at         DATETIME NULL,                       -- NULL = unread
  PRIMARY KEY (notification_id, member_id),
  KEY ix_inbox (member_id, notification_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

The `dedupe_key` is the trick that makes automated reminders safe: before creating a
`fee_due` reminder, check whether a row with that key already exists (e.g.
`fee_due:<invoiceId>:d-3`). If so, skip. This lets a job run hourly without double-sending.

---

## 5. Server — storing subscriptions

Validate the endpoint host **before storing** (anti-SSRF: you will POST to it later, so it
must be a real push service, never an arbitrary URL):

```js
const PUSH_SERVICE_HOSTS = [
  "fcm.googleapis.com",         // Chrome, Edge on Android, Samsung Internet
  "push.services.mozilla.com",  // Firefox
  "notify.windows.com",         // Edge on Windows
  "push.apple.com",             // Safari / iOS home-screen apps
];

export function isAllowedPushEndpoint(endpoint) {
  try {
    const { protocol, hostname } = new URL(endpoint);
    return protocol === "https:" &&
      PUSH_SERVICE_HOSTS.some((h) => hostname === h || hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

const hashEndpoint = (endpoint) =>
  crypto.createHash("sha256").update(endpoint).digest("hex");
```

Subscribe handler (pseudo): validate → `upsert` by `endpoint_hash` → return the user's device
list (labels + hashes only). Derive a human label from the User-Agent so the UI can show
"Chrome on Android" and let the user tell their phones apart.

**Endpoints to expose:**

| Method & path | Auth | Purpose |
|---|---|---|
| `GET /api/push/public-key` | public | VAPID public key for `pushManager.subscribe()` |
| `POST /push/subscribe` | user session | store `{ endpoint, keys }` |
| `POST /push/unsubscribe` | user session | delete by endpoint hash |
| `GET /push/devices` | user session | list the user's subscribed devices |

---

## 6. Server — sending

Use the `web-push` library. Send to **all** of a user's devices; delete subscriptions the
push service reports as gone (HTTP **404/410**).

```js
import webPush from "web-push";

const options = {
  vapidDetails: { subject: "mailto:you@example.com", publicKey, privateKey },
  TTL: 86400, // seconds the push service holds it if the device is offline
};

async function sendToMembers(db, tenantId, memberIds, payload) {
  if (memberIds.length === 0) return { sent: 0, failed: 0 };
  const subs = await listSubscriptionsForMembers(db, tenantId, memberIds);
  const body = JSON.stringify(payload);        // the SW reads this JSON
  let sent = 0, failed = 0;
  const stale = [];

  await Promise.allSettled(subs.map(async (sub) => {
    try {
      await webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body, options,
      );
      sent++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) stale.push(sub.id); // browser gone
      failed++;
    }
  }));

  for (const id of stale) await deleteSubscriptionById(db, id).catch(() => {});
  return { sent, failed };
}
```

### 6.1 The payload contract (server ↔ service worker)

Keep the payload small and define exactly what the SW expects. The one used here:

```jsonc
{
  "title": "Fee reminder",
  "body":  "Your fee is due today. Please pay at the desk.",
  "url":   "/fees",          // where a tap opens (relative to the app)
  "tag":   "fee_due",        // notifications with the same tag collapse into one
  "important": true          // urgent → stays on screen + stronger vibration
}
```

Derive `tag`/`important` on the server from the notification kind so the SW stays dumb:

```js
const URGENT_KINDS = new Set(["fee_due", "seat_expiry"]);
function pushPayload({ kind, title, body, url }) {
  return { title, body, url: url || "", tag: kind, important: URGENT_KINDS.has(kind) };
}
```

### 6.2 Targeting an audience

Resolve "who gets this" to a list of user IDs with a query per audience type. Examples:

- **all active users:** `WHERE status = 'active'`
- **users with dues:** join to open invoices past due date
- **one group/slot:** join to active memberships of that group

Then `sendToMembers(..., memberIds, payload)`. For **automated** reminders, run a scheduled
job (cron / interval) that finds who qualifies and calls a `sendSystemNotification` that
checks the `dedupe_key` first.

---

## 7. The service worker

Served at the app's scope root (e.g. `/sw.js`), registered **in production only** (it
caches assets). Three jobs: cache assets, show pushes, open on tap.

```js
// --- show a push notification ---
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { body: event.data ? event.data.text() : "" }; }

  const scope = self.registration.scope;
  const urgent = data.important === true;

  event.waitUntil(
    self.registration.showNotification(data.title || "Update", {
      body: data.body || "",
      icon: `${scope}icon-192.png`,            // your app icon
      badge: `${scope}icon-192.png`,           // monochrome tray badge (Android)
      tag: data.tag || undefined,              // same tag replaces, doesn't stack
      renotify: data.tag ? true : undefined,   // re-alert (sound+buzz) when replacing
      requireInteraction: urgent,              // urgent stays until tapped
      vibrate: urgent ? [200,100,200,100,200] : [200,100,200], // the "app-like" buzz
      data: { url: data.url || scope },        // read back in notificationclick
    }),
  );
});

// --- open the app when tapped ---
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const scope = self.registration.scope;
  const target = new URL(event.notification.data?.url || scope, scope);
  const url = target.origin === self.location.origin ? target.href : scope; // same-origin only
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = wins.find((w) => w.url.startsWith(scope));
    if (open) { await open.focus(); return open.navigate(url); }  // reuse an open tab
    return self.clients.openWindow(url);                          // else open fresh
  })());
});
```

Notes:
- `tag` + `renotify` is how you make a **fresh reminder replace a stale one** instead of
  stacking five "fee due" notifications.
- `requireInteraction` keeps urgent notifications on the lock screen until the user acts.
- `vibrate` is the closest thing to a custom alert; the **sound** is the OS default.
- Never cache API responses in the SW if they're private/business data.

Also keep a minimal `install`/`activate` (`skipWaiting()` + `clients.claim()`) and an
asset-caching `fetch` handler if you want offline support — orthogonal to push.

---

## 8. Client — registering & subscribing

```js
// Capability check. On iOS these are only present in the INSTALLED PWA, not the Safari tab.
export const pushSupported = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

// Register the SW (production only).
export function registerServiceWorker(scope = "/") {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw.js", { scope }).catch(() => {});
}

// Ask permission, subscribe, send to server.
export async function enablePush(apiBase = "") {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) throw new Error("Install the app to your home screen first.");

  const permission = await Notification.requestPermission();   // MUST be from a user tap
  if (permission !== "granted") throw new Error("Notifications are blocked. Enable in Settings.");

  const { publicKey } = await fetch(`${apiBase}/api/push/public-key`).then((r) => r.json());
  const subscription = await reg.pushManager.subscribe({
    userVisibleOnly: true,                      // required: you promise every push is visible
    applicationServerKey: base64UrlToBytes(publicKey),
  });
  await fetch(`${apiBase}/push/subscribe`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription.toJSON()),  // { endpoint, keys: { p256dh, auth } }
  });
}

// The VAPID public key is base64url; subscribe() wants a Uint8Array.
function base64UrlToBytes(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}
```

To **unsubscribe**: `const sub = await reg.pushManager.getSubscription(); await
sub?.unsubscribe();` and tell the server to delete it.

**Important:** `Notification.requestPermission()` must be triggered by a user gesture (a
button tap). If the user denies, you **cannot ask again** — they must re-enable in OS/browser
settings. So show the value *before* the prompt and make the one tap count.

---

## 9. PWA requirements (so it can be installed)

Push on mobile needs the PWA to be installable. Minimum:

1. **Web App Manifest** (`manifest.webmanifest`) with `name`, `start_url`, `display:
   "standalone"`, and icons (include a 192px and 512px PNG). Link it in your HTML `<head>`.
2. **A registered service worker.**
3. **Served over HTTPS.**
4. Icons referenced by the SW (`icon-192.png`) must exist at the app scope.

Install UX:
- **Android/Chrome:** fires a `beforeinstallprompt` event — capture it, show your own
  "Install" button, call `event.prompt()` on tap.
- **iOS:** there is **no** install prompt. You must *instruct* the user: "Tap the Share
  button → Add to Home Screen," then open from the home-screen icon.

---

## 10. Android vs iOS — the differences that matter

| | Android (Chrome) | iPhone (Safari) |
|---|---|---|
| Works in browser tab? | Yes once permission granted | **No** — installed PWA only |
| Minimum OS | Any modern Chrome | **iOS/iPadOS 16.4+** |
| Install prompt | `beforeinstallprompt` | Manual: Share → Add to Home Screen |
| Closed-app delivery | Yes | Yes (when installed) |
| Sound | OS default | OS default |
| Vibration | Yes | Limited |

**Make the "enable" UI OS-aware** so iPhone users get the right next step instead of a dead
"unsupported" message:

```js
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
function iosVersion() {                           // 16.4 etc., or null off iOS
  const m = /OS (\d+)_(\d+)/.exec(navigator.userAgent);
  return isIos() && m ? Number(`${m[1]}.${m[2]}`) : null;
}

function unavailableReason() {
  if (isIos()) {
    const v = iosVersion();
    if (v !== null && v < 16.4) return "Your iPhone needs iOS 16.4 or newer for notifications.";
    if (!isStandalone()) return "Install the app first: Share → Add to Home Screen, then open it and turn notifications on.";
  }
  return "This browser can't show notifications. Install the app and open it from your home screen.";
}
```

---

## 11. Security checklist

- **Validate the endpoint host** before storing (section 5) — prevents your sender from
  being used to POST at arbitrary hosts (SSRF).
- **Require `https:` endpoints** only.
- **Never return** `endpoint`, `p256dh`, or `auth` to any client — return device labels only.
- **Scope every query by tenant/user** in multi-tenant apps; take the owning IDs from the
  session, never from the request body.
- **Keep VAPID private key and gateway secrets in env/secret store**, never in the client,
  never in logs.
- **Rate-limit** subscribe/unsubscribe endpoints.
- **Clean up stale subscriptions** on 404/410 so you don't keep hammering dead endpoints.

---

## 12. Testing

- **Unit:** test audience resolution (who qualifies), dedupe (skip when key exists), and
  that the payload carries the right `tag`/`important` for each kind. Mock the push sender.
- **Local:** `localhost` counts as a secure origin, so you can test install + push in
  desktop Chrome. Use DevTools → Application → Service Workers (and the "Push" tester).
- **Phone:** you need HTTPS. Deploy to a host with TLS, or expose your dev server via an
  HTTPS tunnel (`ngrok http 5050`, `cloudflared tunnel`). Then open the tunnel URL on the
  phone, install the PWA, enable notifications, and send a test.
- **Expiry:** push subscriptions expire/rotate. Handle `pushsubscriptionchange` in the SW
  (re-subscribe and re-send to server) for long-lived installs.

---

## 13. When web push isn't enough

- **Custom sound / louder alert on Android:** wrap the *same* PWA as a **TWA (Trusted Web
  Activity)** with Bubblewrap and configure a native notification channel. It reuses your
  existing push code — it's packaging, not a rewrite.
- **Guaranteed delivery for critical messages (money, OTP):** push is best-effort. Add a
  second channel — **SMS or WhatsApp Business API** (high open rates), or email as a
  tertiary. Route users who have **no active subscription** to the fallback automatically
  (you already know who has a device from `push_subscriptions`).
- **Full native features** (background location, custom iOS sound, etc.): only then consider
  a native wrapper (Capacitor) + FCM/APNs. It's a much bigger maintenance commitment.

---

## 14. Build order for a new project

1. Manifest + icons + service worker registration → app is installable.
2. VAPID key generation + storage + `GET /public-key`.
3. `push_subscriptions` table + subscribe/unsubscribe/devices endpoints (with host
   validation).
4. Client "turn on notifications" flow (OS-aware).
5. Service worker `push` + `notificationclick` handlers.
6. `sendToMembers` + the payload contract; wire one manual "send announcement" path.
7. Notification log + inbox tables (if you want in-app history / unread badges).
8. Scheduled jobs + `dedupe_key` for automated reminders.
9. Fallback channel (SMS/WhatsApp) for critical messages.

That order gets you a visible, testable result at each step.
