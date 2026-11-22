import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { databasePool, closeDatabasePool } from "./pool.ts";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

async function migrate(): Promise<void> {
  if (!databasePool) {
    throw new Error("DATABASE_URL is required to run database migrations.");
  }

  const sql = await readFile(path.join(dirname, "schema.sql"), "utf8");
  const client = await databasePool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`
    );
    await client.query(
      "INSERT INTO schema_migrations(version) VALUES ($1) ON CONFLICT (version) DO NOTHING",
      ["2026-11-22-initial-neon-foundation"]
    );
    const financialVersion = "2026-11-22-financial-core";
    const applied = await client.query(
      "SELECT 1 FROM schema_migrations WHERE version = $1",
      [financialVersion]
    );
    if (applied.rowCount === 0) {
      const financialSql = await readFile(path.join(dirname, "financial-core.sql"), "utf8");
      await client.query(financialSql);
      await client.query("INSERT INTO schema_migrations(version) VALUES ($1)", [financialVersion]);
    }
    await client.query("COMMIT");
    console.log("Neon PostgreSQL schema migration completed.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await closeDatabasePool();
  }
}

migrate().catch(async (error) => {
  console.error("Database migration failed:", error);
  await closeDatabasePool();
  process.exitCode = 1;
});
