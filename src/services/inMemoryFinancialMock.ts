import { randomUUID } from "node:crypto";
import { INVESTMENT_MANDATES, getMandateById, type InvestmentMandate } from "../trading/tradingPage.ts";
import type {
  CustomerDocumentDTO,
  DashboardInvestmentDTO,
  DashboardOverviewDTO,
  DashboardTransactionDTO,
  EmailOutboxRecord,
  EmailTemplateRecord,
  NotificationMessage,
} from "./dashboardApi.ts";
import { DEFAULT_MAIL_TEMPLATES } from "./mailTemplates.ts";
import {
  buildAccountDisclosureDocument,
  buildInvestmentAgreementDocument,
  buildTransactionDocument,
} from "./institutionalDocuments.ts";

interface MockWallet {
  availableBalance: number;
  reservedBalance: number;
}

interface MockStoredTransaction {
  id: string;
  userId: string;
  userEmail: string;
  type: "Deposit" | "Withdrawal" | "Investment" | "Profit" | "Referral";
  method: string;
  amount: number;
  destination: string;
  reference: string;
  status: "Pending" | "Completed" | "Rejected";
  currency: string;
  description: string;
  fee?: number;
  createdAt: string;
  updatedAt: string;
}

interface MockStoredInvestment {
  id: string;
  reference: string;
  userId: string;
  userEmail: string;
  userName: string;
  planId: string;
  planName: string;
  category: "crypto" | "stock" | "estate";
  categoryLabel: string;
  amount: number;
  dailyRatePct: number;
  durationDays: number;
  status: "Active" | "Completed";
  startDate: string;
  maturityDate: string;
  expectedPaymentTerms: string;
  paymentFrequency: string;
  settlementRail: string;
}

interface MockUserInfo {
  id: string;
  email: string;
  name: string;
  username?: string;
  referralCode: string;
  kycStatus: "not_submitted" | "pending" | "approved" | "rejected" | "needs_information";
  country: string;
  phone: string;
  preferredRail: string;
  emailAlerts: boolean;
  twoFactorEnabled: boolean;
  accountStatus: "Active" | "Review" | "Suspended";
  photoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MockInquiry {
  id: string;
  name: string;
  email: string;
  topic: string;
  subject: string;
  message: string;
  createdAt: string;
}

interface MockReferralRecord {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  referredEmail: string;
  referralCode: string;
  status: "pending" | "qualified" | "paid" | "void";
  rewardAmount: number;
  createdAt: string;
}

export interface MockBlockedUser {
  id: string;
  userId: string | null;
  email: string;
  displayName: string;
  reason: string;
  blockedBy: string;
  createdAt: string;
}

export interface MockPaymentWallet {
  id: string;
  label: string;
  currency: string;
  network: string;
  walletAddress: string;
  minDeposit: number;
  instructions: string;
  confirmationInfo: string;
  enabled: boolean;
  updatedAt: string;
}

export interface MockManualPaymentAssignment {
  id: string;
  userId: string;
  userEmail: string;
  customerName: string;
  method: string;
  amount: number;
  destination: string;
  network: string;
  reference: string;
  note: string;
  status: "Assigned";
  createdAt: string;
}

const usersById = new Map<string, MockUserInfo>();
const emailByUsername = new Map<string, string>();
const walletsByUser = new Map<string, MockWallet>();
const transactions: MockStoredTransaction[] = [];
const investments: MockStoredInvestment[] = [];
const idempotencyResponses = new Map<string, unknown>();
const customPlans = new Map<string, Record<string, unknown>>();
const customProperties = new Map<string, Record<string, unknown>>();
const notificationsList: NotificationMessage[] = [];
const broadcastReadByUser = new Map<string, Set<string>>();
const inquiriesList: MockInquiry[] = [];
const newsletterSubscribers = new Map<string, string>();
const referralsList: MockReferralRecord[] = [];
const manualPaymentAssignments: MockManualPaymentAssignment[] = [];
const customEmailTemplates = new Map<string, EmailTemplateRecord>();
const emailOutboxList: EmailOutboxRecord[] = [];
const mockRoiAccruedDates = new Map<string, Set<string>>();
const mockRoiUnpaidBalances = new Map<string, number>();
const blockedUsersById = new Map<string, MockBlockedUser>();
const platformPaymentWallets = new Map<string, MockPaymentWallet>([
  [
    "USDT (TRC20)",
    {
      id: "USDT (TRC20)",
      label: "USDT (TRC20)",
      currency: "USDT / USD",
      network: "TRON (TRC20)",
      walletAddress: "TXv79qL2k83j2019384756102938475610293847",
      minDeposit: 100,
      instructions:
        "Transmit USDT strictly on the TRON (TRC20) network to the BitfuryTech custody treasury address, then submit the exact transfer hash for settlement verification.",
      confirmationInfo:
        "Balance credits only after settlement desk review confirms network finality and matching reference.",
      enabled: true,
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    "Bitcoin (BTC)",
    {
      id: "Bitcoin (BTC)",
      label: "Bitcoin (BTC)",
      currency: "BTC / USD Equivalent",
      network: "Bitcoin Mainnet",
      walletAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      minDeposit: 250,
      instructions:
        "Transfer BTC via Bitcoin Mainnet and enter your transaction ID (TXID). USD credit is calculated at verified settlement review.",
      confirmationInfo:
        "Requires minimum 3 mainnet confirmations and manual settlement desk sign-off.",
      enabled: true,
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    "Ethereum (ETH)",
    {
      id: "Ethereum (ETH)",
      label: "Ethereum (ETH)",
      currency: "ETH / USD Equivalent",
      network: "Ethereum Mainnet (ERC20)",
      walletAddress: "0x71C3d2948b816281028372610293847192837465",
      minDeposit: 250,
      instructions:
        "Send ETH on Ethereum Mainnet and record your transaction hash below. Do not use unsupported layer-2 bridges without prior desk notice.",
      confirmationInfo:
        "Requires 12 block confirmations and settlement verification prior to ledger credit.",
      enabled: true,
      updatedAt: new Date().toISOString(),
    },
  ],
  [
    "Bank Wire",
    {
      id: "Bank Wire",
      label: "Bank Wire",
      currency: "USD",
      network: "SWIFT / Fedwire",
      walletAddress: "BitfuryTech Corporate Settlement — Reference Desk Upon Verification",
      minDeposit: 1000,
      instructions:
        "Initiate an institutional wire quoting your BitfuryTech account email and wire reference number in the beneficiary memo.",
      confirmationInfo:
        "Typically clears within 1–3 business days after incoming bank reconciliation.",
      enabled: true,
      updatedAt: new Date().toISOString(),
    },
  ],
]);
const auditLogs: Array<{
  id: string;
  actorUid: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  summary: string;
  createdAt: string;
}> = [];

function money(val: number): number {
  return Number(val.toFixed(2));
}

function getOrCreateWallet(userId: string): MockWallet {
  let wallet = walletsByUser.get(userId);
  if (!wallet) {
    wallet = { availableBalance: 0, reservedBalance: 0 };
    walletsByUser.set(userId, wallet);
  }
  return wallet;
}

export function registerMockUser(user: {
  id: string;
  email: string;
  name?: string | null;
  username?: string | null;
}): void {
  const existing = usersById.get(user.id);
  const cleanEmail = user.email.trim().toLowerCase();
  const cleanUsername = user.username?.trim().toLowerCase();
  if (cleanUsername) {
    emailByUsername.set(cleanUsername, cleanEmail);
  }
  if (!existing) {
    const now = new Date().toISOString();
    usersById.set(user.id, {
      id: user.id,
      email: cleanEmail,
      name: user.name?.trim() || cleanEmail.split("@")[0] || "Investor",
      username: cleanUsername || undefined,
      referralCode: `BF-${user.id.slice(0, 8).toUpperCase()}`,
      kycStatus: "not_submitted",
      country: "",
      phone: "",
      preferredRail: "USDT (TRC20)",
      emailAlerts: true,
      twoFactorEnabled: false,
      accountStatus: "Active",
      createdAt: now,
      updatedAt: now,
    });
  } else if (cleanUsername && !existing.username) {
    existing.username = cleanUsername;
  }
  getOrCreateWallet(user.id);
}

export function isMockUsernameAvailable(username: string): boolean {
  return !emailByUsername.has(username.trim().toLowerCase());
}

export function lookupMockEmailByUsername(username: string): string | null {
  return emailByUsername.get(username.trim().toLowerCase()) ?? null;
}

export function isMockUserSuspended(userId?: string | null): boolean {
  const cleanUid = userId?.trim();
  if (!cleanUid) return false;
  return usersById.get(cleanUid)?.accountStatus === "Suspended";
}

export function getMockUserProfile(
  userId: string,
  fallback?: { email?: string | null; name?: string | null; emailVerified?: boolean; role?: string }
) {
  let info = usersById.get(userId);
  if (!info) {
    registerMockUser({
      id: userId,
      email: fallback?.email || "investor@bitfurytech.local",
      name: fallback?.name,
    });
    info = usersById.get(userId)!;
  }
  const wallet = getOrCreateWallet(userId);
  return {
    uid: info.id,
    username: info.username,
    referralCode: info.referralCode,
    email: info.email,
    displayName: info.name,
    country: info.country,
    phone: info.phone,
    walletBalance: wallet.availableBalance,
    preferredRail: info.preferredRail,
    emailAlerts: info.emailAlerts,
    twoFactorEnabled: info.twoFactorEnabled,
    kycStatus: info.kycStatus,
    role: fallback?.role || "investor",
    accountStatus: info.accountStatus,
    photoUrl: info.photoUrl ?? null,
    emailVerified: Boolean(fallback?.emailVerified ?? true),
    createdAt: info.createdAt,
    updatedAt: info.updatedAt,
  };
}

export function updateMockUserProfile(
  userId: string,
  patch: {
    displayName?: string;
    username?: string;
    phone?: string;
    country?: string;
    preferredRail?: string;
    emailAlerts?: boolean;
    twoFactorEnabled?: boolean;
    photoUrl?: string | null;
  },
  fallback?: { email?: string | null; name?: string | null; emailVerified?: boolean; role?: string }
) {
  getMockUserProfile(userId, fallback);
  const info = usersById.get(userId)!;
  if (patch.username !== undefined) {
    const clean = patch.username.trim().toLowerCase();
    const ownerEmail = emailByUsername.get(clean);
    if (ownerEmail && ownerEmail !== info.email) {
      throw Object.assign(new Error("This username is already taken. Please choose another."), { statusCode: 409 });
    }
    if (info.username && info.username !== clean) {
      emailByUsername.delete(info.username);
    }
    info.username = clean;
    emailByUsername.set(clean, info.email);
  }
  if (patch.displayName !== undefined) info.name = patch.displayName;
  if (patch.phone !== undefined) info.phone = patch.phone;
  if (patch.country !== undefined) info.country = patch.country;
  if (patch.preferredRail !== undefined) info.preferredRail = patch.preferredRail;
  if (patch.emailAlerts !== undefined) info.emailAlerts = patch.emailAlerts;
  if (patch.twoFactorEnabled !== undefined) info.twoFactorEnabled = patch.twoFactorEnabled;
  if (patch.photoUrl !== undefined) info.photoUrl = patch.photoUrl || null;
  info.updatedAt = new Date().toISOString();
  return getMockUserProfile(userId, fallback);
}

function toInvestmentDTO(inv: MockStoredInvestment, userTxs: DashboardTransactionDTO[]): DashboardInvestmentDTO {
  const elapsed = Math.max(0, Math.floor((Date.now() - Date.parse(inv.startDate)) / 86400000));
  const daysElapsed = inv.status === "Completed" ? inv.durationDays : Math.min(inv.durationDays, elapsed);
  const related = userTxs.filter(
    (tx) =>
      (tx.type === "Investment" || tx.type === "Profit") &&
      (tx.destination === inv.id ||
        tx.destination === inv.planId ||
        tx.method.toLowerCase().includes(inv.planName.toLowerCase()))
  );
  return {
    id: inv.id,
    reference: inv.reference,
    userId: inv.userId,
    planId: inv.planId,
    planName: inv.planName,
    category: inv.category,
    categoryLabel: inv.categoryLabel,
    amount: inv.amount,
    dailyRatePct: inv.dailyRatePct,
    durationDays: inv.durationDays,
    status: inv.status,
    investmentDate: inv.startDate,
    startDate: inv.startDate,
    maturityDate: inv.maturityDate,
    daysElapsed,
    daysRemaining: inv.status === "Completed" ? 0 : Math.max(0, inv.durationDays - daysElapsed),
    progressPct: inv.status === "Completed" ? 100 : Math.min(100, Math.round((daysElapsed / inv.durationDays) * 100)),
    expectedPaymentTerms: inv.expectedPaymentTerms,
    paymentFrequency: inv.paymentFrequency,
    settlementRail: inv.settlementRail,
    projectedCycleReturn: Number(((inv.amount * inv.dailyRatePct) / 100 * inv.durationDays).toFixed(2)),
    transactions: related,
  };
}

export function getMockCustomerTransactions(userId: string): DashboardTransactionDTO[] {
  return transactions
    .filter((tx) => tx.userId === userId)
    .map((tx) => ({
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
    }));
}

export function getMockCustomerInvestments(userId: string) {
  const userTxs = getMockCustomerTransactions(userId);
  const userInvestments = investments
    .filter((inv) => inv.userId === userId)
    .map((inv) => toInvestmentDTO(inv, userTxs));
  const active = userInvestments.filter((i) => i.status === "Active");
  const completed = userInvestments.filter((i) => i.status === "Completed");
  return {
    investments: userInvestments,
    allTransactions: userTxs,
    summary: {
      totalInvested: money(userInvestments.reduce((sum, item) => sum + item.amount, 0)),
      activeCapital: money(active.reduce((sum, item) => sum + item.amount, 0)),
      activeCount: active.length,
      completedCount: completed.length,
    },
  };
}

export function getMockDashboardOverview(
  userId: string,
  fallbackUser?: { email?: string | null; name?: string | null }
): DashboardOverviewDTO & { ledgerSummary: { entryCount: number; lastEntryAt: string | null } } {
  const known = usersById.get(userId);
  const email = known?.email || fallbackUser?.email || "investor@bitfurytech.local";
  const displayName = known?.name || fallbackUser?.name || email.split("@")[0];
  if (!known) {
    registerMockUser({ id: userId, email, name: displayName });
  }
  const wallet = getOrCreateWallet(userId);
  const invPayload = getMockCustomerInvestments(userId);
  const userTxs = invPayload.allTransactions;
  const active = invPayload.investments.filter((item) => item.status === "Active");
  const completed = invPayload.investments.filter((item) => item.status === "Completed");
  const completedTxs = userTxs.filter((tx) => tx.status === "Completed");
  const pendingTxs = userTxs.filter((tx) => tx.status === "Pending");
  const totalDeposit = money(completedTxs.filter((tx) => tx.type === "Deposit").reduce((s, t) => s + t.amount, 0));
  const totalProfit = money(completedTxs.filter((tx) => tx.type === "Profit").reduce((s, t) => s + t.amount, 0));
  const referralBonus = money(completedTxs.filter((tx) => tx.type === "Referral").reduce((s, t) => s + t.amount, 0));
  const totalInvested = invPayload.summary.totalInvested;

  const categories: Array<"crypto" | "stock" | "estate"> = ["crypto", "stock", "estate"];
  const portfolioSummary = categories.map((category) => {
    const items = invPayload.investments.filter((item) => item.category === category);
    const investedAmount = money(items.reduce((sum, item) => sum + item.amount, 0));
    return {
      category,
      label: category === "crypto" ? "Digital Assets" : category === "stock" ? "Global Equities" : "Real Estate",
      investedAmount,
      activeCount: items.filter((item) => item.status === "Active").length,
      totalCount: items.length,
      sharePct: totalInvested > 0 ? Math.round((investedAmount / totalInvested) * 100) : 0,
    };
  });

  return {
    account: {
      uid: userId,
      email,
      displayName,
      photoUrl: known?.photoUrl ?? null,
      preferredRail: "USDT (TRC20)",
      role: "investor",
    },
    metrics: {
      availableBalance: wallet.availableBalance,
      totalInvested,
      activeInvested: invPayload.summary.activeCapital,
      totalEarnings: money(totalProfit + referralBonus),
      totalProfit,
      bonus: 0,
      referralBonus,
      totalDeposit,
      pendingPayments: money(pendingTxs.reduce((s, t) => s + t.amount, 0)),
      pendingCount: pendingTxs.length,
      activeInvestmentsCount: active.length,
      completedInvestmentsCount: completed.length,
    },
    activeInvestments: active,
    recentTransactions: userTxs.slice(0, 6),
    portfolioSummary,
    opportunities: INVESTMENT_MANDATES,
    unreadNotificationsCount: listMockNotifications(userId).filter((n) => !n.read).length,
    syncedAt: new Date().toISOString(),
    ledgerSummary: {
      entryCount: userTxs.length,
      lastEntryAt: userTxs[0]?.createdAt ?? null,
    },
  };
}

export function getMockCatalog(feeRatePct: number) {
  const plansById = new Map<string, InvestmentMandate & { availabilityStatus: string; published: boolean; unitPrice: number }>();
  for (const m of INVESTMENT_MANDATES) {
    plansById.set(m.id, { ...m, availabilityStatus: "Open", published: true, unitPrice: m.minDeposit });
  }
  for (const [id, raw] of customPlans.entries()) {
    if (raw.published === false) {
      plansById.delete(id);
      continue;
    }
    const minDeposit = Number(raw.minDeposit ?? 500);
    plansById.set(id, {
      id,
      name: String(raw.name ?? "Investment Plan"),
      category: raw.category === "stock" || raw.category === "estate" ? raw.category : "crypto",
      categoryLabel: String(raw.categoryLabel ?? "Digital Assets"),
      audience: String(raw.audience ?? ""),
      description: String(raw.description ?? ""),
      minDeposit,
      maxDeposit: Number(raw.maxDeposit ?? minDeposit * 10),
      dailyRatePct: Number(raw.dailyRatePct ?? 1),
      durationDays: Number(raw.durationDays ?? 30),
      paymentFrequency: String(raw.paymentFrequency ?? ""),
      settlementRail: String(raw.settlementRail ?? "USD"),
      image: String(raw.image ?? "/images/hero-private-capital.jpg"),
      returnTerms: String(raw.returnTerms ?? ""),
      highlights: [],
      availabilityStatus: String(raw.availabilityStatus ?? "Open"),
      published: true,
      unitPrice: minDeposit,
    });
  }
  const properties = Array.from(customProperties.values()).filter((p) => p.published !== false);
  return { plans: Array.from(plansById.values()), properties, feeRatePct };
}

export interface MockCryptoWallet {
  id: string;
  cryptocurrency: string;
  blockchainNetwork: string;
  walletAddress: string;
  walletLabel: string;
  status: "Active" | "Inactive" | "Maintenance";
  minDeposit: number;
  maxDeposit: number;
  instructions: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

const customCryptoWallets = new Map<string, MockCryptoWallet>([
  [
    "wal_btc_1",
    {
      id: "wal_btc_1",
      cryptocurrency: "Bitcoin",
      blockchainNetwork: "Bitcoin Mainnet",
      walletAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
      walletLabel: "Primary BTC Cold Treasury",
      status: "Active",
      minDeposit: 250,
      maxDeposit: 1000000,
      instructions: "Transfer BTC via Bitcoin Mainnet and enter your transaction ID (TXID). Requires 3 block confirmations.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      updatedBy: "system",
    },
  ],
  [
    "wal_eth_1",
    {
      id: "wal_eth_1",
      cryptocurrency: "Ethereum",
      blockchainNetwork: "Ethereum (ERC-20)",
      walletAddress: "0x71C3d2948b816281028372610293847192837465",
      walletLabel: "ETH Multi-Sig Vault",
      status: "Active",
      minDeposit: 250,
      maxDeposit: 2000000,
      instructions: "Send ETH or ERC-20 assets on Ethereum Mainnet. Do not use layer-2 bridges without prior settlement desk notification.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      updatedBy: "system",
    },
  ],
  [
    "wal_usdt_1",
    {
      id: "wal_usdt_1",
      cryptocurrency: "USDT",
      blockchainNetwork: "TRON (TRC-20)",
      walletAddress: "TXv79qL2k83j2019384756102938475610293847",
      walletLabel: "TRC20 Settlement Gateway",
      status: "Active",
      minDeposit: 100,
      maxDeposit: 10000000,
      instructions: "Transmit USDT strictly on the TRON (TRC20) network to the BitfuryTech custody treasury address.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      updatedBy: "system",
    },
  ],
  [
    "wal_usdc_1",
    {
      id: "wal_usdc_1",
      cryptocurrency: "USDC",
      blockchainNetwork: "Ethereum (ERC-20)",
      walletAddress: "0x92B8a10293847561029384756102938475610293",
      walletLabel: "USDC Treasury Reserve",
      status: "Active",
      minDeposit: 100,
      maxDeposit: 5000000,
      instructions: "Transfer USDC on Ethereum Mainnet. Ensure sufficient ETH gas is provided for settlement transfer processing.",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: "system",
      updatedBy: "system",
    },
  ],
]);

export function upsertMockCryptoWallet(data: {
  id?: string;
  cryptocurrency: string;
  blockchainNetwork: string;
  walletAddress: string;
  walletLabel?: string;
  status?: "Active" | "Inactive" | "Maintenance";
  minDeposit?: number;
  maxDeposit?: number;
  instructions?: string;
  adminEmail?: string;
}): MockCryptoWallet {
  const id = data.id || `wal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const existing = customCryptoWallets.get(id);
  const now = new Date().toISOString();
  const record: MockCryptoWallet = {
    id,
    cryptocurrency: data.cryptocurrency.trim() || "USDT",
    blockchainNetwork: data.blockchainNetwork.trim() || "TRON (TRC-20)",
    walletAddress: data.walletAddress.trim(),
    walletLabel: data.walletLabel?.trim() || `${data.cryptocurrency} Wallet`,
    status: data.status || "Active",
    minDeposit: Number(data.minDeposit) || 100,
    maxDeposit: Number(data.maxDeposit) || 10000000,
    instructions: data.instructions?.trim() || "",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    createdBy: existing?.createdBy ?? data.adminEmail ?? "admin",
    updatedBy: data.adminEmail ?? "admin",
  };
  customCryptoWallets.set(id, record);
  return record;
}

export function deleteMockCryptoWallet(id: string): boolean {
  return customCryptoWallets.delete(id);
}

export function listMockPaymentWallets(): MockPaymentWallet[] {
  return Array.from(platformPaymentWallets.values());
}

export function upsertMockPaymentWallet(wallet: MockPaymentWallet): MockPaymentWallet {
  const saved: MockPaymentWallet = {
    ...wallet,
    updatedAt: new Date().toISOString(),
  };
  platformPaymentWallets.set(saved.id, saved);
  return saved;
}

export function getMockDepositMethods() {
  const methods = Array.from(platformPaymentWallets.values())
    .filter((w) => w.enabled && w.walletAddress.trim().length >= 6)
    .map((w) => ({
      id: w.id,
      label: w.label,
      currency: w.currency,
      network: w.network,
      minDeposit: w.minDeposit,
      instructions: w.instructions,
      custodyDestination: w.walletAddress,
      confirmationInfo: w.confirmationInfo,
    }));

  const seenIds = new Set(methods.map((m) => m.id));
  for (const cw of customCryptoWallets.values()) {
    if (cw.status !== "Active" || cw.walletAddress.trim().length < 6) continue;
    const label = `${cw.cryptocurrency} (${cw.blockchainNetwork})`;
    if (seenIds.has(cw.id) || seenIds.has(label)) continue;
    // Also skip if standard matching currency+network already exists in platformPaymentWallets
    const cryptoUpper = cw.cryptocurrency.toUpperCase();
    const netUpper = cw.blockchainNetwork.toUpperCase();
    const alreadyCovered = methods.some((m) => {
      const mid = m.id.toUpperCase();
      return (
        (cryptoUpper.includes("BTC") && mid.includes("BTC")) ||
        (cryptoUpper.includes("ETH") && mid.includes("ETH") && !netUpper.includes("USDC")) ||
        (cryptoUpper.includes("USDT") && mid.includes("USDT") && netUpper.includes("TRC"))
      );
    });
    if (alreadyCovered) continue;
    seenIds.add(cw.id);
    methods.push({
      id: cw.id,
      label: cw.walletLabel ? `${cw.cryptocurrency} — ${cw.walletLabel}` : label,
      currency: `${cw.cryptocurrency} / USD`,
      network: cw.blockchainNetwork,
      minDeposit: cw.minDeposit,
      instructions: cw.instructions || `Send ${cw.cryptocurrency} strictly via ${cw.blockchainNetwork} to the custody address below.`,
      custodyDestination: cw.walletAddress,
      confirmationInfo: "Balance credits after settlement desk confirms blockchain finality.",
    });
  }
  return methods;
}

export function listMockManualPaymentAssignments(): MockManualPaymentAssignment[] {
  return [...manualPaymentAssignments];
}

export function addMockManualPaymentAssignment(
  entry: Omit<MockManualPaymentAssignment, "id" | "status" | "createdAt">,
  actorUid: string,
  actorEmail: string
): MockManualPaymentAssignment {
  const duplicate = manualPaymentAssignments.find(
    (a) =>
      a.userId === entry.userId &&
      a.method === entry.method &&
      a.reference.toLowerCase() === entry.reference.toLowerCase()
  );
  if (duplicate) {
    throw Object.assign(
      new Error("This customer already has an assignment with that reference."),
      { statusCode: 409 }
    );
  }
  const saved: MockManualPaymentAssignment = {
    ...entry,
    id: `mpa_${randomUUID()}`,
    status: "Assigned",
    createdAt: new Date().toISOString(),
  };
  manualPaymentAssignments.unshift(saved);
  addMockAuditLog(actorUid, actorEmail, "CREATE_MANUAL_PAYMENT_ASSIGNMENT", "manual_payment_assignment", saved.id, {
    userId: entry.userId,
    userEmail: entry.userEmail,
    method: entry.method,
    amount: entry.amount,
    reference: entry.reference,
  });
  return saved;
}

export function createMockDeposit(params: {
  userId: string;
  userEmail: string;
  userName?: string | null;
  method: string;
  currency: string;
  custodyDestination: string;
  instructions: string;
  confirmationInfo: string;
  amount: number;
  reference: string;
  idempotencyKey: string;
}) {
  const idemKey = `deposit:${params.userId}:${params.idempotencyKey}`;
  const existing = idempotencyResponses.get(idemKey);
  if (existing) return { response: existing, duplicate: true };

  registerMockUser({ id: params.userId, email: params.userEmail, name: params.userName });
  if (isMockUserSuspended(params.userId)) {
    throw Object.assign(new Error("Account deposit are currently restricted. Contact support."), { statusCode: 403 });
  }
  const now = new Date().toISOString();
  const id = randomUUID();
  const normalizedAmount = money(params.amount);
  transactions.unshift({
    id,
    userId: params.userId,
    userEmail: params.userEmail,
    type: "Deposit",
    method: params.method,
    amount: normalizedAmount,
    destination: params.custodyDestination,
    reference: params.reference,
    status: "Pending",
    currency: "USD",
    description: `Deposit notice via ${params.method}`,
    createdAt: now,
    updatedAt: now,
  });

  const response = {
    ok: true,
    deposit: {
      id,
      reference: params.reference,
      method: params.method,
      currency: params.currency,
      amount: normalizedAmount,
      status: "Pending",
      instructions: params.instructions,
      confirmationInfo: params.confirmationInfo,
      createdAt: now,
    },
  };
  idempotencyResponses.set(idemKey, response);
  return { response, duplicate: false };
}

export function createMockWithdrawal(params: {
  userId: string;
  userEmail: string;
  userName?: string | null;
  method: string;
  amount: number;
  fee: number;
  netPayout: number;
  destination: string;
  reference: string;
  idempotencyKey: string;
}) {
  const idemKey = `withdrawal:${params.userId}:${params.idempotencyKey}`;
  const existing = idempotencyResponses.get(idemKey);
  if (existing) return { response: existing, duplicate: true };

  registerMockUser({ id: params.userId, email: params.userEmail, name: params.userName });
  if (isMockUserSuspended(params.userId)) {
    throw Object.assign(new Error("Account withdrawal are currently restricted. Contact support."), { statusCode: 403 });
  }
  const wallet = getOrCreateWallet(params.userId);
  const requested = money(params.amount);
  if (requested > wallet.availableBalance) {
    throw Object.assign(
      new Error(`Withdrawal amount ($${requested.toFixed(2)}) exceeds available balance ($${wallet.availableBalance.toFixed(2)}).`),
      { statusCode: 400, code: "INSUFFICIENT_FUNDS" }
    );
  }
  wallet.availableBalance = money(wallet.availableBalance - requested);
  wallet.reservedBalance = money(wallet.reservedBalance + requested);

  const now = new Date().toISOString();
  const id = randomUUID();
  transactions.unshift({
    id,
    userId: params.userId,
    userEmail: params.userEmail,
    type: "Withdrawal",
    method: params.method,
    amount: requested,
    destination: params.destination,
    reference: params.reference,
    status: "Pending",
    currency: "USD",
    description: `Withdrawal disbursement via ${params.method} to ${params.destination}`,
    fee: params.fee,
    createdAt: now,
    updatedAt: now,
  });

  const response = {
    ok: true,
    withdrawal: {
      id,
      reference: params.reference,
      method: params.method,
      amount: requested,
      fee: params.fee,
      netPayout: params.netPayout,
      destination: params.destination,
      status: "Pending",
      createdAt: now,
    },
  };
  idempotencyResponses.set(idemKey, response);
  return { response, duplicate: false };
}

export function createMockInvestmentPurchase(params: {
  userId: string;
  userEmail: string;
  userName?: string | null;
  targetType: "plan" | "property";
  targetId: string;
  amountInput: number | null;
  units: number;
  feeRatePct: number;
  reference: string;
  idempotencyKey: string;
}) {
  const idemKey = `investment:${params.userId}:${params.idempotencyKey}`;
  const existing = idempotencyResponses.get(idemKey);
  if (existing) return { response: existing, duplicate: true };

  registerMockUser({ id: params.userId, email: params.userEmail, name: params.userName });
  if (isMockUserSuspended(params.userId)) {
    throw Object.assign(new Error("Account investment allocations are currently restricted. Contact support."), { statusCode: 403 });
  }
  const plan = getMandateById(params.targetId);
  if (!plan && params.targetType === "plan") {
    throw Object.assign(new Error("Selected investment plan does not exist."), { statusCode: 404 });
  }
  const prop = params.targetType === "property" ? customProperties.get(params.targetId) : undefined;
  if (params.targetType === "property" && !prop) {
    throw Object.assign(new Error("Selected property offering was not found."), { statusCode: 404 });
  }

  const planName = prop ? String(prop.title) : plan!.name;
  const category: "crypto" | "stock" | "estate" = prop ? "estate" : plan!.category;
  const unitPrice = prop ? Number(prop.minEntry ?? 1000) : plan!.minDeposit;
  const maxCap = prop ? Number.MAX_SAFE_INTEGER : plan!.maxDeposit;
  const dailyRatePct = prop ? Math.max(0.1, Number(((Number(prop.targetYieldPct ?? 8.5) || 8.5) / 30).toFixed(2))) : plan!.dailyRatePct;
  const durationDays = prop ? 60 : plan!.durationDays;
  const termsSummary = prop ? String(prop.summary ?? "") : plan!.returnTerms;

  const principal = money(params.amountInput !== null ? params.amountInput : params.units * unitPrice);
  const feeAmount = money((principal * params.feeRatePct) / 100);
  const totalCost = money(principal + feeAmount);

  if (!(unitPrice > 0) || principal < unitPrice) {
    throw Object.assign(new Error("Investment amount is below the minimum entry."), { statusCode: 400 });
  }
  if (principal > maxCap) {
    throw Object.assign(new Error(`Maximum allocation cap for ${planName} is $${maxCap.toLocaleString()}.`), { statusCode: 400 });
  }

  const wallet = getOrCreateWallet(params.userId);
  if (totalCost > wallet.availableBalance) {
    throw Object.assign(
      new Error(`Insufficient custody wallet balance. Required $${totalCost.toFixed(2)}, available $${wallet.availableBalance.toFixed(2)}.`),
      { statusCode: 400, code: "INSUFFICIENT_FUNDS" }
    );
  }
  wallet.availableBalance = money(wallet.availableBalance - totalCost);

  const now = new Date();
  const startDate = now.toISOString();
  const maturityDate = new Date(now.getTime() + durationDays * 86400000).toISOString();
  const investmentId = randomUUID();
  const transactionId = randomUUID();

  investments.unshift({
    id: investmentId,
    reference: params.reference,
    userId: params.userId,
    userEmail: params.userEmail,
    userName: params.userName || params.userEmail,
    planId: params.targetId,
    planName,
    category,
    categoryLabel: category === "estate" ? "Real Estate" : category === "stock" ? "Global Equities" : "Digital Assets",
    amount: principal,
    dailyRatePct,
    durationDays,
    status: "Active",
    startDate,
    maturityDate,
    expectedPaymentTerms: termsSummary,
    paymentFrequency: plan?.paymentFrequency ?? "Scheduled cycle distribution",
    settlementRail: plan?.settlementRail ?? "Custody Wallet",
  });

  transactions.unshift({
    id: transactionId,
    userId: params.userId,
    userEmail: params.userEmail,
    type: "Investment",
    method: planName,
    amount: totalCost,
    destination: params.targetId,
    reference: params.reference,
    status: "Completed",
    currency: "USD",
    description: `Investment allocation: ${planName}`,
    createdAt: startDate,
    updatedAt: startDate,
  });

  const response = {
    ok: true,
    receipt: {
      reference: params.reference,
      investmentId,
      transactionId,
      planId: params.targetId,
      planName,
      category,
      units: params.amountInput !== null ? 1 : params.units,
      unitPrice: params.amountInput !== null ? principal : unitPrice,
      principal,
      feeAmount,
      totalCost,
      currency: "USD",
      newWalletBalance: wallet.availableBalance,
      termsSummary,
      createdAt: startDate,
    },
  };
  idempotencyResponses.set(idemKey, response);
  return { response, duplicate: false };
}

export function isMockUserBlocked(userId?: string | null, email?: string | null): boolean {
  const cleanUid = userId?.trim();
  const cleanEmail = email?.trim().toLowerCase();
  for (const entry of blockedUsersById.values()) {
    if (cleanUid && entry.userId && entry.userId === cleanUid) return true;
    if (cleanEmail && entry.email.toLowerCase() === cleanEmail) return true;
  }
  return false;
}

export function getMockAdminOverview() {
  const pendingD = transactions.filter((t) => t.type === "Deposit" && t.status === "Pending");
  const pendingW = transactions.filter((t) => t.type === "Withdrawal" && t.status === "Pending");
  const activeInv = investments.filter((i) => i.status === "Active");
  const activeUsers = Array.from(usersById.values()).filter((u) => !isMockUserBlocked(u.id, u.email));
  return {
    stats: {
      totalCustomers: activeUsers.length,
      activeInvestmentsCount: activeInv.length,
      totalInvested: money(investments.reduce((s, i) => s + i.amount, 0)),
      pendingDepositsCount: pendingD.length,
      pendingDepositsAmount: money(pendingD.reduce((s, t) => s + t.amount, 0)),
      pendingWithdrawalsCount: pendingW.length,
      pendingWithdrawalsAmount: money(pendingW.reduce((s, t) => s + t.amount, 0)),
      newRegistrations: activeUsers.length,
      propertiesCount: customProperties.size,
      inquiriesCount: inquiriesList.length,
    },
    recentTransactions: transactions.slice(0, 10).map((t) => ({
      id: t.id,
      userEmail: t.userEmail,
      type: t.type,
      method: t.method,
      amount: t.amount,
      reference: t.reference,
      status: t.status,
      createdAt: t.createdAt,
    })),
    recentAuditLogs: auditLogs.slice(0, 8),
  };
}

export function getMockAdminData() {
  return {
    customers: Array.from(usersById.values())
      .filter((u) => !isMockUserBlocked(u.id, u.email))
      .map((u) => {
        const userInvs = investments.filter((i) => i.userId === u.id);
        const userTxs = transactions.filter((t) => t.userId === u.id);
        return {
          uid: u.id,
          username: u.username ?? null,
          email: u.email,
          displayName: u.name,
          photoUrl: u.photoUrl ?? null,
          country: u.country,
          phone: u.phone,
          walletBalance: getOrCreateWallet(u.id).availableBalance,
          totalDeposit: money(
            userTxs
              .filter((t) => t.type === "Deposit" && t.status === "Completed")
              .reduce((sum, t) => sum + t.amount, 0)
          ),
          totalProfit: money(
            userTxs
              .filter((t) => t.type === "Profit" && t.status === "Completed")
              .reduce((sum, t) => sum + t.amount, 0)
          ),
          referralBonus: money(
            userTxs
              .filter((t) => t.type === "Referral" && t.status === "Completed")
              .reduce((sum, t) => sum + t.amount, 0)
          ),
          role: "investor",
          kycStatus: u.kycStatus,
          accountStatus: u.accountStatus,
          createdAt: u.createdAt,
          investmentsCount: userInvs.length,
          transactionsCount: userTxs.length,
          investments: userInvs.map((i) => ({
            id: i.id,
            planName: i.planName,
            amount: i.amount,
            status: i.status,
          })),
          transactions: userTxs.map((t) => ({
            id: t.id,
            type: t.type,
            reference: t.reference,
            amount: t.amount,
            status: t.status,
          })),
        };
      }),
    deposits: transactions.filter((t) => t.type === "Deposit"),
    withdrawals: transactions.filter((t) => t.type === "Withdrawal"),
    investments: investments.map((i) => ({
      id: i.id,
      userId: i.userId,
      userEmail: i.userEmail,
      userName: i.userName,
      planId: i.planId,
      planName: i.planName,
      category: i.category,
      amount: i.amount,
      dailyRatePct: i.dailyRatePct,
      durationDays: i.durationDays,
      status: i.status,
      startDate: i.startDate,
      maturityDate: i.maturityDate,
      createdAt: i.startDate,
    })),
    transactions,
    plans: getMockCatalog(0.5).plans.map((p) => ({ ...p, source: customPlans.has(p.id) ? "database" : "default" })),
    properties: Array.from(customProperties.values()),
    cryptoWallets: Array.from(customCryptoWallets.values()),
    inquiries: inquiriesList,
    auditLogs,
    customPlans,
    customProperties,
    customCryptoWallets,
    usersById,
    walletsByUser,
  };
}

export function addMockAuditLog(
  actorUid: string,
  actorEmail: string,
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown>
): void {
  auditLogs.unshift({
    id: randomUUID(),
    actorUid,
    actorEmail,
    action,
    targetType,
    targetId,
    summary: JSON.stringify(details),
    createdAt: new Date().toISOString(),
  });
}

export function addMockInquiry(entry: {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
}) {
  const item: MockInquiry = {
    id: entry.id,
    name: entry.name,
    email: entry.email,
    topic: entry.subject,
    subject: entry.subject,
    message: entry.message,
    createdAt: new Date().toISOString(),
  };
  inquiriesList.unshift(item);
  return item;
}

export function subscribeMockNewsletter(email: string): { subscribedAt: string; alreadySubscribed: boolean } {
  const cleanEmail = email.trim().toLowerCase();
  const existing = newsletterSubscribers.get(cleanEmail);
  if (existing) {
    return { subscribedAt: existing, alreadySubscribed: true };
  }
  const now = new Date().toISOString();
  newsletterSubscribers.set(cleanEmail, now);
  return { subscribedAt: now, alreadySubscribed: false };
}

export function listMockNotifications(userId: string): NotificationMessage[] {
  const broadcastReads = broadcastReadByUser.get(userId);
  return notificationsList
    .filter((n) => n.userId === userId || n.userId === "all")
    .map((n) =>
      n.userId === "all"
        ? { ...n, read: Boolean(broadcastReads?.has(n.id)) }
        : { ...n }
    );
}

export function markMockNotificationRead(id: string, userId: string): boolean {
  const item = notificationsList.find((n) => n.id === id && (n.userId === userId || n.userId === "all"));
  if (!item) return false;
  if (item.userId === "all") {
    const reads = broadcastReadByUser.get(userId) ?? new Set<string>();
    reads.add(id);
    broadcastReadByUser.set(userId, reads);
  } else {
    item.read = true;
  }
  return true;
}

export function markAllMockNotificationsRead(userId: string): void {
  const reads = broadcastReadByUser.get(userId) ?? new Set<string>();
  for (const item of notificationsList) {
    if (item.userId === userId) {
      item.read = true;
    } else if (item.userId === "all") {
      reads.add(item.id);
    }
  }
  broadcastReadByUser.set(userId, reads);
}

export function addMockBroadcast(title: string, body: string, actorUid: string, actorEmail: string): NotificationMessage {
  const entry: NotificationMessage = {
    id: randomUUID(),
    userId: "all",
    category: "Broadcast",
    title,
    body,
    read: false,
    createdAt: new Date().toISOString(),
  };
  notificationsList.unshift(entry);
  addMockAuditLog(actorUid, actorEmail, "PUBLISH_BROADCAST", "notification", entry.id, { title });
  return entry;
}

export function claimMockReferral(
  referredUserId: string,
  referredEmail: string,
  rawCode: string
): { claimed: boolean; reason?: string } {
  const code = rawCode.trim().toUpperCase();
  if (!code || code.length < 4) {
    return { claimed: false, reason: "Invalid referral code." };
  }
  if (referralsList.some((r) => r.referredUserId === referredUserId)) {
    return { claimed: false, reason: "Referral attribution already recorded." };
  }
  const referrer = Array.from(usersById.values()).find(
    (u) =>
      u.id !== referredUserId &&
      u.accountStatus !== "Suspended" &&
      !isMockUserBlocked(u.id, u.email) &&
      (u.referralCode.toUpperCase() === code || `BF-${u.id.slice(0, 8).toUpperCase()}` === code)
  );
  if (!referrer) {
    return { claimed: false, reason: "Referral code does not match an active partner account." };
  }
  referralsList.unshift({
    id: `ref_${randomUUID().slice(0, 12)}`,
    referrerUserId: referrer.id,
    referredUserId,
    referredEmail: referredEmail.trim().toLowerCase(),
    referralCode: code,
    status: "pending",
    rewardAmount: 0,
    createdAt: new Date().toISOString(),
  });
  return { claimed: true };
}

export function getMockReferrals(userId: string) {
  const userInfo = usersById.get(userId);
  const code = userInfo?.referralCode || `BF-${userId.slice(0, 8).toUpperCase()}`;
  const matching = referralsList.filter((r) => r.referrerUserId === userId);
  const referralTxs = getMockCustomerTransactions(userId).filter((t) => t.type === "Referral");
  const referralEarnings = money(
    referralTxs
      .filter((t) => t.status === "Completed")
      .reduce((sum, t) => sum + t.amount, 0)
  );
  return {
    referralCode: code,
    totalReferrals: matching.length,
    qualifiedReferrals: matching.filter((r) => r.status === "qualified" || r.status === "paid").length,
    referralEarnings,
    referrals: matching.map((r) => ({
      id: r.id,
      referredEmail: r.referredEmail,
      status: r.status,
      rewardAmount: r.rewardAmount,
      createdAt: r.createdAt,
    })),
    transactions: referralTxs,
    ruleSummary:
      "5% partner bonus for referrals under $100,000 and 10% for qualified volumes exceeding $100,000, credited after administrator verification of settled deposits.",
  };
}

export function getMockAdminReferrals() {
  return {
    partnerSummary: Array.from(usersById.values()).map((u) => {
      const matching = referralsList.filter((r) => r.referrerUserId === u.id);
      const earnings = transactions
        .filter((t) => t.userId === u.id && t.type === "Referral" && t.status === "Completed")
        .reduce((s, t) => s + t.amount, 0);
      return {
        uid: u.id,
        email: u.email,
        displayName: u.name,
        code: u.referralCode || `BF-${u.id.slice(0, 8).toUpperCase()}`,
        totalReferrals: matching.length,
        qualifiedReferrals: matching.filter((r) => r.status === "qualified" || r.status === "paid").length,
        referralBonus: money(earnings),
      };
    }),
  };
}

export function getMockCustomerDocuments(userId: string): CustomerDocumentDTO[] {
  const userInv = getMockCustomerInvestments(userId).investments;
  const userTx = getMockCustomerTransactions(userId);
  const info = usersById.get(userId);
  const party = {
    uid: userId,
    name: info?.name || "Accredited Investor",
    email: info?.email || "investor@bitfurytech.local",
    country: info?.country || "",
  };
  const docs: CustomerDocumentDTO[] = [
    buildAccountDisclosureDocument(party, info?.createdAt ?? null),
  ];
  for (const inv of userInv) {
    docs.push(buildInvestmentAgreementDocument(party, inv));
  }
  for (const tx of userTx) {
    docs.push(buildTransactionDocument(party, tx));
  }
  return docs;
}

export function getMockAdminDocuments(): CustomerDocumentDTO[] {
  const docs: CustomerDocumentDTO[] = [];
  for (const u of usersById.values()) {
    docs.push(...getMockCustomerDocuments(u.id));
  }
  return docs;
}

export function updateMockCustomerStatus(
  uid: string,
  status: "Active" | "Review" | "Suspended",
  actorUid: string,
  actorEmail: string
): boolean {
  const user = usersById.get(uid);
  if (!user) return false;
  user.accountStatus = status;
  user.updatedAt = new Date().toISOString();
  addMockAuditLog(actorUid, actorEmail, "UPDATE_CUSTOMER_STATUS", "user", uid, { status });
  return true;
}

export function updateMockCustomerKycStatus(
  uid: string,
  kycStatus: "pending" | "approved" | "rejected" | "needs_information",
  note: string,
  actorUid: string,
  actorEmail: string
): { email: string; name: string } | null {
  const user = usersById.get(uid);
  if (!user) return null;
  user.kycStatus = kycStatus;
  user.updatedAt = new Date().toISOString();
  addMockUserNotification(
    uid,
    "Security",
    "Verification status updated",
    `Your KYC verification status is now ${kycStatus.replace(/_/g, " ")}.${note ? ` Note: ${note}` : ""}`
  );
  addMockAuditLog(actorUid, actorEmail, "UPDATE_KYC_STATUS", "user", uid, { status: kycStatus, note });
  return { email: user.email, name: user.name };
}

export function updateMockCustomerDetails(
  uid: string,
  patch: {
    displayName?: string;
    email?: string;
    country?: string;
    phone?: string;
    accountStatus?: "Active" | "Review" | "Suspended";
    walletBalance?: number;
    balanceNote?: string;
  },
  actorUid: string,
  actorEmail: string
) {
  const user = usersById.get(uid);
  if (!user || isMockUserBlocked(uid, user.email)) return null;

  if (patch.email !== undefined) {
    const cleanEmail = patch.email.trim().toLowerCase();
    for (const [otherId, otherUser] of usersById.entries()) {
      if (otherId !== uid && otherUser.email.toLowerCase() === cleanEmail) {
        throw Object.assign(new Error("Email address is already in use by another account."), { statusCode: 409 });
      }
    }
    if (isMockUserBlocked(null, cleanEmail)) {
      throw Object.assign(new Error("Email address belongs to a blocked defaulter."), { statusCode: 409 });
    }
    if (user.username) {
      emailByUsername.set(user.username, cleanEmail);
    }
    user.email = cleanEmail;
    for (const tx of transactions) {
      if (tx.userId === uid) tx.userEmail = cleanEmail;
    }
    for (const inv of investments) {
      if (inv.userId === uid) inv.userEmail = cleanEmail;
    }
  }

  if (patch.displayName !== undefined) user.name = patch.displayName.trim();
  if (patch.country !== undefined) user.country = patch.country.trim();
  if (patch.phone !== undefined) user.phone = patch.phone.trim();
  if (patch.accountStatus !== undefined) user.accountStatus = patch.accountStatus;
  user.updatedAt = new Date().toISOString();

  const wallet = getOrCreateWallet(uid);
  let balanceAdjusted = false;
  if (patch.walletBalance !== undefined && Number.isFinite(patch.walletBalance) && patch.walletBalance >= 0) {
    const target = money(patch.walletBalance);
    const delta = money(target - wallet.availableBalance);
    if (Math.abs(delta) >= 0.01) {
      wallet.availableBalance = target;
      balanceAdjusted = true;
      const nowIso = new Date().toISOString();
      transactions.unshift({
        id: randomUUID(),
        userId: uid,
        userEmail: user.email,
        type: delta > 0 ? "Deposit" : "Withdrawal",
        method: "Admin Balance Adjustment",
        amount: Math.abs(delta),
        destination: "Wallet",
        reference: `ADJ-${Date.now().toString().slice(-8)}`,
        status: "Completed",
        currency: "USD",
        description: patch.balanceNote?.trim() || `Administrator balance ${delta > 0 ? "credit" : "debit"} adjustment`,
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }
  }

  addMockAuditLog(actorUid, actorEmail, "EDIT_USER_ACCOUNT", "user", uid, {
    displayName: user.name,
    email: user.email,
    accountStatus: user.accountStatus,
    balanceAdjusted,
    walletBalance: wallet.availableBalance,
  });

  return {
    uid: user.id,
    displayName: user.name,
    email: user.email,
    country: user.country,
    phone: user.phone,
    accountStatus: user.accountStatus,
    walletBalance: wallet.availableBalance,
  };
}

export function listMockBlockedUsers(): MockBlockedUser[] {
  return Array.from(blockedUsersById.values()).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
}

export function blockMockUser(params: {
  userId?: string | null;
  email?: string | null;
  reason: string;
  actorUid: string;
  actorEmail: string;
}): MockBlockedUser {
  const matchedUser = params.userId
    ? usersById.get(params.userId)
    : Array.from(usersById.values()).find(
        (u) => params.email && u.email.toLowerCase() === params.email.trim().toLowerCase()
      );

  const cleanEmail = (matchedUser?.email || params.email || "").trim().toLowerCase();
  if (!cleanEmail) {
    throw Object.assign(new Error("A valid user or email address is required."), { statusCode: 400 });
  }

  const blockId = `blk_${randomUUID().slice(0, 10)}`;
  const entry: MockBlockedUser = {
    id: blockId,
    userId: matchedUser?.id ?? params.userId ?? null,
    email: cleanEmail,
    displayName: matchedUser?.name ?? cleanEmail.split("@")[0] ?? "Defaulter",
    reason: params.reason.trim(),
    blockedBy: params.actorEmail,
    createdAt: new Date().toISOString(),
  };

  for (const [existingId, existing] of blockedUsersById.entries()) {
    if (existing.email.toLowerCase() === cleanEmail) {
      blockedUsersById.delete(existingId);
    }
  }
  blockedUsersById.set(blockId, entry);

  if (matchedUser) {
    matchedUser.accountStatus = "Suspended";
    if (matchedUser.username) {
      emailByUsername.delete(matchedUser.username);
    }
    usersById.delete(matchedUser.id);
  }

  addMockAuditLog(params.actorUid, params.actorEmail, "BLOCK_REMOVE_USER", "user", entry.userId || cleanEmail, {
    email: cleanEmail,
    reason: entry.reason,
  });

  return entry;
}

export function unblockMockUser(blockId: string, actorUid: string, actorEmail: string): boolean {
  const existing = blockedUsersById.get(blockId);
  if (!existing) return false;
  blockedUsersById.delete(blockId);
  addMockAuditLog(actorUid, actorEmail, "UNBLOCK_USER", "blocked_user", blockId, {
    email: existing.email,
  });
  return true;
}

export function addMockUserNotification(
  userId: string,
  category: string,
  title: string,
  body: string
): NotificationMessage {
  const entry: NotificationMessage = {
    id: randomUUID(),
    userId,
    category,
    title,
    body,
    read: false,
    createdAt: new Date().toISOString(),
  };
  notificationsList.unshift(entry);
  return entry;
}

export function updateMockInvestmentStatus(
  id: string,
  status: "Active" | "Completed",
  reason: string,
  actorUid: string,
  actorEmail: string
): boolean {
  const inv = investments.find((i) => i.id === id);
  if (!inv) return false;
  inv.status = status;
  addMockAuditLog(actorUid, actorEmail, "UPDATE_INVESTMENT_STATUS", "investment", id, { status, reason });
  return true;
}

export function upsertMockPlan(
  id: string,
  data: Record<string, unknown>,
  actorUid: string,
  actorEmail: string
): void {
  customPlans.set(id, { id, ...data });
  addMockAuditLog(actorUid, actorEmail, "UPSERT_INVESTMENT_PLAN", "investment_plan", id, {
    name: data.name,
    category: data.category,
    published: data.published !== false,
  });
}

export function upsertMockProperty(
  id: string,
  data: Record<string, unknown>,
  actorUid: string,
  actorEmail: string
): void {
  customProperties.set(id, { id, ...data });
  addMockAuditLog(actorUid, actorEmail, "UPSERT_PROPERTY", "property", id, {
    title: data.title,
    published: data.published !== false,
  });
}

export function updateMockProperty(
  id: string,
  data: Record<string, unknown>,
  actorUid: string,
  actorEmail: string
): boolean {
  const existing = customProperties.get(id);
  if (!existing) return false;
  customProperties.set(id, { ...existing, ...data, id });
  addMockAuditLog(actorUid, actorEmail, "UPDATE_PROPERTY", "property", id, {
    published: data.published !== false,
  });
  return true;
}

export function deleteMockProperty(
  id: string,
  actorUid: string,
  actorEmail: string
): boolean {
  const deleted = customProperties.delete(id);
  if (deleted) {
    addMockAuditLog(actorUid, actorEmail, "DELETE_PROPERTY", "property", id, {});
  }
  return deleted;
}

export function getMockEmailTemplates(): EmailTemplateRecord[] {
  return DEFAULT_MAIL_TEMPLATES.map((def) => {
    const saved = customEmailTemplates.get(def.eventType);
    if (saved) return saved;
    return {
      eventType: def.eventType,
      subject: def.subject,
      body: def.body,
      enabled: def.enabled,
      updatedBy: undefined,
      updatedAt: null,
    };
  });
}

export function saveMockEmailTemplate(
  eventType: string,
  subject: string,
  body: string,
  enabled: boolean,
  updatedBy: string
): EmailTemplateRecord {
  const record: EmailTemplateRecord = {
    eventType,
    subject,
    body,
    enabled,
    updatedBy,
    updatedAt: new Date().toISOString(),
  };
  customEmailTemplates.set(eventType, record);
  return record;
}

export function addMockEmailOutbox(entry: {
  id: string;
  eventType: string;
  recipient: string;
  subject: string;
  body: string;
  status: "sent" | "failed" | "pending";
  lastError?: string | null;
}): void {
  const now = new Date().toISOString();
  emailOutboxList.unshift({
    id: entry.id,
    eventType: entry.eventType,
    recipient: entry.recipient,
    subject: entry.subject,
    body: entry.body,
    status: entry.status,
    lastError: entry.lastError ?? null,
    sentAt: entry.status === "sent" ? now : null,
    createdAt: now,
  });
  if (emailOutboxList.length > 200) emailOutboxList.length = 200;
}

export function getMockEmailOutbox(): EmailOutboxRecord[] {
  return emailOutboxList.slice(0, 50);
}

function utcDayStart(value: Date | string): Date {
  const d = new Date(value);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function resolveMockPayoutFrequency(value: unknown): "daily" | "weekly" | "monthly" | "maturity" {
  const s = String(value ?? "").toLowerCase();
  if (s.includes("matur") || s.includes("end of term")) return "maturity";
  if (s.includes("weekly")) return "weekly";
  if (s.includes("monthly")) return "monthly";
  return "daily";
}

function isMockPayoutDue(
  freq: "daily" | "weekly" | "monthly" | "maturity",
  start: Date,
  today: Date,
  matured: boolean
): boolean {
  if (matured) return true;
  if (freq === "maturity") return false;
  const elapsedDays = Math.floor((today.getTime() - start.getTime()) / 86400000);
  if (freq === "daily") return elapsedDays >= 1;
  if (freq === "weekly") return elapsedDays > 0 && elapsedDays % 7 === 0;
  return today.getUTCDate() === start.getUTCDate() && today > start;
}

export function processMockPlanDrivenRoi(asOf = new Date()): Array<{
  investmentId: string;
  userId: string;
  email: string;
  name: string;
  emailAlerts: boolean;
  amount: number;
  planName: string;
}> {
  const today = utcDayStart(asOf);
  const accrualCutoff = new Date(today.getTime() - 86400000);
  const payouts: Array<{
    investmentId: string;
    userId: string;
    email: string;
    name: string;
    emailAlerts: boolean;
    amount: number;
    planName: string;
  }> = [];

  for (const inv of investments) {
    if (inv.status !== "Active") continue;
    if (!(inv.dailyRatePct > 0) || inv.dailyRatePct > 100 || !(inv.amount > 0)) continue;

    const start = utcDayStart(inv.startDate);
    const maturity = utcDayStart(inv.maturityDate);
    const lastAccrual = new Date(Math.min(accrualCutoff.getTime(), maturity.getTime() - 86400000));
    const accruedSet = mockRoiAccruedDates.get(inv.id) ?? new Set<string>();
    mockRoiAccruedDates.set(inv.id, accruedSet);

    if (lastAccrual >= start) {
      const dailyAmount = money((inv.amount * inv.dailyRatePct) / 100);
      if (dailyAmount > 0) {
        let added = 0;
        for (let cursor = start.getTime(); cursor <= lastAccrual.getTime(); cursor += 86400000) {
          const dayKey = new Date(cursor).toISOString().slice(0, 10);
          if (!accruedSet.has(dayKey)) {
            accruedSet.add(dayKey);
            added = money(added + dailyAmount);
          }
        }
        if (added > 0) {
          mockRoiUnpaidBalances.set(inv.id, money((mockRoiUnpaidBalances.get(inv.id) ?? 0) + added));
        }
      }
    }

    const matured = today >= maturity;
    const freq = resolveMockPayoutFrequency(inv.paymentFrequency);
    if (isMockPayoutDue(freq, start, today, matured)) {
      const dueAmount = money(mockRoiUnpaidBalances.get(inv.id) ?? 0);
      if (dueAmount > 0) {
        const wallet = getOrCreateWallet(inv.userId);
        wallet.availableBalance = money(wallet.availableBalance + dueAmount);
        mockRoiUnpaidBalances.set(inv.id, 0);

        const nowIso = new Date().toISOString();
        const ref = `ROI-${inv.id.slice(-8).toUpperCase()}-${today.toISOString().slice(0, 10).replace(/-/g, "")}`;
        transactions.unshift({
          id: randomUUID(),
          userId: inv.userId,
          userEmail: inv.userEmail,
          type: "Profit",
          method: `${inv.planName} ROI`,
          amount: dueAmount,
          destination: inv.id,
          reference: ref,
          status: "Completed",
          currency: "USD",
          description: `Daily ROI distribution: ${inv.planName}`,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
        notificationsList.unshift({
          id: randomUUID(),
          userId: inv.userId,
          category: "investment",
          title: "Investment return credited",
          body: `USD ${dueAmount.toFixed(2)} credited from ${inv.planName}`,
          read: false,
          createdAt: nowIso,
        });

        const userInfo = usersById.get(inv.userId);
        payouts.push({
          investmentId: inv.id,
          userId: inv.userId,
          email: inv.userEmail,
          name: userInfo?.name || inv.userName || "Investor",
          emailAlerts: userInfo ? userInfo.emailAlerts : true,
          amount: dueAmount,
          planName: inv.planName,
        });
      }
    }

    if (matured) {
      inv.status = "Completed";
    }
  }

  return payouts;
}

export function resolveMockDeposit(
  txId: string,
  decision: "Completed" | "Rejected",
  actorEmail: string,
  note: string
): { userId: string; userEmail: string; userName: string; amount: number; method: string; reference: string } | null {
  const tx = transactions.find((t) => t.id === txId && t.type === "Deposit");
  if (!tx || tx.status !== "Pending") return null;
  const nowIso = new Date().toISOString();
  tx.status = decision;
  tx.updatedAt = nowIso;
  const depositor = usersById.get(tx.userId);
  if (decision === "Completed") {
    const w = getOrCreateWallet(tx.userId);
    w.availableBalance = money(w.availableBalance + tx.amount);
    addMockUserNotification(
      tx.userId,
      "Settlement",
      "Deposit verified",
      `Your ${tx.method} deposit for $${tx.amount.toFixed(2)} (${tx.reference}) has been verified and credited.`
    );

    const pendingRef = referralsList.find((r) => r.referredUserId === tx.userId && r.status === "pending");
    if (pendingRef) {
      const referrer = usersById.get(pendingRef.referrerUserId);
      if (referrer && referrer.accountStatus !== "Suspended" && !isMockUserBlocked(referrer.id, referrer.email)) {
        const priorSettledVolume = referralsList
          .filter((r) => r.referrerUserId === referrer.id && (r.status === "paid" || r.status === "qualified"))
          .reduce((sum, r) => {
            const refDeposit = transactions
              .filter((t) => t.userId === r.referredUserId && t.type === "Deposit" && t.status === "Completed")
              .reduce((dSum, t) => dSum + t.amount, 0);
            return sum + refDeposit;
          }, 0);
        const rate = priorSettledVolume + tx.amount >= 100000 ? 0.1 : 0.05;
        const reward = money(tx.amount * rate);
        if (reward > 0) {
          pendingRef.status = "paid";
          pendingRef.rewardAmount = reward;
          const rw = getOrCreateWallet(referrer.id);
          rw.availableBalance = money(rw.availableBalance + reward);
          transactions.unshift({
            id: randomUUID(),
            userId: referrer.id,
            userEmail: referrer.email,
            type: "Referral",
            method: `Partner Tier (${Math.round(rate * 100)}%)`,
            amount: reward,
            destination: "Custody Wallet",
            reference: `REF-${tx.reference.slice(-8)}`,
            status: "Completed",
            currency: "USD",
            description: `Referral bonus credited for ${tx.userEmail}`,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
          addMockUserNotification(
            referrer.id,
            "Referral",
            "Referral reward credited",
            `USD ${reward.toFixed(2)} referral bonus was credited following verified settlement from ${tx.userEmail}.`
          );
        }
      }
    }
  } else {
    addMockUserNotification(
      tx.userId,
      "Settlement",
      "Deposit notice declined",
      `Your ${tx.method} deposit notice (${tx.reference}) could not be verified.${note ? ` Note: ${note}` : ""}`
    );
  }
  addMockAuditLog("admin", actorEmail, "RESOLVE_DEPOSIT", "transaction", txId, {
    decision,
    amount: tx.amount,
    note,
  });
  return {
    userId: tx.userId,
    userEmail: tx.userEmail,
    userName: depositor?.name || tx.userEmail.split("@")[0] || "Investor",
    amount: tx.amount,
    method: tx.method,
    reference: tx.reference,
  };
}

export function resolveMockWithdrawal(
  txId: string,
  decision: "Completed" | "Rejected",
  actorEmail: string,
  note: string
): { userId: string; userEmail: string; userName: string; amount: number; method: string; reference: string } | null {
  const tx = transactions.find((t) => t.id === txId && t.type === "Withdrawal");
  if (!tx || tx.status !== "Pending") return null;
  const w = getOrCreateWallet(tx.userId);
  if (w.reservedBalance < tx.amount) return null;
  w.reservedBalance = money(w.reservedBalance - tx.amount);
  if (decision === "Rejected") {
    w.availableBalance = money(w.availableBalance + tx.amount);
    addMockUserNotification(
      tx.userId,
      "Settlement",
      "Withdrawal request declined",
      `Your withdrawal request for $${tx.amount.toFixed(2)} (${tx.reference}) was declined and reserved funds were returned.${note ? ` Note: ${note}` : ""}`
    );
  } else {
    addMockUserNotification(
      tx.userId,
      "Settlement",
      "Withdrawal settled",
      `Your ${tx.method} withdrawal for $${tx.amount.toFixed(2)} (${tx.reference}) has been approved and settled.`
    );
  }
  tx.status = decision;
  tx.updatedAt = new Date().toISOString();
  const userInfo = usersById.get(tx.userId);
  addMockAuditLog("admin", actorEmail, "RESOLVE_WITHDRAWAL", "transaction", txId, {
    decision,
    amount: tx.amount,
    note,
  });
  return {
    userId: tx.userId,
    userEmail: tx.userEmail,
    userName: userInfo?.name || tx.userEmail.split("@")[0] || "Investor",
    amount: tx.amount,
    method: tx.method,
    reference: tx.reference,
  };
}
