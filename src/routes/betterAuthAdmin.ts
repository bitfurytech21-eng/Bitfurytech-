import { Router } from "express";
import { requireBetterAuth, requireBetterAdmin } from "../middleware/betterAuth.ts";
import { databasePool, queryDatabase } from "../db/pool.ts";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

type Row = Record<string, unknown>;

export function createBetterAuthAdminRouter(): Router {
  const router = Router();
  router.use(requireBetterAuth, requireBetterAdmin);

  router.get("/customers", async (_req, res) => {
    try {
      const result = await queryDatabase<Row>(
        "SELECT u.id AS uid, u.username, u.email, u.name AS \"displayName\", COALESCE(p.country,'') AS country, COALESCE(p.phone,'') AS phone, COALESCE(w.available_balance,0) AS \"walletBalance\", 'Active'::text AS \"accountStatus\", u.\"createdAt\" AS \"createdAt\", COALESCE(inv.count,0)::int AS \"investmentsCount\", COALESCE(tx.count,0)::int AS \"transactionsCount\" FROM \"user\" u LEFT JOIN user_profiles p ON p.user_id=u.id LEFT JOIN wallets w ON w.user_id=u.id AND w.currency='USD' LEFT JOIN LATERAL (SELECT COUNT(*) count FROM investments WHERE user_id=u.id) inv ON true LEFT JOIN LATERAL (SELECT COUNT(*) count FROM transactions WHERE user_id=u.id) tx ON true ORDER BY u.\"createdAt\" DESC"
      );
      res.setHeader("Cache-Control", "no-store");
      res.json({ customers: result.rows });
    } catch (error) {
      console.error("Neon admin customers query failed:", error);
      res.status(502).json({ error: "Unable to load customer records from Neon." });
    }
  });

  router.get("/deposits", async (_req, res) => {
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
    try {
      const result = await queryDatabase<Row>(
        "SELECT id, name, category, CASE category WHEN 'crypto' THEN 'Digital Assets' WHEN 'stock' THEN 'Global Equities' ELSE 'Real Estate' END AS \"categoryLabel\", COALESCE(plan_data->>'audience','Verified investors') AS audience, description, min_deposit AS \"minDeposit\", max_deposit AS \"maxDeposit\", daily_rate_pct AS \"dailyRatePct\", duration_days AS \"durationDays\", COALESCE(plan_data->>'paymentFrequency','At maturity') AS \"paymentFrequency\", COALESCE(plan_data->>'settlementRail','USDT (TRC20) / Bank Wire') AS \"settlementRail\", COALESCE(plan_data->>'returnTerms','') AS \"returnTerms\", COALESCE(plan_data->>'availabilityStatus','Open') AS \"availabilityStatus\", published, COALESCE(plan_data->>'image','/images/hero-private-capital.jpg') AS image, 'database' AS source FROM investment_plans ORDER BY created_at DESC"
      );
      res.setHeader("Cache-Control", "no-store");
      res.json({ plans: result.rows });
    } catch (error) {
      console.error("Neon admin plans query failed:", error);
      res.status(502).json({ error: "Unable to load investment plans from Neon." });
    }
  });

  router.get("/properties", async (_req, res) => {
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
    try {
      const result = await queryDatabase<Row>("SELECT id, name, email, topic, message, created_at AS \"createdAt\" FROM inquiries ORDER BY created_at DESC LIMIT 500");
      res.setHeader("Cache-Control", "no-store");
      res.json({ inquiries: result.rows });
    } catch (error) {
      console.error("Neon admin support query failed:", error);
      res.status(502).json({ error: "Unable to load support inquiries from Neon." });
    }
  });

  router.get("/audit-logs", async (_req, res) => {
    try {
      const result = await queryDatabase<Row>("SELECT a.id, a.actor_user_id AS \"actorUid\", u.email AS \"actorEmail\", a.action, a.target_type AS \"targetType\", a.target_id AS \"targetId\", a.details, a.created_at AS \"createdAt\" FROM audit_logs a LEFT JOIN \"user\" u ON u.id=a.actor_user_id ORDER BY a.created_at DESC LIMIT 500");
      res.setHeader("Cache-Control", "no-store");
      res.json({ logs: result.rows });
    } catch (error) {
      console.error("Neon admin audit query failed:", error);
      res.status(502).json({ error: "Unable to load audit history from Neon." });
    }
  });


  async function withAdminTransaction<T>(work: (client: any) => Promise<T>): Promise<T> {
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

  async function auditInTransaction(client: any, actorId: string, action: string, targetType: string, targetId: string, details: Record<string, unknown>) {
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
          await client.query(
            "INSERT INTO ledger_entries (transaction_id,user_id,account_code,direction,amount,currency,memo) VALUES ($1,$2,'customer_available','debit',$3,$4,'Approved withdrawal'),($1,$2,'platform_custody','credit',$3,$4,'Approved withdrawal')",
            [id, tx.user_id, amount, currency]
          );
        } else {
          await client.query(
            "UPDATE wallets SET reserved_balance=reserved_balance-$3, available_balance=available_balance+$3, updated_at=now() WHERE user_id=$1 AND currency=$2",
            [tx.user_id, currency, amount]
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
    try {
      const result = await queryDatabase(
        "UPDATE properties SET property_data=property_data || $2::jsonb, updated_at=now() WHERE id=$1 RETURNING id",
        [id, JSON.stringify({ published: b.published !== false })]
      );
      if (!result.rowCount) {
        res.status(404).json({ error: "Property not found." });
        return;
      }
      await recordAudit(req as BetterAuthRequest, "UPDATE_PROPERTY_VISIBILITY", "property", id, { published: b.published !== false });
      res.json({ ok: true, id });
    } catch (error) {
      res.status(502).json({ error: "Unable to update property visibility." });
    }
  });

  router.delete("/properties/:id", async (req, res) => {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    try {
      const result = await queryDatabase("DELETE FROM properties WHERE id=$1 RETURNING id", [id]);
      if (!result.rowCount) {
        res.status(404).json({ error: "Property not found." });
        return;
      }
      await recordAudit(req as BetterAuthRequest, "DELETE_PROPERTY", "property", id, {});
      res.json({ ok: true });
    } catch (error) {
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

  return router;
}
