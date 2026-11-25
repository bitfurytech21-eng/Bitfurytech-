import { isDatabaseConfigured, queryDatabase } from "../db/pool.ts";
import { isMockUserBlocked, isMockUserSuspended } from "../services/inMemoryFinancialMock.ts";

export const BOOTSTRAP_ADMIN_EMAIL = (
  process.env.BITFURYTECH_ADMIN_EMAIL || "bitfurytech21@gmail.com"
)
  .trim()
  .toLowerCase();

export function isBootstrapAdminEmail(email?: string | null): boolean {
  return Boolean(email && email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL);
}

export async function isUserBlocked(
  userId?: string | null,
  email?: string | null
): Promise<boolean> {
  if (isBootstrapAdminEmail(email)) return false;

  const cleanUid = userId?.trim() || null;
  const cleanEmail = email?.trim().toLowerCase() || null;
  if (!cleanUid && !cleanEmail) return false;

  if (!isDatabaseConfigured) {
    return isMockUserBlocked(cleanUid, cleanEmail);
  }

  try {
    const result = await queryDatabase<{ blocked: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM blocked_users
         WHERE ($1::text IS NOT NULL AND user_id = $1)
            OR ($2::text IS NOT NULL AND lower(email) = $2)
       ) AS blocked`,
      [cleanUid, cleanEmail]
    );
    return result.rows[0]?.blocked === true;
  } catch (error) {
    const pgCode =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    if (pgCode === "42P01") {
      // blocked_users table not yet migrated on older DB; do not crash requests
      return false;
    }
    throw error;
  }
}

export async function isUserSuspended(
  userId?: string | null,
  email?: string | null
): Promise<boolean> {
  if (isBootstrapAdminEmail(email)) return false;
  const cleanUid = userId?.trim() || null;
  if (!cleanUid) return false;

  if (!isDatabaseConfigured) {
    return isMockUserSuspended(cleanUid);
  }

  try {
    const result = await queryDatabase<{ account_status: string }>(
      "SELECT account_status FROM user_profiles WHERE user_id = $1 LIMIT 1",
      [cleanUid]
    );
    return result.rows[0]?.account_status === "Suspended";
  } catch (error) {
    const pgCode =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : "";
    if (pgCode === "42P01") {
      return false;
    }
    throw error;
  }
}
