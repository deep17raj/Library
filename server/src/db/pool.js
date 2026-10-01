import mysql from "mysql2/promise";

/**
 * @param {import("../config/env.js").AppConfig["db"]} dbConfig
 * @param {{ multipleStatements?: boolean }} [options]
 */
function connectionOptions(dbConfig, { multipleStatements = false } = {}) {
  const shared = {
    // DATETIME values are UTC. DATE values are library-local calendar days and must
    // stay strings: turning "2026-10-01" into a JS Date shifts it by the server offset.
    timezone: "Z",
    dateStrings: ["DATE"],
    charset: "utf8mb4",
    multipleStatements,
    decimalNumbers: true,
  };
  if (dbConfig.uri) return { uri: dbConfig.uri, ...shared };
  const { host, port, user, password, database } = dbConfig;
  return { host, port, user, password, database, ...shared };
}

/** @param {import("../config/env.js").AppConfig["db"]} dbConfig */
export function createPool(dbConfig) {
  const pool = mysql.createPool({
    ...connectionOptions(dbConfig),
    waitForConnections: true,
    connectionLimit: dbConfig.connectionLimit,
  });
  // CURRENT_TIMESTAMP defaults must be UTC too, whatever timezone the host's MySQL uses.
  pool.on("connection", (connection) => {
    connection.query("SET time_zone = '+00:00'");
  });
  return pool;
}

/** A single connection allowed to run multi-statement SQL files (migrations only). */
export async function createMigrationConnection(dbConfig) {
  const connection = await mysql.createConnection(
    connectionOptions(dbConfig, { multipleStatements: true }),
  );
  await connection.query("SET time_zone = '+00:00'");
  return connection;
}
