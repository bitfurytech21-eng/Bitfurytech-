import fs from "fs/promises";
import path from "path";
import { Router } from "express";
import {
  requireAdmin,
  requireAuth,
  requireVerifiedEmail,
  type AuthRequest,
} from "../middleware/auth.ts";
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
  type FirestoreValue,
} from "../services/firestoreRestClient.ts";
import { INVESTMENT_MANDATES } from "../trading/tradingPage.ts";
import { enqueueMailEvent } from "../services/mailOutbox.ts";

const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");

function paramStr(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function buildFullUserFields(
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
  const out: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined) out[k] = encodeValue(v);
  }
  if (typeof userDoc.createdAt === "string") {
    out.createdAt = { timestampValue: userDoc.createdAt };
  }
  return out;
}

async function writeAdminAuditLog(
  req: AuthRequest,
  action: string,
  targetType: string,
  targetId: string,
  summary: string
): Promise<void> {
  if (!req.user || !req.rawIdToken) return;
  await safeAuxCommit(
    {
      collection: "auditLogs",
      docId: makeDocId("aud"),
      fields: {
        actorUid: req.user.uid,
        actorEmail: (req.user.email || "admin@bitfurytech.com").slice(0, 200),
        action: action.slice(0, 80),
        targetType: targetType.slice(0, 60),
        targetId: targetId.slice(0, 128),
        summary: summary.slice(0, 500),
      },
      serverTimestamps: ["createdAt"],
      precondition: { exists: false },
    },
    req.rawIdToken
  );
}

export function createAdminRouter(): Router {
  const router = Router();

  router.use(requireAuth, requireVerifiedEmail, requireAdmin);

  // Prompt 27: Admin Overview
  router.get("/overview", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const rawToken = req.rawIdToken;
    try {
      const [users, investments, transactions, properties, inquiries, auditLogs] =
        await Promise.all([
          runFirestoreQuery("users", null, rawToken),
          runFirestoreQuery("investments", null, rawToken),
          runFirestoreQuery("transactions", null, rawToken),
          runFirestoreQuery("properties", null, rawToken),
          runFirestoreQuery("inquiries", null, rawToken).catch(() => []),
          runFirestoreQuery("auditLogs", null, rawToken).catch(() => []),
        ]);

      const nowMs = Date.now();
      const sevenDaysMs = 7 * 86_400_000;
      const newRegistrations = users.filter((u) => {
        if (typeof u.createdAt !== "string") return false;
        const ms = Date.parse(u.createdAt);
        return Number.isFinite(ms) && nowMs - ms <= sevenDaysMs;
      }).length;

      const activeInvestments = investments.filter((i) => i.status === "Active");
      const totalInvested = Number(
        investments.reduce((sum, i) => sum + (Number(i.amount ?? 0) || 0), 0).toFixed(2)
      );
      const pendingDeposits = transactions.filter(
        (t) => t.type === "Deposit" && t.status === "Pending"
      );
      const pendingWithdrawals = transactions.filter(
        (t) => t.type === "Withdrawal" && t.status === "Pending"
      );

      const recentTransactions = [...transactions]
        .sort((a, b) => {
          const msA = typeof a.createdAt === "string" ? Date.parse(a.createdAt) || 0 : 0;
          const msB = typeof b.createdAt === "string" ? Date.parse(b.createdAt) || 0 : 0;
          return msB - msA;
        })
        .slice(0, 10);

      res.json({
        stats: {
          totalCustomers: users.length,
          activeInvestmentsCount: activeInvestments.length,
          totalInvested,
          pendingDepositsCount: pendingDeposits.length,
          pendingDepositsAmount: Number(
            pendingDeposits.reduce((s, t) => s + (Number(t.amount ?? 0) || 0), 0).toFixed(2)
          ),
          pendingWithdrawalsCount: pendingWithdrawals.length,
          pendingWithdrawalsAmount: Number(
            pendingWithdrawals.reduce((s, t) => s + (Number(t.amount ?? 0) || 0), 0).toFixed(2)
          ),
          newRegistrations,
          propertiesCount: properties.length,
          inquiriesCount: inquiries.length,
        },
        recentTransactions,
        recentAuditLogs: auditLogs
          .sort((a, b) => {
            const msA = typeof a.createdAt === "string" ? Date.parse(a.createdAt) || 0 : 0;
            const msB = typeof b.createdAt === "string" ? Date.parse(b.createdAt) || 0 : 0;
            return msB - msA;
          })
          .slice(0, 8),
      });
    } catch (err) {
      console.error("Admin overview error:", err);
      res.status(502).json({ error: "Unable to load admin overview statistics." });
    }
  });

  // Prompt 28: Customer Management
  router.get("/customers", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const rawToken = req.rawIdToken;
    try {
      const [users, investments, transactions] = await Promise.all([
        runFirestoreQuery("users", null, rawToken),
        runFirestoreQuery("investments", null, rawToken),
        runFirestoreQuery("transactions", null, rawToken),
      ]);

      const customers = users.map((u) => {
        const uid = String(u.uid ?? u.id);
        const userInvs = investments.filter((i) => i.userId === uid);
        const userTxs = transactions.filter((t) => t.userId === uid);
        return {
          uid,
          username: String(u.username ?? ""),
          email: String(u.email ?? ""),
          displayName: String(u.displayName ?? "Investor"),
          country: String(u.country ?? ""),
          phone: String(u.phone ?? ""),
          walletBalance: Number(u.walletBalance ?? 0) || 0,
          totalDeposit: Number(u.totalDeposit ?? 0) || 0,
          totalProfit: Number(u.totalProfit ?? 0) || 0,
          referralBonus: Number(u.referralBonus ?? 0) || 0,
          role: String(u.role ?? "investor"),
          accountStatus: String(u.accountStatus ?? "Active"),
          createdAt: typeof u.createdAt === "string" ? u.createdAt : null,
          investmentsCount: userInvs.length,
          transactionsCount: userTxs.length,
          investments: userInvs,
          transactions: userTxs,
        };
      });

      res.json({ customers });
    } catch (err) {
      console.error("Admin customers error:", err);
      res.status(502).json({ error: "Unable to fetch customer directory." });
    }
  });

  router.patch("/customers/:uid/status", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const targetUid = paramStr(req.params.uid);
    const status = typeof req.body?.status === "string" ? req.body.status : "";
    if (!["Active", "Review", "Suspended"].includes(status)) {
      res.status(400).json({ error: "Status must be Active, Review, or Suspended." });
      return;
    }

    try {
      await patchFirestoreFields(
        "users",
        targetUid,
        { accountStatus: status },
        req.rawIdToken,
        ["accountStatus"],
        ["updatedAt"]
      );
      await writeAdminAuditLog(
        req,
        "UPDATE_CUSTOMER_STATUS",
        "user",
        targetUid,
        `Updated customer account status to ${status}.`
      );
      res.json({ ok: true, uid: targetUid, accountStatus: status });
    } catch (err) {
      console.error("Customer status update failed:", err);
      res.status(502).json({ error: "Unable to update customer account status." });
    }
  });

  // Prompt 29: Real Property Media & Document Upload
  router.post("/uploads", async (req: AuthRequest, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const kind = body.kind === "document" ? "documents" : "properties";
    const fileNameRaw = typeof body.fileName === "string" ? body.fileName : "asset";
    const dataUrl = typeof body.dataUrl === "string" ? body.dataUrl : "";

    const match = dataUrl.match(/^data:([a-zA-Z0-9/+.-]+);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      res.status(400).json({ error: "Invalid base64 upload payload." });
      return;
    }

    const mime = match[1].toLowerCase();
    const b64 = match[2];
    const buffer = Buffer.from(b64, "base64");

    const maxBytes = kind === "properties" ? 2 * 1024 * 1024 : 3 * 1024 * 1024;
    if (buffer.length === 0 || buffer.length > maxBytes) {
      res.status(400).json({ error: "Uploaded file exceeds allowed size limit." });
      return;
    }

    const mimeExtMap: Record<string, string> =
      kind === "properties"
        ? {
            "image/jpeg": ".jpg",
            "image/jpg": ".jpg",
            "image/png": ".png",
            "image/webp": ".webp",
          }
        : {
            "application/pdf": ".pdf",
            "text/plain": ".txt",
            "image/jpeg": ".jpg",
            "image/png": ".png",
          };

    const ext = mimeExtMap[mime];
    if (!ext) {
      res.status(400).json({ error: `Unsupported file type: ${mime}` });
      return;
    }

    const safeBase = fileNameRaw
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 40) || "asset";
    const finalName = `${safeBase}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}${ext}`;

    const targetDir = path.resolve(UPLOAD_ROOT, kind);
    const resolvedTarget = path.resolve(targetDir, finalName);
    if (!resolvedTarget.startsWith(targetDir + path.sep)) {
      res.status(400).json({ error: "Invalid file path." });
      return;
    }

    try {
      await fs.mkdir(targetDir, { recursive: true });
      await fs.writeFile(resolvedTarget, buffer);
      const publicUrl = `/uploads/${kind}/${finalName}`;
      await writeAdminAuditLog(
        req,
        kind === "properties" ? "UPLOAD_PROPERTY_IMAGE" : "UPLOAD_SUPPORTING_DOC",
        "upload",
        finalName,
        `Uploaded ${kind} asset (${publicUrl}).`
      );
      res.status(201).json({ ok: true, url: publicUrl, fileName: finalName });
    } catch (err) {
      console.error("Admin upload error:", err);
      res.status(500).json({ error: "Failed to persist uploaded file." });
    }
  });

  // Prompt 29: Properties Admin CRUD
  router.get("/properties", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    try {
      const properties = await runFirestoreQuery("properties", null, req.rawIdToken);
      res.json({ properties });
    } catch (err) {
      console.error("Admin properties fetch failed:", err);
      res.status(502).json({ error: "Unable to load properties." });
    }
  });

  router.post("/properties", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const b = (req.body ?? {}) as Record<string, unknown>;
    const propId = makeDocId("prop");
    const fields: Record<string, unknown> = {
      title: String(b.title ?? "").trim().slice(0, 140),
      location: String(b.location ?? "").trim().slice(0, 140),
      assetType: String(b.assetType ?? "Commercial Real Estate").trim().slice(0, 80),
      targetYieldPct: Math.max(0, Number(b.targetYieldPct ?? 0) || 0),
      minEntry: Math.max(1, Number(b.minEntry ?? 1000) || 1000),
      valuation: Math.max(1, Number(b.valuation ?? 100000) || 100000),
      occupancyPct: Math.min(100, Math.max(0, Number(b.occupancyPct ?? 95) || 0)),
      status: b.status === "Fully Subscribed" ? "Fully Subscribed" : "Open",
      published: b.published !== false,
      image: String(b.image ?? "/images/commercial-property.png").trim().slice(0, 200),
      summary: String(b.summary ?? "").trim().slice(0, 600),
      ...(typeof b.supportingDocUrl === "string" && b.supportingDocUrl.trim()
        ? { supportingDocUrl: b.supportingDocUrl.trim().slice(0, 200) }
        : {}),
      ...(typeof b.supportingDocName === "string" && b.supportingDocName.trim()
        ? { supportingDocName: b.supportingDocName.trim().slice(0, 140) }
        : {}),
    };

    if (!fields.title || !fields.location || !fields.summary) {
      res.status(400).json({ error: "Title, location, and summary are required." });
      return;
    }

    try {
      await commitFirestoreWrites(
        [
          {
            collection: "properties",
            docId: propId,
            fields,
            serverTimestamps: ["createdAt", "updatedAt"],
            precondition: { exists: false },
          },
        ],
        req.rawIdToken
      );
      await writeAdminAuditLog(
        req,
        "CREATE_PROPERTY",
        "property",
        propId,
        `Created property offering "${String(fields.title)}".`
      );
      res.status(201).json({ ok: true, id: propId });
    } catch (err) {
      console.error("Create property failed:", err);
      res.status(502).json({ error: "Unable to create property offering." });
    }
  });

  router.put("/properties/:id", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const id = paramStr(req.params.id);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const existing = await getFirestoreDoc("properties", id, req.rawIdToken).catch(() => null);
    if (!existing) {
      res.status(404).json({ error: "Property record not found." });
      return;
    }

    const patch: Record<string, unknown> = {
      title: String(b.title ?? existing.title ?? "").trim().slice(0, 140),
      location: String(b.location ?? existing.location ?? "").trim().slice(0, 140),
      assetType: String(b.assetType ?? existing.assetType ?? "Commercial").trim().slice(0, 80),
      targetYieldPct: Math.max(0, Number(b.targetYieldPct ?? existing.targetYieldPct ?? 0) || 0),
      minEntry: Math.max(1, Number(b.minEntry ?? existing.minEntry ?? 1000) || 1000),
      valuation: Math.max(1, Number(b.valuation ?? existing.valuation ?? 100000) || 100000),
      occupancyPct: Math.min(100, Math.max(0, Number(b.occupancyPct ?? existing.occupancyPct ?? 95) || 0)),
      status: b.status === "Fully Subscribed" ? "Fully Subscribed" : "Open",
      published: typeof b.published === "boolean" ? b.published : existing.published !== false,
      image: String(b.image ?? existing.image ?? "/images/commercial-property.png").trim().slice(0, 200),
      summary: String(b.summary ?? existing.summary ?? "").trim().slice(0, 600),
      ...(typeof b.supportingDocUrl === "string"
        ? { supportingDocUrl: b.supportingDocUrl.trim().slice(0, 200) }
        : {}),
      ...(typeof b.supportingDocName === "string"
        ? { supportingDocName: b.supportingDocName.trim().slice(0, 140) }
        : {}),
    };

    try {
      await patchFirestoreFields(
        "properties",
        id,
        patch,
        req.rawIdToken,
        Object.keys(patch),
        ["updatedAt"]
      );
      await writeAdminAuditLog(
        req,
        "UPDATE_PROPERTY",
        "property",
        id,
        `Updated property "${String(patch.title)}" (published: ${String(patch.published)}).`
      );
      res.json({ ok: true, id });
    } catch (err) {
      console.error("Update property failed:", err);
      res.status(502).json({ error: "Unable to update property offering." });
    }
  });

  router.delete("/properties/:id", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const id = paramStr(req.params.id);
    try {
      await deleteFirestoreDoc("properties", id, req.rawIdToken);
      await writeAdminAuditLog(
        req,
        "DELETE_PROPERTY",
        "property",
        id,
        `Removed property offering ${id}.`
      );
      res.json({ ok: true });
    } catch (err) {
      console.error("Delete property failed:", err);
      res.status(502).json({ error: "Unable to delete property offering." });
    }
  });

  // Prompt 30: Investment Plan Management
  router.get("/plans", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    try {
      const stored = await runFirestoreQuery("investmentPlans", null, req.rawIdToken).catch(
        () => []
      );
      const map = new Map<string, Record<string, unknown>>();
      for (const m of INVESTMENT_MANDATES) {
        map.set(m.id, {
          ...m,
          availabilityStatus: "Open",
          published: true,
          source: "default",
        });
      }
      for (const s of stored) {
        map.set(s.id, {
          ...s,
          source: "database",
        });
      }
      res.json({ plans: Array.from(map.values()) });
    } catch (err) {
      console.error("Admin plans fetch failed:", err);
      res.status(502).json({ error: "Unable to load investment plans." });
    }
  });

  router.post("/plans", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const b = (req.body ?? {}) as Record<string, unknown>;
    const planId =
      typeof b.id === "string" && b.id.trim()
        ? b.id.trim().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64)
        : makeDocId("plan");
    const category =
      b.category === "stock" || b.category === "estate" ? b.category : "crypto";
    const minDeposit = Math.max(1, Number(b.minDeposit ?? 500) || 500);
    const maxDeposit = Math.max(minDeposit, Number(b.maxDeposit ?? minDeposit * 10) || minDeposit);
    const fields: Record<string, unknown> = {
      name: String(b.name ?? "").trim().slice(0, 80),
      category,
      categoryLabel:
        category === "crypto"
          ? "Digital Assets"
          : category === "stock"
            ? "Global Equities"
            : "Real Estate",
      audience: String(b.audience ?? "Structured institutional portfolio allocation").trim().slice(0, 160),
      description: String(b.description ?? "").trim().slice(0, 800),
      minDeposit,
      maxDeposit,
      dailyRatePct: Math.max(0.1, Number(b.dailyRatePct ?? 1.5) || 1.5),
      durationDays: Math.max(1, Math.round(Number(b.durationDays ?? 30) || 30)),
      paymentFrequency: String(b.paymentFrequency ?? "Daily cycle accrual").trim().slice(0, 160),
      settlementRail: String(b.settlementRail ?? "USDT (TRC20) / Bank Wire").trim().slice(0, 120),
      returnTerms: String(b.returnTerms ?? "").trim().slice(0, 500),
      availabilityStatus:
        b.availabilityStatus === "Paused" || b.availabilityStatus === "Closed"
          ? b.availabilityStatus
          : "Open",
      published: b.published !== false,
      image: String(b.image ?? "/images/hero-private-capital.png").trim().slice(0, 200),
    };

    if (!fields.name || !fields.description || !fields.returnTerms) {
      res.status(400).json({
        error: "Plan name, description, and return terms are required.",
      });
      return;
    }

    try {
      const existing = await getFirestoreDoc("investmentPlans", planId, req.rawIdToken).catch(
        () => null
      );
      if (existing) {
        await patchFirestoreFields(
          "investmentPlans",
          planId,
          fields,
          req.rawIdToken,
          Object.keys(fields),
          ["updatedAt"]
        );
      } else {
        await commitFirestoreWrites(
          [
            {
              collection: "investmentPlans",
              docId: planId,
              fields,
              serverTimestamps: ["createdAt", "updatedAt"],
              precondition: { exists: false },
            },
          ],
          req.rawIdToken
        );
      }
      await writeAdminAuditLog(
        req,
        existing ? "UPDATE_INVESTMENT_PLAN" : "CREATE_INVESTMENT_PLAN",
        "investmentPlan",
        planId,
        `${existing ? "Updated" : "Created"} plan "${String(fields.name)}" (status: ${String(fields.availabilityStatus)}, published: ${String(fields.published)}). Existing active positions retain original terms.`
      );
      res.status(existing ? 200 : 201).json({ ok: true, id: planId });
    } catch (err) {
      console.error("Save plan failed:", err);
      res.status(502).json({
        error: "Unable to persist investment plan. Check Firestore rules deployment.",
      });
    }
  });

  // Prompt 31 & 32: Deposits & Withdrawals Administration
  router.get("/deposits", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    try {
      const allTxs = await runFirestoreQuery("transactions", null, req.rawIdToken);
      const deposits = allTxs
        .filter((t) => t.type === "Deposit")
        .sort((a, b) => {
          const msA = typeof a.createdAt === "string" ? Date.parse(a.createdAt) || 0 : 0;
          const msB = typeof b.createdAt === "string" ? Date.parse(b.createdAt) || 0 : 0;
          return msB - msA;
        });
      res.json({ deposits });
    } catch (err) {
      console.error("Admin deposits fetch failed:", err);
      res.status(502).json({ error: "Unable to load deposit queue." });
    }
  });

  router.post("/deposits/:txId/resolve", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const txId = paramStr(req.params.txId);
    const rawToken = req.rawIdToken;
    const decision = req.body?.decision === "Rejected" ? "Rejected" : "Completed";
    const evidenceNote =
      typeof req.body?.evidenceNote === "string" ? req.body.evidenceNote.trim() : "";

    if (decision === "Completed" && !evidenceNote) {
      res.status(400).json({
        error: "Enter payment verification / evidence confirmation before crediting balance.",
      });
      return;
    }

    try {
      const txDoc = await getFirestoreDoc("transactions", txId, rawToken);
      if (!txDoc || txDoc.type !== "Deposit") {
        res.status(404).json({ error: "Deposit transaction not found." });
        return;
      }
      if (txDoc.status !== "Pending") {
        res.status(409).json({ error: "Deposit has already been resolved." });
        return;
      }

      const targetUid = String(txDoc.userId ?? "");
      const userDoc = await getFirestoreDoc("users", targetUid, rawToken);
      if (!userDoc) {
        res.status(404).json({ error: "Customer account not found." });
        return;
      }

      const amount = Number(txDoc.amount ?? 0) || 0;
      const root = firestoreRootPath();
      const writes: Array<Record<string, unknown>> = [
        {
          update: {
            name: `${root}/transactions/${txId}`,
            fields: {
              userId: { stringValue: targetUid },
              userEmail: { stringValue: String(txDoc.userEmail ?? "") },
              type: { stringValue: "Deposit" },
              method: { stringValue: String(txDoc.method ?? "") },
              amount: { doubleValue: amount },
              destination: { stringValue: String(txDoc.destination ?? "") },
              reference: { stringValue: String(txDoc.reference ?? "") },
              status: { stringValue: decision },
              createdAt: { timestampValue: String(txDoc.createdAt ?? new Date().toISOString()) },
            },
          },
          updateTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
          currentDocument: txDoc._updateTime
            ? { updateTime: txDoc._updateTime }
            : { exists: true },
        },
      ];

      if (decision === "Completed") {
        const newBal = Number(((Number(userDoc.walletBalance ?? 0) || 0) + amount).toFixed(2));
        const newDep = Number(((Number(userDoc.totalDeposit ?? 0) || 0) + amount).toFixed(2));
        writes.push({
          update: {
            name: `${root}/users/${targetUid}`,
            fields: buildFullUserFields(userDoc, {
              walletBalance: newBal,
              totalDeposit: newDep,
            }),
          },
          updateTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
          currentDocument: userDoc._updateTime
            ? { updateTime: userDoc._updateTime }
            : { exists: true },
        });
      }

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
        const txt = await commitRes.text().catch(() => "");
        throw new Error(`Deposit resolution commit failed (${commitRes.status}): ${txt}`);
      }

      await writeAdminAuditLog(
        req,
        decision === "Completed" ? "APPROVE_DEPOSIT" : "REJECT_DEPOSIT",
        "transaction",
        txId,
        `${decision} deposit ${String(txDoc.reference ?? txId)} ($${amount.toFixed(2)}). Evidence: ${evidenceNote || "Rejected during review"}`
      );
      await enqueueMailEvent({
        eventType: decision === "Completed" ? "deposit_approved" : "deposit_rejected",
        userId: targetUid,
        recipient: String(txDoc.userEmail || userDoc.email || ""),
        rawToken,
        values: {
          firstName: String(userDoc.displayName || userDoc.email || "Investor").split(/[ @]/)[0],
          amount: `$${amount.toFixed(2)}`,
          reference: String(txDoc.reference ?? txId),
          method: String(txDoc.method ?? ""),
          status: decision,
        },
      }).catch((error) => console.error("Deposit resolution mail event queue failed:", error));

      res.json({ ok: true, id: txId, status: decision });
    } catch (err) {
      console.error("Resolve deposit error:", err);
      res.status(502).json({ error: "Unable to resolve deposit request." });
    }
  });

  router.get("/withdrawals", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    try {
      const allTxs = await runFirestoreQuery("transactions", null, req.rawIdToken);
      const withdrawals = allTxs
        .filter((t) => t.type === "Withdrawal")
        .sort((a, b) => {
          const msA = typeof a.createdAt === "string" ? Date.parse(a.createdAt) || 0 : 0;
          const msB = typeof b.createdAt === "string" ? Date.parse(b.createdAt) || 0 : 0;
          return msB - msA;
        });
      res.json({ withdrawals });
    } catch (err) {
      console.error("Admin withdrawals fetch failed:", err);
      res.status(502).json({ error: "Unable to load withdrawal queue." });
    }
  });

  router.post("/withdrawals/:txId/resolve", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const txId = paramStr(req.params.txId);
    const rawToken = req.rawIdToken;
    const decision = req.body?.decision === "Rejected" ? "Rejected" : "Completed";
    const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";

    try {
      const txDoc = await getFirestoreDoc("transactions", txId, rawToken);
      if (!txDoc || txDoc.type !== "Withdrawal") {
        res.status(404).json({ error: "Withdrawal request not found." });
        return;
      }
      if (txDoc.status !== "Pending") {
        res.status(409).json({ error: "Withdrawal has already been resolved." });
        return;
      }

      const targetUid = String(txDoc.userId ?? "");
      const userDoc = await getFirestoreDoc("users", targetUid, rawToken);
      if (!userDoc) {
        res.status(404).json({ error: "Customer account not found." });
        return;
      }

      const amount = Number(txDoc.amount ?? 0) || 0;
      const root = firestoreRootPath();
      const writes: Array<Record<string, unknown>> = [
        {
          update: {
            name: `${root}/transactions/${txId}`,
            fields: {
              userId: { stringValue: targetUid },
              userEmail: { stringValue: String(txDoc.userEmail ?? "") },
              type: { stringValue: "Withdrawal" },
              method: { stringValue: String(txDoc.method ?? "") },
              amount: { doubleValue: amount },
              destination: { stringValue: String(txDoc.destination ?? "") },
              reference: { stringValue: String(txDoc.reference ?? "") },
              status: { stringValue: decision },
              createdAt: { timestampValue: String(txDoc.createdAt ?? new Date().toISOString()) },
            },
          },
          updateTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
          currentDocument: txDoc._updateTime
            ? { updateTime: txDoc._updateTime }
            : { exists: true },
        },
      ];

      // Refund reserved funds if rejected
      if (decision === "Rejected") {
        const refunded = Number(((Number(userDoc.walletBalance ?? 0) || 0) + amount).toFixed(2));
        writes.push({
          update: {
            name: `${root}/users/${targetUid}`,
            fields: buildFullUserFields(userDoc, { walletBalance: refunded }),
          },
          updateTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
          currentDocument: userDoc._updateTime
            ? { updateTime: userDoc._updateTime }
            : { exists: true },
        });
      }

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
        const txt = await commitRes.text().catch(() => "");
        throw new Error(`Withdrawal resolution failed (${commitRes.status}): ${txt}`);
      }

      await writeAdminAuditLog(
        req,
        decision === "Completed" ? "APPROVE_WITHDRAWAL" : "REJECT_WITHDRAWAL",
        "transaction",
        txId,
        `${decision} withdrawal ${String(txDoc.reference ?? txId)} ($${amount.toFixed(2)}). ${note || ""}`.trim()
      );
      await enqueueMailEvent({
        eventType: decision === "Completed" ? "withdrawal_approved" : "withdrawal_rejected",
        userId: targetUid,
        recipient: String(txDoc.userEmail || userDoc.email || ""),
        rawToken,
        values: {
          firstName: String(userDoc.displayName || userDoc.email || "Investor").split(/[ @]/)[0],
          amount: `$${amount.toFixed(2)}`,
          reference: String(txDoc.reference ?? txId),
          method: String(txDoc.method ?? ""),
          status: decision,
        },
      }).catch((error) => console.error("Withdrawal resolution mail event queue failed:", error));

      res.json({ ok: true, id: txId, status: decision });
    } catch (err) {
      console.error("Resolve withdrawal error:", err);
      res.status(502).json({ error: "Unable to resolve withdrawal request." });
    }
  });

  // Prompt 33: Investment Administration (view, search, schedule, status update with audit — never silently alters amounts)
  router.get("/investments", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    try {
      const [investments, users] = await Promise.all([
        runFirestoreQuery("investments", null, req.rawIdToken),
        runFirestoreQuery("users", null, req.rawIdToken),
      ]);
      const userMap = new Map(users.map((u) => [String(u.uid ?? u.id), u]));

      const enriched = investments.map((inv) => {
        const u = userMap.get(String(inv.userId ?? ""));
        const durationDays = Math.max(1, Number(inv.durationDays ?? 30) || 30);
        const createdIso =
          typeof inv.createdAt === "string" ? inv.createdAt : new Date().toISOString();
        const startMs = Date.parse(createdIso) || Date.now();
        const maturityDate = new Date(startMs + durationDays * 86_400_000).toISOString();
        return {
          id: inv.id,
          reference: `INV-${inv.id.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()}`,
          userId: String(inv.userId ?? ""),
          userEmail: String(u?.email ?? ""),
          userName: String(u?.displayName ?? ""),
          planId: String(inv.planId ?? ""),
          planName: String(inv.planName ?? ""),
          category: String(inv.category ?? "crypto"),
          amount: Number(inv.amount ?? 0) || 0,
          dailyRatePct: Number(inv.dailyRatePct ?? 0) || 0,
          durationDays,
          status: String(inv.status ?? "Active"),
          startDate: createdIso,
          maturityDate,
        };
      });

      res.json({ investments: enriched });
    } catch (err) {
      console.error("Admin investments fetch failed:", err);
      res.status(502).json({ error: "Unable to load investments." });
    }
  });

  router.post("/investments/:id/status", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const id = paramStr(req.params.id);
    const status = req.body?.status === "Completed" ? "Completed" : "Active";
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

    if (!reason || reason.length < 4) {
      res.status(400).json({
        error: "An administrative audit reason is required before modifying investment status.",
      });
      return;
    }

    try {
      const existing = await getFirestoreDoc("investments", id, req.rawIdToken);
      if (!existing) {
        res.status(404).json({ error: "Investment record not found." });
        return;
      }
      await patchFirestoreFields(
        "investments",
        id,
        { status },
        req.rawIdToken,
        ["status"],
        ["updatedAt"]
      );
      await writeAdminAuditLog(
        req,
        "UPDATE_INVESTMENT_STATUS",
        "investment",
        id,
        `Updated investment ${id} status from ${String(existing.status)} to ${status}. Reason: ${reason}`
      );
      res.json({ ok: true, id, status });
    } catch (err) {
      console.error("Update investment status failed:", err);
      res.status(502).json({ error: "Unable to update investment status." });
    }
  });

  // Additional admin views for Transactions, Referrals, Documents, Support, Settings/Audit
  router.get("/transactions", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) return;
    try {
      const transactions = await runFirestoreQuery("transactions", null, req.rawIdToken);
      res.json({ transactions });
    } catch {
      res.status(502).json({ error: "Unable to load transactions." });
    }
  });

  router.get("/referrals", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) return;
    try {
      const [users, referrals] = await Promise.all([
        runFirestoreQuery("users", null, req.rawIdToken),
        runFirestoreQuery("referrals", null, req.rawIdToken).catch(() => []),
      ]);
      res.json({
        referrals,
        partnerSummary: users.map((u) => ({
          uid: String(u.uid ?? u.id),
          email: String(u.email ?? ""),
          displayName: String(u.displayName ?? ""),
          code: `BF-${String(u.uid ?? u.id).slice(0, 8).toUpperCase()}`,
          referralBonus: Number(u.referralBonus ?? 0) || 0,
        })),
      });
    } catch {
      res.status(502).json({ error: "Unable to load referral records." });
    }
  });

  router.get("/documents", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) return;
    try {
      const documents = await runFirestoreQuery("documents", null, req.rawIdToken).catch(
        () => []
      );
      res.json({ documents });
    } catch {
      res.status(502).json({ error: "Unable to load documents." });
    }
  });

  router.get("/support", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) return;
    try {
      const inquiries = await runFirestoreQuery("inquiries", null, req.rawIdToken).catch(
        () => []
      );
      res.json({ inquiries });
    } catch {
      res.status(502).json({ error: "Unable to load support inquiries." });
    }
  });

  router.get("/audit-logs", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) return;
    try {
      const logs = await runFirestoreQuery("auditLogs", null, req.rawIdToken).catch(() => []);
      res.json({ logs });
    } catch {
      res.status(502).json({ error: "Unable to load audit logs." });
    }
  });

  router.post("/broadcasts", async (req: AuthRequest, res) => {
    if (!req.rawIdToken) return;
    const title = typeof req.body?.title === "string" ? req.body.title.trim().slice(0, 140) : "";
    const body = typeof req.body?.body === "string" ? req.body.body.trim().slice(0, 600) : "";
    if (!title || !body) {
      res.status(400).json({ error: "Title and message body are required." });
      return;
    }
    try {
      const id = makeDocId("not");
      await commitFirestoreWrites(
        [
          {
            collection: "notifications",
            docId: id,
            fields: {
              userId: "all",
              category: "Announcement",
              title,
              body,
              read: false,
            },
            serverTimestamps: ["createdAt"],
            precondition: { exists: false },
          },
        ],
        req.rawIdToken
      );
      await writeAdminAuditLog(
        req,
        "SEND_PLATFORM_BROADCAST",
        "notification",
        id,
        `Published broadcast "${title}".`
      );
      res.status(201).json({ ok: true, id });
    } catch {
      res.status(502).json({ error: "Unable to publish broadcast." });
    }
  });

  return router;
}
