import express from "express";
import http from "http";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getMandateById, INVESTMENT_MANDATES } from "./src/trading/tradingPage.ts";
import { createCustomerRouter } from "./src/routes/apiCustomer.ts";
import { createBetterAuthAdminRouter } from "./src/routes/betterAuthAdmin.ts";
import { createBetterAuthFinancialRouter } from "./src/routes/betterAuthFinancial.ts";
import { createSupportRouter } from "./src/routes/apiSupport.ts";
import { attachSupportWebSocketServer } from "./src/services/supportWebSocketServer.ts";
import { enqueueMailEvent } from "./src/services/mailOutbox.ts";
import { startDailyRoiEmailScheduler } from "./src/services/dailyRoiEmailScheduler.ts";
import { startPlanDrivenRoiEngine } from "./src/services/planDrivenRoiEngine.ts";
import { validateUsername } from "./src/lib/username.ts";
import { isDatabaseConfigured, queryDatabase } from "./src/db/pool.ts";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { betterAuthInstance } from "./src/lib/better-auth.ts";
import {
  requireBetterAuth,
  requireBetterAdmin,
  resolveBetterAuthRole,
  type BetterAuthRequest,
} from "./src/middleware/betterAuth.ts";
import {
  addMockInquiry,
  getMockAdminData,
  getMockAdminOverview,
  getMockCatalog,
  isMockUsernameAvailable,
  lookupMockEmailByUsername,
} from "./src/services/inMemoryFinancialMock.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set("trust proxy", 1);
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production";

// Better Auth is isolated under /api/better-auth and runs before express.json() so it can read the request body.
app.all("/api/better-auth/*splat", toNodeHandler(betterAuthInstance));

app.get("/api/account/session", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  try {
    const session = await betterAuthInstance.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) {
      res.status(401).json({ authenticated: false });
      return;
    }
    const role = await resolveBetterAuthRole(session.user.id, session.user.email);
    res.json({
      authenticated: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
        role,
        isAdmin: role === "admin" && session.user.emailVerified,
      },
      session: {
        expiresAt: session.session.expiresAt,
      },
    });
  } catch (error) {
    console.error("Better Auth session lookup failed:", error);
    res.status(503).json({ authenticated: false, error: "Unable to verify account session." });
  }
});

// Better Auth session endpoints.
app.get("/api/auth/better-session", requireBetterAuth, async (req: BetterAuthRequest, res) => {
  const session = req.betterAuthSession;
  if (!session) {
    res.status(401).json({ authenticated: false });
    return;
  }
  try {
    const role = await resolveBetterAuthRole(session.user.id, session.user.email);
    res.json({
      authenticated: true,
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        emailVerified: session.user.emailVerified,
        role,
        isAdmin: role === "admin" && session.user.emailVerified,
      },
      session: { expiresAt: session.session.expiresAt },
    });
  } catch (error) {
    console.error("Better Auth role lookup failed:", error);
    res.status(503).json({ authenticated: false, error: "Unable to verify account permissions." });
  }
});

app.get("/api/auth/better-admin-check", requireBetterAuth, requireBetterAdmin, (req: BetterAuthRequest, res) => {
  res.json({
    ok: true,
    userId: req.betterAuthSession?.user.id,
    email: req.betterAuthSession?.user.email ?? null,
    isAdmin: true,
    role: "admin",
  });
});

// Resend webhook receiver. Keep this raw-body route before express.json() for signature verification.
app.post(
  "/api/webhooks/resend",
  express.raw({ type: "application/json", limit: "1mb" }),
  async (req, res) => {
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret) {
      res.status(503).json({ ok: false, error: "Webhook receiver is not configured." });
      return;
    }
    const webhookId = req.header("svix-id");
    const timestamp = req.header("svix-timestamp");
    const signatures = req.header("svix-signature");
    if (!webhookId || !timestamp || !signatures || !Buffer.isBuffer(req.body)) {
      res.status(400).json({ ok: false, error: "Missing webhook signature headers or raw body." });
      return;
    }
    const timestampSeconds = Number(timestamp);
    if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 5 * 60) {
      res.status(400).json({ ok: false, error: "Webhook timestamp is outside the allowed window." });
      return;
    }
    const encodedSecret = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const signingKey = Buffer.from(encodedSecret, "base64");
    if (signingKey.length === 0) {
      res.status(503).json({ ok: false, error: "Webhook signing secret is invalid." });
      return;
    }
    const signedContent = `${webhookId}.${timestamp}.${req.body.toString("utf8")}`;
    const expected = createHmac("sha256", signingKey).update(signedContent).digest();
    const validSignature = signatures.split(" ").some((part) => {
      const [version, value] = part.split(",", 2);
      if (version !== "v1" || !value) return false;
      const supplied = Buffer.from(value, "base64");
      return supplied.length === expected.length && timingSafeEqual(supplied, expected);
    });
    if (!validSignature) {
      res.status(401).json({ ok: false, error: "Invalid webhook signature." });
      return;
    }
    let event: { type?: unknown; data?: Record<string, unknown> };
    try {
      event = JSON.parse(req.body.toString("utf8")) as typeof event;
    } catch {
      res.status(400).json({ ok: false, error: "Invalid webhook JSON." });
      return;
    }
    if (typeof event.type !== "string" || !event.type.startsWith("email.")) {
      res.status(400).json({ ok: false, error: "Unsupported webhook event type." });
      return;
    }
    const data = event.data ?? {};
    const emailId = typeof data.email_id === "string" ? data.email_id : typeof data.id === "string" ? data.id : null;
    const rawTo = data.to;
    const recipient = typeof rawTo === "string"
      ? rawTo
      : Array.isArray(rawTo) ? rawTo.filter((value): value is string => typeof value === "string").join(",")
      : null;
    try {
      const saved = await queryDatabase(
        `INSERT INTO email_webhook_events (event_id, event_type, email_id, recipient, payload)
         VALUES ($1, $2, $3, $4, $5::jsonb)
         ON CONFLICT (event_id) DO NOTHING
         RETURNING event_id`,
        [webhookId, event.type, emailId, recipient, req.body.toString("utf8")]
      );
      res.status(200).json({ ok: true, received: true, duplicate: saved.rowCount === 0 });
    } catch (error) {
      console.error("Resend webhook persistence failed:", error);
      res.status(500).json({ ok: false, error: "Unable to persist webhook event." });
    }
  }
);

app.use(express.json({ limit: "6mb" }));

// Serve locally uploaded property images & supporting documents
const uploadsDir = path.resolve(__dirname, "uploads");
app.use(
  "/uploads",
  express.static(uploadsDir, {
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  })
);

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "bitfurytech" });
});

app.get("/api/health/database", async (_req, res) => {
  if (!isDatabaseConfigured) {
    res.json({ ok: true, database: "in-memory-mock" });
    return;
  }
  try {
    await queryDatabase("SELECT 1 AS connected");
    res.json({ ok: true, database: "connected" });
  } catch (error) {
    console.error("Database health check failed:", error);
    res.status(503).json({
      ok: false,
      database: "unavailable",
      error: "Database connection is not ready.",
    });
  }
});

/**
 * Reports whether the additive Neon migration schema is installed.
 * This endpoint exposes only readiness booleans, never database data or secrets.
 */
app.get("/api/health/migration", async (_req, res) => {
  if (!isDatabaseConfigured) {
    res.json({
      ok: true,
      database: "in-memory-mock",
      migrationSchema: "mock-ready",
      missingTables: [],
      userProvisioningTrigger: true,
    });
    return;
  }
  try {
    const result = await queryDatabase<{ name: string; present: boolean }>(
      `SELECT required.name,
              to_regclass(required.name) IS NOT NULL AS present
       FROM (VALUES
         ('public."user"'),
         ('public.session'),
         ('public.account'),
         ('public.verification'),
         ('public.user_profiles'),
         ('public.user_roles'),
         ('public.investment_plans'),
         ('public.investments'),
         ('public.transactions'),
         ('public.ledger_entries'),
         ('public.properties'),
         ('public.email_outbox'),
         ('public.audit_logs'),
         ('public.platform_payment_wallets')
       ) AS required(name)`
    );
    const missing = result.rows.filter((row) => !row.present).map((row) => row.name);
    const trigger = await queryDatabase<{ present: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM pg_trigger
         WHERE tgname = 'bitfurytech_user_provision_after_insert'
           AND NOT tgisinternal
       ) AS present`
    );
    const schemaReady = missing.length === 0 && trigger.rows[0]?.present === true;
    res.status(schemaReady ? 200 : 503).json({
      ok: schemaReady,
      database: "connected",
      migrationSchema: schemaReady ? "ready" : "incomplete",
      missingTables: missing,
      userProvisioningTrigger: trigger.rows[0]?.present === true,
    });
  } catch (error) {
    console.error("Migration readiness check failed:", error);
    res.status(503).json({
      ok: false,
      database: "unavailable",
      migrationSchema: "unknown",
      error: "Unable to verify migration schema.",
    });
  }
});

interface MarketTickerQuote {
  symbol: string;
  name: string;
  priceUsd: number;
  change24hPct: number;
}

let marketTickerCache: {
  fetchedAt: string;
  quotes: MarketTickerQuote[];
  expiresAtMs: number;
} | null = null;

// Live cryptocurrency market ticker (proxied and cached cleanly via CoinGecko public API)
app.get("/api/market/ticker", async (_req, res) => {
  const now = Date.now();
  if (marketTickerCache && marketTickerCache.expiresAtMs > now) {
    res.json({
      available: true,
      source: "CoinGecko Spot Index",
      fetchedAt: marketTickerCache.fetchedAt,
      quotes: marketTickerCache.quotes,
    });
    return;
  }

  try {
    const cgRes = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,binancecoin,solana,ripple&vs_currencies=usd&include_24hr_change=true",
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(5000),
      }
    );

    if (!cgRes.ok) {
      throw new Error(`CoinGecko returned HTTP ${cgRes.status}`);
    }

    const payload = (await cgRes.json()) as Record<
      string,
      { usd?: number; usd_24h_change?: number }
    >;

    const defs: Array<{ id: string; symbol: string; name: string }> = [
      { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
      { id: "ethereum", symbol: "ETH", name: "Ethereum" },
      { id: "tether", symbol: "USDT", name: "Tether USD" },
      { id: "binancecoin", symbol: "BNB", name: "BNB" },
      { id: "solana", symbol: "SOL", name: "Solana" },
      { id: "ripple", symbol: "XRP", name: "XRP" },
    ];

    const quotes: MarketTickerQuote[] = defs
      .map((item) => {
        const entry = payload[item.id];
        if (!entry || typeof entry.usd !== "number") return null;
        return {
          symbol: item.symbol,
          name: item.name,
          priceUsd: entry.usd,
          change24hPct:
            typeof entry.usd_24h_change === "number"
              ? Number(entry.usd_24h_change.toFixed(2))
              : 0,
        };
      })
      .filter((item): item is MarketTickerQuote => item !== null);

    if (quotes.length === 0) {
      throw new Error("Empty market feed response.");
    }

    const fetchedAt = new Date().toISOString();
    marketTickerCache = {
      fetchedAt,
      quotes,
      expiresAtMs: now + 60_000,
    };

    res.json({
      available: true,
      source: "CoinGecko Spot Index",
      fetchedAt,
      quotes,
    });
  } catch {
    if (marketTickerCache) {
      res.json({
        available: true,
        cached: true,
        source: "CoinGecko Spot Index",
        fetchedAt: marketTickerCache.fetchedAt,
        quotes: marketTickerCache.quotes,
      });
      return;
    }
    res.json({
      available: false,
      source: "CoinGecko Spot Index",
      fetchedAt: null,
      quotes: [],
    });
  }
});

// Public investment mandate definitions (merges admin-published plans with defaults)
app.get("/api/trading/plans", async (_req, res) => {
  if (!isDatabaseConfigured) {
    res.json({ mandates: getMockCatalog(0.5).plans });
    return;
  }
  try {
    const result = await queryDatabase<{
      id: string;
      name: string;
      category: string;
      description: string;
      min_deposit: string | number;
      max_deposit: string | number | null;
      daily_rate_pct: string | number | null;
      duration_days: number;
      published: boolean;
      plan_data: Record<string, unknown> | null;
    }>(
      "SELECT id, name, category, description, min_deposit, max_deposit, daily_rate_pct, duration_days, published, plan_data FROM investment_plans ORDER BY created_at DESC"
    );
    const byId = new Map(INVESTMENT_MANDATES.map((m) => [m.id, m]));
    for (const r of result.rows) {
      if (r.published === false) {
        byId.delete(r.id);
        continue;
      }
      const data = r.plan_data && typeof r.plan_data === "object" ? r.plan_data : {};
      const category = r.category === "stock" || r.category === "estate" ? r.category : "crypto";
      byId.set(r.id, {
        id: r.id,
        category,
        categoryLabel: String(
          data.categoryLabel ??
            (category === "crypto"
              ? "Digital Assets"
              : category === "stock"
                ? "Global Equities"
                : "Real Estate")
        ),
        name: String(r.name ?? "Investment Mandate"),
        audience: String(data.audience ?? "Structured client allocation"),
        description: String(r.description ?? ""),
        minDeposit: Number(r.min_deposit ?? 500) || 500,
        maxDeposit: Number(r.max_deposit ?? 50000) || 50000,
        dailyRatePct: Number(r.daily_rate_pct ?? 1.5) || 1.5,
        durationDays: Number(r.duration_days ?? 30) || 30,
        paymentFrequency: String(data.paymentFrequency ?? "Scheduled cycle distribution"),
        settlementRail: String(data.settlementRail ?? "USDT (TRC20) / Bank Wire"),
        image: String(data.image ?? "/images/hero_institutional_wealth.jpg"),
        returnTerms: String(data.returnTerms ?? r.description ?? ""),
        highlights: Array.isArray(data.highlights)
          ? data.highlights.map(String)
          : ["Segregated custody tracking", "Verified ledger settlement"],
      });
    }
    res.json({ mandates: Array.from(byId.values()) });
  } catch {
    res.json({ mandates: INVESTMENT_MANDATES });
  }
});

app.get("/api/trading/plans/:id", (req, res) => {
  const mandate = getMandateById(req.params.id);
  if (!mandate) {
    res.status(404).json({ error: "Investment plan not found." });
    return;
  }
  res.json({ mandate });
});

// Public published property listings
app.get("/api/properties", async (_req, res) => {
  if (!isDatabaseConfigured) {
    res.setHeader("Cache-Control", "no-store");
    res.json({
      properties: getMockAdminData().properties.filter((p) => p.published !== false),
    });
    return;
  }
  try {
    const result = await queryDatabase<{
      id: string;
      title: string;
      location: string;
      assetType: string;
      targetYieldPct: string | number | null;
      minEntry: string | number | null;
      valuation: string | number | null;
      occupancyPct: string | number | null;
      status: string;
      published: boolean;
      image: string | null;
      summary: string | null;
      supportingDocUrl: string | null;
      supportingDocName: string | null;
      createdAt: Date | string;
    }>(
      `SELECT id, title, location, asset_type AS "assetType", target_yield_pct AS "targetYieldPct",
              minimum_entry AS "minEntry", valuation, occupancy_pct AS "occupancyPct", status,
              COALESCE((property_data->>'published')::boolean, true) AS published,
              COALESCE(image_url, '/images/commercial-property.jpg') AS image,
              summary, supporting_document_url AS "supportingDocUrl",
              property_data->>'supportingDocName' AS "supportingDocName",
              created_at AS "createdAt"
       FROM properties
       WHERE COALESCE((property_data->>'published')::boolean, true) = true
       ORDER BY created_at DESC`
    );
    res.setHeader("Cache-Control", "no-store");
    res.json({
      properties: result.rows.map((r) => ({
        ...r,
        targetYieldPct: Number(r.targetYieldPct ?? 0),
        minEntry: Number(r.minEntry ?? 1000),
        valuation: Number(r.valuation ?? 0),
        occupancyPct: Number(r.occupancyPct ?? 0),
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
      })),
    });
  } catch (error) {
    console.error("Public properties fetch failed:", error);
    res.status(503).json({ error: "Unable to load published property offerings." });
  }
});

// Username availability and lookup are backed by Neon, the active Better Auth identity store.
app.post("/api/auth/check-username", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  const rawUsername = typeof req.body?.username === "string" ? req.body.username : "";
  const check = validateUsername(rawUsername);
  if (!check.valid) {
    res.status(400).json({ ok: false, available: false, error: check.error });
    return;
  }
  if (!isDatabaseConfigured) {
    const available = isMockUsernameAvailable(check.normalized);
    res.json({
      ok: true,
      available,
      username: check.normalized,
      ...(!available ? { error: "This username is already taken. Please choose another." } : {}),
    });
    return;
  }
  try {
    const result = await queryDatabase<{ id: string }>(
      'SELECT id FROM "user" WHERE lower(username) = lower($1) LIMIT 1',
      [check.normalized]
    );
    res.json({
      ok: true,
      available: result.rows.length === 0,
      username: check.normalized,
      ...(result.rows.length ? { error: "This username is already taken. Please choose another." } : {}),
    });
  } catch (error) {
    console.error("Neon username availability check failed:", error);
    res.status(503).json({ ok: false, available: null, error: "Username service is temporarily unavailable." });
  }
});

app.post("/api/auth/username-email", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  const rawUsername = typeof req.body?.username === "string" ? req.body.username : "";
  const check = validateUsername(rawUsername);
  if (!check.valid) {
    res.status(400).json({ error: "Invalid username or password." });
    return;
  }
  if (!isDatabaseConfigured) {
    const email = lookupMockEmailByUsername(check.normalized);
    if (!email) {
      res.status(401).json({ error: "Invalid username or password." });
      return;
    }
    res.json({ email });
    return;
  }
  try {
    const result = await queryDatabase<{ email: string }>(
      'SELECT email FROM "user" WHERE lower(username) = lower($1) LIMIT 1',
      [check.normalized]
    );
    if (!result.rows[0]?.email) {
      res.status(401).json({ error: "Invalid username or password." });
      return;
    }
    res.json({ email: result.rows[0].email });
  } catch (error) {
    console.error("Neon username lookup failed:", error);
    res.status(503).json({ error: "Username sign-in is temporarily unavailable." });
  }
});

// Public contact inquiry endpoint backed by Neon PostgreSQL (with in-memory fallback)
app.post("/api/contact", async (req, res) => {
  const body = (req.body ?? {}) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const subject =
    typeof body.subject === "string"
      ? body.subject.trim()
      : typeof body.topic === "string"
        ? body.topic.trim()
        : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!name || name.length > 120) {
    res.status(400).json({ ok: false, error: "Name must be between 1 and 120 characters." });
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || email.length < 3 || email.length > 200 || !emailRegex.test(email)) {
    res.status(400).json({ ok: false, error: "Provide a valid email address." });
    return;
  }
  if (!subject || subject.length > 120) {
    res.status(400).json({ ok: false, error: "Subject must be between 1 and 120 characters." });
    return;
  }
  if (!message || message.length > 1500) {
    res.status(400).json({ ok: false, error: "Message must be between 1 and 1500 characters." });
    return;
  }

  const inquiryId = `inq_${randomUUID()}`;
  if (!isDatabaseConfigured) {
    const saved = addMockInquiry({ id: inquiryId, name, email, subject, message });
    res.status(201).json({ ok: true, inquiryId: saved.id, submittedAt: saved.createdAt });
    return;
  }
  try {
    await queryDatabase(
      "INSERT INTO inquiries (id, name, email, topic, message) VALUES ($1, $2, $3, $4, $5)",
      [inquiryId, name, email, subject, message]
    );
    res.status(201).json({
      ok: true,
      inquiryId,
      submittedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Contact inquiry server error:", err);
    res.status(500).json({
      ok: false,
      error: "Server error while recording your inquiry. Please try again later.",
    });
  }
});

// Public newsletter subscription endpoint backed by Neon PostgreSQL (with in-memory fallback)
app.post("/api/newsletter", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || email.length < 3 || email.length > 200 || !emailRegex.test(email)) {
    res.status(400).json({ ok: false, error: "Provide a valid email address." });
    return;
  }

  const subscriptionId = `news_${randomUUID()}`;
  const topic = "Newsletter Subscription";
  const message =
    "Subscribed to BitfuryTech institutional briefings, mandate announcements, and property releases.";

  try {
    let isNewSubscription = true;
    let subscribedAt = new Date().toISOString();

    if (!isDatabaseConfigured) {
      const saved = addMockInquiry({
        id: subscriptionId,
        name: "Newsletter Subscriber",
        email,
        subject: topic,
        message,
      });
      subscribedAt = saved.createdAt;
    } else {
      const saved = await queryDatabase<{ id: string; subscribed_at: Date | string }>(
        `INSERT INTO newsletter_subscribers (id, email)
         VALUES ($1, $2)
         ON CONFLICT (email) DO NOTHING
         RETURNING id, subscribed_at`,
        [subscriptionId, email]
      );
      isNewSubscription = saved.rowCount > 0;
      if (saved.rows[0]?.subscribed_at) {
        subscribedAt = new Date(saved.rows[0].subscribed_at).toISOString();
      }
    }

    let emailSent = false;
    if (isNewSubscription) {
      try {
        emailSent = await enqueueMailEvent({
          eventType: "newsletter_signup",
          userId: `newsletter:${email}`,
          recipient: email,
          values: { email },
        });
      } catch (mailError) {
        console.error("Newsletter confirmation email failed:", mailError);
      }
    }
    res.status(201).json({
      ok: true,
      subscriptionId,
      subscribedAt,
      alreadySubscribed: !isNewSubscription,
      emailSent,
    });
  } catch (err) {
    console.error("Newsletter subscription error:", err);
    res.status(500).json({
      ok: false,
      error: "Unable to save newsletter subscription right now.",
    });
  }
});

/** Better Auth protected admin landing overview. */
app.get("/api/admin/overview", requireBetterAuth, requireBetterAdmin, async (_req: BetterAuthRequest, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  if (!isDatabaseConfigured) {
    res.json(getMockAdminOverview());
    return;
  }
  try {
    const [users, active, invested, pendingD, pendingW, amountD, amountW, newUsers, properties, inquiries, recentTx, audit] = await Promise.all([
      queryDatabase<{ count: string }>("SELECT COUNT(*)::text AS count FROM \"user\""),
      queryDatabase<{ count: string }>("SELECT COUNT(*)::text AS count FROM investments WHERE lower(status) = 'active'"),
      queryDatabase<{ total: string }>("SELECT COALESCE(SUM(principal), 0)::text AS total FROM investments"),
      queryDatabase<{ count: string }>("SELECT COUNT(*)::text AS count FROM transactions WHERE lower(type) = 'deposit' AND lower(status) IN ('pending','processing')"),
      queryDatabase<{ count: string }>("SELECT COUNT(*)::text AS count FROM transactions WHERE lower(type) = 'withdrawal' AND lower(status) IN ('pending','processing')"),
      queryDatabase<{ total: string }>("SELECT COALESCE(SUM(amount), 0)::text AS total FROM transactions WHERE lower(type) = 'deposit' AND lower(status) IN ('pending','processing')"),
      queryDatabase<{ total: string }>("SELECT COALESCE(SUM(amount), 0)::text AS total FROM transactions WHERE lower(type) = 'withdrawal' AND lower(status) IN ('pending','processing')"),
      queryDatabase<{ count: string }>("SELECT COUNT(*)::text AS count FROM \"user\" WHERE \"createdAt\" >= now() - interval '7 days'"),
      queryDatabase<{ count: string }>("SELECT COUNT(*)::text AS count FROM properties"),
      queryDatabase<{ count: string }>("SELECT COUNT(*)::text AS count FROM inquiries"),
      queryDatabase<{ id: string; email: string; type: string; method: string | null; amount: string; reference: string | null; status: string; created_at: string }>("SELECT t.id, u.email, t.type, t.method, t.amount::text, t.reference, t.status, t.created_at FROM transactions t JOIN \"user\" u ON u.id = t.user_id ORDER BY t.created_at DESC LIMIT 10"),
      queryDatabase<{ id: string; action: string; target_type: string; target_id: string | null; details: unknown; created_at: string }>("SELECT id::text, action, target_type, target_id, details, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 8")
    ]);
    const n = (v: unknown) => Number(v || 0);
    res.json({
      stats: { totalCustomers: n(users.rows[0]?.count), activeInvestmentsCount: n(active.rows[0]?.count), totalInvested: n(invested.rows[0]?.total), pendingDepositsCount: n(pendingD.rows[0]?.count), pendingDepositsAmount: n(amountD.rows[0]?.total), pendingWithdrawalsCount: n(pendingW.rows[0]?.count), pendingWithdrawalsAmount: n(amountW.rows[0]?.total), newRegistrations: n(newUsers.rows[0]?.count), propertiesCount: n(properties.rows[0]?.count), inquiriesCount: n(inquiries.rows[0]?.count) },
      recentTransactions: recentTx.rows.map((t) => ({ id: t.id, userEmail: t.email, type: t.type, method: t.method || "", amount: n(t.amount), reference: t.reference || "", status: t.status, createdAt: t.created_at })),
      recentAuditLogs: audit.rows.map((a) => ({ id: a.id, actorEmail: "Administrator", action: a.action, targetType: a.target_type, targetId: a.target_id || "", summary: typeof a.details === "string" ? a.details : JSON.stringify(a.details || {}), createdAt: a.created_at }))
    });
  } catch (error) {
    console.error("Neon admin overview failed:", error);
    res.status(503).json({ error: "Unable to load administrator overview from Neon." });
  }
});

// Modular Support, Customer & Admin API routers
app.use("/api", createSupportRouter());
app.use("/api", createBetterAuthFinancialRouter());
app.use("/api", createCustomerRouter());
app.use("/api/admin", createBetterAuthAdminRouter());

async function startServer() {
  const httpServer = http.createServer(app);
  attachSupportWebSocketServer(httpServer);

  if (!isProduction) {
    const disableHmr = process.env.DISABLE_HMR === "true" || Boolean(process.env.K_SERVICE);
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: disableHmr ? false : { server: httpServer },
        watch: disableHmr ? null : undefined,
      },
      appType: "spa",
    });
    if (disableHmr) {
      app.get("/@vite/client", (_req, res) => {
        res.type("application/javascript; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache");
        res.send(`const sheetsMap = new Map();
const linkSheetsMap = new Map();
const cspNonce = typeof document !== "undefined" ? document.querySelector("meta[property=csp-nonce]")?.getAttribute("nonce") : void 0;
if (typeof document !== "undefined") {
  document.querySelectorAll("style[data-vite-dev-id]").forEach((el) => {
    sheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
  document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id]').forEach((el) => {
    linkSheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
}
export function updateStyle(id, content) {
  if (typeof document === "undefined" || linkSheetsMap.has(id)) return;
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.setAttribute("data-vite-dev-id", id);
    style.textContent = content;
    if (cspNonce) style.setAttribute("nonce", cspNonce);
    document.head.appendChild(style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  if (typeof document === "undefined") return;
  if (linkSheetsMap.has(id)) {
    document.querySelectorAll(\`link[rel="stylesheet"][data-vite-dev-id="\${CSS.escape(id)}"]\`).forEach((el) => el.remove());
    linkSheetsMap.delete(id);
  }
  const style = sheetsMap.get(id);
  if (style && style.parentNode) {
    style.parentNode.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (typeof url !== "string" || (url[0] !== "." && url[0] !== "/")) return url;
  const pathname = url.replace(/[?#].*$/, "");
  const parsed = new URL(url, "http://vite.dev");
  return \`\${pathname}?\${queryToInject}\${parsed.search ? "&" + parsed.search.slice(1) : ""}\${parsed.hash || ""}\`;
}
const BaseEl = typeof HTMLElement !== "undefined" ? HTMLElement : class {};
export class ErrorOverlay extends BaseEl {}
`);
      });
    }
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get(/.*/, (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`BitfuryTech server listening on http://0.0.0.0:${PORT}`);
    if (isDatabaseConfigured) {
      startDailyRoiEmailScheduler();
      startPlanDrivenRoiEngine();
    }
  });
}

startServer().catch((err) => {
  console.error("Failed to start BitfuryTech server:", err);
  process.exit(1);
});
