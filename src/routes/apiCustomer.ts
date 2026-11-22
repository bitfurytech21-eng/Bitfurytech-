import { Router } from "express";
import {
  requireAuth,
  requireVerifiedEmail,
  type AuthRequest,
} from "../middleware/auth.ts";
import {
  getAuthenticatedCustomerInvestments,
  getAuthenticatedDashboardOverview,
} from "../services/serverDashboardService.ts";
import {
  commitFirestoreWrites,
  deleteFirestoreDoc,
  encodeValue,
  firestoreBaseUrl,
  firestoreRootPath,
  getFirestoreDoc,
  makeDocId,
  patchFirestoreFields,
  runFirestoreQuery,
  safeAuxCommit,
  type CommitWriteOp,
  type FirestoreValue,
} from "../services/firestoreRestClient.ts";
import { validateUsername } from "../lib/username.ts";
import {
  acquireInFlightLock,
  getCachedIdempotentResult,
  normalizeIdempotencyKey,
  releaseInFlightLock,
  saveIdempotentResult,
} from "../services/idempotencyService.ts";
import { enqueueMailEvent } from "../services/mailOutbox.ts";
import {
  getMandateById,
  INVESTMENT_MANDATES,
  type InvestmentMandate,
} from "../trading/tradingPage.ts";

export interface DepositRailConfig {
  id: string;
  label: string;
  currency: string;
  network: string;
  minDeposit: number;
  instructions: string;
  custodyDestination: string;
  confirmationInfo: string;
}

export const DEPOSIT_RAILS: DepositRailConfig[] = [
  {
    id: "USDT (TRC20)",
    label: "USDT (TRC20)",
    currency: "USDT / USD",
    network: "TRON (TRC20)",
    minDeposit: 100,
    instructions:
      "Transmit USDT strictly on the TRON (TRC20) network to the BitfuryTech custody treasury address, then submit the exact transfer hash for settlement verification.",
    custodyDestination: "BitfuryTech Custody Desk — TRON TRC20 Treasury",
    confirmationInfo:
      "Balance credits only after settlement desk review confirms network finality and matching reference.",
  },
  {
    id: "Bitcoin (BTC)",
    label: "Bitcoin (BTC)",
    currency: "BTC / USD Equivalent",
    network: "Bitcoin Mainnet",
    minDeposit: 250,
    instructions:
      "Transfer BTC via Bitcoin Mainnet and enter your transaction ID (TXID). USD credit is calculated at verified settlement review.",
    custodyDestination: "BitfuryTech Custody Desk — Cold Reserve BTC",
    confirmationInfo:
      "Requires minimum 3 mainnet confirmations and manual settlement desk sign-off.",
  },
  {
    id: "Ethereum (ETH)",
    label: "Ethereum (ETH)",
    currency: "ETH / USD Equivalent",
    network: "Ethereum Mainnet (ERC20)",
    minDeposit: 250,
    instructions:
      "Send ETH on Ethereum Mainnet and record your transaction hash below. Do not use unsupported layer-2 bridges without prior desk notice.",
    custodyDestination: "BitfuryTech Custody Desk — ETH Multi-Sig",
    confirmationInfo:
      "Requires 12 block confirmations and settlement verification prior to ledger credit.",
  },
  {
    id: "Bank Wire",
    label: "Bank Wire",
    currency: "USD",
    network: "SWIFT / Fedwire",
    minDeposit: 1000,
    instructions:
      "Initiate an institutional wire quoting your BitfuryTech account email and wire reference number in the beneficiary memo.",
    custodyDestination: "BitfuryTech Corporate Settlement Account",
    confirmationInfo:
      "Typically clears within 1–3 business days after incoming bank reconciliation.",
  },
];

export const WITHDRAWAL_CONFIG = {
  minWithdrawal: 50,
  maxSingleWithdrawal: 250000,
  feeRatePct: 1.0,
  minFeeUsd: 2.0,
  currency: "USD",
  supportedRails: DEPOSIT_RAILS.map((r) => r.label),
};

const PLATFORM_INVESTMENT_FEE_PCT = 0.5; // 0.5% transparent structuring & custody fee

async function getMergedActivePlans(rawToken?: string): Promise<
  Array<
    InvestmentMandate & {
      availabilityStatus: "Open" | "Paused" | "Closed";
      published: boolean;
      unitPrice: number;
    }
  >
> {
  const base = INVESTMENT_MANDATES.map((m) => ({
    ...m,
    availabilityStatus: "Open" as "Open" | "Paused" | "Closed",
    published: true,
    unitPrice: m.minDeposit,
  }));

  try {
    const rows = await runFirestoreQuery("investmentPlans", null, rawToken);
    if (rows.length === 0) return base;

    const byId = new Map(base.map((p) => [p.id, p]));
    for (const row of rows) {
      const id = row.id;
      const published = row.published !== false;
      const availability =
        row.availabilityStatus === "Paused" || row.availabilityStatus === "Closed"
          ? row.availabilityStatus
          : "Open";
      const minDeposit = Number(row.minDeposit ?? 500) || 500;
      const maxDeposit = Math.max(minDeposit, Number(row.maxDeposit ?? minDeposit * 10) || minDeposit);
      const category: "crypto" | "stock" | "estate" =
        row.category === "stock" || row.category === "estate" ? row.category : "crypto";

      const merged = {
        id,
        category,
        categoryLabel:
          String(
            row.categoryLabel ??
              (category === "crypto"
                ? "Digital Assets"
                : category === "stock"
                  ? "Global Equities"
                  : "Real Estate")
          ),
        name: String(row.name ?? "Investment Mandate"),
        audience: String(row.audience ?? "Structured client portfolio allocation"),
        description: String(row.description ?? ""),
        minDeposit,
        maxDeposit,
        dailyRatePct: Number(row.dailyRatePct ?? 1.5) || 1.5,
        ...(row.monthlyRatePct !== undefined ? { monthlyRatePct: Number(row.monthlyRatePct) } : {}),
        ...(row.referralBonusPct !== undefined
          ? { referralBonusPct: Number(row.referralBonusPct) }
          : {}),
        durationDays: Math.max(1, Number(row.durationDays ?? 30) || 30),
        paymentFrequency: String(row.paymentFrequency ?? "Scheduled cycle distribution"),
        settlementRail: String(row.settlementRail ?? "USDT (TRC20) / Bank Wire"),
        image: String(row.image ?? "/images/hero-private-capital.png"),
        returnTerms: String(
          row.returnTerms ??
            "Indicative benchmark terms only. Returns are variable and not guaranteed."
        ),
        highlights: Array.isArray(row.highlights)
          ? row.highlights.map(String)
          : ["Segregated custody tracking", "Verified ledger settlement"],
        availabilityStatus: availability as "Open" | "Paused" | "Closed",
        published,
        unitPrice: minDeposit,
      };
      byId.set(id, merged);
    }

    return Array.from(byId.values()).filter((p) => p.published);
  } catch {
    return base;
  }
}

function buildUserUpdateFields(
  userDoc: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, FirestoreValue> {
  const merged: Record<string, unknown> = {
    uid: userDoc.uid,
    ...(userDoc.username ? { username: userDoc.username } : {}),
    email: userDoc.email,
    displayName: userDoc.displayName,
    country: userDoc.country ?? "",
    phone: userDoc.phone ?? "",
    walletBalance: Number(userDoc.walletBalance ?? 0),
    totalProfit: Number(userDoc.totalProfit ?? 0),
    bonus: Number(userDoc.bonus ?? 0),
    referralBonus: Number(userDoc.referralBonus ?? 0),
    totalDeposit: Number(userDoc.totalDeposit ?? 0),
    preferredRail: userDoc.preferredRail ?? "USDT (TRC20)",
    emailAlerts: Boolean(userDoc.emailAlerts ?? true),
    twoFactorEnabled: Boolean(userDoc.twoFactorEnabled ?? false),
    role: userDoc.role ?? "investor",
    ...(userDoc.accountStatus ? { accountStatus: userDoc.accountStatus } : {}),
    ...patch,
  };

  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined) {
      fields[k] = encodeValue(v);
    }
  }
  if (typeof userDoc.createdAt === "string") {
    fields.createdAt = { timestampValue: userDoc.createdAt };
  }
  return fields;
}

export function createCustomerRouter(): Router {
  const router = Router();

  router.use(requireAuth, requireVerifiedEmail);

  // Dashboard Overview
  router.get("/dashboard/overview", async (req: AuthRequest, res) => {
    if (!req.user || !req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    try {
      const overview = await getAuthenticatedDashboardOverview(
        req.user.uid,
        req.user.email ?? "",
        req.rawIdToken
      );
      res.json(overview);
    } catch (err) {
      console.error("Dashboard overview fetch failed:", err);
      res.status(502).json({
        error: "Unable to load authenticated dashboard figures from ledger.",
      });
    }
  });

  // Customer Investments
  router.get("/dashboard/investments", async (req: AuthRequest, res) => {
    if (!req.user || !req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    try {
      const payload = await getAuthenticatedCustomerInvestments(
        req.user.uid,
        req.rawIdToken
      );
      res.json(payload);
    } catch (err) {
      console.error("Dashboard investments fetch failed:", err);
      res.status(502).json({
        error: "Unable to load authenticated investment records.",
      });
    }
  });

  // Active Plans & Open Properties for Purchase
  router.get("/investments/catalog", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    try {
      const [plans, propertyRows] = await Promise.all([
        getMergedActivePlans(req.rawIdToken),
        runFirestoreQuery("properties", null, req.rawIdToken).catch(() => []),
      ]);
      const properties = propertyRows
        .filter((p) => p.published !== false)
        .map((p) => ({
          id: p.id,
          title: String(p.title ?? "Commercial Property"),
          location: String(p.location ?? ""),
          assetType: String(p.assetType ?? "Real Estate"),
          targetYieldPct: Number(p.targetYieldPct ?? 0) || 0,
          minEntry: Number(p.minEntry ?? 1000) || 1000,
          valuation: Number(p.valuation ?? 0) || 0,
          occupancyPct: Number(p.occupancyPct ?? 0) || 0,
          status: String(p.status ?? "Open"),
          image: String(p.image ?? "/images/commercial-property.png"),
          summary: String(p.summary ?? ""),
        }));

      res.json({
        plans,
        properties,
        feeRatePct: PLATFORM_INVESTMENT_FEE_PCT,
      });
    } catch (err) {
      console.error("Catalog fetch failed:", err);
      res.status(502).json({ error: "Unable to load investment catalog." });
    }
  });

  // Prompt 18: Server-validated, atomic, idempotent investment purchase
  router.post("/investments/purchase", async (req: AuthRequest, res) => {
    if (!req.user || !req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const uid = req.user.uid;
    const rawToken = req.rawIdToken;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const targetType = body.targetType === "property" ? "property" : "plan";
    const targetId = typeof body.targetId === "string" ? body.targetId.trim() : "";
    const units = Number(body.units);
    const confirmed = body.confirmed === true;
    const idempotencyKey =
      normalizeIdempotencyKey(body.idempotencyKey) ||
      `auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (!confirmed) {
      res.status(400).json({ error: "Explicit investment confirmation is required." });
      return;
    }
    if (!targetId) {
      res.status(400).json({ error: "Select an investment plan or property offering." });
      return;
    }
    if (!Number.isFinite(units) || !Number.isInteger(units) || units < 1 || units > 1000) {
      res.status(400).json({ error: "Units must be a whole number between 1 and 1,000." });
      return;
    }

    const cached = getCachedIdempotentResult(uid, "purchase", idempotencyKey);
    if (cached) {
      res.status(200).json({ ...cached, deduplicated: true });
      return;
    }
    if (!acquireInFlightLock(uid, "purchase", idempotencyKey)) {
      res.status(409).json({
        error: "A matching investment submission is already being processed.",
      });
      return;
    }

    try {
      const userDoc = await getFirestoreDoc("users", uid, rawToken);
      if (!userDoc) {
        res.status(404).json({ error: "Authenticated account record not found." });
        return;
      }
      if (userDoc.accountStatus === "Suspended") {
        res.status(403).json({
          error: "Account allocations are currently restricted. Contact support.",
        });
        return;
      }

      const availableBalance = Number(userDoc.walletBalance ?? 0) || 0;
      let planId = targetId;
      let planName = "";
      let category: "crypto" | "stock" | "estate" = "crypto";
      let unitPrice = 0;
      let minRequirement = 0;
      let maxCap = Number.MAX_SAFE_INTEGER;
      let dailyRatePct = 1.4;
      let durationDays = 30;
      let termsSummary = "";

      if (targetType === "property") {
        const propDoc = await getFirestoreDoc("properties", targetId, rawToken);
        if (!propDoc || propDoc.published === false) {
          res.status(404).json({ error: "Selected property offering was not found." });
          return;
        }
        if (String(propDoc.status ?? "") !== "Open") {
          res.status(400).json({
            error: "This property offering is currently fully subscribed or closed.",
          });
          return;
        }
        planId = `prop_${propDoc.id}`.slice(0, 64);
        planName = String(propDoc.title ?? "Commercial Property").slice(0, 80);
        category = "estate";
        unitPrice = Number(propDoc.minEntry ?? 0) || 0;
        minRequirement = unitPrice;
        dailyRatePct = Math.max(0.1, Number(((Number(propDoc.targetYieldPct ?? 8.5) || 8.5) / 30).toFixed(2)));
        durationDays = 60;
        termsSummary = `Asset-backed participation in ${planName} (${String(propDoc.location ?? "")}). Indicative annualized target ${String(propDoc.targetYieldPct ?? 0)}%; distributions are not guaranteed.`;
      } else {
        const plans = await getMergedActivePlans(rawToken);
        const plan = plans.find((p) => p.id === targetId) || getMandateById(targetId);
        if (!plan) {
          res.status(404).json({ error: "Selected investment plan does not exist." });
          return;
        }
        if ("availabilityStatus" in plan && plan.availabilityStatus !== "Open") {
          res.status(400).json({
            error: `${plan.name} is currently ${String(plan.availabilityStatus).toLowerCase()} for new allocations.`,
          });
          return;
        }
        planId = plan.id.slice(0, 64);
        planName = plan.name.slice(0, 80);
        category = plan.category;
        unitPrice = plan.minDeposit;
        minRequirement = plan.minDeposit;
        maxCap = plan.maxDeposit;
        dailyRatePct = plan.dailyRatePct;
        durationDays = plan.durationDays;
        termsSummary = plan.returnTerms;
      }

      const principal = Number((units * unitPrice).toFixed(2));
      const feeAmount = Number(((principal * PLATFORM_INVESTMENT_FEE_PCT) / 100).toFixed(2));
      const totalCost = Number((principal + feeAmount).toFixed(2));

      if (principal < minRequirement) {
        res.status(400).json({
          error: `Minimum investment requirement is $${minRequirement.toLocaleString()}.`,
        });
        return;
      }
      if (principal > maxCap) {
        res.status(400).json({
          error: `Maximum allocation cap for ${planName} is $${maxCap.toLocaleString()}.`,
        });
        return;
      }
      if (totalCost > availableBalance) {
        res.status(400).json({
          code: "INSUFFICIENT_FUNDS",
          error: `Insufficient custody wallet balance. Required ${totalCost.toFixed(2)} USD (including ${feeAmount.toFixed(2)} USD fee), available ${availableBalance.toFixed(2)} USD.`,
          availableBalance,
          requiredAmount: totalCost,
        });
        return;
      }

      const invId = makeDocId("inv");
      const txId = makeDocId("tx");
      const notifId = makeDocId("not");
      const receiptRef = `INV-${Date.now().toString().slice(-6)}-${Math.random()
        .toString(36)
        .slice(2, 5)
        .toUpperCase()}`;

      const updatedBalance = Number((availableBalance - totalCost).toFixed(2));
      const userUpdateFields = buildUserUpdateFields(userDoc, {
        walletBalance: updatedBalance,
      });

      const root = firestoreRootPath();
      const writes: Array<Record<string, unknown>> = [
        {
          update: {
            name: `${root}/users/${uid}`,
            fields: userUpdateFields,
          },
          updateTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
          currentDocument: userDoc._updateTime
            ? { updateTime: userDoc._updateTime }
            : { exists: true },
        },
        {
          update: {
            name: `${root}/investments/${invId}`,
            fields: {
              userId: { stringValue: uid },
              planId: { stringValue: planId },
              planName: { stringValue: planName },
              category: { stringValue: category },
              amount: { doubleValue: principal },
              dailyRatePct: { doubleValue: dailyRatePct },
              durationDays: { integerValue: String(durationDays) },
              status: { stringValue: "Active" },
            },
          },
          updateTransforms: [
            { fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" },
            { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" },
          ],
          currentDocument: { exists: false },
        },
        {
          update: {
            name: `${root}/transactions/${txId}`,
            fields: {
              userId: { stringValue: uid },
              userEmail: { stringValue: String(userDoc.email || req.user.email || "").slice(0, 200) },
              type: { stringValue: "Investment" },
              method: { stringValue: `${units} unit(s) · ${planName}`.slice(0, 100) },
              amount: { doubleValue: totalCost },
              destination: { stringValue: planId.slice(0, 200) },
              reference: { stringValue: receiptRef.slice(0, 64) },
              status: { stringValue: "Completed" },
            },
          },
          updateTransforms: [
            { fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" },
            { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" },
          ],
          currentDocument: { exists: false },
        },
        {
          update: {
            name: `${root}/notifications/${notifId}`,
            fields: {
              userId: { stringValue: uid },
              category: { stringValue: "Settlement" },
              title: { stringValue: `Investment Confirmed: ${planName}`.slice(0, 140) },
              body: {
                stringValue: `Allocated ${units} unit(s) ($${principal.toFixed(2)} principal + $${feeAmount.toFixed(2)} fee). Reference: ${receiptRef}.`.slice(
                  0,
                  600
                ),
              },
              read: { booleanValue: false },
            },
          },
          updateTransforms: [{ fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" }],
          currentDocument: { exists: false },
        },
      ];

      const commitRes = await fetch(`${firestoreBaseUrl()}:commit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rawToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ writes }),
        signal: AbortSignal.timeout(6000),
      });

      if (!commitRes.ok) {
        const errText = await commitRes.text().catch(() => "");
        console.error("Investment purchase commit failed:", commitRes.status, errText);
        res.status(commitRes.status === 409 || commitRes.status === 400 ? 409 : 502).json({
          error:
            "Unable to finalize investment allocation due to concurrent balance change or verification rule. Please refresh and retry.",
        });
        return;
      }

      // Best-effort auxiliary records (agreement document + idempotency key in Firestore)
      const docId = makeDocId("doc");
      await Promise.all([
        safeAuxCommit(
          {
            collection: "documents",
            docId,
            fields: {
              userId: uid,
              title: `${planName} — Investment Agreement & Receipt`.slice(0, 140),
              docType: "Agreement",
              reference: receiptRef,
              relatedId: invId,
              summary: `${units} unit(s) at $${unitPrice.toFixed(2)}/unit. Principal $${principal.toFixed(2)}, fee $${feeAmount.toFixed(2)}, total $${totalCost.toFixed(2)}. ${termsSummary}`.slice(
                0,
                600
              ),
            },
            serverTimestamps: ["createdAt"],
            precondition: { exists: false },
          },
          rawToken
        ),
        safeAuxCommit(
          {
            collection: "idempotencyKeys",
            docId: `${uid}_${idempotencyKey}`.slice(0, 128),
            fields: {
              userId: uid,
              operation: "purchase",
              reference: receiptRef,
              resultId: invId,
            },
            serverTimestamps: ["createdAt"],
            precondition: { exists: false },
          },
          rawToken
        ),
      ]);

      const receiptPayload = {
        ok: true,
        receipt: {
          reference: receiptRef,
          investmentId: invId,
          transactionId: txId,
          planId,
          planName,
          category,
          units,
          unitPrice,
          principal,
          feeAmount,
          totalCost,
          currency: "USD",
          newWalletBalance: updatedBalance,
          termsSummary,
          createdAt: new Date().toISOString(),
        },
      };

      saveIdempotentResult(uid, "purchase", idempotencyKey, receiptPayload);
      res.status(201).json(receiptPayload);
    } catch (err) {
      console.error("Investment purchase error:", err);
      res.status(500).json({ error: "Server error while processing investment purchase." });
    } finally {
      releaseInFlightLock(uid, "purchase", idempotencyKey);
    }
  });

  // Prompt 19: Deposit methods & submission (Pending until verified by admin)
  router.get("/deposits/methods", (_req, res) => {
    res.json({ methods: DEPOSIT_RAILS });
  });

  router.post("/deposits", async (req: AuthRequest, res) => {
    if (!req.user || !req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const uid = req.user.uid;
    const rawToken = req.rawIdToken;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const methodId = typeof body.method === "string" ? body.method.trim() : "";
    const amount = Number(body.amount);
    const referenceInput =
      typeof body.reference === "string" ? body.reference.trim() : "";
    const idempotencyKey =
      normalizeIdempotencyKey(body.idempotencyKey) ||
      `dep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const rail = DEPOSIT_RAILS.find((r) => r.id === methodId || r.label === methodId);
    if (!rail) {
      res.status(400).json({ error: "Selected payment method is not supported." });
      return;
    }
    if (!Number.isFinite(amount) || amount < rail.minDeposit || amount > 10_000_000) {
      res.status(400).json({
        error: `Deposit amount for ${rail.label} must be at least $${rail.minDeposit.toLocaleString()}.`,
      });
      return;
    }

    const cached = getCachedIdempotentResult(uid, "deposit", idempotencyKey);
    if (cached) {
      res.status(200).json({ ...cached, deduplicated: true });
      return;
    }
    if (!acquireInFlightLock(uid, "deposit", idempotencyKey)) {
      res.status(409).json({ error: "Deposit submission already in progress." });
      return;
    }

    try {
      const txId = makeDocId("tx");
      const refCode =
        referenceInput.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64) ||
        `DEP-${Date.now().toString().slice(-6)}`;

      await commitFirestoreWrites(
        [
          {
            collection: "transactions",
            docId: txId,
            fields: {
              userId: uid,
              userEmail: (req.user.email || "").slice(0, 200),
              type: "Deposit",
              method: rail.label,
              amount: Number(amount.toFixed(2)),
              destination: rail.custodyDestination.slice(0, 200),
              reference: refCode,
              status: "Pending",
            },
            serverTimestamps: ["createdAt", "updatedAt"],
            precondition: { exists: false },
          },
        ],
        rawToken
      );

      await safeAuxCommit(
        {
          collection: "documents",
          docId: makeDocId("doc"),
          fields: {
            userId: uid,
            title: `Deposit Confirmation Notice (${rail.label})`.slice(0, 140),
            docType: "DepositConfirmation",
            reference: refCode,
            relatedId: txId,
            summary: `Submitted pending deposit notice of $${amount.toFixed(2)} USD via ${rail.label}. ${rail.confirmationInfo}`.slice(
              0,
              600
            ),
          },
          serverTimestamps: ["createdAt"],
          precondition: { exists: false },
        },
        rawToken
      );

      await enqueueMailEvent({
        eventType: "deposit_initiated",
        userId: uid,
        recipient: String(req.user.email || ""),
        rawToken,
        values: {
          firstName: String(req.user.name || req.user.email || "Investor").split(/[ @]/)[0],
          amount: `$${amount.toFixed(2)}`,
          method: rail.label,
          reference: refCode,
          status: "Pending",
        },
      }).catch((error) => console.error("Deposit mail event queue failed:", error));

      const responsePayload = {
        ok: true,
        deposit: {
          id: txId,
          reference: refCode,
          method: rail.label,
          currency: rail.currency,
          amount: Number(amount.toFixed(2)),
          status: "Pending",
          instructions: rail.instructions,
          confirmationInfo: rail.confirmationInfo,
          createdAt: new Date().toISOString(),
        },
      };

      saveIdempotentResult(uid, "deposit", idempotencyKey, responsePayload);
      res.status(201).json(responsePayload);
    } catch (err) {
      console.error("Deposit submission failed:", err);
      res.status(502).json({ error: "Unable to record deposit notice. Please retry." });
    } finally {
      releaseInFlightLock(uid, "deposit", idempotencyKey);
    }
  });

  // Prompt 20: Withdrawal config & atomic reservation
  router.get("/withdrawals/config", (_req, res) => {
    res.json(WITHDRAWAL_CONFIG);
  });

  router.post("/withdrawals", async (req: AuthRequest, res) => {
    if (!req.user || !req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const uid = req.user.uid;
    const rawToken = req.rawIdToken;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const method = typeof body.method === "string" ? body.method.trim() : "";
    const amount = Number(body.amount);
    const destination =
      typeof body.destination === "string" ? body.destination.trim() : "";
    const accountDetails =
      typeof body.accountDetails === "string" ? body.accountDetails.trim() : "";
    const confirmed = body.confirmed === true;
    const idempotencyKey =
      normalizeIdempotencyKey(body.idempotencyKey) ||
      `wdr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (!confirmed) {
      res.status(400).json({ error: "Explicit withdrawal confirmation is required." });
      return;
    }
    if (!WITHDRAWAL_CONFIG.supportedRails.includes(method)) {
      res.status(400).json({ error: "Unsupported payout rail selected." });
      return;
    }
    if (
      !Number.isFinite(amount) ||
      amount < WITHDRAWAL_CONFIG.minWithdrawal ||
      amount > WITHDRAWAL_CONFIG.maxSingleWithdrawal
    ) {
      res.status(400).json({
        error: `Withdrawal amount must be between $${WITHDRAWAL_CONFIG.minWithdrawal} and $${WITHDRAWAL_CONFIG.maxSingleWithdrawal.toLocaleString()}.`,
      });
      return;
    }
    if (!destination || destination.length < 4 || destination.length > 160) {
      res.status(400).json({ error: "Provide a valid destination wallet or bank beneficiary." });
      return;
    }

    const cached = getCachedIdempotentResult(uid, "withdrawal", idempotencyKey);
    if (cached) {
      res.status(200).json({ ...cached, deduplicated: true });
      return;
    }
    if (!acquireInFlightLock(uid, "withdrawal", idempotencyKey)) {
      res.status(409).json({ error: "Withdrawal request already processing." });
      return;
    }

    try {
      const userDoc = await getFirestoreDoc("users", uid, rawToken);
      if (!userDoc) {
        res.status(404).json({ error: "Authenticated account record not found." });
        return;
      }
      if (userDoc.accountStatus === "Suspended") {
        res.status(403).json({ error: "Withdrawals are suspended on this account." });
        return;
      }

      const available = Number(userDoc.walletBalance ?? 0) || 0;
      const requested = Number(amount.toFixed(2));
      if (requested > available) {
        res.status(400).json({
          error: `Withdrawal amount ($${requested.toFixed(2)}) exceeds available balance ($${available.toFixed(2)}).`,
        });
        return;
      }

      const fee = Number(
        Math.max(
          WITHDRAWAL_CONFIG.minFeeUsd,
          (requested * WITHDRAWAL_CONFIG.feeRatePct) / 100
        ).toFixed(2)
      );
      const netPayout = Number(Math.max(0, requested - fee).toFixed(2));
      const newBalance = Number((available - requested).toFixed(2));

      const txId = makeDocId("tx");
      const refCode = `WDR-${Date.now().toString().slice(-6)}`;
      const combinedDest = accountDetails
        ? `${destination} (${accountDetails})`.slice(0, 200)
        : destination.slice(0, 200);

      const root = firestoreRootPath();
      const writes: Array<Record<string, unknown>> = [
        {
          update: {
            name: `${root}/users/${uid}`,
            fields: buildUserUpdateFields(userDoc, { walletBalance: newBalance }),
          },
          updateTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
          currentDocument: userDoc._updateTime
            ? { updateTime: userDoc._updateTime }
            : { exists: true },
        },
        {
          update: {
            name: `${root}/transactions/${txId}`,
            fields: {
              userId: { stringValue: uid },
              userEmail: { stringValue: String(userDoc.email || req.user.email || "").slice(0, 200) },
              type: { stringValue: "Withdrawal" },
              method: { stringValue: method.slice(0, 100) },
              amount: { doubleValue: requested },
              destination: { stringValue: combinedDest },
              reference: { stringValue: refCode },
              status: { stringValue: "Pending" },
            },
          },
          updateTransforms: [
            { fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" },
            { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" },
          ],
          currentDocument: { exists: false },
        },
      ];

      const commitRes = await fetch(`${firestoreBaseUrl()}:commit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rawToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ writes }),
        signal: AbortSignal.timeout(6000),
      });

      if (!commitRes.ok) {
        res.status(409).json({
          error: "Balance changed concurrently while queuing withdrawal. Please refresh and retry.",
        });
        return;
      }

      await safeAuxCommit(
        {
          collection: "documents",
          docId: makeDocId("doc"),
          fields: {
            userId: uid,
            title: `Withdrawal Disbursement Record (${method})`.slice(0, 140),
            docType: "WithdrawalRecord",
            reference: refCode,
            relatedId: txId,
            summary: `Requested $${requested.toFixed(2)} USD (applicable fee $${fee.toFixed(2)}, net payout $${netPayout.toFixed(2)}) to ${combinedDest}.`.slice(
              0,
              600
            ),
          },
          serverTimestamps: ["createdAt"],
          precondition: { exists: false },
        },
        rawToken
      );

      await enqueueMailEvent({
        eventType: "withdrawal_initiated",
        userId: uid,
        recipient: String(userDoc.email || req.user.email || ""),
        rawToken,
        values: {
          firstName: String(userDoc.displayName || req.user.name || req.user.email || "Investor").split(" ")[0],
          amount: `$${requested.toFixed(2)}`,
          method,
          reference: refCode,
          status: "Pending",
        },
      }).catch((error) => console.error("Withdrawal mail event queue failed:", error));

      const payload = {
        ok: true,
        withdrawal: {
          id: txId,
          reference: refCode,
          method,
          amount: requested,
          fee,
          netPayout,
          destination: combinedDest,
          status: "Pending",
          newWalletBalance: newBalance,
          createdAt: new Date().toISOString(),
        },
      };

      saveIdempotentResult(uid, "withdrawal", idempotencyKey, payload);
      res.status(201).json(payload);
    } catch (err) {
      console.error("Withdrawal submission failed:", err);
      res.status(500).json({ error: "Unable to submit withdrawal request." });
    } finally {
      releaseInFlightLock(uid, "withdrawal", idempotencyKey);
    }
  });

  // Prompt 21: Searchable Transaction Ledger & Details
  router.get("/transactions", async (req: AuthRequest, res) => {
    if (!req.user || !req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    try {
      const { allTransactions } = await getAuthenticatedCustomerInvestments(
        req.user.uid,
        req.rawIdToken
      );
      const enriched = allTransactions.map((tx) => ({
        ...tx,
        currency: "USD",
        description:
          tx.type === "Deposit"
            ? `Deposit notice via ${tx.method}`
            : tx.type === "Withdrawal"
              ? `Withdrawal disbursement via ${tx.method} to ${tx.destination}`
              : tx.type === "Investment"
                ? `Investment allocation: ${tx.method}`
                : tx.type === "Referral"
                  ? `Referral commission settlement (${tx.method})`
                  : `Yield distribution: ${tx.method}`,
      }));
      res.json({ transactions: enriched });
    } catch (err) {
      console.error("Transactions fetch failed:", err);
      res.status(502).json({ error: "Unable to load transaction ledger." });
    }
  });

  // Prompt 22: Referrals
  router.get("/referrals", async (req: AuthRequest, res) => {
    if (!req.user || !req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const uid = req.user.uid;
    const rawToken = req.rawIdToken;
    try {
      const [overview, invData, refRows] = await Promise.all([
        getAuthenticatedDashboardOverview(uid, req.user.email ?? "", rawToken),
        getAuthenticatedCustomerInvestments(uid, rawToken),
        runFirestoreQuery(
          "referrals",
          {
            fieldFilter: {
              field: { fieldPath: "referrerUid" },
              op: "EQUAL",
              value: { stringValue: uid },
            },
          },
          rawToken
        ).catch(() => []),
      ]);

      const referralTxs = invData.allTransactions.filter((t) => t.type === "Referral");
      const referralCode = `BF-${uid.slice(0, 8).toUpperCase()}`;
      const referralsList = refRows.map((r) => ({
        id: r.id,
        referredEmail: String(r.referredEmail ?? "Verified Investor"),
        status: String(r.status ?? "Pending"),
        rewardAmount: Number(r.rewardAmount ?? 0) || 0,
        createdAt: typeof r.createdAt === "string" ? r.createdAt : null,
      }));

      const qualifiedCount = referralsList.filter(
        (r) => r.status === "Qualified" || r.status === "Credited"
      ).length;

      res.json({
        referralCode,
        totalReferrals: referralsList.length,
        qualifiedReferrals: qualifiedCount,
        referralEarnings: overview.metrics.referralBonus,
        referrals: referralsList,
        transactions: referralTxs,
        ruleSummary:
          "Referral rewards are credited strictly upon administrator verification of qualifying settled deposits.",
      });
    } catch (err) {
      console.error("Referrals fetch failed:", err);
      res.status(502).json({ error: "Unable to load referral records." });
    }
  });

  // Prompt 23 & 24: Profile & Settings Backend Validation
  router.get("/profile", async (req: AuthRequest, res) => {
    if (!req.user || !req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    try {
      const doc = await getFirestoreDoc("users", req.user.uid, req.rawIdToken);
      if (!doc) {
        res.status(404).json({ error: "Profile not found." });
        return;
      }
      res.json({
        profile: {
          uid: String(doc.uid ?? req.user.uid),
          username: String(doc.username ?? ""),
          email: String(doc.email ?? req.user.email ?? ""),
          displayName: String(doc.displayName ?? ""),
          country: String(doc.country ?? ""),
          phone: String(doc.phone ?? ""),
          preferredRail: String(doc.preferredRail ?? "USDT (TRC20)"),
          emailAlerts: Boolean(doc.emailAlerts ?? true),
          twoFactorEnabled: Boolean(doc.twoFactorEnabled ?? false),
          role: String(doc.role ?? "investor"),
          accountStatus: String(doc.accountStatus ?? "Active"),
          emailVerified: Boolean(req.user.email_verified),
          createdAt: typeof doc.createdAt === "string" ? doc.createdAt : null,
          updatedAt: typeof doc.updatedAt === "string" ? doc.updatedAt : null,
        },
      });
    } catch (err) {
      console.error("Profile fetch failed:", err);
      res.status(502).json({ error: "Unable to load profile." });
    }
  });

  router.patch("/profile", async (req: AuthRequest, res) => {
    if (!req.user || !req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};
    const mask: string[] = [];

    if ("displayName" in body) {
      const val = typeof body.displayName === "string" ? body.displayName.trim() : "";
      if (!val || val.length > 120) {
        res.status(400).json({ error: "Full name must be between 1 and 120 characters." });
        return;
      }
      patch.displayName = val;
      mask.push("displayName");
    }
    if ("country" in body) {
      const val = typeof body.country === "string" ? body.country.trim() : "";
      if (val.length > 80) {
        res.status(400).json({ error: "Country must be 80 characters or fewer." });
        return;
      }
      patch.country = val;
      mask.push("country");
    }
    if ("phone" in body) {
      const val = typeof body.phone === "string" ? body.phone.trim() : "";
      if (val.length > 40 || (val && !/^[+0-9()\s-]{5,40}$/.test(val))) {
        res.status(400).json({ error: "Enter a valid telephone number (5-40 characters)." });
        return;
      }
      patch.phone = val;
      mask.push("phone");
    }
    if ("preferredRail" in body) {
      const allowed = ["USDT (TRC20)", "Bitcoin (BTC)", "Ethereum (ETH)", "Bank Wire"];
      const val = typeof body.preferredRail === "string" ? body.preferredRail.trim() : "";
      if (!allowed.includes(val)) {
        res.status(400).json({ error: "Invalid settlement rail selected." });
        return;
      }
      patch.preferredRail = val;
      mask.push("preferredRail");
    }
    if ("emailAlerts" in body) {
      if (typeof body.emailAlerts !== "boolean") {
        res.status(400).json({ error: "emailAlerts must be a boolean." });
        return;
      }
      patch.emailAlerts = body.emailAlerts;
      mask.push("emailAlerts");
    }
    if ("twoFactorEnabled" in body) {
      if (typeof body.twoFactorEnabled !== "boolean") {
        res.status(400).json({ error: "twoFactorEnabled must be a boolean." });
        return;
      }
      patch.twoFactorEnabled = body.twoFactorEnabled;
      mask.push("twoFactorEnabled");
    }

    if ("username" in body) {
      const rawUsername = typeof body.username === "string" ? body.username : "";
      if (rawUsername.trim()) {
        const check = validateUsername(rawUsername);
        if (!check.valid) {
          res.status(400).json({ error: check.error || "Invalid username format." });
          return;
        }
        patch.username = check.normalized;
        mask.push("username");
      }
    }

    if (mask.length === 0) {
      res.status(400).json({ error: "No valid profile fields provided to update." });
      return;
    }

    try {
      if (typeof patch.username === "string") {
        const nextUsername = patch.username;
        const uid = req.user.uid;
        const userEmail = String(req.user.email || "").trim().toLowerCase();

        const existingTarget = await getFirestoreDoc("usernames", nextUsername, req.rawIdToken);
        if (existingTarget && String(existingTarget.uid ?? "") !== uid) {
          res.status(409).json({ error: "This username is already taken by another investor." });
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
          req.rawIdToken
        ).catch(() => []);

        if (existingTarget) {
          await patchFirestoreFields(
            "usernames",
            nextUsername,
            { email: userEmail.slice(0, 200) },
            req.rawIdToken,
            ["email"],
            ["updatedAt"]
          );
        } else {
          await commitFirestoreWrites(
            [
              {
                collection: "usernames",
                docId: nextUsername,
                fields: {
                  username: nextUsername,
                  uid,
                  email: userEmail.slice(0, 200),
                },
                serverTimestamps: ["createdAt", "updatedAt"],
                precondition: { exists: false },
              },
            ],
            req.rawIdToken
          );
        }

        for (const oldDoc of ownedDocs) {
          if (oldDoc.id !== nextUsername) {
            await deleteFirestoreDoc("usernames", oldDoc.id, req.rawIdToken).catch(() => undefined);
          }
        }
      }

      await patchFirestoreFields(
        "users",
        req.user.uid,
        patch,
        req.rawIdToken,
        mask,
        ["updatedAt"]
      );
      res.json({ ok: true, updated: patch });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("403") || msg.includes("PERMISSION_DENIED")) {
        res.status(503).json({
          error:
            "Firestore security rules for username storage must be deployed in Firebase Console before saving a username.",
        });
        return;
      }
      console.error("Profile update failed:", err);
      res.status(502).json({ error: "Unable to save profile updates." });
    }
  });

  // Prompt 25: User-protected Customer Documents
  router.get("/documents", async (req: AuthRequest, res) => {
    if (!req.user || !req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const uid = req.user.uid;
    const rawToken = req.rawIdToken;

    try {
      const [invData, storedDocs] = await Promise.all([
        getAuthenticatedCustomerInvestments(uid, rawToken),
        runFirestoreQuery(
          "documents",
          {
            fieldFilter: {
              field: { fieldPath: "userId" },
              op: "EQUAL",
              value: { stringValue: uid },
            },
          },
          rawToken
        ).catch(() => []),
      ]);

      const docsMap = new Map<
        string,
        {
          id: string;
          userId: string;
          title: string;
          docType: "Agreement" | "Receipt" | "DepositConfirmation" | "WithdrawalRecord" | "AccountDocument";
          reference: string;
          summary: string;
          fileUrl?: string;
          createdAt: string | null;
        }
      >();

      for (const d of storedDocs) {
        if (String(d.userId ?? "") !== uid) continue;
        docsMap.set(d.id, {
          id: d.id,
          userId: uid,
          title: String(d.title ?? "Account Document"),
          docType: (String(d.docType ?? "AccountDocument") as
            | "Agreement"
            | "Receipt"
            | "DepositConfirmation"
            | "WithdrawalRecord"
            | "AccountDocument"),
          reference: String(d.reference ?? d.id),
          summary: String(d.summary ?? ""),
          fileUrl: typeof d.fileUrl === "string" ? d.fileUrl : undefined,
          createdAt: typeof d.createdAt === "string" ? d.createdAt : null,
        });
      }

      // Derive missing agreements/confirmations/receipts directly from verified user investments & transactions
      for (const inv of invData.investments) {
        const key = `derived_inv_${inv.id}`;
        if (!Array.from(docsMap.values()).some((x) => x.reference === inv.reference)) {
          docsMap.set(key, {
            id: key,
            userId: uid,
            title: `${inv.planName} — Investment Agreement`,
            docType: "Agreement",
            reference: inv.reference,
            summary: `Principal $${inv.amount.toFixed(2)} USD · ${inv.durationDays} days · ${inv.expectedPaymentTerms}`,
            createdAt: inv.investmentDate,
          });
        }
      }

      for (const tx of invData.allTransactions) {
        if (tx.type === "Deposit" && !Array.from(docsMap.values()).some((x) => x.reference === tx.reference && x.docType === "DepositConfirmation")) {
          docsMap.set(`derived_dep_${tx.id}`, {
            id: `derived_dep_${tx.id}`,
            userId: uid,
            title: `Deposit Confirmation (${tx.method})`,
            docType: "DepositConfirmation",
            reference: tx.reference,
            summary: `Amount $${tx.amount.toFixed(2)} USD · Status: ${tx.status} · Destination: ${tx.destination}`,
            createdAt: tx.createdAt,
          });
        } else if (tx.type === "Withdrawal" && !Array.from(docsMap.values()).some((x) => x.reference === tx.reference && x.docType === "WithdrawalRecord")) {
          docsMap.set(`derived_wdr_${tx.id}`, {
            id: `derived_wdr_${tx.id}`,
            userId: uid,
            title: `Withdrawal Record (${tx.method})`,
            docType: "WithdrawalRecord",
            reference: tx.reference,
            summary: `Amount $${tx.amount.toFixed(2)} USD · Status: ${tx.status} · Beneficiary: ${tx.destination}`,
            createdAt: tx.createdAt,
          });
        } else {
          docsMap.set(`derived_rcp_${tx.id}`, {
            id: `derived_rcp_${tx.id}`,
            userId: uid,
            title: `Transaction Receipt (${tx.type})`,
            docType: "Receipt",
            reference: tx.reference,
            summary: `${tx.type} of $${tx.amount.toFixed(2)} USD via ${tx.method} (${tx.status}).`,
            createdAt: tx.createdAt,
          });
        }
      }

      // Account verification / custody memorandum
      docsMap.set(`derived_acct_${uid}`, {
        id: `derived_acct_${uid}`,
        userId: uid,
        title: "Account Custody & Risk Disclosure Statement",
        docType: "AccountDocument",
        reference: `ACCT-${uid.slice(0, 8).toUpperCase()}`,
        summary:
          "BitfuryTech custody operating terms, email verification status record, and non-guaranteed benchmark disclosure.",
        createdAt: null,
      });

      const documents = Array.from(docsMap.values()).sort((a, b) => {
        const msA = a.createdAt ? Date.parse(a.createdAt) || 0 : 0;
        const msB = b.createdAt ? Date.parse(b.createdAt) || 0 : 0;
        return msB - msA;
      });

      res.json({ documents });
    } catch (err) {
      console.error("Documents fetch failed:", err);
      res.status(502).json({ error: "Unable to load customer documents." });
    }
  });

  // Reference unused helper type safely
  void (undefined as unknown as CommitWriteOp);

  return router;
}
