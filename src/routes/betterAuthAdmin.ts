import { Router } from "express";
import { requireBetterAuth, requireBetterAdmin } from "../middleware/betterAuth.ts";
import { queryDatabase } from "../db/pool.ts";

type Row = Record<string, unknown>;

export function createBetterAuthAdminRouter(): Router {
  const router = Router();
  router.use(requireBetterAuth, requireBetterAdmin);

  router.get("/customers", async (_req, res) => {
    try {
      const result = await queryDatabase<Row>(
        "SELECT u.id AS uid, u.username, u.email, u.name AS \"displayName\", COALESCE(p.country,'') AS country, COALESCE(p.phone,'') AS phone, COALESCE(w.available_balance,0) AS \"walletBalance\", COALESCE(p.account_status,'Active') AS \"accountStatus\", u.\"createdAt\" AS \"createdAt\", COALESCE(inv.count,0)::int AS \"investmentsCount\", COALESCE(tx.count,0)::int AS \"transactionsCount\" FROM \"user\" u LEFT JOIN user_profiles p ON p.user_id=u.id LEFT JOIN wallets w ON w.user_id=u.id AND w.currency='USD' LEFT JOIN LATERAL (SELECT COUNT(*) count FROM investments WHERE user_id=u.id) inv ON true LEFT JOIN LATERAL (SELECT COUNT(*) count FROM transactions WHERE user_id=u.id) tx ON true ORDER BY u.\"createdAt\" DESC"
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

  return router;
}
