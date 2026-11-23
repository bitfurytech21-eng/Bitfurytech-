import { Router } from "express";
import { randomUUID } from "node:crypto";
import type pg from "pg";
import { requireBetterAuth, requireBetterVerifiedEmail, type BetterAuthRequest } from "../middleware/betterAuth.ts";
import { databasePool, isDatabaseConfigured } from "../db/pool.ts";
import { enqueueMailEvent } from "../services/mailOutbox.ts";
import { INVESTMENT_MANDATES, type InvestmentMandate } from "../trading/tradingPage.ts";
import {
  createMockDeposit,
  createMockInvestmentPurchase,
  createMockWithdrawal,
  getMockCatalog,
} from "../services/inMemoryFinancialMock.ts";

const DEPOSIT_RAILS = [
  { id: "USDT (TRC20)", label: "USDT (TRC20)", currency: "USDT / USD", network: "TRON (TRC20)", minDeposit: 100, instructions: "Transmit USDT strictly on the TRON (TRC20) network to the BitfuryTech custody treasury address, then submit the exact transfer hash for settlement verification.", custodyDestination: "BitfuryTech Custody Desk — TRON TRC20 Treasury", confirmationInfo: "Balance credits only after settlement desk review confirms network finality and matching reference." },
  { id: "Bitcoin (BTC)", label: "Bitcoin (BTC)", currency: "BTC / USD Equivalent", network: "Bitcoin Mainnet", minDeposit: 250, instructions: "Transfer BTC via Bitcoin Mainnet and enter your transaction ID (TXID). USD credit is calculated at verified settlement review.", custodyDestination: "BitfuryTech Custody Desk — Cold Reserve BTC", confirmationInfo: "Requires minimum 3 mainnet confirmations and manual settlement desk sign-off." },
  { id: "Ethereum (ETH)", label: "Ethereum (ETH)", currency: "ETH / USD Equivalent", network: "Ethereum Mainnet (ERC20)", minDeposit: 250, instructions: "Send ETH on Ethereum Mainnet and record your transaction hash below. Do not use unsupported layer-2 bridges without prior desk notice.", custodyDestination: "BitfuryTech Custody Desk — ETH Multi-Sig", confirmationInfo: "Requires 12 block confirmations and settlement verification prior to ledger credit." },
  { id: "Bank Wire", label: "Bank Wire", currency: "USD", network: "SWIFT / Fedwire", minDeposit: 1000, instructions: "Initiate an institutional wire quoting your BitfuryTech account email and wire reference number in the beneficiary memo.", custodyDestination: "BitfuryTech Corporate Settlement Account", confirmationInfo: "Typically clears within 1–3 business days after incoming bank reconciliation." },
] as const;
const WITHDRAWAL_CONFIG = { minWithdrawal: 50, maxSingleWithdrawal: 250000, feeRatePct: 1, minFeeUsd: 2, currency: "USD", supportedRails: DEPOSIT_RAILS.map((rail) => rail.label) };
const INVESTMENT_FEE_PCT = 0.5;

function httpError(message: string, statusCode: number, code?: string) {
  return Object.assign(new Error(message), { statusCode, code });
}
function cleanText(value: unknown, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function money(value: number): number {
  return Number(value.toFixed(2));
}
function makeReference(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 6).toUpperCase()}`;
}
function userOf(req: BetterAuthRequest) {
  const user = req.betterAuthSession?.user;
  if (!user?.id) throw httpError("Authentication required.", 401);
  return user;
}
async function startIdempotent(client: pg.PoolClient, userId: string, operation: "deposit_request" | "withdrawal_request" | "investment_request", key: string) {
  await client.query(
    "INSERT INTO financial_idempotency(user_id,idempotency_key,operation) VALUES($1,$2,$3) ON CONFLICT(user_id,idempotency_key) DO NOTHING",
    [userId, key, operation]
  );
  const row = await client.query(
    "SELECT operation,response FROM financial_idempotency WHERE user_id=$1 AND idempotency_key=$2 FOR UPDATE",
    [userId, key]
  );
  if (row.rows[0]?.operation !== operation) throw httpError("This idempotency key was already used for a different financial operation.", 409);
  if (row.rows[0]?.response) return row.rows[0].response;
  const pending = await client.query(
    "SELECT id FROM transactions WHERE user_id=$1 AND idempotency_key=$2 LIMIT 1",
    [userId, `${userId}:${key}`]
  );
  if (pending.rowCount) throw httpError("This financial request is already being processed.", 409);
  return null;
}
async function finishIdempotent(client: pg.PoolClient, userId: string, key: string, response: unknown) {
  await client.query(
    "UPDATE financial_idempotency SET response=$3::jsonb WHERE user_id=$1 AND idempotency_key=$2",
    [userId, key, JSON.stringify(response)]
  );
}
async function withFinancialTransaction<T>(work: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  if (!databasePool) throw new Error("Neon database is unavailable.");
  const client = await databasePool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
async function ensureWallet(client: pg.PoolClient, userId: string) {
  await client.query(
    "INSERT INTO wallets(user_id,currency) VALUES($1,'USD') ON CONFLICT(user_id,currency) DO NOTHING",
    [userId]
  );
  const result = await client.query(
    "SELECT available_balance,reserved_balance FROM wallets WHERE user_id=$1 AND currency='USD' FOR UPDATE",
    [userId]
  );
  return result.rows[0] ?? { available_balance: 0, reserved_balance: 0 };
}
async function assertAccountAllowed(client: pg.PoolClient, userId: string, operation: string) {
  const result = await client.query("SELECT account_status FROM user_profiles WHERE user_id=$1", [userId]);
  if (String(result.rows[0]?.account_status ?? "Active") === "Suspended") {
    throw httpError(`Account ${operation} are currently restricted. Contact support.`, 403);
  }
}

export function createBetterAuthFinancialRouter(): Router {
  const router = Router();
  router.use(requireBetterAuth, requireBetterVerifiedEmail);

  router.get("/deposits/methods", (_req, res) => res.json({ methods: DEPOSIT_RAILS }));
  router.get("/withdrawals/config", (_req, res) => res.json(WITHDRAWAL_CONFIG));

  router.get("/investments/catalog", async (_req, res) => {
    if (!isDatabaseConfigured) {
      res.setHeader("Cache-Control", "no-store");
      res.json(getMockCatalog(INVESTMENT_FEE_PCT));
      return;
    }
    try {
      const plansResult = await databasePool!.query(
        "SELECT id,name,category,description,min_deposit,max_deposit,daily_rate_pct,duration_days,plan_data FROM investment_plans WHERE published=true ORDER BY created_at DESC"
      );
      const plansById = new Map<string, InvestmentMandate>();
      const availabilityById = new Map<string, "Open" | "Paused" | "Closed">();
      for (const mandate of INVESTMENT_MANDATES) { plansById.set(mandate.id, mandate); availabilityById.set(mandate.id, "Open"); }
      for (const row of plansResult.rows) {
        const data = row.plan_data && typeof row.plan_data === "object" ? row.plan_data as Record<string, unknown> : {};
        const availabilityStatus = data.availabilityStatus === "Paused" || data.availabilityStatus === "Closed" ? data.availabilityStatus : "Open";
        availabilityById.set(String(row.id), availabilityStatus);
        plansById.set(String(row.id), {
          id: String(row.id), name: String(row.name), category: row.category === "stock" || row.category === "estate" ? row.category : "crypto",
          categoryLabel: String(data.categoryLabel ?? row.category), audience: String(data.audience ?? ""),
          description: String(row.description ?? ""), minDeposit: Number(row.min_deposit), maxDeposit: row.max_deposit == null ? Number.MAX_SAFE_INTEGER : Number(row.max_deposit),
          dailyRatePct: Number(row.daily_rate_pct ?? 0), durationDays: Number(row.duration_days), paymentFrequency: String(data.paymentFrequency ?? ""),
          settlementRail: String(data.settlementRail ?? "USD"), image: String(data.image ?? ""), returnTerms: String(data.returnTerms ?? row.description ?? ""),
          highlights: Array.isArray(data.highlights) ? data.highlights.map(String) : [],
        });
      }
      const propertiesResult = await databasePool!.query(
        "SELECT id,title,location,asset_type,target_yield_pct,minimum_entry,valuation,occupancy_pct,status,image_url,summary,property_data FROM properties WHERE COALESCE((property_data->>'published')::boolean,true)=true ORDER BY created_at DESC"
      );
      const properties = propertiesResult.rows.map((row) => ({
        id: String(row.id), title: String(row.title), location: String(row.location), assetType: String(row.asset_type),
        targetYieldPct: Number(row.target_yield_pct ?? 0), minEntry: Number(row.minimum_entry ?? 1000),
        valuation: Number(row.valuation ?? 0), occupancyPct: Number(row.occupancy_pct ?? 0), status: String(row.status),
        image: String(row.image_url ?? "/images/commercial-property.jpg"), summary: String(row.summary ?? ""),
      }));
      res.setHeader("Cache-Control", "no-store");
      res.json({ plans: [...plansById.values()].map((plan) => ({ ...plan, availabilityStatus: availabilityById.get(plan.id) ?? "Open", published: true, unitPrice: plan.minDeposit })), properties, feeRatePct: INVESTMENT_FEE_PCT });
    } catch (error) {
      console.error("Neon investment catalog failed:", error);
      res.status(503).json({ error: "Unable to load investment offerings from Neon." });
    }
  });

  router.post("/deposits", async (req: BetterAuthRequest, res) => {
    const user = userOf(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const method = cleanText(body.method, 100);
    const amount = Number(body.amount);
    const referenceInput = cleanText(body.reference, 120).replace(/[^a-zA-Z0-9_-]/g, "");
    const key = cleanText(body.idempotencyKey, 128);
    const rail = DEPOSIT_RAILS.find((item) => item.id === method || item.label === method);
    if (!rail) { res.status(400).json({ error: "Selected payment method is not supported." }); return; }
    if (!key || key.length < 8) { res.status(400).json({ error: "A valid idempotency key is required." }); return; }
    if (!Number.isFinite(amount) || amount < rail.minDeposit || amount > 10_000_000) { res.status(400).json({ error: `Deposit amount for ${rail.label} must be at least $${rail.minDeposit.toLocaleString()}.` }); return; }
    if (!isDatabaseConfigured) {
      const reference = referenceInput.slice(0, 64) || makeReference("DEP");
      const result = createMockDeposit({
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        method: rail.label,
        currency: rail.currency,
        custodyDestination: rail.custodyDestination,
        instructions: rail.instructions,
        confirmationInfo: rail.confirmationInfo,
        amount,
        reference,
        idempotencyKey: key,
      });
      res.status(result.duplicate ? 200 : 201).json(result.response);
      return;
    }
    try {
      const result = await withFinancialTransaction(async (client) => {
        await assertAccountAllowed(client, user.id, "deposit");
        const existing = await startIdempotent(client, user.id, "deposit_request", key);
        if (existing) return { response: existing, duplicate: true };
        const id = randomUUID();
        const reference = referenceInput.slice(0, 64) || makeReference("DEP");
        const normalizedAmount = money(amount);
        const response = { ok: true, deposit: { id, reference, method: rail.label, currency: rail.currency, amount: normalizedAmount, status: "Pending", instructions: rail.instructions, confirmationInfo: rail.confirmationInfo, createdAt: new Date().toISOString() } };
        await client.query(
          "INSERT INTO transactions(id,user_id,type,amount,currency,method,destination,reference,status,idempotency_key,metadata) VALUES($1,$2,'deposit',$3,'USD',$4,$5,$6,'pending',$7,$8::jsonb)",
          [id, user.id, normalizedAmount, rail.label, rail.custodyDestination, reference, `${user.id}:${key}`, JSON.stringify({ rail: rail.id, submittedReference: referenceInput || null, confirmationInfo: rail.confirmationInfo })]
        );
        await client.query(
          "INSERT INTO financial_audit_log(actor_user_id,subject_user_id,action,entity_type,entity_id,details) VALUES($1,$1,'CUSTOMER_DEPOSIT_REQUEST','transaction',$2,$3::jsonb)",
          [user.id, id, JSON.stringify({ amount: normalizedAmount, method: rail.label, reference })]
        );
        await client.query(
          "INSERT INTO notifications(id,user_id,category,title,body) VALUES($1,$2,'deposit','Deposit request received',$3)",
          [randomUUID(), user.id, `Your ${rail.label} deposit request for $${normalizedAmount.toFixed(2)} is awaiting verification.`]
        );
        await finishIdempotent(client, user.id, key, response);
        return { response, duplicate: false };
      });
      if (!result.duplicate) {
        await enqueueMailEvent({ eventType: "deposit_initiated", userId: user.id, recipient: user.email, values: { firstName: String(user.name || user.email).split(/[ @]/)[0], amount: `$${money(amount).toFixed(2)}`, method: rail.label, reference: result.response.deposit.reference, status: "Pending" } }).catch((error) => console.error("Deposit mail event failed:", error));
      }
      res.status(result.duplicate ? 200 : 201).json(result.response);
    } catch (error) {
      const status = Number((error as { statusCode?: number }).statusCode) || 502;
      res.status(status).json({ error: error instanceof Error ? error.message : "Unable to record deposit request." });
    }
  });

  router.post("/withdrawals", async (req: BetterAuthRequest, res) => {
    const user = userOf(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const method = cleanText(body.method, 100);
    const amount = Number(body.amount);
    const destination = cleanText(body.destination, 160);
    const accountDetails = cleanText(body.accountDetails, 160);
    const key = cleanText(body.idempotencyKey, 128);
    if (body.confirmed !== true) { res.status(400).json({ error: "Explicit withdrawal confirmation is required." }); return; }
    if (!WITHDRAWAL_CONFIG.supportedRails.some((rail) => rail === method)) { res.status(400).json({ error: "Unsupported payout rail selected." }); return; }
    if (!key || key.length < 8) { res.status(400).json({ error: "A valid idempotency key is required." }); return; }
    if (!Number.isFinite(amount) || amount < WITHDRAWAL_CONFIG.minWithdrawal || amount > WITHDRAWAL_CONFIG.maxSingleWithdrawal) { res.status(400).json({ error: "Withdrawal amount is outside the permitted range." }); return; }
    if (destination.length < 4) { res.status(400).json({ error: "Provide a valid destination wallet or bank beneficiary." }); return; }
    const requested = money(amount);
    const fee = money(Math.max(WITHDRAWAL_CONFIG.minFeeUsd, requested * WITHDRAWAL_CONFIG.feeRatePct / 100));
    const netPayout = money(Math.max(0, requested - fee));
    const combinedDestination = accountDetails ? `${destination} (${accountDetails})`.slice(0, 200) : destination;
    if (!isDatabaseConfigured) {
      try {
        const result = createMockWithdrawal({
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          method,
          amount: requested,
          fee,
          netPayout,
          destination: combinedDestination,
          reference: makeReference("WDR"),
          idempotencyKey: key,
        });
        res.status(result.duplicate ? 200 : 201).json(result.response);
      } catch (error) {
        const status = Number((error as { statusCode?: number }).statusCode) || 400;
        res.status(status).json({ error: error instanceof Error ? error.message : "Unable to record withdrawal request.", code: (error as { code?: string }).code });
      }
      return;
    }
    try {
      const result = await withFinancialTransaction(async (client) => {
        await assertAccountAllowed(client, user.id, "withdrawal");
        const existing = await startIdempotent(client, user.id, "withdrawal_request", key);
        if (existing) return { response: existing, duplicate: true };
        const wallet = await ensureWallet(client, user.id);
        const available = Number(wallet.available_balance ?? 0);
        if (requested > available) throw httpError(`Withdrawal amount ($${requested.toFixed(2)}) exceeds available balance ($${available.toFixed(2)}).`, 400, "INSUFFICIENT_FUNDS");
        const id = randomUUID();
        const reference = makeReference("WDR");
        const response = { ok: true, withdrawal: { id, reference, method, amount: requested, fee, netPayout, destination: combinedDestination, status: "Pending", createdAt: new Date().toISOString() } };
        await client.query("UPDATE wallets SET available_balance=available_balance-$2,reserved_balance=reserved_balance+$2,updated_at=now() WHERE user_id=$1 AND currency='USD'", [user.id, requested]);
        await client.query(
          "INSERT INTO transactions(id,user_id,type,amount,currency,method,destination,reference,status,idempotency_key,metadata) VALUES($1,$2,'withdrawal',$3,'USD',$4,$5,$6,'pending',$7,$8::jsonb)",
          [id, user.id, requested, method, combinedDestination, reference, `${user.id}:${key}`, JSON.stringify({ fee, netPayout, accountDetails: accountDetails || null })]
        );
        await client.query(
          "INSERT INTO ledger_entries(transaction_id,user_id,account_code,direction,amount,currency,memo) VALUES($1,$2,'customer_available','debit',$3,'USD','Withdrawal funds reserved'),($1,$2,'customer_reserved','credit',$3,'USD','Withdrawal funds reserved')",
          [id, user.id, requested]
        );
        await client.query(
          "INSERT INTO financial_audit_log(actor_user_id,subject_user_id,action,entity_type,entity_id,details) VALUES($1,$1,'CUSTOMER_WITHDRAWAL_REQUEST','transaction',$2,$3::jsonb)",
          [user.id, id, JSON.stringify({ amount: requested, fee, netPayout, method })]
        );
        await client.query("INSERT INTO notifications(id,user_id,category,title,body) VALUES($1,$2,'withdrawal','Withdrawal request received',$3)", [randomUUID(), user.id, `Your withdrawal request for $${requested.toFixed(2)} is awaiting review.`]);
        await finishIdempotent(client, user.id, key, response);
        return { response, duplicate: false };
      });
      if (!result.duplicate) {
        await enqueueMailEvent({ eventType: "withdrawal_initiated", userId: user.id, recipient: user.email, values: { firstName: String(user.name || user.email).split(" ")[0], amount: `$${requested.toFixed(2)}`, method, reference: result.response.withdrawal.reference, status: "Pending" } }).catch((error) => console.error("Withdrawal mail event failed:", error));
      }
      res.status(result.duplicate ? 200 : 201).json(result.response);
    } catch (error) {
      const status = Number((error as { statusCode?: number }).statusCode) || 502;
      res.status(status).json({ error: error instanceof Error ? error.message : "Unable to record withdrawal request.", code: (error as { code?: string }).code });
    }
  });

  router.post("/investments/purchase", async (req: BetterAuthRequest, res) => {
    const user = userOf(req);
    const body = (req.body ?? {}) as Record<string, unknown>;
    const targetType = body.targetType === "property" ? "property" : "plan";
    const targetId = cleanText(body.targetId, 100);
    const amountInput = body.amount == null ? null : Number(body.amount);
    const amountBased = amountInput !== null;
    const units = amountBased ? 1 : Number(body.units);
    const key = cleanText(body.idempotencyKey, 128);
    if (body.confirmed !== true) { res.status(400).json({ error: "Explicit investment confirmation is required." }); return; }
    if (!targetId) { res.status(400).json({ error: "Select an investment plan or property offering." }); return; }
    if (!key || key.length < 8) { res.status(400).json({ error: "A valid idempotency key is required." }); return; }
    if (amountBased && (!Number.isFinite(amountInput) || Number(amountInput) <= 0 || Number(amountInput) > 10_000_000)) { res.status(400).json({ error: "Enter a valid investment amount." }); return; }
    if (!amountBased && (!Number.isInteger(units) || units < 1 || units > 1000)) { res.status(400).json({ error: "Units must be a whole number between 1 and 1,000." }); return; }

    if (!isDatabaseConfigured) {
      try {
        const result = createMockInvestmentPurchase({
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          targetType,
          targetId,
          amountInput,
          units,
          feeRatePct: INVESTMENT_FEE_PCT,
          reference: makeReference("INV"),
          idempotencyKey: key,
        });
        res.status(result.duplicate ? 200 : 201).json(result.response);
      } catch (error) {
        const status = Number((error as { statusCode?: number }).statusCode) || 400;
        res.status(status).json({ error: error instanceof Error ? error.message : "Unable to complete investment purchase.", code: (error as { code?: string }).code });
      }
      return;
    }

    try {
      const result = await withFinancialTransaction(async (client) => {
        await assertAccountAllowed(client, user.id, "investment allocations");
        const existing = await startIdempotent(client, user.id, "investment_request", key);
        if (existing) return { response: existing, duplicate: true };
        let planId: string | null = null;
        let plan: InvestmentMandate | null = null;
        let planName = "";
        let category = "crypto";
        let unitPrice = 0;
        let maxCap = Number.MAX_SAFE_INTEGER;
        let dailyRatePct = 0;
        let durationDays = 30;
        let paymentFrequency = "At maturity";
        let settlementRail = "USD";
        let termsSummary = "";
        let propertyId: string | null = null;
        if (targetType === "property") {
          const property = await client.query("SELECT id,title,location,target_yield_pct,minimum_entry,status,property_data FROM properties WHERE id=$1", [targetId]);
          const row = property.rows[0];
          const propertyData = row?.property_data && typeof row.property_data === "object" ? row.property_data as Record<string, unknown> : {};
          if (!row || propertyData.published === false) throw httpError("Selected property offering was not found.", 404);
          if (String(row.status) !== "Open") throw httpError("This property offering is currently fully subscribed or closed.", 400);
          propertyId = String(row.id);
          planName = String(row.title);
          category = "estate";
          unitPrice = Number(row.minimum_entry ?? 1000);
          dailyRatePct = Math.max(0.1, Number(((Number(row.target_yield_pct ?? 8.5) || 8.5) / 30).toFixed(2)));
          durationDays = 60;
          termsSummary = `Asset-backed participation in ${planName} (${String(row.location ?? "")}). Indicative annualized target ${String(row.target_yield_pct ?? 0)}%; distributions are not guaranteed.`;
        } else {
          const dbPlan = await client.query("SELECT id,name,category,min_deposit,max_deposit,daily_rate_pct,duration_days,description,plan_data FROM investment_plans WHERE id=$1 AND published=true", [targetId]);
          if (dbPlan.rows[0]) {
            const row = dbPlan.rows[0];
            const data = row.plan_data && typeof row.plan_data === "object" ? row.plan_data as Record<string, unknown> : {};
            const availabilityStatus = data.availabilityStatus === "Paused" || data.availabilityStatus === "Closed" ? data.availabilityStatus : "Open";
            if (availabilityStatus !== "Open") throw httpError(`${String(row.name)} is currently ${availabilityStatus.toLowerCase()} for new allocations.`, 400);
            planId = String(row.id); planName = String(row.name); category = String(row.category);
            unitPrice = Number(row.min_deposit); maxCap = row.max_deposit == null ? Number.MAX_SAFE_INTEGER : Number(row.max_deposit);
            dailyRatePct = Number(row.daily_rate_pct ?? 0); durationDays = Number(row.duration_days);
            paymentFrequency = String(data.paymentFrequency ?? "At maturity");
            settlementRail = String(data.settlementRail ?? "USD");
            termsSummary = String(data.returnTerms ?? row.description ?? "");
          } else {
            plan = INVESTMENT_MANDATES.find((item) => item.id === targetId) ?? null;
            if (!plan) throw httpError("Selected investment plan does not exist.", 404);
            planId = null; planName = plan.name; category = plan.category;
            unitPrice = plan.minDeposit; maxCap = plan.maxDeposit; dailyRatePct = plan.dailyRatePct;
            durationDays = plan.durationDays; paymentFrequency = plan.paymentFrequency || "At maturity"; settlementRail = plan.settlementRail || "USD"; termsSummary = plan.returnTerms;
          }
        }
        const principal = money(amountBased ? Number(amountInput) : units * unitPrice);
        const feeAmount = money(principal * INVESTMENT_FEE_PCT / 100);
        const totalCost = money(principal + feeAmount);
        if (!(unitPrice > 0) || principal < unitPrice) throw httpError("Investment amount is below the minimum entry.", 400);
        if (principal > maxCap) throw httpError(`Maximum allocation cap for ${planName} is $${maxCap.toLocaleString()}.`, 400);
        const wallet = await ensureWallet(client, user.id);
        const available = Number(wallet.available_balance ?? 0);
        if (totalCost > available) throw httpError(`Insufficient custody wallet balance. Required $${totalCost.toFixed(2)}, available $${available.toFixed(2)}.`, 400, "INSUFFICIENT_FUNDS");
        const investmentId = randomUUID();
        const transactionId = randomUUID();
        const reference = makeReference("INV");
        const snapshot = { name: planName, category, categoryLabel: category === "estate" ? "Real Estate" : category === "stock" ? "Global Equities" : "Digital Assets", dailyRatePct, durationDays, paymentFrequency, settlementRail, returnTerms: termsSummary, propertyId };
        await client.query("UPDATE wallets SET available_balance=available_balance-$2,updated_at=now() WHERE user_id=$1 AND currency='USD'", [user.id, totalCost]);
        await client.query(
          "INSERT INTO investments(id,user_id,plan_id,plan_snapshot,principal,currency,status,started_at,matures_at) VALUES($1,$2,$3,$4::jsonb,$5,'USD','active',now(),now()+($6::text||' days')::interval)",
          [investmentId, user.id, planId, JSON.stringify(snapshot), principal, durationDays]
        );
        await client.query(
          "INSERT INTO transactions(id,user_id,type,amount,currency,method,destination,reference,status,idempotency_key,metadata) VALUES($1,$2,'investment',$3,'USD',$4,$5,$6,'completed',$7,$8::jsonb)",
          [transactionId, user.id, totalCost, planName, propertyId ?? planId ?? "", reference, `${user.id}:${key}`, JSON.stringify({ investmentId, principal, feeAmount, units, unitPrice, targetType })]
        );
        await client.query(
          "INSERT INTO ledger_entries(transaction_id,user_id,account_code,direction,amount,currency,memo) VALUES($1,$2,'customer_available','debit',$3,'USD','Investment allocation and fee'),($1,$2,'platform_custody','credit',$3,'USD','Investment allocation and fee')",
          [transactionId, user.id, totalCost]
        );
        await client.query(
          "INSERT INTO financial_audit_log(actor_user_id,subject_user_id,action,entity_type,entity_id,details) VALUES($1,$1,'CUSTOMER_INVESTMENT_PURCHASE','investment',$2,$3::jsonb)",
          [user.id, investmentId, JSON.stringify({ principal, feeAmount, totalCost, planName, targetType })]
        );
        await client.query("INSERT INTO notifications(id,user_id,category,title,body) VALUES($1,$2,'investment','Investment allocation confirmed',$3)", [randomUUID(), user.id, `Your allocation in ${planName} has been recorded.`]);
        const response = { ok: true, receipt: { reference, investmentId, transactionId, planId: planId ?? propertyId ?? targetId, planName, category, units, unitPrice: amountBased ? principal : unitPrice, principal, feeAmount, totalCost, currency: "USD", newWalletBalance: money(available - totalCost), termsSummary, createdAt: new Date().toISOString() } };
        await finishIdempotent(client, user.id, key, response);
        return { response, duplicate: false };
      });
      if (!result.duplicate) {
        await enqueueMailEvent({ eventType: "investment_confirmed", userId: user.id, recipient: user.email, values: { firstName: String(user.name || user.email).split(" ")[0], amount: `$${result.response.receipt.totalCost.toFixed(2)}`, plan: result.response.receipt.planName, reference: result.response.receipt.reference, status: "Completed" } }).catch((error) => console.error("Investment mail event failed:", error));
      }
      res.status(result.duplicate ? 200 : 201).json(result.response);
    } catch (error) {
      const status = Number((error as { statusCode?: number }).statusCode) || 502;
      res.status(status).json({ error: error instanceof Error ? error.message : "Unable to complete investment purchase.", code: (error as { code?: string }).code });
    }
  });

  return router;
}
