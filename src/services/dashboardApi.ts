import type { InvestmentMandate } from "../trading/tradingPage";

export interface DashboardTransactionDTO {
  id: string;
  userId: string;
  userEmail: string;
  type: "Deposit" | "Withdrawal" | "Investment" | "Profit" | "Referral";
  method: string;
  amount: number;
  destination: string;
  reference: string;
  status: "Pending" | "Completed" | "Rejected";
  currency?: string;
  description?: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface DashboardInvestmentDTO {
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
  transactions: DashboardTransactionDTO[];
}

export interface DashboardPortfolioCategoryDTO {
  category: "crypto" | "stock" | "estate";
  label: string;
  investedAmount: number;
  activeCount: number;
  totalCount: number;
  sharePct: number;
}

export interface DashboardOverviewDTO {
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
  activeInvestments: DashboardInvestmentDTO[];
  recentTransactions: DashboardTransactionDTO[];
  portfolioSummary: DashboardPortfolioCategoryDTO[];
  opportunities: InvestmentMandate[];
  unreadNotificationsCount: number;
  syncedAt: string;
}

export interface DashboardInvestmentsDTO {
  investments: DashboardInvestmentDTO[];
  allTransactions: DashboardTransactionDTO[];
  summary: {
    totalInvested: number;
    activeCapital: number;
    activeCount: number;
    completedCount: number;
  };
}

export interface DepositRailDTO {
  id: string;
  label: string;
  currency: string;
  network: string;
  minDeposit: number;
  instructions: string;
  custodyDestination: string;
  confirmationInfo: string;
}

export interface WithdrawalConfigDTO {
  minWithdrawal: number;
  maxSingleWithdrawal: number;
  feeRatePct: number;
  minFeeUsd: number;
  currency: string;
  supportedRails: string[];
}

export interface CustomerDocumentDTO {
  id: string;
  userId: string;
  title: string;
  docType:
    | "Agreement"
    | "Receipt"
    | "DepositConfirmation"
    | "WithdrawalRecord"
    | "AccountDocument";
  reference: string;
  summary: string;
  fileUrl?: string;
  createdAt: string | null;
}

export interface UserAccount {
  uid: string;
  username?: string;
  email: string;
  displayName: string;
  country: string;
  phone: string;
  walletBalance: number;
  totalProfit: number;
  bonus: number;
  referralBonus: number;
  totalDeposit: number;
  preferredRail: "USDT (TRC20)" | "Bitcoin (BTC)" | "Ethereum (ETH)" | "Bank Wire";
  emailAlerts: boolean;
  twoFactorEnabled: boolean;
  role: "investor" | "admin";
  accountStatus?: "Active" | "Review" | "Suspended";
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PropertyOffering {
  id: string;
  title: string;
  location: string;
  assetType: string;
  targetYieldPct: number;
  minEntry: number;
  valuation: number;
  occupancyPct: number;
  status: "Open" | "Fully Subscribed";
  published?: boolean;
  image: string;
  summary: string;
  supportingDocUrl?: string;
  supportingDocName?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface NotificationMessage {
  id: string;
  userId: string;
  category: "Settlement" | "Mandate" | "Security" | "Broadcast" | string;
  title: string;
  body: string;
  read: boolean;
  createdAt?: string | null;
}

export interface EmailTemplateRecord {
  eventType: string;
  subject: string;
  body: string;
  enabled: boolean;
  updatedBy?: string;
  updatedAt?: string | null;
}

export interface EmailOutboxRecord {
  id: string;
  eventType: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  createdAt?: string | null;
}

export async function sessionApiRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      ...(init.headers || {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as T & {
    error?: string;
    code?: string;
    availableBalance?: number;
    requiredAmount?: number;
  };
  if (!res.ok) {
    const err = new Error(body.error || `Request failed (${res.status}).`) as Error & {
      status?: number;
      code?: string;
      availableBalance?: number;
      requiredAmount?: number;
    };
    err.status = res.status;
    err.code = body.code;
    err.availableBalance = body.availableBalance;
    err.requiredAmount = body.requiredAmount;
    throw err;
  }
  return body;
}

export function fetchDashboardOverview(): Promise<DashboardOverviewDTO> {
  return sessionApiRequest<DashboardOverviewDTO>("/api/dashboard/overview");
}

export function fetchDashboardInvestments(): Promise<DashboardInvestmentsDTO> {
  return sessionApiRequest<DashboardInvestmentsDTO>("/api/dashboard/investments");
}

export function formatIsoDate(iso?: string | null): string {
  if (!iso) return "Pending";
  const parsed = Date.parse(iso);
  if (!Number.isFinite(parsed)) return "Pending";
  return new Date(parsed).toISOString().slice(0, 10);
}

export function formatTimestamp(ts?: string | Date | null): string {
  if (!ts) return "Pending";
  const date = ts instanceof Date ? ts : new Date(ts);
  if (Number.isNaN(date.getTime())) return "Pending";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
