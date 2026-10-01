import mysql from "mysql2/promise";
import { runMigrations } from "../src/db/migrate.js";
import { createPool } from "../src/db/pool.js";

/**
 * Integration tests run only when TEST_DATABASE_URL points at a MySQL server, e.g.
 *   TEST_DATABASE_URL=mysql://root:pass@localhost:3306/study_library_test
 * Each test file gets its own database "<name>_<suffix>" (node --test runs files in
 * parallel), which is DROPPED and recreated — never point this at real data.
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || "";

/** @param {string} suffix short name of the test file, e.g. "platform" */
export async function createFreshTestDatabase(suffix) {
  const url = new URL(TEST_DATABASE_URL);
  const baseName = url.pathname.replace(/^\//, "");
  if (!/_test$/.test(baseName))
    throw new Error("TEST_DATABASE_URL database name must end in _test");
  const name = `${baseName}_${suffix}`;

  const admin = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  });
  await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
  await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await admin.end();

  url.pathname = `/${name}`;
  const dbConfig = { uri: url.toString(), connectionLimit: 5 };
  await runMigrations(dbConfig, { log: () => {} });
  return { dbConfig, pool: createPool(dbConfig) };
}
