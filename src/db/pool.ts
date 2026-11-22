import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString && process.env.NODE_ENV === "production") {
  throw new Error("DATABASE_URL is required in production.");
}

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
    throw new Error("DATABASE_URL is not configured.");
  }
  return databasePool.query<T>(text, values);
}

export async function closeDatabasePool(): Promise<void> {
  await databasePool?.end();
}
