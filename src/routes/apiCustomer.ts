import { Router } from "express";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {
  requireBetterAuth,
  requireBetterVerifiedEmail,
  resolveBetterAuthRole,
  type BetterAuthRequest,
} from "../middleware/betterAuth.ts";
import { isDatabaseConfigured, queryDatabase } from "../db/pool.ts";
import { validateUsername } from "../lib/username.ts";
import {
  getNeonCustomerInvestments,
  getNeonCustomerTransactions,
  getNeonDashboardOverview,
} from "../services/neonDashboardService.ts";
import {
  claimMockReferral,
  getMockCustomerDocuments,
  getMockReferrals,
  getMockUserProfile,
  listMockNotifications,
  markAllMockNotificationsRead,
  markMockNotificationRead,
  updateMockUserProfile,
} from "../services/inMemoryFinancialMock.ts";
import type { CustomerDocumentDTO } from "../services/dashboardApi.ts";
import {
  buildAccountDisclosureDocument,
  buildInvestmentAgreementDocument,
  buildTransactionDocument,
} from "../services/institutionalDocuments.ts";

const VALID_RAILS = new Set(["USDT (TRC20)", "Bitcoin (BTC)", "Ethereum (ETH)", "Bank Wire"]);
const AVATAR_UPLOADS_DIR = path.resolve(process.cwd(), "uploads", "avatars");
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

function matchesImageMagicBytes(mime: string, buffer: Buffer): boolean {
  if (buffer.length < 12) return false;
  if (mime === "image/jpeg" || mime === "image/jpg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mime === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }
  if (mime === "image/webp") {
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  }
  return false;
}

async function removePreviousAvatarFile(existingUrl: string | null | undefined): Promise<void> {
  if (!existingUrl || !existingUrl.startsWith("/uploads/avatars/")) return;
  const filename = path.basename(existingUrl);
  if (!filename || filename === "." || filename === "..") return;
  const candidate = path.resolve(AVATAR_UPLOADS_DIR, filename);
  if (!candidate.startsWith(AVATAR_UPLOADS_DIR + path.sep)) return;
  await fs.unlink(candidate).catch(() => undefined);
}

export function createCustomerRouter(): Router {
  const router = Router();
  const requireVerifiedSession = [requireBetterAuth, requireBetterVerifiedEmail] as const;

  router.get("/dashboard/overview", ...requireVerifiedSession, async (req: BetterAuthRequest, res) => {
    const userId = req.betterAuthSession?.user.id;
    if (!userId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    try {
      const overview = await getNeonDashboardOverview(userId, req.betterAuthSession?.user);
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.json(overview);
    } catch (error) {
      console.error("Dashboard overview fetch failed:", error);
      res.status(503).json({ error: "Unable to load financial overview from the account ledger." });
    }
  });

  router.get("/dashboard/investments", ...requireVerifiedSession, async (req: BetterAuthRequest, res) => {
    const userId = req.betterAuthSession?.user.id;
    if (!userId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    try {
      const payload = await getNeonCustomerInvestments(userId);
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.json(payload);
    } catch (error) {
      console.error("Dashboard investments fetch failed:", error);
      res.status(503).json({ error: "Unable to load investment records." });
    }
  });

  router.get("/transactions", ...requireVerifiedSession, async (req: BetterAuthRequest, res) => {
    const userId = req.betterAuthSession?.user.id;
    if (!userId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    try {
      const transactions = await getNeonCustomerTransactions(userId);
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
      res.json({ transactions });
    } catch (error) {
      console.error("Customer transactions fetch failed:", error);
      res.status(503).json({ error: "Unable to load transaction history." });
    }
  });

  router.get("/profile", ...requireVerifiedSession, async (req: BetterAuthRequest, res) => {
    const user = req.betterAuthSession?.user;
    if (!user?.id) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    const role = await resolveBetterAuthRole(user.id, user.email).catch(() => "investor" as const);
    if (!isDatabaseConfigured) {
      res.json({
        profile: {
          ...getMockUserProfile(user.id, {
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
            role,
          }),
          hasPasswordProvider: true,
        },
      });
      return;
    }
    try {
      const result = await queryDatabase<{
        uid: string;
        username: string | null;
        referralCode: string | null;
        email: string;
        displayName: string;
        photoUrl: string | null;
        emailVerified: boolean;
        createdAt: Date | string;
        updatedAt: Date | string;
        country: string | null;
        phone: string | null;
        preferredRail: string | null;
        emailAlerts: boolean | null;
        twoFactorEnabled: boolean | null;
        kycStatus: string | null;
        accountStatus: string | null;
        hasPasswordProvider: boolean;
      }>(
        `SELECT u.id AS uid,
                COALESCE(u.username, p.username) AS username,
                COALESCE(p.referral_code, 'BF-' || upper(left(u.id, 8))) AS "referralCode",
                u.email,
                u.name AS "displayName",
                u.image AS "photoUrl",
                u."emailVerified",
                u."createdAt",
                COALESCE(p.updated_at, u."updatedAt") AS "updatedAt",
                COALESCE(p.country, '') AS country,
                COALESCE(p.phone, '') AS phone,
                COALESCE(p.preferred_rail, 'USDT (TRC20)') AS "preferredRail",
                COALESCE(p.email_alerts, true) AS "emailAlerts",
                COALESCE(p.two_factor_enabled, false) AS "twoFactorEnabled",
                COALESCE(p.kyc_status, 'not_submitted') AS "kycStatus",
                COALESCE(p.account_status, 'Active') AS "accountStatus",
                EXISTS (
                  SELECT 1 FROM account a
                  WHERE a."userId" = u.id AND a."providerId" = 'credential'
                ) AS "hasPasswordProvider"
         FROM "user" u
         LEFT JOIN user_profiles p ON p.user_id = u.id
         WHERE u.id = $1
         LIMIT 1`,
        [user.id]
      );
      const row = result.rows[0];
      if (!row) {
        res.status(404).json({ error: "Profile not found." });
        return;
      }
      res.json({
        profile: {
          uid: row.uid,
          username: row.username ?? undefined,
          referralCode: row.referralCode || `BF-${row.uid.slice(0, 8).toUpperCase()}`,
          email: row.email,
          displayName: row.displayName,
          photoUrl: row.photoUrl ?? null,
          country: row.country ?? "",
          phone: row.phone ?? "",
          preferredRail: row.preferredRail ?? "USDT (TRC20)",
          emailAlerts: Boolean(row.emailAlerts ?? true),
          twoFactorEnabled: Boolean(row.twoFactorEnabled ?? false),
          kycStatus: row.kycStatus ?? "not_submitted",
          hasPasswordProvider: Boolean(row.hasPasswordProvider),
          role,
          accountStatus: row.accountStatus ?? "Active",
          emailVerified: Boolean(row.emailVerified),
          createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
          updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
        },
      });
    } catch (error) {
      console.error("Neon profile fetch failed:", error);
      res.status(503).json({ error: "Unable to load profile." });
    }
  });

  router.patch("/profile", ...requireVerifiedSession, async (req: BetterAuthRequest, res) => {
    const user = req.betterAuthSession?.user;
    if (!user?.id) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const patch: {
      displayName?: string;
      username?: string;
      phone?: string;
      country?: string;
      preferredRail?: string;
      emailAlerts?: boolean;
      twoFactorEnabled?: boolean;
    } = {};

    if (typeof body.displayName === "string") {
      const clean = body.displayName.trim().slice(0, 120);
      if (!clean) {
        res.status(400).json({ error: "Full name cannot be empty." });
        return;
      }
      patch.displayName = clean;
    }
    if (typeof body.username === "string" && body.username.trim()) {
      const check = validateUsername(body.username);
      if (!check.valid) {
        res.status(400).json({ error: check.error || "Invalid username format." });
        return;
      }
      patch.username = check.normalized;
    }
    if (typeof body.phone === "string") {
      patch.phone = body.phone.trim().slice(0, 40);
    }
    if (typeof body.country === "string") {
      patch.country = body.country.trim().slice(0, 80);
    }
    if (typeof body.preferredRail === "string") {
      if (!VALID_RAILS.has(body.preferredRail)) {
        res.status(400).json({ error: "Invalid settlement rail selected." });
        return;
      }
      patch.preferredRail = body.preferredRail;
    }
    if (typeof body.emailAlerts === "boolean") {
      patch.emailAlerts = body.emailAlerts;
    }
    if (typeof body.twoFactorEnabled === "boolean") {
      patch.twoFactorEnabled = body.twoFactorEnabled;
    }

    const role = await resolveBetterAuthRole(user.id, user.email).catch(() => "investor" as const);
    if (!isDatabaseConfigured) {
      try {
        const updated = updateMockUserProfile(user.id, patch, {
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          role,
        });
        res.json({ ok: true, profile: updated });
      } catch (error) {
        const status = Number((error as { statusCode?: number }).statusCode) || 400;
        res.status(status).json({ error: error instanceof Error ? error.message : "Unable to update profile." });
      }
      return;
    }

    try {
      if (patch.username) {
        const clash = await queryDatabase<{ id: string }>(
          'SELECT id FROM "user" WHERE lower(username) = lower($1) AND id <> $2 LIMIT 1',
          [patch.username, user.id]
        );
        if (clash.rows.length > 0) {
          res.status(409).json({ error: "This username is already taken. Please choose another." });
          return;
        }
        await queryDatabase('UPDATE "user" SET username = $1, "updatedAt" = now() WHERE id = $2', [
          patch.username,
          user.id,
        ]);
      }
      if (patch.displayName !== undefined) {
        await queryDatabase('UPDATE "user" SET name = $1, "updatedAt" = now() WHERE id = $2', [
          patch.displayName,
          user.id,
        ]);
      }
      await queryDatabase(
        `INSERT INTO user_profiles (user_id, username, country, phone, preferred_rail, email_alerts, two_factor_enabled, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, now())
         ON CONFLICT (user_id) DO UPDATE SET
           username = COALESCE($2, user_profiles.username),
           country = COALESCE($3, user_profiles.country),
           phone = COALESCE($4, user_profiles.phone),
           preferred_rail = COALESCE($5, user_profiles.preferred_rail),
           email_alerts = COALESCE($6, user_profiles.email_alerts),
           two_factor_enabled = COALESCE($7, user_profiles.two_factor_enabled),
           updated_at = now()`,
        [
          user.id,
          patch.username ?? null,
          patch.country ?? null,
          patch.phone ?? null,
          patch.preferredRail ?? null,
          patch.emailAlerts ?? null,
          patch.twoFactorEnabled ?? null,
        ]
      );
      res.json({ ok: true });
    } catch (error) {
      console.error("Neon profile update failed:", error);
      res.status(502).json({ error: "Unable to update profile details." });
    }
  });

  router.post("/profile/photo", ...requireVerifiedSession, async (req: BetterAuthRequest, res) => {
    const user = req.betterAuthSession?.user;
    if (!user?.id) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }

    const dataUrl = typeof req.body?.dataUrl === "string" ? req.body.dataUrl.trim() : "";
    const match = dataUrl.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      res.status(400).json({ error: "Upload a valid JPEG, PNG, or WebP profile image." });
      return;
    }

    const mime = match[1].toLowerCase();
    const ext = ALLOWED_AVATAR_MIME[mime];
    if (!ext) {
      res.status(400).json({ error: "Unsupported profile photo format." });
      return;
    }

    const buffer = Buffer.from(match[2], "base64");
    if (!buffer.length || buffer.length > MAX_AVATAR_BYTES) {
      res.status(400).json({ error: "Profile photo must be under 2 MB." });
      return;
    }

    if (!matchesImageMagicBytes(mime, buffer)) {
      res.status(400).json({ error: "Uploaded file contents do not match a valid image." });
      return;
    }

    const safeUserTag = user.id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 24) || "investor";
    const finalName = `avatar_${safeUserTag}_${Date.now()}_${randomUUID().slice(0, 8)}${ext}`;
    const targetPath = path.resolve(AVATAR_UPLOADS_DIR, finalName);
    if (!targetPath.startsWith(AVATAR_UPLOADS_DIR + path.sep)) {
      res.status(400).json({ error: "Invalid avatar storage path." });
      return;
    }

    try {
      let previousUrl: string | null = null;
      if (!isDatabaseConfigured) {
        previousUrl = getMockUserProfile(user.id, {
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        }).photoUrl ?? null;
      } else {
        const current = await queryDatabase<{ image: string | null }>(
          'SELECT image FROM "user" WHERE id = $1 LIMIT 1',
          [user.id]
        );
        previousUrl = current.rows[0]?.image ?? null;
      }

      await fs.mkdir(AVATAR_UPLOADS_DIR, { recursive: true });
      await fs.writeFile(targetPath, buffer, { flag: "wx" });
      const photoUrl = `/uploads/avatars/${finalName}`;

      if (!isDatabaseConfigured) {
        const role = await resolveBetterAuthRole(user.id, user.email).catch(() => "investor" as const);
        updateMockUserProfile(
          user.id,
          { photoUrl },
          { email: user.email, name: user.name, emailVerified: user.emailVerified, role }
        );
      } else {
        await queryDatabase('UPDATE "user" SET image = $1, "updatedAt" = now() WHERE id = $2', [
          photoUrl,
          user.id,
        ]);
      }

      await removePreviousAvatarFile(previousUrl);
      res.status(201).json({ ok: true, photoUrl });
    } catch (error) {
      await fs.unlink(targetPath).catch(() => undefined);
      console.error("Investor profile photo upload failed:", error);
      res.status(500).json({ error: "Unable to save profile photo." });
    }
  });

  router.delete("/profile/photo", ...requireVerifiedSession, async (req: BetterAuthRequest, res) => {
    const user = req.betterAuthSession?.user;
    if (!user?.id) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    try {
      let previousUrl: string | null = null;
      if (!isDatabaseConfigured) {
        const role = await resolveBetterAuthRole(user.id, user.email).catch(() => "investor" as const);
        previousUrl = getMockUserProfile(user.id, {
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          role,
        }).photoUrl ?? null;
        updateMockUserProfile(
          user.id,
          { photoUrl: null },
          { email: user.email, name: user.name, emailVerified: user.emailVerified, role }
        );
      } else {
        const current = await queryDatabase<{ image: string | null }>(
          'SELECT image FROM "user" WHERE id = $1 LIMIT 1',
          [user.id]
        );
        previousUrl = current.rows[0]?.image ?? null;
        await queryDatabase('UPDATE "user" SET image = NULL, "updatedAt" = now() WHERE id = $1', [
          user.id,
        ]);
      }
      await removePreviousAvatarFile(previousUrl);
      res.json({ ok: true, photoUrl: null });
    } catch (error) {
      console.error("Investor profile photo removal failed:", error);
      res.status(500).json({ error: "Unable to remove profile photo." });
    }
  });

  router.get("/referrals", ...requireVerifiedSession, async (req: BetterAuthRequest, res) => {
    const userId = req.betterAuthSession?.user.id;
    if (!userId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    if (!isDatabaseConfigured) {
      res.json(getMockReferrals(userId));
      return;
    }
    try {
      const [profileRow, refRows, allTxs] = await Promise.all([
        queryDatabase<{ referral_code: string | null }>(
          "SELECT referral_code FROM user_profiles WHERE user_id = $1 LIMIT 1",
          [userId]
        ),
        queryDatabase<{
          id: string;
          email: string;
          status: string;
          reward_amount: string | number;
          created_at: Date | string;
        }>(
          `SELECT r.id, ru.email, r.status, r.reward_amount, r.created_at
           FROM referrals r
           JOIN "user" ru ON ru.id = r.referred_user_id
           WHERE r.referrer_user_id = $1
           ORDER BY r.created_at DESC`,
          [userId]
        ),
        getNeonCustomerTransactions(userId),
      ]);
      const referralTxs = allTxs.filter((tx) => tx.type === "Referral");
      const referralEarnings = Number(
        referralTxs
          .filter((tx) => tx.status === "Completed")
          .reduce((sum, tx) => sum + tx.amount, 0)
          .toFixed(2)
      );
      res.json({
        referralCode: profileRow.rows[0]?.referral_code || `BF-${userId.slice(0, 8).toUpperCase()}`,
        totalReferrals: refRows.rows.length,
        qualifiedReferrals: refRows.rows.filter((r) => r.status === "qualified" || r.status === "paid").length,
        referralEarnings,
        referrals: refRows.rows.map((r) => ({
          id: r.id,
          referredEmail: r.email,
          status: r.status,
          rewardAmount: Number(r.reward_amount || 0),
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
        })),
        transactions: referralTxs,
        ruleSummary:
          "5% partner bonus for referrals under $100,000 and 10% for qualified volumes exceeding $100,000, credited after administrator verification of settled deposits.",
      });
    } catch (error) {
      console.error("Neon referrals fetch failed:", error);
      res.status(503).json({ error: "Unable to load referral records." });
    }
  });

  router.post("/referrals/claim", ...requireVerifiedSession, async (req: BetterAuthRequest, res) => {
    const user = req.betterAuthSession?.user;
    if (!user?.id) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    const rawCode = typeof req.body?.code === "string" ? req.body.code.trim().toUpperCase().slice(0, 40) : "";
    if (!rawCode || rawCode.length < 4 || !/^[A-Z0-9_-]+$/.test(rawCode)) {
      res.status(400).json({ error: "A valid referral code is required." });
      return;
    }
    if (!isDatabaseConfigured) {
      const outcome = claimMockReferral(user.id, user.email, rawCode);
      res.json({ ok: true, ...outcome });
      return;
    }
    try {
      const existing = await queryDatabase<{ id: string }>(
        "SELECT id FROM referrals WHERE referred_user_id = $1 LIMIT 1",
        [user.id]
      );
      if (existing.rowCount) {
        res.json({ ok: true, claimed: false, reason: "Referral attribution already recorded." });
        return;
      }
      const referrerRes = await queryDatabase<{ id: string }>(
        `SELECT u.id
         FROM "user" u
         LEFT JOIN user_profiles p ON p.user_id = u.id
         WHERE u.id <> $1
           AND COALESCE(p.account_status, 'Active') <> 'Suspended'
           AND NOT EXISTS (
             SELECT 1 FROM blocked_users bu
             WHERE bu.user_id = u.id OR lower(bu.email) = lower(u.email)
           )
           AND (
             upper(COALESCE(p.referral_code, '')) = $2
             OR ('BF-' || upper(left(u.id, 8))) = $2
           )
         LIMIT 1`,
        [user.id, rawCode]
      );
      const referrer = referrerRes.rows[0];
      if (!referrer) {
        res.json({ ok: true, claimed: false, reason: "Referral code does not match an active partner account." });
        return;
      }
      const id = `ref_${randomUUID().slice(0, 12)}`;
      const inserted = await queryDatabase(
        `INSERT INTO referrals (id, referrer_user_id, referred_user_id, referral_code, status, reward_amount)
         VALUES ($1, $2, $3, $4, 'pending', 0)
         ON CONFLICT (referred_user_id) DO NOTHING
         RETURNING id`,
        [id, referrer.id, user.id, rawCode]
      );
      res.json({ ok: true, claimed: (inserted.rowCount ?? 0) > 0 });
    } catch (error) {
      console.error("Neon referral attribution failed:", error);
      res.status(502).json({ error: "Unable to record referral attribution." });
    }
  });

  router.get("/account/sessions", ...requireVerifiedSession, async (req: BetterAuthRequest, res) => {
    const userId = req.betterAuthSession?.user.id;
    const currentSessionId = req.betterAuthSession?.session.id ?? null;
    if (!userId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    if (!isDatabaseConfigured) {
      res.json({
        sessions: [
          {
            id: currentSessionId || "current-session",
            current: true,
            createdAt: new Date().toISOString(),
            expiresAt: req.betterAuthSession?.session.expiresAt
              ? new Date(req.betterAuthSession.session.expiresAt).toISOString()
              : null,
            ipAddress: req.ip || null,
            userAgent: req.header("user-agent") || null,
          },
        ],
      });
      return;
    }
    try {
      const result = await queryDatabase<{
        id: string;
        createdAt: Date | string;
        expiresAt: Date | string;
        ipAddress: string | null;
        userAgent: string | null;
      }>(
        `SELECT id, "createdAt", "expiresAt", "ipAddress", "userAgent"
         FROM session
         WHERE "userId" = $1 AND "expiresAt" > now()
         ORDER BY "createdAt" DESC
         LIMIT 25`,
        [userId]
      );
      res.json({
        sessions: result.rows.map((row) => ({
          id: row.id,
          current: row.id === currentSessionId,
          createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : null,
          expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
          ipAddress: row.ipAddress ?? null,
          userAgent: row.userAgent ?? null,
        })),
      });
    } catch (error) {
      console.error("Neon sessions query failed:", error);
      res.status(503).json({ error: "Unable to load active sessions." });
    }
  });

  router.delete("/account/sessions/:sessionId", ...requireVerifiedSession, async (req: BetterAuthRequest, res) => {
    const userId = req.betterAuthSession?.user.id;
    const currentSessionId = req.betterAuthSession?.session.id ?? null;
    const sessionId = typeof req.params.sessionId === "string" ? req.params.sessionId.trim() : "";
    if (!userId || !sessionId) {
      res.status(400).json({ error: "Session identifier is required." });
      return;
    }
    if (!isDatabaseConfigured) {
      if (sessionId !== (currentSessionId || "current-session")) {
        res.status(404).json({ error: "Session not found." });
        return;
      }
      res.json({ ok: true });
      return;
    }
    try {
      const result = await queryDatabase(
        'DELETE FROM session WHERE id = $1 AND "userId" = $2 RETURNING id',
        [sessionId, userId]
      );
      if (!result.rowCount) {
        res.status(404).json({ error: "Session not found." });
        return;
      }
      res.json({ ok: true, revokedCurrent: sessionId === currentSessionId });
    } catch (error) {
      console.error("Neon session revocation failed:", error);
      res.status(502).json({ error: "Unable to revoke session." });
    }
  });

  router.post("/account/sessions/revoke-others", ...requireVerifiedSession, async (req: BetterAuthRequest, res) => {
    const userId = req.betterAuthSession?.user.id;
    const currentSessionId = req.betterAuthSession?.session.id ?? null;
    if (!userId || !currentSessionId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    if (!isDatabaseConfigured) {
      res.json({ ok: true, revokedCount: 0 });
      return;
    }
    try {
      const result = await queryDatabase(
        'DELETE FROM session WHERE "userId" = $1 AND id <> $2',
        [userId, currentSessionId]
      );
      res.json({ ok: true, revokedCount: result.rowCount ?? 0 });
    } catch (error) {
      console.error("Neon revoke-other-sessions failed:", error);
      res.status(502).json({ error: "Unable to revoke other sessions." });
    }
  });

  router.get("/documents", ...requireVerifiedSession, async (req: BetterAuthRequest, res) => {
    const userId = req.betterAuthSession?.user.id;
    if (!userId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    if (!isDatabaseConfigured) {
      res.json({ documents: getMockCustomerDocuments(userId) });
      return;
    }
    try {
      const [invPayload, userRow, profileRow] = await Promise.all([
        getNeonCustomerInvestments(userId),
        queryDatabase<{ name: string; email: string; "createdAt": Date | string }>(
          'SELECT name, email, "createdAt" FROM "user" WHERE id = $1 LIMIT 1',
          [userId]
        ),
        queryDatabase<{ country: string }>(
          "SELECT country FROM user_profiles WHERE user_id = $1 LIMIT 1",
          [userId]
        ),
      ]);
      const party = {
        uid: userId,
        name: userRow.rows[0]?.name || req.betterAuthSession?.user.name || "Accredited Client",
        email: userRow.rows[0]?.email || req.betterAuthSession?.user.email || "",
        country: profileRow.rows[0]?.country || "",
      };
      const accountCreated = userRow.rows[0]?.createdAt
        ? new Date(userRow.rows[0].createdAt).toISOString()
        : null;
      const docs: CustomerDocumentDTO[] = [
        buildAccountDisclosureDocument(party, accountCreated),
      ];
      for (const inv of invPayload.investments) {
        docs.push(buildInvestmentAgreementDocument(party, inv));
      }
      for (const tx of invPayload.allTransactions) {
        docs.push(buildTransactionDocument(party, tx));
      }
      res.json({ documents: docs });
    } catch (error) {
      console.error("Neon documents fetch failed:", error);
      res.status(503).json({ error: "Unable to load customer documents." });
    }
  });

  router.get("/notifications", ...requireVerifiedSession, async (req: BetterAuthRequest, res) => {
    const userId = req.betterAuthSession?.user.id;
    if (!userId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    if (!isDatabaseConfigured) {
      res.json({ notifications: listMockNotifications(userId) });
      return;
    }
    try {
      const result = await queryDatabase<{
        id: string;
        user_id: string | null;
        category: string;
        title: string;
        body: string;
        is_read: boolean;
        created_at: Date | string;
      }>(
        `SELECT n.id,
                n.user_id,
                n.category,
                n.title,
                n.body,
                (n.read_at IS NOT NULL OR nr.read_at IS NOT NULL) AS is_read,
                n.created_at
         FROM notifications n
         LEFT JOIN notification_reads nr
           ON nr.notification_id = n.id AND nr.user_id = $1
         WHERE n.user_id = $1 OR n.user_id IS NULL
         ORDER BY n.created_at DESC
         LIMIT 50`,
        [userId]
      );
      res.json({
        notifications: result.rows.map((row) => ({
          id: row.id,
          userId: row.user_id ?? "all",
          category: row.category,
          title: row.title,
          body: row.body,
          read: Boolean(row.is_read),
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
        })),
      });
    } catch (error) {
      console.error("Neon notifications fetch failed:", error);
      res.status(503).json({ error: "Unable to load notifications." });
    }
  });

  router.patch("/notifications/:id/read", ...requireVerifiedSession, async (req: BetterAuthRequest, res) => {
    const userId = req.betterAuthSession?.user.id;
    const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!userId || !id) {
      res.status(400).json({ error: "Notification identifier required." });
      return;
    }
    if (!isDatabaseConfigured) {
      const updated = markMockNotificationRead(id, userId);
      if (!updated) {
        res.status(404).json({ error: "Notification not found." });
        return;
      }
      res.json({ ok: true });
      return;
    }
    try {
      const existing = await queryDatabase<{ id: string; user_id: string | null }>(
        "SELECT id, user_id FROM notifications WHERE id = $1 AND (user_id = $2 OR user_id IS NULL) LIMIT 1",
        [id, userId]
      );
      const row = existing.rows[0];
      if (!row) {
        res.status(404).json({ error: "Notification not found." });
        return;
      }
      if (row.user_id === userId) {
        await queryDatabase(
          "UPDATE notifications SET read_at = COALESCE(read_at, now()) WHERE id = $1 AND user_id = $2",
          [id, userId]
        );
      } else {
        await queryDatabase(
          `INSERT INTO notification_reads (notification_id, user_id, read_at)
           VALUES ($1, $2, now())
           ON CONFLICT (notification_id, user_id) DO NOTHING`,
          [id, userId]
        );
      }
      res.json({ ok: true });
    } catch (error) {
      console.error("Notification mark read failed:", error);
      res.status(502).json({ error: "Unable to mark notification as read." });
    }
  });

  router.post("/notifications/read-all", ...requireVerifiedSession, async (req: BetterAuthRequest, res) => {
    const userId = req.betterAuthSession?.user.id;
    if (!userId) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    if (!isDatabaseConfigured) {
      markAllMockNotificationsRead(userId);
      res.json({ ok: true });
      return;
    }
    try {
      await queryDatabase(
        "UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL",
        [userId]
      );
      await queryDatabase(
        `INSERT INTO notification_reads (notification_id, user_id, read_at)
         SELECT id, $1, now()
         FROM notifications
         WHERE user_id IS NULL
         ON CONFLICT (notification_id, user_id) DO NOTHING`,
        [userId]
      );
      res.json({ ok: true });
    } catch (error) {
      console.error("Notification mark all read failed:", error);
      res.status(502).json({ error: "Unable to mark all notifications as read." });
    }
  });

  return router;
}
