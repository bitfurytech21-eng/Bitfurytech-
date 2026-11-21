export type MandateCategory = "crypto" | "stock" | "estate";

export interface InvestmentMandate {
  id: string;
  category: MandateCategory;
  categoryLabel: string;
  name: string;
  audience: string;
  minDeposit: number;
  maxDeposit: number;
  dailyRatePct: number;
  durationDays: number;
  settlementRail: string;
  highlights: string[];
}

export const INVESTMENT_MANDATES: InvestmentMandate[] = [
  {
    id: "crypto-core",
    category: "crypto",
    categoryLabel: "Digital Assets",
    name: "Core Liquidity",
    audience: "For entry-level digital asset custody and spot arbitrage",
    minDeposit: 500,
    maxDeposit: 4999,
    dailyRatePct: 1.5,
    durationDays: 30,
    settlementRail: "USDT (TRC20) / BTC / ETH",
    highlights: [
      "Cold-storage reserve segregation",
      "Automated 24-hour settlement cycle",
      "Transparent ledger tracking",
    ],
  },
  {
    id: "crypto-institutional",
    category: "crypto",
    categoryLabel: "Digital Assets",
    name: "Institutional Digital",
    audience: "For larger multi-asset cryptocurrency treasury allocations",
    minDeposit: 5000,
    maxDeposit: 100000,
    dailyRatePct: 2.2,
    durationDays: 30,
    settlementRail: "USDT (TRC20) / BTC / Bank Wire",
    highlights: [
      "Cross-venue liquidity routing",
      "Automated drawdown risk limits",
      "Priority withdrawal verification",
    ],
  },
  {
    id: "stock-equity",
    category: "stock",
    categoryLabel: "Global Equities",
    name: "Global Equity Index",
    audience: "For diversified large-cap technology and industrial exposure",
    minDeposit: 1000,
    maxDeposit: 24999,
    dailyRatePct: 1.8,
    durationDays: 30,
    settlementRail: "Bank Wire / USDT (TRC20)",
    highlights: [
      "Major global index liquidity",
      "Systematic rebalancing windows",
      "Real-time allocation reporting",
    ],
  },
  {
    id: "stock-private",
    category: "stock",
    categoryLabel: "Global Equities",
    name: "Private Equity Mandate",
    audience: "For concentrated corporate treasury and growth mandates",
    minDeposit: 25000,
    maxDeposit: 250000,
    dailyRatePct: 2.6,
    durationDays: 30,
    settlementRail: "Bank Wire / USDT (TRC20)",
    highlights: [
      "Dedicated portfolio structuring",
      "Multi-currency hedge protection",
      "Quarterly compliance statements",
    ],
  },
  {
    id: "estate-commercial",
    category: "estate",
    categoryLabel: "Real Estate",
    name: "Commercial Property Trust",
    audience: "For asset-backed participation in commercial office holdings",
    minDeposit: 3000,
    maxDeposit: 49999,
    dailyRatePct: 1.4,
    durationDays: 60,
    settlementRail: "Bank Wire / USDT (TRC20)",
    highlights: [
      "Commercial tenant lease backing",
      "Independent appraisal governance",
      "Scheduled rental distribution",
    ],
  },
  {
    id: "estate-syndicate",
    category: "estate",
    categoryLabel: "Real Estate",
    name: "Prime Logistics Syndicate",
    audience: "For institutional commercial & logistics development holdings",
    minDeposit: 50000,
    maxDeposit: 500000,
    dailyRatePct: 2.1,
    durationDays: 90,
    settlementRail: "Bank Wire / Institutional Custody",
    highlights: [
      "Senior asset-backed participation",
      "Long-term corporate tenancy",
      "Full property inspection documentation",
    ],
  },
];

export function getMandateById(planId: string): InvestmentMandate | undefined {
  return INVESTMENT_MANDATES.find((m) => m.id === planId);
}

export function validateAllocation(
  planId: string,
  amount: number,
  availableBalance: number
): { valid: boolean; error?: string; mandate?: InvestmentMandate } {
  const mandate = getMandateById(planId);
  if (!mandate) {
    return { valid: false, error: "Selected investment mandate does not exist." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { valid: false, error: "Enter a valid positive allocation amount." };
  }
  if (amount < mandate.minDeposit || amount > mandate.maxDeposit) {
    return {
      valid: false,
      error: `Allocation must be between $${mandate.minDeposit.toLocaleString()} and $${mandate.maxDeposit.toLocaleString()}.`,
    };
  }
  if (amount > availableBalance) {
    return {
      valid: false,
      error: "Insufficient verified wallet balance for this allocation.",
    };
  }
  return { valid: true, mandate };
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
