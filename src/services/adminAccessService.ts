import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { databasePool, isDatabaseConfigured, queryDatabase } from "../db/pool.ts";
import { addMockAuditLog, hasAnyMockUser, hasMockUserEmail } from "./inMemoryFinancialMock.ts";

export const BOOTSTRAP_ADMIN_EMAIL = (
  process.env.BITFURYTECH_ADMIN_EMAIL || "bitfurytech21@gmail.com"
)
  .trim()
  .toLowerCase();

// In-memory state used when PostgreSQL is unconfigured (e.g., preview mode)
// or for same-process granted admin elevations.
let inMemoryPasscodeHash: string | null = null;
const grantedAdminUserIds = new Set<string>();

export interface AdminAccessStatus {
  envPasscodeConfigured: boolean;
  claimed: boolean;
  claimAllowed: boolean;
  hasAdminAccount: boolean;
  databaseConfigured: boolean;
}

export function hashAdminPasscode(passcode: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(passcode, salt, 64).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPasscodeAgainstHash(candidate: string, storedHash: string): boolean {
  const parts = storedHash.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const expected = Buffer.from(expectedHex, "hex");
    const derived = scryptSync(candidate, salt, 64);
    return expected.length === derived.length && timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

function verifyConfiguredEnvPasscode(candidate: string): boolean {
  const configured = process.env.ADMIN_ACCESS_PASSCODE?.trim() || "";
  if (!configured) return false;
  const a = createHash("sha256").update(candidate, "utf8").digest();
  const b = createHash("sha256").update(configured, "utf8").digest();
  return timingSafeEqual(a, b);
}

export function isEnvAdminPasscodeConfigured(): boolean {
  return Boolean(process.env.ADMIN_ACCESS_PASSCODE?.trim());
}

export function isInMemoryAdminGranted(userId: string): boolean {
  return grantedAdminUserIds.has(userId);
}

async function ensureAdminAccessTableExists(): Promise<void> {
  if (!isDatabaseConfigured) return;
  await queryDatabase(`
    CREATE TABLE IF NOT EXISTS admin_access_config (
      id text PRIMARY KEY DEFAULT 'primary' CHECK (id = 'primary'),
      passcode_hash text NOT NULL,
      claimed_by_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
      claimed_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `);
}

async function getStoredPasscodeHash(): Promise<string | null> {
  if (!isDatabaseConfigured) {
    return inMemoryPasscodeHash;
  }
  try {
    const res = await queryDatabase<{ passcode_hash: string }>(
      "SELECT passcode_hash FROM admin_access_config WHERE id = 'primary' LIMIT 1"
    );
    return res.rows[0]?.passcode_hash ?? null;
  } catch (error) {
    if ((error as { code?: string })?.code === "42P01") {
      await ensureAdminAccessTableExists();
      return null;
    }
    throw error;
  }
}

export async function hasExistingAdminAccount(): Promise<boolean> {
  if (grantedAdminUserIds.size > 0) return true;
  if (!isDatabaseConfigured) {
    return hasMockUserEmail(BOOTSTRAP_ADMIN_EMAIL) && hasAnyMockUser();
  }
  const result = await queryDatabase<{ present: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM "user" u
       LEFT JOIN user_roles r ON r.user_id = u.id
       WHERE r.role = 'admin' OR lower(u.email) = $1
     ) AS present`,
    [BOOTSTRAP_ADMIN_EMAIL]
  );
  return result.rows[0]?.present === true;
}

export async function getAdminAccessStatus(): Promise<AdminAccessStatus> {
  const envPasscodeConfigured = isEnvAdminPasscodeConfigured();
  const storedHash = envPasscodeConfigured ? null : await getStoredPasscodeHash();
  const claimed = Boolean(storedHash);
  const adminExists = await hasExistingAdminAccount();
  const claimAllowed = !envPasscodeConfigured && !claimed && !adminExists;
  return {
    envPasscodeConfigured,
    claimed,
    claimAllowed,
    hasAdminAccount: adminExists,
    databaseConfigured: isDatabaseConfigured,
  };
}

export async function verifyAdminPasscode(candidate: string): Promise<boolean> {
  const trimmed = candidate.trim();
  if (!trimmed) return false;
  // Configured environment passcode always overrides any claimed fallback hash.
  if (isEnvAdminPasscodeConfigured()) {
    return verifyConfiguredEnvPasscode(trimmed);
  }
  const storedHash = await getStoredPasscodeHash();
  if (!storedHash) return false;
  return verifyPasscodeAgainstHash(trimmed, storedHash);
}

export async function claimInitialAdminPasscode(
  passcode: string,
  userId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (isEnvAdminPasscodeConfigured()) {
    return {
      ok: false,
      error: "An administrator access passcode is already configured via server environment.",
    };
  }
  const adminExists = await hasExistingAdminAccount();
  if (adminExists && !(userId && grantedAdminUserIds.has(userId))) {
    // Allow if the caller is not yet conflicting with a separate existing admin; otherwise block unauthenticated claim.
    return {
      ok: false,
      error: "An administrator account already exists. Sign in with the administrator account or unlock with the configured passcode.",
    };
  }
  const hashed = hashAdminPasscode(passcode);
  if (!isDatabaseConfigured) {
    if (inMemoryPasscodeHash !== null) {
      return { ok: false, error: "Administrator access has already been claimed." };
    }
    inMemoryPasscodeHash = hashed;
    return { ok: true };
  }

  await ensureAdminAccessTableExists();
  const inserted = await queryDatabase<{ id: string }>(
    `INSERT INTO admin_access_config (id, passcode_hash, claimed_by_user_id)
     VALUES ('primary', $1, $2)
     ON CONFLICT (id) DO NOTHING
     RETURNING id`,
    [hashed, userId ?? null]
  );
  if (inserted.rowCount === 0) {
    return { ok: false, error: "Administrator access has already been claimed." };
  }
  return { ok: true };
}

export async function clearClaimedPasscodeRollback(expectedUserId?: string | null): Promise<void> {
  if (!isDatabaseConfigured) {
    inMemoryPasscodeHash = null;
    return;
  }
  await queryDatabase(
    "DELETE FROM admin_access_config WHERE id = 'primary' AND ($1::text IS NULL OR claimed_by_user_id IS NOT DISTINCT FROM $1)",
    [expectedUserId ?? null]
  );
}

export async function setFallbackAdminPasscodeByAdmin(
  passcode: string,
  actorUserId: string,
  actorEmail: string
): Promise<void> {
  const hashed = hashAdminPasscode(passcode);
  if (!isDatabaseConfigured) {
    inMemoryPasscodeHash = hashed;
    addMockAuditLog(actorUserId, actorEmail, "UPDATE_ADMIN_PASSCODE", "admin_access", "primary", {
      mode: "in-memory",
    });
    return;
  }
  await ensureAdminAccessTableExists();
  await queryDatabase(
    `INSERT INTO admin_access_config (id, passcode_hash, claimed_by_user_id)
     VALUES ('primary', $1, $2)
     ON CONFLICT (id) DO UPDATE SET
       passcode_hash = EXCLUDED.passcode_hash,
       claimed_by_user_id = COALESCE(admin_access_config.claimed_by_user_id, EXCLUDED.claimed_by_user_id),
       updated_at = now()`,
    [hashed, actorUserId]
  );
  await queryDatabase(
    "INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, details) VALUES ($1, $2, $3, $4, $5::jsonb)",
    [actorUserId, "UPDATE_ADMIN_PASSCODE", "admin_access", "primary", JSON.stringify({ updatedBy: actorEmail })]
  );
}

export async function grantAdminRoleToUser(
  userId: string,
  email: string,
  action: "ADMIN_ACCESS_CLAIMED" | "ADMIN_ACCESS_UNLOCKED"
): Promise<void> {
  grantedAdminUserIds.add(userId);

  if (!isDatabaseConfigured) {
    addMockAuditLog(userId, email, action, "user", userId, { email });
    return;
  }

  if (!databasePool) return;
  const client = await databasePool.connect();
  try {
    await client.query("BEGIN");
    await client.query('UPDATE "user" SET "emailVerified" = true, "updatedAt" = now() WHERE id = $1 AND "emailVerified" = false', [userId]);
    await client.query(
      "INSERT INTO user_roles (user_id, role, granted_by) VALUES ($1, 'admin', $1) ON CONFLICT (user_id, role) DO NOTHING",
      [userId]
    );
    await client.query(
      "UPDATE admin_access_config SET claimed_by_user_id = COALESCE(claimed_by_user_id, $1) WHERE id = 'primary'",
      [userId]
    ).catch(() => undefined);
    await client.query(
      "INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, details) VALUES ($1, $2, 'user', $1, $3::jsonb)",
      [userId, action, JSON.stringify({ email })]
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function userEmailExists(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  if (!isDatabaseConfigured) {
    return hasMockUserEmail(normalized);
  }
  const result = await queryDatabase<{ id: string }>(
    'SELECT id FROM "user" WHERE lower(email) = $1 LIMIT 1',
    [normalized]
  );
  return result.rows.length > 0;
}
