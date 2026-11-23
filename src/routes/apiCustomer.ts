import { Router } from "express";
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
  getMockCustomerDocuments,
  getMockReferrals,
  getMockUserProfile,
  listMockNotifications,
  markMockNotificationRead,
  updateMockUserProfile,
} from "../services/inMemoryFinancialMock.ts";
import type { CustomerDocumentDTO } from "../services/dashboardApi.ts";

const VALID_RAILS = new Set(["USDT (TRC20)", "Bitcoin (BTC)", "Ethereum (ETH)", "Bank Wire"]);

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
        profile: getMockUserProfile(user.id, {
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
          role,
        }),
      });
      return;
    }
    try {
      const result = await queryDatabase<{
        uid: string;
        username: string | null;
        email: string;
        displayName: string;
        emailVerified: boolean;
        createdAt: Date | string;
        updatedAt: Date | string;
        country: string | null;
        phone: string | null;
        preferredRail: string | null;
        emailAlerts: boolean | null;
        twoFactorEnabled: boolean | null;
        accountStatus: string | null;
      }>(
        `SELECT u.id AS uid,
                COALESCE(u.username, p.username) AS username,
                u.email,
                u.name AS "displayName",
                u."emailVerified",
                u."createdAt",
                COALESCE(p.updated_at, u."updatedAt") AS "updatedAt",
                COALESCE(p.country, '') AS country,
                COALESCE(p.phone, '') AS phone,
                COALESCE(p.preferred_rail, 'USDT (TRC20)') AS "preferredRail",
                COALESCE(p.email_alerts, true) AS "emailAlerts",
                COALESCE(p.two_factor_enabled, false) AS "twoFactorEnabled",
                COALESCE(p.account_status, 'Active') AS "accountStatus"
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
          email: row.email,
          displayName: row.displayName,
          country: row.country ?? "",
          phone: row.phone ?? "",
          preferredRail: row.preferredRail ?? "USDT (TRC20)",
          emailAlerts: Boolean(row.emailAlerts ?? true),
          twoFactorEnabled: Boolean(row.twoFactorEnabled ?? false),
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
      const [refRows, allTxs] = await Promise.all([
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
        referralCode: `BF-${userId.slice(0, 8).toUpperCase()}`,
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
      const invPayload = await getNeonCustomerInvestments(userId);
      const docs: CustomerDocumentDTO[] = [
        {
          id: `acct-${userId}`,
          userId,
          title: "BitfuryTech Custody & Mandate Disclosure Agreement",
          docType: "AccountDocument",
          reference: `ACCT-${userId.slice(0, 8).toUpperCase()}`,
          summary:
            "Standard BitfuryTech account disclosure, risk notice, and segregated ledger settlement terms governing your investor profile.",
          fileUrl: "/documents/bitfury-company-certificate.pdf",
          createdAt: new Date().toISOString(),
        },
      ];
      for (const inv of invPayload.investments) {
        docs.push({
          id: `agr-${inv.id}`,
          userId,
          title: `${inv.planName} Allocation Agreement`,
          docType: "Agreement",
          reference: inv.reference,
          summary: `Principal allocation of $${inv.amount.toFixed(2)} USD in ${inv.planName} (${inv.durationDays} days). ${inv.expectedPaymentTerms}`,
          createdAt: inv.startDate,
        });
      }
      for (const tx of invPayload.allTransactions) {
        const docType =
          tx.type === "Deposit"
            ? "DepositConfirmation"
            : tx.type === "Withdrawal"
              ? "WithdrawalRecord"
              : "Receipt";
        docs.push({
          id: `txdoc-${tx.id}`,
          userId,
          title: `${tx.type} ${tx.status} Record — ${tx.method}`,
          docType,
          reference: tx.reference,
          summary: `${tx.description || tx.type} (${tx.amount.toFixed(2)} ${tx.currency || "USD"}) · Status: ${tx.status}.`,
          createdAt: tx.createdAt,
        });
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
        read_at: Date | string | null;
        created_at: Date | string;
      }>(
        `SELECT id, user_id, category, title, body, read_at, created_at
         FROM notifications
         WHERE user_id = $1 OR user_id IS NULL
         ORDER BY created_at DESC
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
          read: Boolean(row.read_at),
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
    const id = typeof req.params.id === "string" ? req.params.id : "";
    if (!userId || !id) {
      res.status(400).json({ error: "Notification identifier required." });
      return;
    }
    if (!isDatabaseConfigured) {
      markMockNotificationRead(id, userId);
      res.json({ ok: true });
      return;
    }
    try {
      await queryDatabase(
        "UPDATE notifications SET read_at = now() WHERE id = $1 AND user_id = $2",
        [id, userId]
      );
      res.json({ ok: true });
    } catch (error) {
      console.error("Notification mark read failed:", error);
      res.status(502).json({ error: "Unable to mark notification as read." });
    }
  });

  return router;
}
