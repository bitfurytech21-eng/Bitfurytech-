import express from "express";
import http from "http";
import { createHmac, timingSafeEqual } from "node:crypto";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import {
  requireAdmin,
  requireAuth,
  resolveSessionPayload,
  type AuthRequest,
} from "./src/middleware/auth.ts";
import { getMandateById, INVESTMENT_MANDATES } from "./src/trading/tradingPage.ts";
import { createCustomerRouter } from "./src/routes/apiCustomer.ts";
import { createAdminRouter } from "./src/routes/apiAdmin.ts";
import { createSupportRouter } from "./src/routes/apiSupport.ts";
import { attachSupportWebSocketServer } from "./src/services/supportWebSocketServer.ts";
import {
  commitFirestoreWrites,
  decodeDocument,
  deleteFirestoreDoc,
  firestoreBaseUrl,
  getFirestoreDoc,
  patchFirestoreFields,
  runFirestoreQuery,
  type FirestoreDocument,
} from "./src/services/firestoreRestClient.ts";
import { validateUsername } from "./src/lib/username.ts";
import { enqueueMailEvent } from "./src/services/mailOutbox.ts";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };
import { queryDatabase } from "./src/db/pool.ts";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { betterAuthInstance } from "./src/lib/better-auth.ts";
import { requireBetterAuth, requireBetterAdmin, resolveBetterAuthRole, type BetterAuthRequest } from "./src/middleware/betterAuth.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
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

// Better Auth session endpoints. The existing Firebase-backed API remains in place during staged migration.
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
         ('public.audit_logs')
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
  try {
    const rows = await runFirestoreQuery("investmentPlans", null).catch(() => []);
    if (rows.length === 0) {
      res.json({ mandates: INVESTMENT_MANDATES });
      return;
    }
    const byId = new Map(INVESTMENT_MANDATES.map((m) => [m.id, m]));
    for (const r of rows) {
      if (r.published === false) {
        byId.delete(r.id);
        continue;
      }
      const category =
        r.category === "stock" || r.category === "estate" ? r.category : "crypto";
      byId.set(r.id, {
        id: r.id,
        category,
        categoryLabel: String(
          r.categoryLabel ??
            (category === "crypto"
              ? "Digital Assets"
              : category === "stock"
                ? "Global Equities"
                : "Real Estate")
        ),
        name: String(r.name ?? "Investment Mandate"),
        audience: String(r.audience ?? "Structured client allocation"),
        description: String(r.description ?? ""),
        minDeposit: Number(r.minDeposit ?? 500) || 500,
        maxDeposit: Number(r.maxDeposit ?? 50000) || 50000,
        dailyRatePct: Number(r.dailyRatePct ?? 1.5) || 1.5,
        ...(r.monthlyRatePct !== undefined ? { monthlyRatePct: Number(r.monthlyRatePct) } : {}),
        ...(r.referralBonusPct !== undefined ? { referralBonusPct: Number(r.referralBonusPct) } : {}),
        durationDays: Number(r.durationDays ?? 30) || 30,
        paymentFrequency: String(r.paymentFrequency ?? "Scheduled cycle distribution"),
        settlementRail: String(r.settlementRail ?? "USDT (TRC20) / Bank Wire"),
        image: String(r.image ?? "/images/hero_institutional_wealth.jpg"),
        returnTerms: String(r.returnTerms ?? ""),
        highlights: Array.isArray(r.highlights)
          ? r.highlights.map(String)
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

// Protected session verification endpoint (authoritative server-side token & role resolution)
app.get("/api/auth/session", requireAuth, async (req: AuthRequest, res) => {
  if (!req.user || !req.rawIdToken) {
    res.status(401).json({ error: "Unauthorized: Missing authenticated session." });
    return;
  }

  const session = await resolveSessionPayload(req.user, req.rawIdToken);
  res.json(session);
});

// Protected administrator verification endpoint (never trusts client-side role checks)
app.get("/api/auth/admin-check", requireAuth, requireAdmin, (req: AuthRequest, res) => {
  res.json({
    ok: true,
    uid: req.user?.uid,
    email: req.user?.email ?? null,
    isAdmin: true,
    role: "admin",
  });
});

// Server-side logout handshake
app.post("/api/auth/logout", (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.json({ ok: true, cleared: true });
});

app.post("/api/auth/registration-notice", requireAuth, async (req: AuthRequest, res) => {
  if (!req.user || !req.rawIdToken || !req.user.email) {
    res.status(401).json({ ok: false, error: "Authenticated email session required." });
    return;
  }

  try {
    const queued = await enqueueMailEvent({
      eventType: "client_registration",
      userId: req.user.uid,
      recipient: req.user.email,
      rawToken: req.rawIdToken,
      values: {
        firstName: String(req.user.name || req.user.email.split("@")[0]).split(" ")[0],
      },
    });
    res.status(queued ? 200 : 202).json({ ok: true, sent: queued, deliveryStatus: queued ? "accepted_by_resend" : "disabled" });
  } catch (error) {
    console.error("Registration mail event could not be queued:", error);
    res.status(502).json({ ok: false, sent: false, deliveryStatus: "failed" });
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

// Authenticated endpoint to reserve/update the caller's unique username in Firestore
app.post("/api/auth/claim-username", requireAuth, async (req: AuthRequest, res) => {
  if (!req.user || !req.rawIdToken) {
    res.status(401).json({ ok: false, error: "Unauthorized." });
    return;
  }

  const rawUsername = typeof req.body?.username === "string" ? req.body.username : "";
  const check = validateUsername(rawUsername);
  if (!check.valid) {
    res.status(400).json({ ok: false, error: check.error });
    return;
  }

  const username = check.normalized;
  const uid = req.user.uid;
  const rawToken = req.rawIdToken;
  const userEmail = String(req.user.email || "").trim().toLowerCase();

  if (!userEmail) {
    res.status(400).json({ ok: false, error: "Authenticated account email is required to claim a username." });
    return;
  }

  try {
    const existingTarget = await getFirestoreDoc("usernames", username, rawToken);
    if (existingTarget && String(existingTarget.uid ?? "") !== uid) {
      res.status(409).json({ ok: false, error: "This username is already taken. Please choose another." });
      return;
    }

    const ownedDocs = await runFirestoreQuery(
      "usernames",
      {
        fieldFilter: {
          field: { fieldPath: "uid" },
          op: "EQUAL",
          value: { stringValue: uid },
        },
      },
      rawToken
    ).catch(() => []);

    if (existingTarget) {
      await patchFirestoreFields(
        "usernames",
        username,
        { email: userEmail.slice(0, 200) },
        rawToken,
        ["email"],
        ["updatedAt"]
      );
    } else {
      await commitFirestoreWrites(
        [
          {
            collection: "usernames",
            docId: username,
            fields: {
              username,
              uid,
              email: userEmail.slice(0, 200),
            },
            serverTimestamps: ["createdAt", "updatedAt"],
            precondition: { exists: false },
          },
        ],
        rawToken
      );
    }

    for (const oldDoc of ownedDocs) {
      if (oldDoc.id !== username) {
        await deleteFirestoreDoc("usernames", oldDoc.id, rawToken).catch(() => undefined);
      }
    }

    if (req.user.email_verified) {
      const userDoc = await getFirestoreDoc("users", uid, rawToken).catch(() => null);
      if (userDoc) {
        await patchFirestoreFields(
          "users",
          uid,
          { username },
          rawToken,
          ["username"],
          ["updatedAt"]
        ).catch(() => undefined);
      }
    }

    res.json({ ok: true, username });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("403") || msg.includes("PERMISSION_DENIED")) {
      res.status(503).json({
        ok: false,
        rulesPendingDeploy: true,
        error:
          "Firestore security rules for usernames have not been deployed to Firebase Console yet.",
      });
      return;
    }
    console.error("Claim username failed:", err);
    res.status(500).json({ ok: false, error: "Unable to reserve username in database." });
  }
});

// Password-verified username lookup: verifies password with Firebase Auth before resolving login email
app.post("/api/auth/username-signin", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  const rawUsername = typeof req.body?.username === "string" ? req.body.username : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  const check = validateUsername(rawUsername);
  if (!check.valid || !password) {
    res.status(401).json({ ok: false, error: "Invalid username or password." });
    return;
  }

  try {
    const docUrl = `${firestoreBaseUrl()}/usernames/${encodeURIComponent(check.normalized)}?key=${encodeURIComponent(firebaseConfig.apiKey)}`;
    const lookupRes = await fetch(docUrl, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (lookupRes.status === 404) {
      res.status(401).json({ ok: false, error: "Invalid username or password." });
      return;
    }

    if (lookupRes.status === 403) {
      res.status(503).json({
        ok: false,
        rulesPendingDeploy: true,
        error:
          "Username lookup requires updated Firestore rules to be deployed in Firebase Console. Please sign in with your email address.",
      });
      return;
    }

    if (!lookupRes.ok) {
      res.status(502).json({ ok: false, error: "Unable to verify username credentials." });
      return;
    }

    const docJson = (await lookupRes.json()) as FirestoreDocument;
    const decoded = decodeDocument(docJson);
    const loginEmail = typeof decoded.email === "string" ? decoded.email.trim().toLowerCase() : "";

    if (!loginEmail) {
      res.status(401).json({ ok: false, error: "Invalid username or password." });
      return;
    }

    const authVerifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail,
          password,
          returnSecureToken: true,
        }),
        signal: AbortSignal.timeout(6000),
      }
    );

    if (!authVerifyRes.ok) {
      const errBody = (await authVerifyRes.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      const fbMsg = String(errBody.error?.message || "");
      if (fbMsg.includes("OPERATION_NOT_ALLOWED")) {
        res.status(400).json({
          ok: false,
          code: "auth/operation-not-allowed",
          error:
            "Email/Password authentication is not yet enabled in Firebase Console (Authentication -> Sign-in method).",
        });
        return;
      }
      if (fbMsg.includes("USER_DISABLED")) {
        res.status(403).json({
          ok: false,
          code: "auth/user-disabled",
          error: "This account has been disabled. Contact BitfuryTech support.",
        });
        return;
      }
      if (fbMsg.includes("TOO_MANY_ATTEMPTS")) {
        res.status(429).json({
          ok: false,
          code: "auth/too-many-requests",
          error: "Too many login attempts. Wait a moment or reset your password.",
        });
        return;
      }
      res.status(401).json({ ok: false, error: "Invalid username or password." });
      return;
    }

    res.json({ ok: true, email: loginEmail, username: check.normalized });
  } catch (err) {
    console.error("Username sign-in failed:", err);
    res.status(500).json({ ok: false, error: "Unable to complete username sign-in." });
  }
});

// Public contact inquiry endpoint backed by Firestore commit verification
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

  const inquiryId = `inq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const docPath = `projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/inquiries/${inquiryId}`;
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:commit?key=${encodeURIComponent(firebaseConfig.apiKey)}`;

  try {
    const firestoreRes = await fetch(commitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: docPath,
              fields: {
                name: { stringValue: name },
                email: { stringValue: email },
                topic: { stringValue: subject },
                message: { stringValue: message },
              },
            },
            updateTransforms: [
              {
                fieldPath: "createdAt",
                setToServerValue: "REQUEST_TIME",
              },
            ],
            currentDocument: {
              exists: false,
            },
          },
        ],
      }),
    });

    if (!firestoreRes.ok) {
      const errText = await firestoreRes.text();
      console.error("Firestore inquiry commit failed:", firestoreRes.status, errText);
      res.status(502).json({
        ok: false,
        error: "Unable to confirm inquiry persistence with the server. Please try again.",
      });
      return;
    }

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

// Public newsletter subscription endpoint backed by Firestore commit verification
app.post("/api/newsletter", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || email.length < 3 || email.length > 200 || !emailRegex.test(email)) {
    res.status(400).json({ ok: false, error: "Provide a valid email address." });
    return;
  }

  const subscriptionId = `news_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const docPath = `projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/inquiries/${subscriptionId}`;
  const commitUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:commit?key=${encodeURIComponent(firebaseConfig.apiKey)}`;

  try {
    const firestoreRes = await fetch(commitUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        writes: [
          {
            update: {
              name: docPath,
              fields: {
                name: { stringValue: "Newsletter Subscriber" },
                email: { stringValue: email },
                topic: { stringValue: "Newsletter Subscription" },
                message: {
                  stringValue:
                    "Subscribed to BitfuryTech institutional briefings, mandate announcements, and property releases.",
                },
              },
            },
            updateTransforms: [
              {
                fieldPath: "createdAt",
                setToServerValue: "REQUEST_TIME",
              },
            ],
            currentDocument: {
              exists: false,
            },
          },
        ],
      }),
    });

    if (!firestoreRes.ok) {
      res.status(502).json({
        ok: false,
        error: "Unable to confirm newsletter subscription with the server right now.",
      });
      return;
    }

    res.status(201).json({
      ok: true,
      subscriptionId,
      subscribedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Newsletter subscription error:", err);
    res.status(500).json({
      ok: false,
      error: "Unable to save newsletter subscription right now.",
    });
  }
});

/** Better Auth protected admin landing data, registered ahead of the legacy Firebase router. */
app.get("/api/admin/overview", requireBetterAuth, requireBetterAdmin, async (_req: BetterAuthRequest, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  try {
    const [users, active, invested, pendingD, pendingW, amountD, amountW, newUsers, properties, inquiries, recentTx, audit] = await Promise.all([
      queryDatabase("SELECT COUNT(*)::text AS count FROM \"user\""),
      queryDatabase("SELECT COUNT(*)::text AS count FROM investments WHERE lower(status) = 'active'"),
      queryDatabase("SELECT COALESCE(SUM(principal), 0)::text AS total FROM investments"),
      queryDatabase("SELECT COUNT(*)::text AS count FROM transactions WHERE lower(type) = 'deposit' AND lower(status) IN ('pending','processing')"),
      queryDatabase("SELECT COUNT(*)::text AS count FROM transactions WHERE lower(type) = 'withdrawal' AND lower(status) IN ('pending','processing')"),
      queryDatabase("SELECT COALESCE(SUM(amount), 0)::text AS total FROM transactions WHERE lower(type) = 'deposit' AND lower(status) IN ('pending','processing')"),
      queryDatabase("SELECT COALESCE(SUM(amount), 0)::text AS total FROM transactions WHERE lower(type) = 'withdrawal' AND lower(status) IN ('pending','processing')"),
      queryDatabase("SELECT COUNT(*)::text AS count FROM \"user\" WHERE \"createdAt\" >= now() - interval '7 days'"),
      queryDatabase("SELECT COUNT(*)::text AS count FROM properties"),
      queryDatabase("SELECT COUNT(*)::text AS count FROM inquiries"),
      queryDatabase("SELECT t.id, u.email, t.type, t.method, t.amount::text, t.reference, t.status, t.created_at FROM transactions t JOIN \"user\" u ON u.id = t.user_id ORDER BY t.created_at DESC LIMIT 10"),
      queryDatabase("SELECT id::text, action, target_type, target_id, details, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 8")
    ]);
    const n = (v: unknown) => Number(v || 0);
    res.json({
      stats: { totalCustomers: n(users.rows[0]?.count), activeInvestmentsCount: n(active.rows[0]?.count), totalInvested: n(invested.rows[0]?.total), pendingDepositsCount: n(pendingD.rows[0]?.count), pendingDepositsAmount: n(amountD.rows[0]?.total), pendingWithdrawalsCount: n(pendingW.rows[0]?.count), pendingWithdrawalsAmount: n(amountW.rows[0]?.total), newRegistrations: n(newUsers.rows[0]?.count), propertiesCount: n(properties.rows[0]?.count), inquiriesCount: n(inquiries.rows[0]?.count) },
      recentTransactions: recentTx.rows.map((t: any) => ({ id: t.id, userEmail: t.email, type: t.type, method: t.method || "", amount: n(t.amount), reference: t.reference || "", status: t.status, createdAt: t.created_at })),
      recentAuditLogs: audit.rows.map((a: any) => ({ id: a.id, actorEmail: "Administrator", action: a.action, targetType: a.target_type, targetId: a.target_id || "", summary: typeof a.details === "string" ? a.details : JSON.stringify(a.details || {}), createdAt: a.created_at }))
    });
  } catch (error) {
    console.error("Neon admin overview failed:", error);
    res.status(503).json({ error: "Unable to load administrator overview from Neon." });
  }
});

// Modular Support, Customer & Admin API routers
app.use("/api", createSupportRouter());
app.use("/api", createCustomerRouter());
app.use("/api/admin", createAdminRouter());

async function startServer() {
  const httpServer = http.createServer(app);
  attachSupportWebSocketServer(httpServer);

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === "true" ? false : { server: httpServer },
      },
      appType: "spa",
    });
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
  });
}

startServer().catch((err) => {
  console.error("Failed to start BitfuryTech server:", err);
  process.exit(1);
});
