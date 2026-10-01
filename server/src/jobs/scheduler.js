import { execute, queryAll } from "../db/transaction.js";

/**
 * Background jobs on shared hosting. Passenger can put an idle app to sleep, so jobs
 * don't rely on one long timer: every minute (while awake) the scheduler runs any job
 * whose interval has passed since its last run in `job_runs`, and a cPanel cron can
 * call POST /api/internal/jobs/run to wake the app and do the same.
 *
 * @typedef {{ name: string, everyMinutes: number, run: () => Promise<string> }} Job
 *   run() returns a short summary for the logs.
 */

const TICK_MS = 60_000;

/** Run one job and record how it went in job_runs. */
async function runJob(db, job, log) {
  await execute(
    db,
    `INSERT INTO job_runs (name, last_started_at) VALUES (?, UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE last_started_at = UTC_TIMESTAMP()`,
    [job.name],
  );
  try {
    const summary = await job.run();
    await execute(
      db,
      "UPDATE job_runs SET last_finished_at = UTC_TIMESTAMP(), last_status = 'ok', last_error = NULL WHERE name = ?",
      [job.name],
    );
    log(`[job ${job.name}] ${summary}`);
  } catch (error) {
    await execute(
      db,
      "UPDATE job_runs SET last_finished_at = UTC_TIMESTAMP(), last_status = 'error', last_error = ? WHERE name = ?",
      [String(error.message).slice(0, 500), job.name],
    );
    log(`[job ${job.name}] failed: ${error.message}`);
  }
}

/** @param {import("mysql2/promise").Pool} db @param {Job[]} jobs */
export function createScheduler(db, jobs, { log = console.log } = {}) {
  let running = false;

  async function lastRuns() {
    const rows = await queryAll(db, "SELECT name, last_started_at FROM job_runs");
    return new Map(rows.map((row) => [row.name, row.last_started_at]));
  }

  /** Run every job that is due (or all of them with `force`). Never two passes at once. */
  async function runDue({ force = false } = {}) {
    if (running) return [];
    running = true;
    try {
      const last = await lastRuns();
      const due = jobs.filter((job) => {
        const startedAt = last.get(job.name);
        return (
          force ||
          !startedAt ||
          Date.now() - new Date(startedAt).getTime() >= job.everyMinutes * 60_000
        );
      });
      for (const job of due) await runJob(db, job, log);
      return due.map((job) => job.name);
    } finally {
      running = false;
    }
  }

  function start() {
    const timer = setInterval(
      () => runDue().catch((error) => log(`[jobs] ${error.message}`)),
      TICK_MS,
    );
    timer.unref(); // never keep the process alive just for jobs
    return () => clearInterval(timer);
  }

  return { runDue, start };
}
