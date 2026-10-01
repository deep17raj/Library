/**
 * Download a file from the API (CSV exports). Fetched with the session cookie, then
 * saved through a temporary link, so the browser keeps the page and the file name.
 * @param {string} path e.g. "/admin/export/dues.csv"
 * @param {string} filename
 */
export async function downloadFile(path, filename) {
  const response = await fetch(`/api${path}`, { credentials: "same-origin" });
  if (!response.ok) throw new Error("The download failed. Please try again.");
  const url = URL.createObjectURL(await response.blob());
  const link = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
