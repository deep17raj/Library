import crypto from "node:crypto";

// Pure helpers for serving the student app per library: the web app manifest (what
// "Install app" uses — name, colour, icons, scope) and the <head> tags injected into
// the one built index.html. See serveStudentApp.js.

/** Same rule as the library slug (shared slugField): lowercase letters, digits, hyphens. */
export function isValidSlug(slug) {
  return /^[a-z0-9](?:[a-z0-9-]{0,58}[a-z0-9])?$/.test(String(slug));
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
export const safeColor = (color, fallback = "#4f46e5") =>
  HEX_COLOR.test(color) ? color : fallback;

/** Changes when the logo or colour changes, so phones fetch the new icon. */
export function iconVersion({ logoPath, brandColor }) {
  return crypto.createHash("sha1").update(`${logoPath}|${brandColor}`).digest("hex").slice(0, 8);
}

/**
 * @param {{ slug: string, name: string, brandColor: string, logoPath: string }} library
 */
export function buildManifest(library) {
  const base = `/s/${library.slug}/`;
  const v = iconVersion(library);
  const icon = (file, size, purpose) => ({
    src: `${base}${file}?v=${v}`,
    sizes: `${size}x${size}`,
    type: "image/png",
    purpose,
  });
  return {
    id: base,
    name: library.name,
    // The label under the home-screen icon: keep it short.
    short_name:
      library.name.length <= 12 ? library.name : library.name.split(/\s+/)[0].slice(0, 12),
    description: `${library.name}: your seat, check-in and fees`,
    start_url: base,
    scope: base,
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: safeColor(library.brandColor),
    icons: [
      icon("icon-192.png", 192, "any"),
      icon("icon-512.png", 512, "any"),
      icon("icon-maskable-512.png", 512, "maskable"),
    ],
  };
}

const escapeHtml = (text) =>
  String(text).replace(
    /[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch],
  );

/**
 * Put the library's manifest, icon, colour and name into the built index.html.
 * Without a library (unknown slug) the shell is served unchanged and the app shows
 * "library not found" itself.
 * @param {string} html the built apps/student/dist/index.html
 * @param {{ slug: string, name: string, brandColor: string, logoPath: string } | null} library
 */
export function injectHead(html, library) {
  if (!library) return html;
  const base = `/s/${library.slug}/`;
  const name = escapeHtml(library.name);
  const tags = [
    `<link rel="manifest" href="${base}manifest.webmanifest" />`,
    `<link rel="apple-touch-icon" href="${base}icon-192.png?v=${iconVersion(library)}" />`,
    `<meta name="apple-mobile-web-app-title" content="${name}" />`,
  ].join("\n    ");
  return html
    .replace(
      /<meta name="theme-color" content="[^"]*"\s*\/?>/,
      `<meta name="theme-color" content="${safeColor(library.brandColor)}" />`,
    )
    .replace(/<title>[^<]*<\/title>/, `<title>${name}</title>`)
    .replace("</head>", `    ${tags}\n  </head>`);
}
