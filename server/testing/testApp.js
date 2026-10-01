import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createApp } from "../src/app.js";
import { testConfig } from "./fakes.js";
import { createTestBrowser } from "./httpClient.js";
import { createFreshTestDatabase } from "./testDatabase.js";

export const SUPER_ADMIN = { email: "boss@example.com", password: "boss-password" };

/**
 * Boots the real app on a fresh database and a temporary storage folder, with a
 * super admin already seeded. Call `stop()` in `after`.
 * @param {string} suffix database suffix, unique per test file
 */
export async function startTestApp(suffix) {
  const { pool } = await createFreshTestDatabase(suffix);
  const storageDir = await fs.mkdtemp(path.join(os.tmpdir(), "sl-storage-"));
  const { app, services } = createApp({ db: pool, config: testConfig({ storageDir }) });
  await services.authService.ensureSuperAdmin({ ...SUPER_ADMIN, name: "Boss" });

  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const baseUrl = `${origin}/api`;

  /** A browser already signed in with these credentials. */
  async function signedIn(email, password) {
    const browser = createTestBrowser(baseUrl);
    const { status } = await browser.post("/auth/login", { email, password });
    if (status !== 200) throw new Error(`Sign-in failed for ${email}: ${status}`);
    return browser;
  }

  /** Creates a library through the platform API and returns its owner's browser. */
  async function createLibraryWithOwner(slug) {
    const boss = await signedIn(SUPER_ADMIN.email, SUPER_ADMIN.password);
    const ownerEmail = `owner@${slug}.test`;
    const { body } = await boss.post("/platform/libraries", {
      name: `Library ${slug}`,
      slug,
      ownerName: "Owner Person",
      ownerEmail,
      ownerPassword: "owner-password",
    });
    return { library: body.library, owner: await signedIn(ownerEmail, "owner-password") };
  }

  async function stop() {
    server.close();
    await pool.end();
    await fs.rm(storageDir, { recursive: true, force: true });
  }

  return { origin, baseUrl, pool, storageDir, signedIn, createLibraryWithOwner, stop };
}
