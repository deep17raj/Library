// The admin app's web app manifest ("Install app"). Unlike the student app it is a
// single, non-tenant app at /admin/, so the manifest is fixed: one name, one colour and
// a drawn icon (reusing renderAppIcon). Bump ADMIN_ICON_VERSION if the icon art changes
// so installed phones fetch the new one.

export const ADMIN_BASE = "/admin/";
export const ADMIN_BRAND_COLOR = "#4f46e5";
export const ADMIN_ICON_VERSION = "1";

/** The home-screen icon sizes the manifest offers, keyed by the URL variant. */
export const ADMIN_ICONS = {
  192: { size: 192, maskable: false },
  512: { size: 512, maskable: false },
  "maskable-512": { size: 512, maskable: true },
};

export function buildAdminManifest() {
  const icon = (file, size, purpose) => ({
    src: `${ADMIN_BASE}${file}?v=${ADMIN_ICON_VERSION}`,
    sizes: `${size}x${size}`,
    type: "image/png",
    purpose,
  });
  return {
    id: ADMIN_BASE,
    name: "Study Library Admin",
    short_name: "Study Admin",
    description: "Manage seats, members, fees and check-in.",
    start_url: ADMIN_BASE,
    scope: ADMIN_BASE,
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: ADMIN_BRAND_COLOR,
    icons: [
      icon("icon-192.png", 192, "any"),
      icon("icon-512.png", 512, "any"),
      icon("icon-maskable-512.png", 512, "maskable"),
    ],
  };
}
