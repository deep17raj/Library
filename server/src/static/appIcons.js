import sharp from "sharp";
import { safeColor } from "./studentShell.js";

// Home-screen icons for a library's student app, drawn on request and kept in memory:
// the library's logo on a white tile, or (no logo) an open book on its brand colour.
// Drawn with shapes only — no fonts — so it looks the same on any server.

const cache = new Map();
const MAX_ENTRIES = 300;

// lucide "book-open" (24×24, stroke 2), the app's library icon family.
const BOOK_PATHS =
  '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>';

/**
 * @param {{ size: number, maskable: boolean, brandColor: string, logoFile: string | null }} options
 *   `maskable` keeps the art inside the middle 60 % so Android can crop to any shape.
 * @returns {Promise<Buffer>} PNG
 */
export function renderAppIcon(options) {
  const key = JSON.stringify(options);
  if (!cache.has(key)) {
    if (cache.size >= MAX_ENTRIES) cache.clear();
    const drawing = draw(options).catch((error) => {
      cache.delete(key); // don't remember a failure
      throw error;
    });
    cache.set(key, drawing);
  }
  return cache.get(key);
}

async function draw({ size, maskable, brandColor, logoFile }) {
  const art = Math.round(size * (maskable ? 0.6 : 0.78));
  if (logoFile) {
    try {
      const logo = await sharp(logoFile)
        .resize(art, art, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toBuffer();
      return await sharp({
        create: { width: size, height: size, channels: 4, background: "#ffffff" },
      })
        .composite([{ input: logo, gravity: "center" }])
        .png()
        .toBuffer();
    } catch {
      // Logo missing or unreadable: fall back to the drawn icon below.
    }
  }
  const offset = (size - art) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="${safeColor(brandColor)}"/>
  <svg x="${offset}" y="${offset}" width="${art}" height="${art}" viewBox="0 0 24 24" fill="none"
    stroke="#ffffff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${BOOK_PATHS}</svg>
</svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
