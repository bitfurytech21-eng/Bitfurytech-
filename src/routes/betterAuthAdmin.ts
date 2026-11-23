import { Router } from "express";
import type pg from "pg";
import { requireBetterAuth, requireBetterAdmin, type BetterAuthRequest } from "../middleware/betterAuth.ts";
import { databasePool, isDatabaseConfigured, queryDatabase } from "../db/pool.ts";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { INVESTMENT_MANDATES } from "../trading/tradingPage.ts";
import { MANUAL_PAYMENT_METHODS } from "../trading/manualPaymentMethods.ts";
import {
  addMockAuditLog,
  addMockBroadcast,
  getMockAdminData,
  getMockAdminDocuments,
  getMockAdminReferrals,
  getMockEmailOutbox,
  getMockEmailTemplates,
  resolveMockDeposit,
  resolveMockWithdrawal,
  saveMockEmailTemplate,
  updateMockCustomerStatus,
  updateMockInvestmentStatus,
  updateMockProperty,
  upsertMockPlan,
  upsertMockProperty,
} from "../services/inMemoryFinancialMock.ts";
import { DEFAULT_MAIL_TEMPLATES } from "../services/mailTemplates.ts";
import type { CustomerDocumentDTO } from "../services/dashboardApi.ts";


type Row = Record<string, unknown>;

function textValue(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (value == null) return fallback;
  return String(value);
}

function number(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function auditActor(req: BetterAuthRequest): string {
  const actorId = req.betterAuthSession?.user.id;
  if (!actorId) throw new Error("A verified administrator session is required for audit logging.");
  return actorId;
}

async function recordAudit(
  req: BetterAuthRequest,
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown>
): Promise<void> {
  if (!isDatabaseConfigured) {
    addMockAuditLog(
      auditActor(req),
      req.betterAuthSession?.user.email ?? "admin",
      action,
      targetType,
      targetId,
      details
    );
    return;
  }
  await queryDatabase(
    "INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, details) VALUES ($1,$2,$3,$4,$5::jsonb)",
    [auditActor(req), action, targetType, targetId, JSON.stringify(details)]
  );
}

export function createBetterAuthAdminRouter(): Router {
  const router = Router();
  router.use(requireBetterAuth, requireBetterAdmin);

  router.get("/customers", async (_req, res) => {
    if (!isDatabaseConfigured) {
      res.setHeader("Cache-Control", "no-store");
      res.json({ customers: getMockAdminData().customers });
      return;
    }
    try {
      const result = await queryDatabase<Row>(
        "SELECT u.id AS uid, u.username, u.email, u.name AS \"displayName\", COALESCE(p.country,'') AS country, COALESCE(p.phone,'') AS phone, COALESCE(w.available_balance,0) AS \"walletBalance\", 'Active'::text AS \"accountStatus\", u.\"createdAt\" AS \"createdAt\", COALESCE(inv.count,0)::int AS \"investmentsCount\", COALESCE(tx.count,0)::int AS \"transactionsCount\" FROM \"user\" u LEFT JOIN user_profiles p ON p.user_id=u.id LEFT JOIN wallets w ON w.user_id=u.id AND w.currency='USD' LEFT JOIN LATERAL (SELECT COUNT(*) count, jsonb_agg(jsonb_build_object('id',i.id,'planName',COALESCE(i.plan_snapshot->>'name','Investment'),'amount',i.principal,'status',initcap(i.status))) AS items FROM investments i WHERE i.user_id=u.id) inv ON true LEFT JOIN LATERAL (SELECT COUNT(*) count, jsonb_agg(jsonb_build_object('id',t.id,'type',initcap(t.type),'reference',COALESCE(t.reference,t.id),'amount',t.amount,'status',initcap(t.status))) AS items FROM transactions t WHERE t.user_id=u.id) tx ON true ORDER BY u.\"createdAt\" DESC"
      );
      res.setHeader("Cache-Control", "no-store");
      res.json({ customers: result.rows });
    } catch (error) {
      console.error("Neon admin customers query failed:", error);
      res.status(502).json({ error: "Unable to load customer records from Neon." });
    }
  });

  router.get("/deposits", async (_req, res) => {
    if (!isDatabaseConfigured) {
      res.setHeader("Cache-Control", "no-store");
      res.json({ deposits: getMockAdminData().deposits });
      return;
    }
    try {
      const result = await queryDatabase<Row>(
        "SELECT t.id, t.user_id AS \"userId\", u.email AS \"userEmail\", 'Deposit' AS type, t.method, t.amount, t.destination, t.reference, initcap(t.status) AS status, t.currency, t.metadata, t.created_at AS \"createdAt\", t.updated_at AS \"updatedAt\" FROM transactions t JOIN \"user\" u ON u.id=t.user_id WHERE t.type='deposit' ORDER BY t.created_at DESC LIMIT 500"
      );
      res.setHeader("Cache-Control", "no-store");
      res.json({ deposits: result.rows });
    } catch (error) {
      console.error("Neon admin deposits query failed:", error);
      res.status(502).json({ error: "Unable to load deposit requests from Neon." });
    }
  });

  router.get("/withdrawals", async (_req, res) => {
    if (!isDatabaseConfigured) {
      res.setHeader("Cache-Control", "no-store");
      res.json({ withdrawals: getMockAdminData().withdrawals });
      return;
    }
    try {
      const result = await queryDatabase<Row>(
        "SELECT t.id, t.user_id AS \"userId\", u.email AS \"userEmail\", 'Withdrawal' AS type, t.method, t.amount, t.destination, t.reference, initcap(t.status) AS status, t.currency, t.metadata, t.created_at AS \"createdAt\", t.updated_at AS \"updatedAt\" FROM transactions t JOIN \"user\" u ON u.id=t.user_id WHERE t.type='withdrawal' ORDER BY t.created_at DESC LIMIT 500"
      );
      res.setHeader("Cache-Control", "no-store");
      res.json({ withdrawals: result.rows });
    } catch (error) {
      console.error("Neon admin withdrawals query failed:", error);
      res.status(502).json({ error: "Unable to load withdrawal requests from Neon." });
    }
  });

  router.get("/investments", async (_req, res) => {
    if (!isDatabaseConfigured) {
      res.setHeader("Cache-Control", "no-store");
      res.json({ investments: getMockAdminData().investments });
      return;
    }
    try {
      const result = await queryDatabase<Row>(
        "SELECT i.id, i.user_id AS \"userId\", u.email AS \"userEmail\", u.name AS \"userName\", i.plan_id AS \"planId\", COALESCE(i.plan_snapshot->>'name',p.name,'Investment') AS \"planName\", COALESCE(i.plan_snapshot->>'category',p.category,'crypto') AS category, i.principal AS amount, COALESCE((i.plan_snapshot->>'dailyRatePct')::numeric,p.daily_rate_pct,0) AS \"dailyRatePct\", COALESCE((i.plan_snapshot->>'durationDays')::int,p.duration_days,30) AS \"durationDays\", initcap(i.status) AS status, i.started_at AS \"startDate\", i.matures_at AS \"maturityDate\", i.created_at AS \"createdAt\" FROM investments i JOIN \"user\" u ON u.id=i.user_id LEFT JOIN investment_plans p ON p.id=i.plan_id ORDER BY i.created_at DESC LIMIT 1000"
      );
      res.setHeader("Cache-Control", "no-store");
      res.json({ investments: result.rows });
    } catch (error) {
      console.error("Neon admin investments query failed:", error);
      res.status(502).json({ error: "Unable to load investments from Neon." });
    }
  });

  router.get("/transactions", async (_req, res) => {
    if (!isDatabaseConfigured) {
      res.setHeader("Cache-Control", "no-store");
      res.json({ transactions: getMockAdminData().transactions });
      return;
    }
    try {
      const result = await queryDatabase<Row>(
        "SELECT t.id, t.user_id AS \"userId\", u.email AS \"userEmail\", initcap(t.type) AS type, t.method, t.amount, t.destination, t.reference, initcap(t.status) AS status, t.currency, t.metadata, t.created_at AS \"createdAt\", t.updated_at AS \"updatedAt\" FROM transactions t JOIN \"user\" u ON u.id=t.user_id ORDER BY t.created_at DESC LIMIT 1000"
      );
      res.setHeader("Cache-Control", "no-store");
      res.json({ transactions: result.rows });
    } catch (error) {
      console.error("Neon admin transactions query failed:", error);
      res.status(502).json({ error: "Unable to load transactions from Neon." });
    }
  });

  router.get("/plans", async (_req, res) => {
    if (!isDatabaseConfigured) {
      res.setHeader("Cache-Control", "no-store");
      res.json({ plans: getMockAdminData().plans });
      return;
    }
    try {
      const result = await queryDatabase<Row>(
        "SELECT id, name, category, CASE category WHEN 'crypto' THEN 'Digital Assets' WHEN 'stock' THEN 'Global Equities' ELSE 'Real Estate' END AS \"categoryLabel\", COALESCE(plan_data->>'audience','Verified investors') AS audience, description, min_deposit AS \"minDeposit\", max_deposit AS \"maxDeposit\", daily_rate_pct AS \"dailyRatePct\", duration_days AS \"durationDays\", COALESCE(plan_data->>'paymentFrequency','At maturity') AS \"paymentFrequency\", COALESCE(plan_data->>'settlementRail','USDT (TRC20) / Bank Wire') AS \"settlementRail\", COALESCE(plan_data->>'returnTerms','') AS \"returnTerms\", COALESCE(plan_data->>'availabilityStatus','Open') AS \"availabilityStatus\", published, COALESCE(plan_data->>'image','/images/hero-private-capital.jpg') AS image, 'database' AS source FROM investment_plans ORDER BY created_at DESC"
      );
      const plans = new Map<string, Row>();
      for (const mandate of INVESTMENT_MANDATES) {
        plans.set(mandate.id, { ...mandate, availabilityStatus: "Open", published: true, source: "default" });
      }
      for (const row of result.rows) plans.set(String(row.id), row);
      res.setHeader("Cache-Control", "no-store");
      res.json({ plans: Array.from(plans.values()) });
    } catch (error) {
      console.error("Neon admin plans query failed:", error);
      res.status(502).json({ error: "Unable to load investment plans from Neon." });
    }
  });

  router.get("/properties", async (_req, res) => {
    if (!isDatabaseConfigured) {
      res.setHeader("Cache-Control", "no-store");
      res.json({ properties: getMockAdminData().properties });
      return;
    }
    try {
      const result = await queryDatabase<Row>(
        "SELECT id, title, location, asset_type AS \"assetType\", target_yield_pct AS \"targetYieldPct\", minimum_entry AS \"minEntry\", valuation, occupancy_pct AS \"occupancyPct\", status, COALESCE((property_data->>'published')::boolean,true) AS published, COALESCE(image_url,'') AS image, summary, supporting_document_url AS \"supportingDocUrl\", property_data->>'supportingDocName' AS \"supportingDocName\" FROM properties ORDER BY created_at DESC"
      );
      res.setHeader("Cache-Control", "no-store");
      res.json({ properties: result.rows });
    } catch (error) {
      console.error("Neon admin properties query failed:", error);
      res.status(502).json({ error: "Unable to load properties from Neon." });
    }
  });

  router.get("/support", async (_req, res) => {
    if (!isDatabaseConfigured) {
      res.setHeader("Cache-Control", "no-store");
      res.json({ inquiries: getMockAdminData().inquiries });
      return;
    }
    try {
      const result = await queryDatabase<Row>("SELECT id, name, email, topic, topic AS subject, message, created_at AS \"createdAt\" FROM inquiries ORDER BY created_at DESC LIMIT 500");
      res.setHeader("Cache-Control", "no-store");
      res.json({ inquiries: result.rows });
    } catch (error) {
      console.error("Neon admin support query failed:", error);
      res.status(502).json({ error: "Unable to load support inquiries from Neon." });
    }
  });

  router.get("/audit-logs", async (_req, res) => {
    if (!isDatabaseConfigured) {
      res.setHeader("Cache-Control", "no-store");
      res.json({ logs: getMockAdminData().auditLogs });
      return;
    }
    try {
      const result = await queryDatabase<Row>("SELECT a.id, a.actor_user_id AS \"actorUid\", u.email AS \"actorEmail\", a.action, a.target_type AS \"targetType\", a.target_id AS \"targetId\", a.details, a.created_at AS \"createdAt\" FROM audit_logs a LEFT JOIN \"user\" u ON u.id=a.actor_user_id ORDER BY a.created_at DESC LIMIT 500");
      res.setHeader("Cache-Control", "no-store");
      res.json({ logs: result.rows });
    } catch (error) {
      console.error("Neon admin audit query failed:", error);
      res.status(502).json({ error: "Unable to load audit history from Neon." });
    }
  });


  async function withAdminTransaction<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    if (!databasePool) throw new Error("DATABASE_URL is not configured.");
    const client = await databasePool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async function auditInTransaction(client: pg.PoolClient, actorId: string, action: string, targetType: string, targetId: string, details: Record<string, unknown>) {
    await client.query(
      "INSERT INTO audit_logs (actor_user_id, action, target_type, target_id, details) VALUES ($1,$2,$3,$4,$5::jsonb)",
      [actorId, action, targetType, targetId, JSON.stringify(details)]
    );
  }

  router.patch("/customers/:uid/status", async (req, res) => {
    const uid = typeof req.params.uid === "string" ? req.params.uid : "";
    const status = req.body?.status;
    if (!uid || !["Active", "Review", "Suspended"].includes(status)) {
      res.status(400).json({ error: "A valid customer ID and account status are required." });
      return;
    }
    if (!isDatabaseConfigured) {
      const ok = updateMockCustomerStatus(
        uid,
        status,
        auditActor(req as BetterAuthRequest),
        (req as BetterAuthRequest).betterAuthSession?.user.email ?? "admin"
      );
      if (!ok) {
        res.status(404).json({ error: "Customer not found." });
        return;
      }
      res.json({ ok: true, uid, accountStatus: status });
      return;
    }
    try {
      await withAdminTransaction(async (client) => {
        const user = await client.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE', [uid]);
        if (!user.rowCount) throw Object.assign(new Error("Customer not found."), { statusCode: 404 });
        await client.query(
          "INSERT INTO user_profiles (user_id, account_status) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET account_status=EXCLUDED.account_status, updated_at=now()",
          [uid, status]
        );
        await auditInTransaction(client, auditActor(req as BetterAuthRequest)!, "UPDATE_CUSTOMER_STATUS", "user", uid, { status });
      });
      res.json({ ok: true, uid, accountStatus: status });
    } catch (error) {
      const code = Number((error as { statusCode?: number }).statusCode) || 502;
      res.status(code).json({ error: code === 404 ? "Customer not found." : "Unable to update customer status." });
    }
  });

  router.post("/deposits/:txId/resolve", async (req, res) => {
    const id = typeof req.params.txId === "string" ? req.params.txId : "";
    const decision = req.body?.decision === "Rejected" ? "rejected" : "completed";
    const evidenceNote = typeof req.body?.evidenceNote === "string" ? req.body.evidenceNote.trim().slice(0, 500) : "";
    if (!id || (decision === "completed" && evidenceNote.length < 4)) {
      res.status(400).json({ error: "Payment verification evidence is required before crediting a deposit." });
      return;
    }
    if (!isDatabaseConfigured) {
      const ok = resolveMockDeposit(
        id,
        decision === "completed" ? "Completed" : "Rejected",
        (req as BetterAuthRequest).betterAuthSession?.user.email ?? "admin",
        evidenceNote
      );
      if (!ok) {
        res.status(404).json({ error: "Deposit not found or already resolved." });
        return;
      }
      res.json({ ok: true, id, status: decision === "completed" ? "Completed" : "Rejected" });
      return;
    }
    try {
      await withAdminTransaction(async (client) => {
        const found = await client.query(
          "SELECT id,user_id,type,amount,currency,status,metadata FROM transactions WHERE id=$1 FOR UPDATE",
          [id]
        );
        const tx = found.rows[0];
        if (!tx || tx.type !== "deposit") throw Object.assign(new Error("Deposit not found."), { statusCode: 404 });
        if (tx.status !== "pending" && tx.status !== "processing") throw Object.assign(new Error("Deposit has already been resolved."), { statusCode: 409 });
        const amount = Number(tx.amount);
        const currency = String(tx.currency || "USD").trim().toUpperCase();
        if (!(amount > 0) || currency.length !== 3) throw Object.assign(new Error("Deposit amount or currency is invalid."), { statusCode: 422 });
        if (decision === "completed") {
          await client.query(
            "INSERT INTO wallets (user_id,currency,available_balance) VALUES ($1,$2,$3) ON CONFLICT (user_id,currency) DO UPDATE SET available_balance=wallets.available_balance+EXCLUDED.available_balance, updated_at=now()",
            [tx.user_id, currency, amount]
          );
          await client.query(
            "INSERT INTO ledger_entries (transaction_id,user_id,account_code,direction,amount,currency,memo) VALUES ($1,$2,'platform_custody','debit',$3,$4,$5),($1,$2,'customer_available','credit',$3,$4,$5)",
            [id, tx.user_id, amount, currency, "Verified deposit credit"]
          );
        }
        await client.query(
          "UPDATE transactions SET status=$2, metadata=metadata || $3::jsonb, updated_at=now() WHERE id=$1",
          [id, decision, JSON.stringify({ adminEvidence: evidenceNote, reviewedAt: new Date().toISOString() })]
        );
        await auditInTransaction(client, auditActor(req as BetterAuthRequest)!, "RESOLVE_DEPOSIT", "transaction", id, { decision, amount, currency, evidenceNote });
      });
      res.json({ ok: true, id, status: decision === "completed" ? "Completed" : "Rejected" });
    } catch (error) {
      const code = Number((error as { statusCode?: number }).statusCode) || 502;
      res.status(code).json({ error: error instanceof Error ? error.message : "Unable to resolve deposit." });
    }
  });

  router.post("/withdrawals/:txId/resolve", async (req, res) => {
    const id = typeof req.params.txId === "string" ? req.params.txId : "";
    const decision = req.body?.decision === "Rejected" ? "rejected" : "completed";
    const note = typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 500) : "";
    if (!id) {
      res.status(400).json({ error: "A withdrawal transaction ID is required." });
      return;
    }
    if (!isDatabaseConfigured) {
      const ok = resolveMockWithdrawal(
        id,
        decision === "completed" ? "Completed" : "Rejected",
        (req as BetterAuthRequest).betterAuthSession?.user.email ?? "admin",
        note
      );
      if (!ok) {
        res.status(404).json({ error: "Withdrawal not found or already resolved." });
        return;
      }
      res.json({ ok: true, id, status: decision === "completed" ? "Completed" : "Rejected" });
      return;
    }
    try {
      await withAdminTransaction(async (client) => {
        const found = await client.query(
          "SELECT id,user_id,type,amount,currency,status,metadata FROM transactions WHERE id=$1 FOR UPDATE",
          [id]
        );
        const tx = found.rows[0];
        if (!tx || tx.type !== "withdrawal") throw Object.assign(new Error("Withdrawal not found."), { statusCode: 404 });
        if (tx.status !== "pending" && tx.status !== "processing") throw Object.assign(new Error("Withdrawal has already been resolved."), { statusCode: 409 });
        const amount = Number(tx.amount);
        const currency = String(tx.currency || "USD").trim().toUpperCase();
        if (!(amount > 0) || currency.length !== 3) throw Object.assign(new Error("Withdrawal amount or currency is invalid."), { statusCode: 422 });
        const wallet = await client.query(
          "SELECT available_balance,reserved_balance FROM wallets WHERE user_id=$1 AND currency=$2 FOR UPDATE",
          [tx.user_id, currency]
        );
        const reserved = Number(wallet.rows[0]?.reserved_balance ?? 0);
        if (reserved < amount) throw Object.assign(new Error("The withdrawal has no matching reserved funds. No balance was changed; reconcile the request before approving it."), { statusCode: 409 });
        if (decision === "completed") {
          await client.query(
            "UPDATE wallets SET reserved_balance=reserved_balance-$3, updated_at=now() WHERE user_id=$1 AND currency=$2",
            [tx.user_id, currency, amount]
          );
          const withdrawalMetadata = tx.metadata && typeof tx.metadata === "object" ? tx.metadata as Record<string, unknown> : {};
          const fee = Math.min(amount, Math.max(0, Number(withdrawalMetadata.fee ?? 0)));
          const payout = Math.max(0, amount - fee);
          await client.query(
            "INSERT INTO ledger_entries (transaction_id,user_id,account_code,direction,amount,currency,memo) VALUES ($1,$2,'customer_reserved','debit',$3,$4,'Approved reserved withdrawal'),($1,$2,'platform_custody','credit',$5,$4,'Approved withdrawal payout'),($1,$2,'platform_fees','credit',$6,$4,'Withdrawal processing fee')",
            [id, tx.user_id, amount, currency, payout, fee]
          );
        } else {
          await client.query(
            "UPDATE wallets SET reserved_balance=reserved_balance-$3, available_balance=available_balance+$3, updated_at=now() WHERE user_id=$1 AND currency=$2",
            [tx.user_id, currency, amount]
          );
          await client.query(
            "INSERT INTO ledger_entries (transaction_id,user_id,account_code,direction,amount,currency,memo) VALUES ($1,$2,'customer_reserved','debit',$3,$4,'Rejected withdrawal release'),($1,$2,'customer_available','credit',$3,$4,'Rejected withdrawal refund')",
            [id, tx.user_id, amount, currency]
          );
        }
        await client.query(
          "UPDATE transactions SET status=$2, metadata=metadata || $3::jsonb, updated_at=now() WHERE id=$1",
          [id, decision, JSON.stringify({ adminNote: note, reviewedAt: new Date().toISOString() })]
        );
        await auditInTransaction(client, auditActor(req as BetterAuthRequest)!, "RESOLVE_WITHDRAWAL", "transaction", id, { decision, amount, currency, note });
      });
      res.json({ ok: true, id, status: decision === "completed" ? "Completed" : "Rejected" });
    } catch (error) {
      const code = Number((error as { statusCode?: number }).statusCode) || 502;
      res.status(code).json({ error: error instanceof Error ? error.message : "Unable to resolve withdrawal." });
    }
  });

  router.post("/investments/:id/status", async (req, res) => {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    const status = req.body?.status === "Completed" ? "completed" : "active";
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 500) : "";
    if (!id || reason.length < 4) {
      res.status(400).json({ error: "An investment ID and administrative reason are required." });
      return;
    }
    if (!isDatabaseConfigured) {
      const ok = updateMockInvestmentStatus(
        id,
        status === "completed" ? "Completed" : "Active",
        reason,
        auditActor(req as BetterAuthRequest),
        (req as BetterAuthRequest).betterAuthSession?.user.email ?? "admin"
      );
      if (!ok) {
        res.status(404).json({ error: "Investment not found." });
        return;
      }
      res.json({ ok: true, id, status: status === "completed" ? "Completed" : "Active" });
      return;
    }
    try {
      await withAdminTransaction(async (client) => {
        const result = await client.query("UPDATE investments SET status=$2, updated_at=now() WHERE id=$1 RETURNING id", [id, status]);
        if (!result.rowCount) throw Object.assign(new Error("Investment not found."), { statusCode: 404 });
        await auditInTransaction(client, auditActor(req as BetterAuthRequest)!, "UPDATE_INVESTMENT_STATUS", "investment", id, { status, reason });
      });
      res.json({ ok: true, id, status: status === "completed" ? "Completed" : "Active" });
    } catch (error) {
      const code = Number((error as { statusCode?: number }).statusCode) || 502;
      res.status(code).json({ error: error instanceof Error ? error.message : "Unable to update investment status." });
    }
  });

  router.post("/plans", async (req, res) => {
    const b = (req.body ?? {}) as Row;
    const id = textValue(b.id).trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) || `plan_${randomUUID()}`;
    const name = textValue(b.name).trim().slice(0, 80);
    const category = ["crypto", "stock", "estate"].includes(textValue(b.category)) ? textValue(b.category) : "crypto";
    const description = textValue(b.description).trim().slice(0, 800);
    const min = number(b.minDeposit);
    const max = number(b.maxDeposit);
    const duration = Math.round(number(b.durationDays));
    if (!name || !description || !textValue(b.returnTerms).trim() || min <= 0 || max < min || duration <= 0) {
      res.status(400).json({ error: "Plan name, description, return terms, valid limits and duration are required." });
      return;
    }
    const planData = {
      audience: textValue(b.audience), paymentFrequency: textValue(b.paymentFrequency),
      settlementRail: textValue(b.settlementRail), returnTerms: textValue(b.returnTerms),
      availabilityStatus: ["Paused", "Closed"].includes(textValue(b.availabilityStatus)) ? textValue(b.availabilityStatus) : "Open",
      image: textValue(b.image), categoryLabel: category === "crypto" ? "Digital Assets" : category === "stock" ? "Global Equities" : "Real Estate"
    };
    if (!isDatabaseConfigured) {
      upsertMockPlan(
        id,
        {
          name,
          category,
          description,
          minDeposit: min,
          maxDeposit: max,
          dailyRatePct: Math.max(0, number(b.dailyRatePct)),
          durationDays: duration,
          published: b.published !== false,
          ...planData,
        },
        auditActor(req as BetterAuthRequest),
        (req as BetterAuthRequest).betterAuthSession?.user.email ?? "admin"
      );
      res.json({ ok: true, id });
      return;
    }
    try {
      await withAdminTransaction(async (client) => {
        await client.query(
          "INSERT INTO investment_plans (id,name,category,description,min_deposit,max_deposit,daily_rate_pct,duration_days,published,plan_data) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,category=EXCLUDED.category,description=EXCLUDED.description,min_deposit=EXCLUDED.min_deposit,max_deposit=EXCLUDED.max_deposit,daily_rate_pct=EXCLUDED.daily_rate_pct,duration_days=EXCLUDED.duration_days,published=EXCLUDED.published,plan_data=EXCLUDED.plan_data,updated_at=now()",
          [id,name,category,description,min,max,Math.max(0,number(b.dailyRatePct)),duration,b.published !== false,JSON.stringify(planData)]
        );
        await auditInTransaction(client, auditActor(req as BetterAuthRequest)!, "UPSERT_INVESTMENT_PLAN", "investment_plan", id, { name, category, published: b.published !== false });
      });
      res.json({ ok: true, id });
    } catch (error) {
      console.error("Neon admin plan save failed:", error);
      res.status(502).json({ error: "Unable to save investment plan." });
    }
  });

  router.post("/properties", async (req, res) => {
    const b = (req.body ?? {}) as Row;
    const id = textValue(b.id).trim() || `property_${randomUUID()}`;
    const title = textValue(b.title).trim().slice(0, 140);
    const location = textValue(b.location).trim().slice(0, 140);
    const summary = textValue(b.summary).trim().slice(0, 600);
    if (!title || !location || !summary) {
      res.status(400).json({ error: "Property title, location and summary are required." });
      return;
    }
    const propertyData = { published: b.published !== false, supportingDocName: textValue(b.supportingDocName).slice(0,140) };
    if (!isDatabaseConfigured) {
      upsertMockProperty(
        id,
        {
          title,
          location,
          assetType: textValue(b.assetType, "Commercial Real Estate"),
          targetYieldPct: number(b.targetYieldPct),
          minEntry: Math.max(1000, number(b.minEntry) || 1000),
          valuation: Math.max(1, number(b.valuation)),
          occupancyPct: Math.min(100, Math.max(0, number(b.occupancyPct))),
          status: b.status === "Fully Subscribed" ? "Fully Subscribed" : "Open",
          image: textValue(b.image),
          summary,
          supportingDocUrl: textValue(b.supportingDocUrl) || null,
          ...propertyData,
        },
        auditActor(req as BetterAuthRequest),
        (req as BetterAuthRequest).betterAuthSession?.user.email ?? "admin"
      );
      res.json({ ok: true, id });
      return;
    }
    try {
      await withAdminTransaction(async (client) => {
        await client.query(
          "INSERT INTO properties (id,title,location,asset_type,target_yield_pct,minimum_entry,valuation,occupancy_pct,status,image_url,summary,supporting_document_url,property_data) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb) ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,location=EXCLUDED.location,asset_type=EXCLUDED.asset_type,target_yield_pct=EXCLUDED.target_yield_pct,minimum_entry=EXCLUDED.minimum_entry,valuation=EXCLUDED.valuation,occupancy_pct=EXCLUDED.occupancy_pct,status=EXCLUDED.status,image_url=EXCLUDED.image_url,summary=EXCLUDED.summary,supporting_document_url=EXCLUDED.supporting_document_url,property_data=EXCLUDED.property_data,updated_at=now()",
          [id,title,location,textValue(b.assetType,"Commercial Real Estate"),number(b.targetYieldPct),Math.max(1000,number(b.minEntry)||1000),Math.max(1,number(b.valuation)),Math.min(100,Math.max(0,number(b.occupancyPct))),b.status === "Fully Subscribed" ? "Fully Subscribed" : "Open",textValue(b.image),summary,textValue(b.supportingDocUrl)||null,JSON.stringify(propertyData)]
        );
        await auditInTransaction(client, auditActor(req as BetterAuthRequest)!, "UPSERT_PROPERTY", "property", id, { title, published: propertyData.published });
      });
      res.json({ ok: true, id });
    } catch (error) {
      console.error("Neon admin property save failed:", error);
      res.status(502).json({ error: "Unable to save property." });
    }
  });

  router.put("/properties/:id", async (req, res) => {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    const b = (req.body ?? {}) as Row;
    if (!isDatabaseConfigured) {
      const updated = updateMockProperty(
        id,
        {
          ...(b.title !== undefined ? { title: textValue(b.title) } : {}),
          ...(b.location !== undefined ? { location: textValue(b.location) } : {}),
          ...(b.assetType !== undefined ? { assetType: textValue(b.assetType) } : {}),
          ...(b.targetYieldPct !== undefined ? { targetYieldPct: number(b.targetYieldPct) } : {}),
          ...(b.minEntry !== undefined ? { minEntry: number(b.minEntry) } : {}),
          ...(b.valuation !== undefined ? { valuation: number(b.valuation) } : {}),
          ...(b.occupancyPct !== undefined ? { occupancyPct: number(b.occupancyPct) } : {}),
          ...(b.status !== undefined ? { status: textValue(b.status) } : {}),
          ...(b.image !== undefined ? { image: textValue(b.image) } : {}),
          ...(b.summary !== undefined ? { summary: textValue(b.summary) } : {}),
          ...(b.supportingDocUrl !== undefined ? { supportingDocUrl: textValue(b.supportingDocUrl) } : {}),
          ...(b.supportingDocName !== undefined ? { supportingDocName: textValue(b.supportingDocName) } : {}),
          published: b.published !== false,
        },
        auditActor(req as BetterAuthRequest),
        (req as BetterAuthRequest).betterAuthSession?.user.email ?? "admin"
      );
      if (!updated) {
        res.status(404).json({ error: "Property not found." });
        return;
      }
      res.json({ ok: true, id });
      return;
    }
    try {
      const result = await queryDatabase(
        "UPDATE properties SET title=COALESCE(NULLIF($2,''),title), location=COALESCE(NULLIF($3,''),location), asset_type=COALESCE(NULLIF($4,''),asset_type), target_yield_pct=COALESCE($5,target_yield_pct), minimum_entry=COALESCE($6,minimum_entry), valuation=COALESCE($7,valuation), occupancy_pct=COALESCE($8,occupancy_pct), status=COALESCE(NULLIF($9,''),status), image_url=COALESCE(NULLIF($10,''),image_url), summary=COALESCE(NULLIF($11,''),summary), supporting_document_url=COALESCE(NULLIF($12,''),supporting_document_url), property_data=property_data || $13::jsonb, updated_at=now() WHERE id=$1 RETURNING id",
        [id, textValue(b.title), textValue(b.location), textValue(b.assetType), b.targetYieldPct == null ? null : number(b.targetYieldPct), b.minEntry == null ? null : number(b.minEntry), b.valuation == null ? null : number(b.valuation), b.occupancyPct == null ? null : number(b.occupancyPct), textValue(b.status), textValue(b.image), textValue(b.summary), textValue(b.supportingDocUrl), JSON.stringify({ published: b.published !== false, supportingDocName: textValue(b.supportingDocName) })]
      );
      if (!result.rowCount) {
        res.status(404).json({ error: "Property not found." });
        return;
      }
      await recordAudit(req as BetterAuthRequest, "UPDATE_PROPERTY", "property", id, { published: b.published !== false });
      res.json({ ok: true, id });
    } catch {
      res.status(502).json({ error: "Unable to update property." });
    }
  });

  router.delete("/properties/:id", async (req, res) => {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    if (!isDatabaseConfigured) {
      const deleted = getMockAdminData().customProperties.delete(id);
      if (!deleted) {
        res.status(404).json({ error: "Property not found." });
        return;
      }
      res.json({ ok: true });
      return;
    }
    try {
      const result = await queryDatabase("DELETE FROM properties WHERE id=$1 RETURNING id", [id]);
      if (!result.rowCount) {
        res.status(404).json({ error: "Property not found." });
        return;
      }
      await recordAudit(req as BetterAuthRequest, "DELETE_PROPERTY", "property", id, {});
      res.json({ ok: true });
    } catch {
      res.status(502).json({ error: "Unable to delete property." });
    }
  });


  router.post("/uploads", async (req, res) => {
    const kind = req.body?.kind === "document" ? "documents" : "properties";
    const fileNameRaw = textValue(req.body?.fileName, "asset");
    const dataUrl = textValue(req.body?.dataUrl);
    const match = dataUrl.match(/^data:([a-zA-Z0-9/+.-]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      res.status(400).json({ error: "Invalid base64 upload payload." });
      return;
    }
    const mime = match[1].toLowerCase();
    const buffer = Buffer.from(match[2], "base64");
    const maxBytes = kind === "properties" ? 2 * 1024 * 1024 : 3 * 1024 * 1024;
    if (!buffer.length || buffer.length > maxBytes) {
      res.status(400).json({ error: "Uploaded file exceeds the allowed size limit." });
      return;
    }
    const allowed: Record<string, string> = kind === "properties"
      ? { "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "image/webp": ".webp" }
      : { "application/pdf": ".pdf", "text/plain": ".txt", "image/jpeg": ".jpg", "image/png": ".png" };
    const ext = allowed[mime];
    if (!ext) {
      res.status(400).json({ error: "Unsupported upload file type." });
      return;
    }
    const safeBase = fileNameRaw.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) || "asset";
    const finalName = `${safeBase}_${Date.now()}_${randomUUID().slice(0, 6)}${ext}`;
    const targetDir = path.resolve(process.cwd(), "uploads", kind);
    const target = path.resolve(targetDir, finalName);
    if (!target.startsWith(targetDir + path.sep)) {
      res.status(400).json({ error: "Invalid upload path." });
      return;
    }
    try {
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(target, buffer, { flag: "wx" });
      const url = `/uploads/${kind}/${finalName}`;
      await recordAudit(req as BetterAuthRequest, kind === "properties" ? "UPLOAD_PROPERTY_IMAGE" : "UPLOAD_SUPPORTING_DOC", "upload", finalName, { url, mime });
      res.status(201).json({ ok: true, url, fileName: finalName });
    } catch (error) {
      console.error("Neon admin upload failed:", error);
      res.status(500).json({ error: "Unable to persist uploaded file." });
    }
  });


  // Manual payment instructions are stored in Neon and never approve or credit deposits.
  router.get("/manual-payment-assignments", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!isDatabaseConfigured) {
      res.status(503).json({ error: "Neon database is required for payment assignments." });
      return;
    }
    try {
      const result = await queryDatabase<Row>(
        `SELECT a.id, a.user_id AS "userId", a.user_email AS "userEmail",
                a.customer_name AS "customerName", a.method, a.amount,
                a.destination, a.network, a.reference, a.note, a.status,
                a.created_at AS "createdAt"
         FROM manual_payment_assignments a
         ORDER BY a.created_at DESC
         LIMIT 500`
      );
      res.json({ assignments: result.rows.map((row) => ({
        ...row,
        amount: Number(row.amount),
        createdAt: row.createdAt ? new Date(row.createdAt as string).toISOString() : null,
      })) });
    } catch (error) {
      console.error("Neon manual payment assignments query failed:", error);
      res.status(502).json({ error: "Unable to load payment assignments from Neon." });
    }
  });

  router.post("/manual-payment-assignments", async (req: BetterAuthRequest, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!isDatabaseConfigured) {
      res.status(503).json({ error: "Neon database is required for payment assignments." });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const userId = textValue(body.userId).trim();
    const methodId = textValue(body.method).trim();
    const method = MANUAL_PAYMENT_METHODS.find((item) => item.id === methodId);
    const amount = Number(body.amount);
    const destination = textValue(body.destination).trim();
    const network = textValue(body.network).trim();
    const reference = textValue(body.reference).trim();
    const note = textValue(body.note).trim();

    if (!userId || userId.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(userId)) {
      res.status(400).json({ error: "Select a valid customer account." });
      return;
    }
    if (!method) {
      res.status(400).json({ error: "Select one of the available payment methods." });
      return;
    }
    if (!Number.isFinite(amount) || amount < 0.01 || amount > 10000000 ||
        Math.abs(amount - Number(amount.toFixed(2))) > 0.0000001) {
      res.status(400).json({ error: "Payment amount must be a valid USD amount with up to two decimals." });
      return;
    }
    if (destination.length < 3 || destination.length > 220 || /[\r\n]/.test(destination)) {
      res.status(400).json({ error: "Enter a valid payment destination (maximum 220 characters)." });
      return;
    }
    if (network !== method.network) {
      res.status(400).json({ error: "The selected network does not match the payment method." });
      return;
    }
    if (reference.length < 3 || reference.length > 120 || /[\r\n]/.test(reference)) {
      res.status(400).json({ error: "Enter a valid transaction hash or payment reference." });
      return;
    }
    if (note.length > 500) {
      res.status(400).json({ error: "Internal note must be 500 characters or fewer." });
      return;
    }

    try {
      const customerResult = await queryDatabase<Row>(
        `SELECT u.id, u.email, u.name
         FROM "user" u
         WHERE u.id = $1
           AND NOT EXISTS (
             SELECT 1 FROM user_roles r WHERE r.user_id = u.id AND r.role = 'admin'
           )
         LIMIT 1`,
        [userId]
      );
      const customer = customerResult.rows[0];
      if (!customer) {
        res.status(404).json({ error: "Customer account not found." });
        return;
      }
      const userEmail = textValue(customer.email).trim().slice(0, 200);
      const customerName = textValue(customer.name, "Investor").trim().slice(0, 160);
      if (!userEmail) {
        res.status(400).json({ error: "Customer account has no email address." });
        return;
      }
      const id = `mpa_${randomUUID()}`;
      const saved = await queryDatabase<Row>(
        `INSERT INTO manual_payment_assignments
          (id, user_id, user_email, customer_name, method, amount, destination,
           network, reference, note, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Assigned',$11)
         RETURNING created_at AS "createdAt"`,
        [id, userId, userEmail, customerName, method.id, amount, destination,
         method.network, reference, note, auditActor(req)]
      );
      await recordAudit(req, "CREATE_MANUAL_PAYMENT_ASSIGNMENT", "manual_payment_assignment", id, {
        userId, userEmail, method: method.id, amount, reference,
      });
      res.status(201).json({
        assignment: {
          id, userId, userEmail, customerName, method: method.id, amount,
          destination, network: method.network, reference, note, status: "Assigned",
          createdAt: saved.rows[0]?.createdAt
            ? new Date(saved.rows[0].createdAt as string).toISOString()
            : new Date().toISOString(),
        },
      });
    } catch (error) {
      if ((error as { code?: string })?.code === "23505") {
        res.status(409).json({ error: "This customer already has an assignment with that reference." });
        return;
      }
      console.error("Neon manual payment assignment save failed:", error);
      res.status(502).json({ error: "Unable to save payment assignment in Neon." });
    }
  });

  router.get("/referrals", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!isDatabaseConfigured) {
      res.json(getMockAdminReferrals());
      return;
    }
    try {
      const result = await queryDatabase<{
        uid: string;
        email: string;
        displayName: string;
        referralBonus: string | number;
      }>(
        `SELECT u.id AS uid, u.email, u.name AS "displayName",
                COALESCE(SUM(CASE WHEN lower(t.type)='referral' AND lower(t.status)='completed' THEN t.amount ELSE 0 END), 0) AS "referralBonus"
         FROM "user" u
         LEFT JOIN transactions t ON t.user_id = u.id
         GROUP BY u.id, u.email, u.name
         ORDER BY u."createdAt" DESC
         LIMIT 500`
      );
      res.json({
        partnerSummary: result.rows.map((row) => ({
          uid: row.uid,
          email: row.email,
          displayName: row.displayName,
          code: `BF-${row.uid.slice(0, 8).toUpperCase()}`,
          referralBonus: Number(row.referralBonus || 0),
        })),
      });
    } catch (error) {
      console.error("Neon admin referrals query failed:", error);
      res.status(502).json({ error: "Unable to load referral partner summaries." });
    }
  });

  router.get("/documents", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!isDatabaseConfigured) {
      res.json({ documents: getMockAdminDocuments() });
      return;
    }
    try {
      const [invRows, txRows] = await Promise.all([
        queryDatabase<{
          id: string;
          user_id: string;
          plan_name: string;
          principal: string | number;
          created_at: Date | string;
        }>(
          `SELECT id, user_id, COALESCE(plan_snapshot->>'name', 'Investment') AS plan_name, principal, created_at
           FROM investments ORDER BY created_at DESC LIMIT 300`
        ),
        queryDatabase<{
          id: string;
          user_id: string;
          type: string;
          method: string | null;
          amount: string | number;
          currency: string;
          reference: string | null;
          status: string;
          created_at: Date | string;
        }>(
          `SELECT id, user_id, initcap(type) AS type, method, amount, currency, reference, initcap(status) AS status, created_at
           FROM transactions ORDER BY created_at DESC LIMIT 300`
        ),
      ]);
      const docs: CustomerDocumentDTO[] = [
        ...invRows.rows.map((row) => ({
          id: `agr-${row.id}`,
          userId: row.user_id,
          title: `${row.plan_name} Allocation Agreement`,
          docType: "Agreement" as const,
          reference: `INV-${row.id.slice(-8).toUpperCase()}`,
          summary: `Principal allocation of $${Number(row.principal || 0).toFixed(2)} USD in ${row.plan_name}.`,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
        })),
        ...txRows.rows.map((row) => ({
          id: `txdoc-${row.id}`,
          userId: row.user_id,
          title: `${row.type} ${row.status} Record — ${row.method || "Account"}`,
          docType:
            row.type === "Deposit"
              ? ("DepositConfirmation" as const)
              : row.type === "Withdrawal"
                ? ("WithdrawalRecord" as const)
                : ("Receipt" as const),
          reference: row.reference || row.id,
          summary: `${row.type} of $${Number(row.amount || 0).toFixed(2)} ${row.currency || "USD"} · Status: ${row.status}.`,
          createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
        })),
      ];
      res.json({ documents: docs });
    } catch (error) {
      console.error("Neon admin documents query failed:", error);
      res.status(502).json({ error: "Unable to load platform documents." });
    }
  });

  router.post("/broadcasts", async (req: BetterAuthRequest, res) => {
    const title = textValue(req.body?.title).trim().slice(0, 140);
    const body = textValue(req.body?.body).trim().slice(0, 600);
    if (!title || !body) {
      res.status(400).json({ error: "Broadcast title and message content are required." });
      return;
    }
    if (!isDatabaseConfigured) {
      const broadcast = addMockBroadcast(
        title,
        body,
        auditActor(req),
        req.betterAuthSession?.user.email ?? "admin"
      );
      res.status(201).json({ ok: true, broadcast });
      return;
    }
    try {
      const id = randomUUID();
      await queryDatabase(
        "INSERT INTO notifications (id, user_id, category, title, body) VALUES ($1, NULL, 'Broadcast', $2, $3)",
        [id, title, body]
      );
      await recordAudit(req, "PUBLISH_BROADCAST", "notification", id, { title });
      res.status(201).json({
        ok: true,
        broadcast: {
          id,
          userId: "all",
          category: "Broadcast",
          title,
          body,
          read: false,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Broadcast creation failed:", error);
      res.status(502).json({ error: "Unable to publish broadcast." });
    }
  });

  router.get("/email-templates", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!isDatabaseConfigured) {
      res.json({ templates: getMockEmailTemplates() });
      return;
    }
    try {
      const result = await queryDatabase<{
        event_type: string;
        subject: string;
        body: string;
        enabled: boolean;
        updated_by: string | null;
        updated_at: Date | string;
      }>("SELECT event_type, subject, body, enabled, updated_by, updated_at FROM email_templates");
      const savedMap = new Map(result.rows.map((r) => [r.event_type, r]));
      const templates = DEFAULT_MAIL_TEMPLATES.map((def) => {
        const saved = savedMap.get(def.eventType);
        return {
          eventType: def.eventType,
          subject: saved?.subject ?? def.subject,
          body: saved?.body ?? def.body,
          enabled: saved?.enabled ?? def.enabled,
          updatedBy: saved?.updated_by ?? undefined,
          updatedAt: saved?.updated_at ? new Date(saved.updated_at).toISOString() : null,
        };
      });
      res.json({ templates });
    } catch (error) {
      console.error("Neon email templates query failed:", error);
      res.status(502).json({ error: "Unable to load email templates." });
    }
  });

  router.put("/email-templates/:eventType", async (req: BetterAuthRequest, res) => {
    const eventType = typeof req.params.eventType === "string" ? req.params.eventType : "";
    const def = DEFAULT_MAIL_TEMPLATES.find((t) => t.eventType === eventType);
    if (!def || !def.editable) {
      res.status(400).json({ error: "Selected email template cannot be modified." });
      return;
    }
    const subject = textValue(req.body?.subject).trim().slice(0, 160);
    const body = textValue(req.body?.body).trim().slice(0, 3000);
    const enabled = req.body?.enabled !== false;
    if (!subject || !body) {
      res.status(400).json({ error: "Subject and body are required." });
      return;
    }
    const actorId = auditActor(req);
    if (!isDatabaseConfigured) {
      const record = saveMockEmailTemplate(eventType, subject, body, enabled, actorId);
      await recordAudit(req, "SAVE_EMAIL_TEMPLATE", "email_template", eventType, { enabled });
      res.json({ ok: true, template: record });
      return;
    }
    try {
      await queryDatabase(
        `INSERT INTO email_templates (event_type, subject, body, enabled, updated_by, updated_at)
         VALUES ($1, $2, $3, $4, $5, now())
         ON CONFLICT (event_type) DO UPDATE SET
           subject = EXCLUDED.subject,
           body = EXCLUDED.body,
           enabled = EXCLUDED.enabled,
           updated_by = EXCLUDED.updated_by,
           updated_at = now()`,
        [eventType, subject, body, enabled, actorId]
      );
      await recordAudit(req, "SAVE_EMAIL_TEMPLATE", "email_template", eventType, { enabled });
      res.json({
        ok: true,
        template: {
          eventType,
          subject,
          body,
          enabled,
          updatedBy: actorId,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Neon email template save failed:", error);
      res.status(502).json({ error: "Unable to save email template." });
    }
  });

  router.get("/email-outbox", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    if (!isDatabaseConfigured) {
      res.json({ outbox: getMockEmailOutbox() });
      return;
    }
    try {
      const result = await queryDatabase<{
        id: string;
        event_type: string;
        recipient: string;
        payload: Record<string, unknown>;
        status: string;
        created_at: Date | string;
      }>("SELECT id, event_type, recipient, payload, status, created_at FROM email_outbox ORDER BY created_at DESC LIMIT 50");
      res.json({
        outbox: result.rows.map((r) => ({
          id: r.id,
          eventType: r.event_type,
          recipient: r.recipient,
          subject: textValue(r.payload?.subject, r.event_type),
          body: textValue(r.payload?.body, ""),
          status: r.status,
          createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
        })),
      });
    } catch (error) {
      console.error("Neon email outbox query failed:", error);
      res.status(502).json({ error: "Unable to load email outbox." });
    }
  });

  return router;
}
