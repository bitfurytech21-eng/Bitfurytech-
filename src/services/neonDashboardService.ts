import { isDatabaseConfigured, queryDatabase } from "../db/pool.ts";
import { INVESTMENT_MANDATES, getMandateById, type InvestmentMandate } from "../trading/tradingPage.ts";
import {
  getMockCustomerInvestments,
  getMockCustomerTransactions,
  getMockDashboardOverview,
} from "./inMemoryFinancialMock.ts";

type JsonRecord = Record<string, unknown>;
type DbTransaction = {
  id: string; user_id: string; type: string; amount: string | number; currency: string;
  method: string | null; destination: string | null; reference: string | null;
  status: string; metadata: JsonRecord; created_at: Date | string; updated_at: Date | string;
};
type DbInvestment = {
  id: string; user_id: string; plan_id: string | null; plan_snapshot: JsonRecord;
  principal: string | number; currency: string; status: string;
  started_at: Date | string | null; matures_at: Date | string | null;
  created_at: Date | string; updated_at: Date | string;
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}
function amount(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
function transactionType(value: string): "Deposit" | "Withdrawal" | "Investment" | "Profit" | "Referral" {
  switch (value.toLowerCase()) {
    case "withdrawal": return "Withdrawal";
    case "investment": return "Investment";
    case "return": case "adjustment": return "Profit";
    case "referral": return "Referral";
    default: return "Deposit";
  }
}
function transactionStatus(value: string): "Pending" | "Completed" | "Rejected" {
  if (value.toLowerCase() === "completed") return "Completed";
  if (["rejected", "failed", "cancelled"].includes(value.toLowerCase())) return "Rejected";
  return "Pending";
}
function mapTransaction(row: DbTransaction, email: string) {
  return {
    id: row.id,
    userId: row.user_id,
    userEmail: email,
    type: transactionType(row.type),
    method: row.method ?? "",
    amount: amount(row.amount),
    destination: row.destination ?? "",
    reference: row.reference ?? row.id,
    status: transactionStatus(row.status),
    currency: row.currency,
    description: typeof row.metadata?.description === "string" ? row.metadata.description : row.type.toLowerCase() === "deposit" ? `Deposit notice via ${row.method ?? "account rail"}` : row.type.toLowerCase() === "withdrawal" ? `Withdrawal disbursement via ${row.method ?? "account rail"} to ${row.destination ?? "registered destination"}` : row.type.toLowerCase() === "investment" ? `Investment allocation: ${row.method ?? "investment plan"}` : row.type.toLowerCase() === "referral" ? `Referral commission settlement (${row.method ?? "referral"})` : `Yield distribution: ${row.method ?? "account ledger"}`,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    _investmentId: typeof row.metadata?.investmentId === "string" ? row.metadata.investmentId : null,
  };
}
function stripInternalTx(tx: ReturnType<typeof mapTransaction>) {
  return {
    id: tx.id,
    userId: tx.userId,
    userEmail: tx.userEmail,
    type: tx.type,
    method: tx.method,
    amount: tx.amount,
    destination: tx.destination,
    reference: tx.reference,
    status: tx.status,
    currency: tx.currency,
    description: tx.description,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
  };
}
function categoryOf(value: unknown): "crypto" | "stock" | "estate" {
  return value === "stock" || value === "estate" ? value : "crypto";
}
function mapInvestment(row: DbInvestment, transactions: ReturnType<typeof mapTransaction>[]) {
  const snapshot = record(row.plan_snapshot);
  const mandateLookupId = row.plan_id ?? (typeof snapshot.mandateId === "string" ? snapshot.mandateId : "");
  const mandate = mandateLookupId ? getMandateById(mandateLookupId) : undefined;
  const category = categoryOf(snapshot.category ?? mandate?.category);
  const principal = amount(row.principal);
  const startDate = iso(row.started_at ?? row.created_at) ?? new Date().toISOString();
  const maturityDate = iso(row.matures_at) ?? new Date(new Date(startDate).getTime() + Math.max(1, amount(snapshot.durationDays ?? mandate?.durationDays ?? 30)) * 86400000).toISOString();
  const durationDays = Math.max(1, amount(snapshot.durationDays ?? mandate?.durationDays ?? Math.ceil((Date.parse(maturityDate) - Date.parse(startDate)) / 86400000)));
  const status = row.status.toLowerCase() === "completed" ? "Completed" as const : "Active" as const;
  const elapsed = Math.max(0, Math.floor((Date.now() - Date.parse(startDate)) / 86400000));
  const daysElapsed = status === "Completed" ? durationDays : Math.min(durationDays, elapsed);
  const planName = String(snapshot.name ?? snapshot.planName ?? mandate?.name ?? "Investment");
  const planId = row.plan_id ?? "";
  const related = transactions
    .filter(
      (tx) =>
        tx.userId === row.user_id &&
        (tx.type === "Investment" || tx.type === "Profit") &&
        (tx._investmentId === row.id ||
          tx.destination === row.id ||
          (planId !== "" && tx.destination === planId) ||
          (mandateLookupId !== "" && tx.destination === mandateLookupId) ||
          tx.method.toLowerCase().includes(planName.toLowerCase()))
    )
    .map(stripInternalTx);
  const dailyRatePct = amount(snapshot.dailyRatePct ?? mandate?.dailyRatePct);
  return {
    id: row.id,
    reference: String(snapshot.reference ?? `INV-${row.id.slice(-8).toUpperCase()}`),
    userId: row.user_id,
    planId,
    planName,
    category,
    categoryLabel: String(snapshot.categoryLabel ?? mandate?.categoryLabel ?? (category === "crypto" ? "Digital Assets" : category === "stock" ? "Global Equities" : "Real Estate")),
    amount: principal,
    dailyRatePct,
    durationDays,
    status,
    investmentDate: startDate,
    startDate,
    maturityDate,
    daysElapsed,
    daysRemaining: status === "Completed" ? 0 : Math.max(0, durationDays - daysElapsed),
    progressPct: status === "Completed" ? 100 : Math.min(100, Math.round(daysElapsed / durationDays * 100)),
    expectedPaymentTerms: String(snapshot.returnTerms ?? mandate?.returnTerms ?? "Returns are variable and not guaranteed."),
    paymentFrequency: String(snapshot.paymentFrequency ?? mandate?.paymentFrequency ?? "Scheduled cycle distribution"),
    settlementRail: String(snapshot.settlementRail ?? mandate?.settlementRail ?? "Custody Wallet"),
    projectedCycleReturn: Number((principal * dailyRatePct / 100 * durationDays).toFixed(2)),
    transactions: related,
  };
}

async function loadFinancialRows(userId: string) {
  const [user, profile, wallet, investmentRows, transactionRows, ledger] = await Promise.all([
    queryDatabase<{ id: string; name: string; email: string; "emailVerified": boolean; image: string | null }>(
      'SELECT id, name, email, "emailVerified", image FROM "user" WHERE id = $1 LIMIT 1', [userId]),
    queryDatabase<{ preferred_rail: string }>(
      "SELECT preferred_rail FROM user_profiles WHERE user_id = $1 LIMIT 1", [userId]),
    queryDatabase<{ available_balance: string | number }>(
      "SELECT available_balance FROM wallets WHERE user_id = $1 AND currency = 'USD' LIMIT 1", [userId]),
    queryDatabase<DbInvestment>(
      "SELECT id, user_id, plan_id, plan_snapshot, principal, currency, status, started_at, matures_at, created_at, updated_at FROM investments WHERE user_id = $1 ORDER BY created_at DESC", [userId]),
    queryDatabase<DbTransaction>(
      "SELECT id, user_id, type, amount, currency, method, destination, reference, status, metadata, created_at, updated_at FROM transactions WHERE user_id = $1 ORDER BY created_at DESC", [userId]),
    queryDatabase<{ entry_count: string; last_entry_at: Date | string | null }>(
      "SELECT COUNT(*)::text AS entry_count, MAX(created_at) AS last_entry_at FROM ledger_entries WHERE user_id = $1", [userId]),
  ]);
  if (!user.rows[0]) throw new Error("Authenticated Better Auth account was not found in Neon.");
  const email = user.rows[0].email;
  const transactions = transactionRows.rows.map(row => mapTransaction(row, email));
  const investments = investmentRows.rows
    .filter(row => ["active", "completed"].includes(row.status.toLowerCase()))
    .map(row => mapInvestment(row, transactions));
  return { user: user.rows[0], profile: profile.rows[0], wallet: wallet.rows[0], investments, transactions, ledger: ledger.rows[0] };
}

export async function getNeonDashboardOverview(
  userId: string,
  fallbackUser?: { email?: string | null; name?: string | null }
) {
  if (!isDatabaseConfigured) {
    return getMockDashboardOverview(userId, fallbackUser);
  }
  const rows = await loadFinancialRows(userId);
  const active = rows.investments.filter(item => item.status === "Active");
  const completed = rows.investments.filter(item => item.status === "Completed");
  const totalInvested = Number(rows.investments.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
  const activeInvested = Number(active.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
  const completedTransactions = rows.transactions.filter(tx => tx.status === "Completed");
  const pendingTransactions = rows.transactions.filter(tx => tx.status === "Pending");
  const totalDeposit = Number(completedTransactions.filter(tx => tx.type === "Deposit").reduce((sum, tx) => sum + tx.amount, 0).toFixed(2));
  const totalProfit = Number(completedTransactions.filter(tx => tx.type === "Profit").reduce((sum, tx) => sum + tx.amount, 0).toFixed(2));
  const referralBonus = Number(completedTransactions.filter(tx => tx.type === "Referral").reduce((sum, tx) => sum + tx.amount, 0).toFixed(2));
  const categories: Array<"crypto" | "stock" | "estate"> = ["crypto", "stock", "estate"];
  const portfolioSummary = categories.map(category => {
    const items = rows.investments.filter(item => item.category === category);
    const investedAmount = Number(items.reduce((sum, item) => sum + item.amount, 0).toFixed(2));
    return {
      category,
      label: category === "crypto" ? "Digital Assets" : category === "stock" ? "Global Equities" : "Real Estate",
      investedAmount,
      activeCount: items.filter(item => item.status === "Active").length,
      totalCount: items.length,
      sharePct: totalInvested > 0 ? Math.round(investedAmount / totalInvested * 100) : 0,
    };
  });
  const opportunities: InvestmentMandate[] = INVESTMENT_MANDATES;
  return {
    account: {
      uid: userId,
      email: rows.user.email,
      displayName: rows.user.name || rows.user.email.split("@")[0],
      photoUrl: rows.user.image ?? null,
      preferredRail: rows.profile?.preferred_rail ?? "USDT (TRC20)",
      role: "investor",
    },
    metrics: {
      availableBalance: amount(rows.wallet?.available_balance),
      totalInvested,
      activeInvested,
      totalEarnings: Number((totalProfit + referralBonus).toFixed(2)),
      totalProfit,
      bonus: 0,
      referralBonus,
      totalDeposit,
      pendingPayments: Number(pendingTransactions.reduce((sum, tx) => sum + tx.amount, 0).toFixed(2)),
      pendingCount: pendingTransactions.length,
      activeInvestmentsCount: active.length,
      completedInvestmentsCount: completed.length,
    },
    activeInvestments: active,
    recentTransactions: rows.transactions.slice(0, 6).map(stripInternalTx),
    portfolioSummary,
    opportunities,
    unreadNotificationsCount: 0,
    syncedAt: new Date().toISOString(),
    ledgerSummary: {
      entryCount: amount(rows.ledger?.entry_count),
      lastEntryAt: iso(rows.ledger?.last_entry_at),
    },
  };
}

export async function getNeonCustomerInvestments(userId: string) {
  if (!isDatabaseConfigured) {
    return getMockCustomerInvestments(userId);
  }
  const rows = await loadFinancialRows(userId);
  const active = rows.investments.filter(item => item.status === "Active");
  const completed = rows.investments.filter(item => item.status === "Completed");
  return {
    investments: rows.investments,
    allTransactions: rows.transactions.map(stripInternalTx),
    summary: {
      totalInvested: Number(rows.investments.reduce((sum, item) => sum + item.amount, 0).toFixed(2)),
      activeCapital: Number(active.reduce((sum, item) => sum + item.amount, 0).toFixed(2)),
      activeCount: active.length,
      completedCount: completed.length,
    },
  };
}

export async function getNeonCustomerTransactions(userId: string) {
  if (!isDatabaseConfigured) {
    return getMockCustomerTransactions(userId);
  }
  const rows = await loadFinancialRows(userId);
  return rows.transactions.map(stripInternalTx);
}
