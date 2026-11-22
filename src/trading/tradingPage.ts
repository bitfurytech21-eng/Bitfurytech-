export type MandateCategory = "crypto" | "stock" | "estate";

export interface InvestmentMandate {
  id: string;
  category: MandateCategory;
  categoryLabel: string;
  name: string;
  audience: string;
  description: string;
  minDeposit: number;
  maxDeposit: number;
  dailyRatePct: number;
  durationDays: number;
  paymentFrequency: string;
  settlementRail: string;
  image: string;
  returnTerms: string;
  highlights: string[];
}

export const INVESTMENT_MANDATES: InvestmentMandate[] = [
  {
    id: "crypto-core",
    category: "crypto",
    categoryLabel: "Digital Assets",
    name: "Core Liquidity",
    audience: "For entry-level digital asset custody and spot arbitrage",
    description:
      "Designed for investors seeking structured exposure to major digital asset liquidity pools with segregated reserve tracking and a 30-day cycle horizon.",
    minDeposit: 500,
    maxDeposit: 4999,
    dailyRatePct: 1.5,
    durationDays: 30,
    paymentFrequency: "Daily cycle accrual (24-hour ledger interval)",
    settlementRail: "USDT (TRC20) / BTC / ETH",
    image: "/images/asset_algo_trading.jpg",
    returnTerms:
      "1.5% indicative daily target benchmark over 30 days. Targets are not guaranteed and remain subject to market liquidity and settlement review.",
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
    description:
      "Structured multi-venue digital asset treasury mandate built for larger capital allocations requiring cross-venue routing and defined drawdown controls.",
    minDeposit: 5000,
    maxDeposit: 100000,
    dailyRatePct: 2.2,
    durationDays: 30,
    paymentFrequency: "Daily cycle accrual (24-hour ledger interval)",
    settlementRail: "USDT (TRC20) / BTC / Bank Wire",
    image: "/images/asset_algo_trading.jpg",
    returnTerms:
      "2.2% indicative daily target benchmark over 30 days. Returns are variable, unguaranteed, and depend on execution conditions.",
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
    description:
      "Broad-market equity mandate providing structured participation across liquid large-cap technology and industrial sectors with periodic rebalancing.",
    minDeposit: 1000,
    maxDeposit: 24999,
    dailyRatePct: 1.8,
    durationDays: 30,
    paymentFrequency: "Daily cycle accrual with 30-day maturity review",
    settlementRail: "Bank Wire / USDT (TRC20)",
    image: "/images/hero_institutional_wealth.jpg",
    returnTerms:
      "1.8% indicative daily target benchmark over 30 days. Equity market returns fluctuate and are not guaranteed.",
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
    description:
      "Higher-threshold equity portfolio mandate tailored for concentrated corporate treasury allocations with multi-currency hedging and compliance reporting.",
    minDeposit: 25000,
    maxDeposit: 250000,
    dailyRatePct: 2.6,
    durationDays: 30,
    paymentFrequency: "Daily cycle accrual with quarterly compliance review",
    settlementRail: "Bank Wire / USDT (TRC20)",
    image: "/images/hero_institutional_wealth.jpg",
    returnTerms:
      "2.6% indicative daily target benchmark over 30 days. Concentrated equity strategies carry capital risk and offer no guaranteed yield.",
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
    description:
      "Asset-backed participation in commercial office properties backed by corporate tenant leases, independent valuation governance, and a 60-day term.",
    minDeposit: 3000,
    maxDeposit: 49999,
    dailyRatePct: 1.4,
    durationDays: 60,
    paymentFrequency: "Scheduled cycle distribution over 60-day term",
    settlementRail: "Bank Wire / USDT (TRC20)",
    image: "/images/asset_real_estate.jpg",
    returnTerms:
      "1.4% indicative daily target benchmark over 60 days. Property distributions depend on occupancy, lease performance, and appraisal conditions.",
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
    description:
      "Senior asset-backed commercial logistics syndicate offering 90-day structured exposure to industrial distribution facilities under long-term tenancy.",
    minDeposit: 50000,
    maxDeposit: 500000,
    dailyRatePct: 2.1,
    durationDays: 90,
    paymentFrequency: "Scheduled cycle distribution over 90-day term",
    settlementRail: "Bank Wire / Institutional Custody",
    image: "/images/asset_real_estate.jpg",
    returnTerms:
      "2.1% indicative daily target benchmark over 90 days. Real estate syndicate returns are non-guaranteed and subject to asset occupancy.",
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
