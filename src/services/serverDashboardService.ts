import firebaseConfig from "../../firebase-applet-config.json" with { type: "json" };
import { getMandateById, INVESTMENT_MANDATES, type InvestmentMandate } from "../trading/tradingPage.ts";

interface FirestoreValue {
  stringValue?: string;
  integerValue?: string;
  doubleValue?: number;
  booleanValue?: boolean;
  timestampValue?: string;
  nullValue?: null;
  arrayValue?: { values?: FirestoreValue[] };
  mapValue?: { fields?: Record<string, FirestoreValue> };
}

interface FirestoreDocument {
  name: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

interface RunQueryRow {
  document?: FirestoreDocument;
  readTime?: string;
}

export interface ServerUserAccount {
  uid: string;
  email: string;
  displayName: string;
  country: string;
  phone: string;
  walletBalance: number;
  totalProfit: number;
  bonus: number;
  referralBonus: number;
  totalDeposit: number;
  preferredRail: string;
  emailAlerts: boolean;
  twoFactorEnabled: boolean;
  role: string;
  createdAt: string | null;
}

export interface ServerTransactionItem {
  id: string;
  userId: string;
  userEmail: string;
  type: "Deposit" | "Withdrawal" | "Investment" | "Profit" | "Referral";
  method: string;
  amount: number;
  destination: string;
  reference: string;
  status: "Pending" | "Completed" | "Rejected";
  createdAt: string | null;
  updatedAt: string | null;
}

export interface ServerInvestmentItem {
  id: string;
  reference: string;
  userId: string;
  planId: string;
  planName: string;
  category: "crypto" | "stock" | "estate";
  categoryLabel: string;
  amount: number;
  dailyRatePct: number;
  durationDays: number;
  status: "Active" | "Completed";
  investmentDate: string;
  startDate: string;
  maturityDate: string;
  daysElapsed: number;
  daysRemaining: number;
  progressPct: number;
  expectedPaymentTerms: string;
  paymentFrequency: string;
  settlementRail: string;
  projectedCycleReturn: number;
  transactions: ServerTransactionItem[];
}

export interface PortfolioCategorySummary {
  category: "crypto" | "stock" | "estate";
  label: string;
  investedAmount: number;
  activeCount: number;
  totalCount: number;
  sharePct: number;
}

export interface ServerOverviewPayload {
  account: {
    uid: string;
    email: string;
    displayName: string;
    preferredRail: string;
    role: string;
  };
  metrics: {
    availableBalance: number;
    totalInvested: number;
    activeInvested: number;
    totalEarnings: number;
    totalProfit: number;
    bonus: number;
    referralBonus: number;
    totalDeposit: number;
    pendingPayments: number;
    pendingCount: number;
    activeInvestmentsCount: number;
    completedInvestmentsCount: number;
  };
  activeInvestments: ServerInvestmentItem[];
  recentTransactions: ServerTransactionItem[];
  portfolioSummary: PortfolioCategorySummary[];
  opportunities: InvestmentMandate[];
  unreadNotificationsCount: number;
  syncedAt: string;
}

const VALID_DOC_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

function firestoreBaseUrl(): string {
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    firebaseConfig.projectId
  )}/databases/${encodeURIComponent(firebaseConfig.firestoreDatabaseId)}/documents`;
}

function decodeField(val?: FirestoreValue): unknown {
  if (!val) return undefined;
  if ("stringValue" in val) return val.stringValue;
  if ("integerValue" in val) return Number(val.integerValue);
  if ("doubleValue" in val) return Number(val.doubleValue);
  if ("booleanValue" in val) return Boolean(val.booleanValue);
  if ("timestampValue" in val) return val.timestampValue;
  if ("nullValue" in val) return null;
  if ("arrayValue" in val) {
    return (val.arrayValue?.values ?? []).map((item) => decodeField(item));
  }
  if ("mapValue" in val) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val.mapValue?.fields ?? {})) {
      out[k] = decodeField(v);
    }
    return out;
  }
  return undefined;
}

function decodeDocument(doc: FirestoreDocument): Record<string, unknown> & { id: string } {
  const id = doc.name.split("/").pop() || "";
  const out: Record<string, unknown> & { id: string } = { id };
  for (const [key, val] of Object.entries(doc.fields ?? {})) {
    out[key] = decodeField(val);
  }
  if (!out.createdAt && doc.createTime) {
    out.createdAt = doc.createTime;
  }
  if (!out.updatedAt && doc.updateTime) {
    out.updatedAt = doc.updateTime;
  }
  return out;
}

async function fetchUserDocument(
  uid: string,
  rawToken: string
): Promise<ServerUserAccount | null> {
  if (!VALID_DOC_ID_REGEX.test(uid)) {
    return null;
  }

  const res = await fetch(`${firestoreBaseUrl()}/users/${encodeURIComponent(uid)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${rawToken}`,
    },
    signal: AbortSignal.timeout(5000),
  });

  if (res.status === 404) {
    return null;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Firestore user profile read failed (${res.status}): ${text}`);
  }

  const doc = (await res.json()) as FirestoreDocument;
  const raw = decodeDocument(doc);
  return {
    uid: String(raw.uid ?? uid),
    email: String(raw.email ?? ""),
    displayName: String(raw.displayName ?? "BitfuryTech Investor"),
    country: String(raw.country ?? ""),
    phone: String(raw.phone ?? ""),
    walletBalance: Number(raw.walletBalance ?? 0) || 0,
    totalProfit: Number(raw.totalProfit ?? 0) || 0,
    bonus: Number(raw.bonus ?? 0) || 0,
    referralBonus: Number(raw.referralBonus ?? 0) || 0,
    totalDeposit: Number(raw.totalDeposit ?? 0) || 0,
    preferredRail: String(raw.preferredRail ?? "USDT (TRC20)"),
    emailAlerts: Boolean(raw.emailAlerts ?? true),
    twoFactorEnabled: Boolean(raw.twoFactorEnabled ?? false),
    role: String(raw.role ?? "investor"),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : null,
  };
}

async function runCollectionQuery(
  collectionId: string,
  structuredWhere: Record<string, unknown>,
  rawToken: string
): Promise<Array<Record<string, unknown> & { id: string }>> {
  const res = await fetch(`${firestoreBaseUrl()}:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${rawToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: structuredWhere,
      },
    }),
    signal: AbortSignal.timeout(5000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Firestore query on ${collectionId} failed (${res.status}): ${text}`);
  }

  const rows = (await res.json()) as RunQueryRow[];
  return rows
    .filter((row): row is { document: FirestoreDocument } => Boolean(row.document))
    .map((row) => decodeDocument(row.document));
}

function toTimestampMs(iso: string | null): number {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

function normalizeTransactions(
  rows: Array<Record<string, unknown> & { id: string }>,
  uid: string
): ServerTransactionItem[] {
  return rows
    .filter((row) => String(row.userId ?? "") === uid)
    .map((row) => ({
      id: row.id,
      userId: String(row.userId ?? ""),
      userEmail: String(row.userEmail ?? ""),
      type: (String(row.type ?? "Deposit") as ServerTransactionItem["type"]),
      method: String(row.method ?? ""),
      amount: Number(row.amount ?? 0) || 0,
      destination: String(row.destination ?? ""),
      reference: String(row.reference ?? row.id),
      status: (String(row.status ?? "Pending") as ServerTransactionItem["status"]),
      createdAt: typeof row.createdAt === "string" ? row.createdAt : null,
      updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : null,
    }))
    .sort((a, b) => toTimestampMs(b.createdAt) - toTimestampMs(a.createdAt));
}

function categoryLabelFor(category: "crypto" | "stock" | "estate"): string {
  switch (category) {
    case "crypto":
      return "Digital Assets";
    case "stock":
      return "Global Equities";
    case "estate":
      return "Real Estate";
  }
}

function enrichInvestments(
  rows: Array<Record<string, unknown> & { id: string }>,
  userTransactions: ServerTransactionItem[],
  uid: string
): ServerInvestmentItem[] {
  const nowMs = Date.now();

  return rows
    .filter((row) => String(row.userId ?? "") === uid)
    .map((row) => {
      const planId = String(row.planId ?? "");
      const mandate = getMandateById(planId);
      const category = (String(row.category ?? mandate?.category ?? "crypto") as
        | "crypto"
        | "stock"
        | "estate");
      const amount = Number(row.amount ?? 0) || 0;
      const dailyRatePct = Number(row.dailyRatePct ?? mandate?.dailyRatePct ?? 0) || 0;
      const durationDays = Math.max(1, Number(row.durationDays ?? mandate?.durationDays ?? 30) || 30);
      const status: "Active" | "Completed" =
        String(row.status ?? "Active") === "Completed" ? "Completed" : "Active";
      const createdIso =
        typeof row.createdAt === "string" ? row.createdAt : new Date(nowMs).toISOString();
      const startMs = toTimestampMs(createdIso) || nowMs;
      const totalCycleMs = durationDays * 86_400_000;
      const maturityIso = new Date(startMs + totalCycleMs).toISOString();

      const elapsedMs = Math.max(0, nowMs - startMs);
      const daysElapsed =
        status === "Completed"
          ? durationDays
          : Math.min(durationDays, Math.floor(elapsedMs / 86_400_000));
      const daysRemaining = status === "Completed" ? 0 : Math.max(0, durationDays - daysElapsed);
      const progressPct =
        status === "Completed"
          ? 100
          : Math.min(100, Math.max(0, Math.round((elapsedMs / totalCycleMs) * 100)));

      const planName = String(row.planName ?? mandate?.name ?? "Investment Mandate");
      const relatedTransactions = userTransactions.filter((tx) => {
        if (tx.userId !== uid) return false;
        if (tx.type !== "Investment" && tx.type !== "Profit") return false;
        return (
          tx.destination === planId ||
          tx.method.toLowerCase().includes(planName.toLowerCase())
        );
      });

      return {
        id: row.id,
        reference: `INV-${row.id.replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase()}`,
        userId: uid,
        planId,
        planName,
        category,
        categoryLabel: mandate?.categoryLabel || categoryLabelFor(category),
        amount,
        dailyRatePct,
        durationDays,
        status,
        investmentDate: createdIso,
        startDate: createdIso,
        maturityDate: maturityIso,
        daysElapsed,
        daysRemaining,
        progressPct,
        expectedPaymentTerms:
          mandate?.returnTerms ||
          `${dailyRatePct}% indicative daily target benchmark over ${durationDays} days. Returns are variable and not guaranteed.`,
        paymentFrequency:
          mandate?.paymentFrequency ||
          `Scheduled cycle distribution over ${durationDays}-day term`,
        settlementRail: mandate?.settlementRail || "Custody Wallet",
        projectedCycleReturn: Number((amount * (dailyRatePct / 100) * durationDays).toFixed(2)),
        transactions: relatedTransactions,
      };
    })
    .sort((a, b) => toTimestampMs(b.startDate) - toTimestampMs(a.startDate));
}

export async function getAuthenticatedDashboardOverview(
  uid: string,
  email: string,
  rawToken: string
): Promise<ServerOverviewPayload> {
  const [userDoc, investmentRows, transactionRows, notificationRows] = await Promise.all([
    fetchUserDocument(uid, rawToken),
    runCollectionQuery(
      "investments",
      {
        fieldFilter: {
          field: { fieldPath: "userId" },
          op: "EQUAL",
          value: { stringValue: uid },
        },
      },
      rawToken
    ),
    runCollectionQuery(
      "transactions",
      {
        fieldFilter: {
          field: { fieldPath: "userId" },
          op: "EQUAL",
          value: { stringValue: uid },
        },
      },
      rawToken
    ),
    runCollectionQuery(
      "notifications",
      {
        fieldFilter: {
          field: { fieldPath: "userId" },
          op: "IN",
          value: {
            arrayValue: {
              values: [{ stringValue: uid }, { stringValue: "all" }],
            },
          },
        },
      },
      rawToken
    ),
  ]);

  const transactions = normalizeTransactions(transactionRows, uid);
  const investments = enrichInvestments(investmentRows, transactions, uid);
  const activeInvestments = investments.filter((inv) => inv.status === "Active");
  const completedInvestments = investments.filter((inv) => inv.status === "Completed");

  const availableBalance = userDoc?.walletBalance ?? 0;
  const totalProfit = userDoc?.totalProfit ?? 0;
  const bonus = userDoc?.bonus ?? 0;
  const referralBonus = userDoc?.referralBonus ?? 0;
  const totalDeposit = userDoc?.totalDeposit ?? 0;
  const totalEarnings = Number((totalProfit + bonus + referralBonus).toFixed(2));
  const totalInvested = Number(
    investments.reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)
  );
  const activeInvested = Number(
    activeInvestments.reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)
  );

  const pendingTxs = transactions.filter((tx) => tx.status === "Pending");
  const pendingPayments = Number(
    pendingTxs.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)
  );

  const categories: Array<"crypto" | "stock" | "estate"> = ["crypto", "stock", "estate"];
  const portfolioSummary: PortfolioCategorySummary[] = categories.map((cat) => {
    const items = investments.filter((inv) => inv.category === cat);
    const investedAmount = Number(
      items.reduce((sum, inv) => sum + inv.amount, 0).toFixed(2)
    );
    const activeCount = items.filter((inv) => inv.status === "Active").length;
    const sharePct =
      totalInvested > 0 ? Math.round((investedAmount / totalInvested) * 100) : 0;

    return {
      category: cat,
      label: categoryLabelFor(cat),
      investedAmount,
      activeCount,
      totalCount: items.length,
      sharePct,
    };
  });

  const unreadNotificationsCount = notificationRows.filter(
    (n) => String(n.userId ?? "") === uid && n.read === false
  ).length;

  return {
    account: {
      uid,
      email: userDoc?.email || email,
      displayName: userDoc?.displayName || email.split("@")[0] || "BitfuryTech Investor",
      preferredRail: userDoc?.preferredRail || "USDT (TRC20)",
      role: userDoc?.role || "investor",
    },
    metrics: {
      availableBalance,
      totalInvested,
      activeInvested,
      totalEarnings,
      totalProfit,
      bonus,
      referralBonus,
      totalDeposit,
      pendingPayments,
      pendingCount: pendingTxs.length,
      activeInvestmentsCount: activeInvestments.length,
      completedInvestmentsCount: completedInvestments.length,
    },
    activeInvestments,
    recentTransactions: transactions.slice(0, 6),
    portfolioSummary,
    opportunities: INVESTMENT_MANDATES,
    unreadNotificationsCount,
    syncedAt: new Date().toISOString(),
  };
}

export async function getAuthenticatedCustomerInvestments(
  uid: string,
  rawToken: string
): Promise<{
  investments: ServerInvestmentItem[];
  allTransactions: ServerTransactionItem[];
  summary: {
    totalInvested: number;
    activeCapital: number;
    activeCount: number;
    completedCount: number;
  };
}> {
  const [investmentRows, transactionRows] = await Promise.all([
    runCollectionQuery(
      "investments",
      {
        fieldFilter: {
          field: { fieldPath: "userId" },
          op: "EQUAL",
          value: { stringValue: uid },
        },
      },
      rawToken
    ),
    runCollectionQuery(
      "transactions",
      {
        fieldFilter: {
          field: { fieldPath: "userId" },
          op: "EQUAL",
          value: { stringValue: uid },
        },
      },
      rawToken
    ),
  ]);

  const allTransactions = normalizeTransactions(transactionRows, uid);
  const investments = enrichInvestments(investmentRows, allTransactions, uid);
  const active = investments.filter((inv) => inv.status === "Active");
  const completed = investments.filter((inv) => inv.status === "Completed");

  return {
    investments,
    allTransactions,
    summary: {
      totalInvested: Number(investments.reduce((sum, i) => sum + i.amount, 0).toFixed(2)),
      activeCapital: Number(active.reduce((sum, i) => sum + i.amount, 0).toFixed(2)),
      activeCount: active.length,
      completedCount: completed.length,
    },
  };
}
