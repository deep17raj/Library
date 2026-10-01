import mysql from "mysql2/promise";
import { runMigrations } from "../src/db/migrate.js";
import { createPool } from "../src/db/pool.js";

/**
 * Integration tests run only when TEST_DATABASE_URL points at a MySQL server, e.g.
 *   TEST_DATABASE_URL=mysql://root:pass@localhost:3306/study_library_test
 * The database named in the URL is DROPPED and recreated — never point it at real data.
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || "";

export async function createFreshTestDatabase() {
  const url = new URL(TEST_DATABASE_URL);
  const name = url.pathname.replace(/^\//, "");
  if (!/_test$/.test(name)) throw new Error("TEST_DATABASE_URL database name must end in _test");

  const admin = await mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
  });
  await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
  await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await admin.end();

  const dbConfig = { uri: TEST_DATABASE_URL, connectionLimit: 5 };
  await runMigrations(dbConfig, { log: () => {} });
  return { dbConfig, pool: createPool(dbConfig) };
}
