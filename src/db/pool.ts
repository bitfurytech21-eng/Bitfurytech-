import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  console.warn("[AI Studio] DATABASE_URL is not configured — using in-memory database mock.");
}

export const isDatabaseConfigured = Boolean(connectionString);

export const databasePool = connectionString
  ? new Pool({
      connectionString,
      ssl: connectionString.includes("neon.tech")
        ? { rejectUnauthorized: true }
        : undefined,
      max: Number(process.env.PG_POOL_MAX ?? 5),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      application_name: "bitfurytech-api",
    })
  : null;

databasePool?.on("error", (error) => {
  console.error("Unexpected PostgreSQL pool error:", error);
});

export async function queryDatabase<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: unknown[] = []
): Promise<pg.QueryResult<T>> {
  if (!databasePool) {
    return {
      rows: [],
      rowCount: 0,
      command: "SELECT",
      oid: 0,
      fields: [],
    } as unknown as pg.QueryResult<T>;
  }
  return databasePool.query<T>(text, values);
}

export async function closeDatabasePool(): Promise<void> {
  await databasePool?.end();
}
