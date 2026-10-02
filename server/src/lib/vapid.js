import crypto from "node:crypto";

// Web Push identifies our server to the browsers' push services with a VAPID key pair
// (an ECDSA P-256 key). Format is the one every push library uses: the public key as
// the 65-byte uncompressed point and the private key as the 32-byte scalar, both
// base64url. Generated once and kept in platform_settings (push module), so a cPanel
// install needs no extra setup.

/** @returns {{ publicKey: string, privateKey: string }} */
export function generateVapidKeys() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  const pub = publicKey.export({ format: "jwk" });
  const point = Buffer.concat([
    Buffer.from([0x04]),
    Buffer.from(String(pub.x), "base64url"),
    Buffer.from(String(pub.y), "base64url"),
  ]);
  return {
    publicKey: point.toString("base64url"),
    privateKey: String(privateKey.export({ format: "jwk" }).d),
  };
}

// Only real browser push services: we will POST to these URLs when sending (M8), so
// a stored endpoint must never point at an arbitrary host (SSRF).
const PUSH_SERVICE_HOSTS = [
  "fcm.googleapis.com", // Chrome, Edge on Android, Samsung Internet
  "push.services.mozilla.com", // Firefox
  "notify.windows.com", // Edge on Windows
  "push.apple.com", // Safari / iOS home-screen apps
];

/** @param {string} endpoint */
export function isAllowedPushEndpoint(endpoint) {
  try {
    const { protocol, hostname } = new URL(endpoint);
    return (
      protocol === "https:" &&
      PUSH_SERVICE_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`))
    );
  } catch {
    return false;
  }
}
