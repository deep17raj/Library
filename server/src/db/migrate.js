import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMigrationConnection } from "./pool.js";

export const MIGRATIONS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../migrations",
);

/**
 * Apply every migration file not yet recorded in schema_migrations, in name order.
 * Each file runs exactly once. A failure stops the boot: a half-migrated schema must
 * never serve requests.
 * @param {import("../config/env.js").AppConfig["db"]} dbConfig
 * @param {{ log?: (message: string) => void, dir?: string }} [options]
 */
export async function runMigrations(dbConfig, { log = console.log, dir = MIGRATIONS_DIR } = {}) {
  const connection = await createMigrationConnection(dbConfig);
  try {
    await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(120) PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    const [rows] = await connection.query("SELECT name FROM schema_migrations");
    const applied = new Set(rows.map((row) => row.name));
    const pending = listMigrationFiles(dir).filter((name) => !applied.has(name));

    for (const name of pending) {
      const sql = fs.readFileSync(path.join(dir, name), "utf8");
      try {
        await connection.query(sql);
      } catch (error) {
        throw new Error(`Migration ${name} failed: ${error.message}`);
      }
      await connection.query("INSERT INTO schema_migrations (name) VALUES (?)", [name]);
      log(`Applied migration ${name}`);
    }
    return pending;
  } finally {
    await connection.end();
  }
}

export function listMigrationFiles(dir = MIGRATIONS_DIR) {
  return fs
    .readdirSync(dir)
    .filter((name) => /^\d{3}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
}
