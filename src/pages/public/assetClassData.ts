import type { MandateCategory } from "../../trading/tradingPage";

export interface AssetClassGuide {
  id: MandateCategory;
  slug: string;
  label: string;
  title: string;
  image: string;
  summary: string;
  approach: string;
  valueDrivers: string[];
  process: string[];
  reviewPoints: string[];
  risk: string;
}

export const ASSET_CLASS_GUIDES: AssetClassGuide[] = [
  {
    id: "crypto",
    slug: "crypto",
    label: "Digital assets",
    title: "Cryptocurrency & digital assets",
    image: "/images/digital-assets.jpg",
    summary:
      "Digital assets trade around the clock across centralized venues and blockchain networks. Prices can move quickly as liquidity, market sentiment, technology, and regulation change.",
    approach:
      "Bitfury Tech describes a quantitative approach to digital-asset markets, including continuous monitoring, statistical analysis, and execution across liquid venues. These activities seek to manage exposure and identify opportunities; they cannot ensure a positive result.",
    valueDrivers: [
      "Price changes when an asset is bought and later sold",
      "Relative-value opportunities between assets or venues, where available",
      "Liquidity and execution quality after trading costs",
    ],
    process: [
      "Review market, volume, and liquidity signals",
      "Set position sizes and exposure limits",
      "Route and monitor trades across supported venues",
      "Reconcile holdings and activity in account records",
    ],
    reviewPoints: [
      "Custody arrangements and who controls private keys",
      "Venue, counterparty, and settlement exposure",
      "Volatility, drawdowns, and the ability to exit",
    ],
    risk: "Digital assets can lose substantial value; liquidity, custody, technology, and regulatory risks may compound price volatility.",
  },
  {
    id: "stock",
    slug: "stocks",
    label: "Public equities",
    title: "Stocks & company shares",
    image: "/images/global-equities.jpg",
    summary:
      "A share represents an ownership interest in a company. Its market value responds to the issuer’s financial results, competitive position, investor expectations, and broader economic conditions.",
    approach:
      "The company presents its equity offering as research-led portfolio exposure to publicly traded companies. Investment analysis can inform selection and position sizing, but it does not remove issuer or market risk.",
    valueDrivers: [
      "Share-price appreciation if market value rises",
      "Dividends if a company declares and pays them",
      "Portfolio diversification across issuers and industries",
    ],
    process: [
      "Assess company, industry, and economic information",
      "Compare potential positions with portfolio objectives",
      "Set allocations with concentration limits in mind",
      "Review holdings as company and market conditions evolve",
    ],
    reviewPoints: [
      "Issuer fundamentals and the assumptions behind analysis",
      "Concentration, sector exposure, and valuation sensitivity",
      "Trading costs, liquidity, and dividend variability",
    ],
    risk: "Share prices can fall, companies can underperform, and dividends may be reduced or stopped. Past performance does not predict future results.",
  },
  {
    id: "estate",
    slug: "real-estate",
    label: "Commercial property",
    title: "Commercial real estate",
    image: "/images/commercial-property.jpg",
    summary:
      "Commercial property value is influenced by location, condition, tenant demand, financing costs, and local market conditions. Property investments can be less liquid than listed securities.",
    approach:
      "The company describes commercial property offerings that consider occupancy, potential rental income, and valuation. Review each property’s documentation and ownership structure to understand what the specific offering actually provides.",
    valueDrivers: [
      "Rental income, if collected and distributed under the offering terms",
      "Changes in property value at a sale or independent valuation",
      "Occupancy and operating performance over the holding period",
    ],
    process: [
      "Review property, location, title, and valuation materials",
      "Examine occupancy, lease terms, and operating costs",
      "Understand the ownership and income-distribution structure",
      "Monitor property operations and material changes",
    ],
    reviewPoints: [
      "Independent valuation, title, and ownership rights",
      "Tenant concentration, vacancy, and maintenance costs",
      "Holding period, exit options, and distribution terms",
    ],
    risk: "Property values and rental income may decline. Vacancy, repairs, financing, and limited resale options can affect both value and access to capital.",
  },
];

export function getAssetClassGuide(slug: string | undefined) {
  return ASSET_CLASS_GUIDES.find((guide) => guide.slug === slug);
}
