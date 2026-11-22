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
  monthlyRatePct?: number;
  referralBonusPct?: number;
  durationDays: number;
  paymentFrequency: string;
  settlementRail: string;
  image: string;
  returnTerms: string;
  highlights: string[];
}

export const INVESTMENT_MANDATES: InvestmentMandate[] = [
  // Cryptocurrency Plans (6 Tiers · 5% Referral Bonus)
  {
    id: "crypto-beginner",
    category: "crypto",
    categoryLabel: "Digital Assets",
    name: "Crypto Beginner",
    audience: "Entry-tier algorithmic digital asset custody & spot liquidity",
    description:
      "Structured mathematical and statistical trading exposure across major cryptocurrency markets designed for initial portfolio allocations with 24/7 monitoring.",
    minDeposit: 200,
    maxDeposit: 4999,
    dailyRatePct: 1.08,
    monthlyRatePct: 32.4,
    referralBonusPct: 5,
    durationDays: 30,
    paymentFrequency: "Daily trading session accrual · 30-day cycle",
    settlementRail: "USDT (TRC20) / BTC / ETH",
    image: "/images/digital-assets.png",
    returnTerms:
      "1.08% indicative daily benchmark (32.4% monthly target) over a 30-day cycle with 5% referral bonus on qualified deposits. Digital asset values fluctuate and targets are non-guaranteed.",
    highlights: [
      "5% partner referral bonus eligibility",
      "Automated 24/7 algorithmic monitoring",
      "Segregated wallet ledger reporting",
    ],
  },
  {
    id: "crypto-prime",
    category: "crypto",
    categoryLabel: "Digital Assets",
    name: "Crypto Prime",
    audience: "Growing digital asset allocations seeking multi-venue liquidity",
    description:
      "Expanded quantitative digital asset strategy spanning spot liquidity pools and cross-exchange execution with systematic risk brackets.",
    minDeposit: 5000,
    maxDeposit: 24999,
    dailyRatePct: 1.26,
    monthlyRatePct: 37.8,
    referralBonusPct: 5,
    durationDays: 30,
    paymentFrequency: "Daily trading session accrual · 30-day cycle",
    settlementRail: "USDT (TRC20) / BTC / ETH",
    image: "/images/digital-assets.png",
    returnTerms:
      "1.26% indicative daily benchmark (37.8% monthly target) over 30 days with 5% referral bonus. Returns depend on market liquidity and are not guaranteed.",
    highlights: [
      "Multi-venue statistical execution",
      "Defined portfolio risk parameters",
      "Zero cost plan switching across market cycles",
    ],
  },
  {
    id: "crypto-executive",
    category: "crypto",
    categoryLabel: "Digital Assets",
    name: "Crypto Executive",
    audience: "Mid-tier private capital & structured digital treasury",
    description:
      "Systematic algorithmic strategy guided by our Investment Policy Committee for established cryptocurrency portfolios seeking disciplined multi-market execution.",
    minDeposit: 25000,
    maxDeposit: 49999,
    dailyRatePct: 1.95,
    monthlyRatePct: 58.6,
    referralBonusPct: 5,
    durationDays: 30,
    paymentFrequency: "Daily trading session accrual · 30-day cycle",
    settlementRail: "USDT (TRC20) / BTC / ETH / Bank Wire",
    image: "/images/digital-assets.png",
    returnTerms:
      "1.95% indicative daily benchmark (58.6% monthly target) over 30 days with 5% referral bonus. Subject to crypto market volatility and non-guaranteed performance.",
    highlights: [
      "IPC strategic allocation oversight",
      "Priority settlement verification",
      "Full custody & transaction audit trail",
    ],
  },
  {
    id: "crypto-premium",
    category: "crypto",
    categoryLabel: "Digital Assets",
    name: "Crypto Premium",
    audience: "High-balance digital asset mandate with broad market access",
    description:
      "Institutional-grade custody and quantitative trading execution across liquid cryptocurrency pairs backed by continuous statistical risk modeling.",
    minDeposit: 50000,
    maxDeposit: 99999,
    dailyRatePct: 1.98,
    monthlyRatePct: 59.4,
    referralBonusPct: 5,
    durationDays: 30,
    paymentFrequency: "Daily trading session accrual · 30-day cycle",
    settlementRail: "USDT (TRC20) / BTC / Bank Wire",
    image: "/images/digital-assets.png",
    returnTerms:
      "1.98% indicative daily benchmark (59.4% monthly target) over 30 days with 5% referral bonus. Variable digital asset outcomes; capital remains at market risk.",
    highlights: [
      "Institutional-grade digital asset custody",
      "Real-time drawdown & exposure monitoring",
      "Dedicated desk account assistance",
    ],
  },
  {
    id: "crypto-master",
    category: "crypto",
    categoryLabel: "Digital Assets",
    name: "Crypto Master",
    audience: "Substantial treasury allocations across global digital venues",
    description:
      "Large-scale quantitative allocation model utilizing algorithmic order routing, statistical arbitrage, and continuous liquidity management.",
    minDeposit: 100000,
    maxDeposit: 499999,
    dailyRatePct: 2.3,
    monthlyRatePct: 69,
    referralBonusPct: 5,
    durationDays: 30,
    paymentFrequency: "Daily trading session accrual · 30-day cycle",
    settlementRail: "USDT (TRC20) / BTC / Bank Wire",
    image: "/images/digital-assets.png",
    returnTerms:
      "2.3% indicative daily benchmark (69% monthly target) over 30 days with 5% referral bonus (10% partner tier for referred deposits above $100k). Non-guaranteed returns.",
    highlights: [
      "Cross-exchange algorithmic routing",
      "Qualifies above-$100k partner tier threshold",
      "Comprehensive statement & settlement export",
    ],
  },
  {
    id: "crypto-master-pro",
    category: "crypto",
    categoryLabel: "Digital Assets",
    name: "Crypto Master Pro",
    audience: "Flagship institutional digital asset allocation tier",
    description:
      "Bitfury Tech Investment's highest-capacity cryptocurrency mandate combining automated execution across global liquidity venues with institutional custody governance.",
    minDeposit: 500000,
    maxDeposit: 1000000,
    dailyRatePct: 2.8,
    monthlyRatePct: 85,
    referralBonusPct: 5,
    durationDays: 30,
    paymentFrequency: "Daily trading session accrual · 30-day cycle",
    settlementRail: "Bank Wire / USDT (TRC20) / BTC",
    image: "/images/digital-assets.png",
    returnTerms:
      "2.8% indicative daily benchmark (85% monthly target) over 30 days with 5% plan referral bonus. High-tier digital asset exposure carries capital risk and is not guaranteed.",
    highlights: [
      "Up to $1,000,000 single-mandate capacity",
      "24/7 quantitative risk & liquidity control",
      "Senior settlement desk review",
    ],
  },

  // Stock Plans (4 Tiers · 6% Referral Bonus)
  {
    id: "stock-beginner",
    category: "stock",
    categoryLabel: "Global Equities",
    name: "Stock Beginner",
    audience: "Entry equity allocation across global company shares",
    description:
      "Structured participation across liquid public equities spanning over 50 accessible global financial markets through one unified investor account.",
    minDeposit: 1000,
    maxDeposit: 19999,
    dailyRatePct: 1.08,
    monthlyRatePct: 32.4,
    referralBonusPct: 6,
    durationDays: 30,
    paymentFrequency: "Daily trading session accrual · 30-day cycle",
    settlementRail: "Bank Wire / USDT (TRC20)",
    image: "/images/global-equities.png",
    returnTerms:
      "1.08% indicative daily benchmark (32.4% monthly target) over 30 days with 6% referral bonus. Stock valuations rise and fall with earnings and macroeconomic conditions.",
    highlights: [
      "6% equity referral bonus structure",
      "Access across global large-cap sectors",
      "Research-backed systematic rebalancing",
    ],
  },
  {
    id: "stock-prime",
    category: "stock",
    categoryLabel: "Global Equities",
    name: "Stock Prime",
    audience: "Balanced corporate share portfolios with sector diversification",
    description:
      "Diversified multi-sector equity portfolio pairing mathematical momentum models with fundamental macroeconomic analysis from our research department.",
    minDeposit: 20000,
    maxDeposit: 49999,
    dailyRatePct: 1.6,
    monthlyRatePct: 48,
    referralBonusPct: 6,
    durationDays: 30,
    paymentFrequency: "Daily trading session accrual · 30-day cycle",
    settlementRail: "Bank Wire / USDT (TRC20)",
    image: "/images/global-equities.png",
    returnTerms:
      "1.6% indicative daily benchmark (48% monthly target) over 30 days with 6% referral bonus. Equity returns fluctuate with market liquidity and are not guaranteed.",
    highlights: [
      "6% partner referral bonus",
      "Multi-market equity diversification",
      "Ongoing IPC macroeconomic supervision",
    ],
  },
  {
    id: "stock-executive",
    category: "stock",
    categoryLabel: "Global Equities",
    name: "Stock Executive",
    audience: "Active structured equity mandate for seasoned portfolios",
    description:
      "Research-driven corporate equity portfolio integrating quantitative factor screening across major global exchanges and industrial sectors.",
    minDeposit: 50000,
    maxDeposit: 99999,
    dailyRatePct: 1.98,
    monthlyRatePct: 59.4,
    referralBonusPct: 6,
    durationDays: 30,
    paymentFrequency: "Daily trading session accrual · 30-day cycle",
    settlementRail: "Bank Wire / USDT (TRC20)",
    image: "/images/global-equities.png",
    returnTerms:
      "1.98% indicative daily benchmark (59.4% monthly target) over 30 days with 6% referral bonus. Capital value can decline as well as rise.",
    highlights: [
      "Algorithmic factor & sector weighting",
      "Full session reporting in dashboard",
      "Flexible cross-category mandate switching",
    ],
  },
  {
    id: "stock-premium",
    category: "stock",
    categoryLabel: "Global Equities",
    name: "Stock Premium",
    audience: "Institutional equity & corporate finance treasury allocation",
    description:
      "High-capacity global equities mandate supported by Bitfury Tech Investment's network of macroeconomists, research scientists, and quantitative analysts.",
    minDeposit: 100000,
    maxDeposit: 1000000,
    dailyRatePct: 2.6,
    monthlyRatePct: 78,
    referralBonusPct: 6,
    durationDays: 30,
    paymentFrequency: "Daily trading session accrual · 30-day cycle",
    settlementRail: "Bank Wire / USDT (TRC20)",
    image: "/images/global-equities.png",
    returnTerms:
      "2.6% indicative daily benchmark (78% monthly target) over 30 days with 6% referral bonus. Concentrated equity allocations carry market risk with no guaranteed return.",
    highlights: [
      "Dedicated institutional equity capacity up to $1M",
      "Quantitative hedge & volatility controls",
      "Audited transaction & custody records",
    ],
  },

  // Real Estate Plans (3 Tiers · 7% Referral Bonus)
  {
    id: "estate-beginner",
    category: "estate",
    categoryLabel: "Real Estate",
    name: "Real Estate Beginner",
    audience: "Accessible entry into commercial and residential property holdings",
    description:
      "Structured property participation designed to broaden access to institutional-grade real estate investments, tenancy income considerations, and asset-backed appreciation.",
    minDeposit: 3000,
    maxDeposit: 499999,
    dailyRatePct: 1.4,
    monthlyRatePct: 42,
    referralBonusPct: 7,
    durationDays: 30,
    paymentFrequency: "Daily cycle accrual · 30-day term",
    settlementRail: "Bank Wire / USDT (TRC20)",
    image: "/images/commercial-property.png",
    returnTerms:
      "1.4% indicative daily benchmark (42% monthly target) with 7% referral bonus. Property returns depend on occupancy, lease performance, and appraised valuation.",
    highlights: [
      "7% real estate referral bonus",
      "Commercial & residential property focus",
      "Appraised asset & occupancy visibility",
    ],
  },
  {
    id: "estate-prime",
    category: "estate",
    categoryLabel: "Real Estate",
    name: "Real Estate Prime",
    audience: "Mid-market commercial buildings & leased portfolio participation",
    description:
      "Higher-bracket property portfolio allocation targeting prime commercial assets, corporate lease income, and long-term capital preservation.",
    minDeposit: 500000,
    maxDeposit: 999999,
    dailyRatePct: 1.8,
    monthlyRatePct: 54,
    referralBonusPct: 7,
    durationDays: 30,
    paymentFrequency: "Daily cycle accrual · 30-day term",
    settlementRail: "Bank Wire / USDT (TRC20)",
    image: "/images/commercial-property.png",
    returnTerms:
      "1.8% indicative daily benchmark (54% monthly target) with 7% referral bonus. Real estate values and rental cash flows are non-guaranteed.",
    highlights: [
      "Commercial tenant lease backing",
      "Independent property appraisal review",
      "7% partner referral eligibility",
    ],
  },
  {
    id: "estate-executive",
    category: "estate",
    categoryLabel: "Real Estate",
    name: "Real Estate Executive",
    audience: "Institutional property syndicates & flagship commercial developments",
    description:
      "Senior real estate mandate built for multi-million commercial developments, logistics hubs, and diversified regional property syndicates.",
    minDeposit: 1000000,
    maxDeposit: 5000000,
    dailyRatePct: 2.0,
    monthlyRatePct: 60,
    referralBonusPct: 7,
    durationDays: 30,
    paymentFrequency: "Daily cycle accrual · 30-day term",
    settlementRail: "Bank Wire / Institutional Custody",
    image: "/images/commercial-property.png",
    returnTerms:
      "2.0% indicative daily benchmark (60% monthly target) with 7% referral bonus. Subject to tenancy performance, market appraisal, and settlement terms.",
    highlights: [
      "Capacity from $1,000,000 to $5,000,000",
      "Full property offering & inspection transparency",
      "Priority institutional custody handling",
    ],
  },
];

const LEGACY_MANDATE_ALIASES: Record<string, string> = {
  "crypto-core": "crypto-beginner",
  "crypto-institutional": "crypto-prime",
  "stock-equity": "stock-beginner",
  "stock-private": "stock-prime",
  "estate-commercial": "estate-beginner",
  "estate-syndicate": "estate-prime",
};

export function getMandateById(planId: string): InvestmentMandate | undefined {
  const normalized = LEGACY_MANDATE_ALIASES[planId] ?? planId;
  return INVESTMENT_MANDATES.find((m) => m.id === normalized);
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
