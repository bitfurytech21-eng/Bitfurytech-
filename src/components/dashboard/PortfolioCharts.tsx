import { Fragment } from "react";
import { DashboardOverviewDTO } from "../../services/dashboardApi";
import { formatUsd } from "../../trading/tradingPage";
import { Card, CardBody, CardHeader } from "../ui";

const SECTOR_PALETTE: Record<string, string> = {
  crypto: "#E94D65",
  stock: "#1B4962",
  estate: "#2E7D9B",
};

interface PortfolioChartsProps {
  data: DashboardOverviewDTO;
}

export default function PortfolioCharts({ data }: PortfolioChartsProps) {
  const { metrics, portfolioSummary } = data;
  const totalCapital =
    metrics.availableBalance + metrics.activeInvested + metrics.pendingPayments;

  const capitalSlices = [
    {
      label: "Available Liquidity",
      value: metrics.availableBalance,
      color: "#1B4962",
    },
    {
      label: "Active Invested",
      value: metrics.activeInvested,
      color: "#E94D65",
    },
    {
      label: "Pending Settlements",
      value: metrics.pendingPayments,
      color: "#D97706",
    },
  ];

  // SVG Donut ring geometry (r=44, circumference = 2 * pi * 44 = 276.46)
  const radius = 44;
  const circumference = 2 * Math.PI * radius;

  const totalAllocated = portfolioSummary.reduce(
    (sum, bucket) => sum + bucket.investedAmount,
    0
  );

  let cumulativeOffset = 0;
  const donutSegments = portfolioSummary
    .filter((b) => b.investedAmount > 0)
    .map((bucket) => {
      const fraction = totalAllocated > 0 ? bucket.investedAmount / totalAllocated : 0;
      const arcLength = fraction * circumference;
      const segment = {
        ...bucket,
        color: SECTOR_PALETTE[bucket.category] ?? "#1B4962",
        dashArray: `${arcLength} ${Math.max(0, circumference - arcLength)}`,
        dashOffset: -cumulativeOffset,
      };
      cumulativeOffset += arcLength;
      return segment;
    });

  return (
    <div className="grid lg:grid-cols-12 gap-6" aria-label="Investment analytics charts">
      {/* Allocation Distribution Donut Chart */}
      <Card className="lg:col-span-5">
        <CardHeader
          title="Portfolio Sector Allocation"
          subtitle="Verified active & historical principal distribution"
        />
        <CardBody className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
            <svg
              viewBox="0 0 112 112"
              className="w-32 h-32 -rotate-90"
              role="img"
              aria-label="Portfolio sector allocation chart"
            >
              <circle
                cx="56"
                cy="56"
                r={radius}
                fill="transparent"
                stroke="#EDF3F7"
                strokeWidth="14"
              />
              {donutSegments.map((seg) => (
                <circle
                  key={seg.category}
                  cx="56"
                  cy="56"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth="14"
                  strokeDasharray={seg.dashArray}
                  strokeDashoffset={seg.dashOffset}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
              <span className="text-[10px] font-medium text-[#5A6B7C]">Invested</span>
              <span className="text-xs font-bold font-tabular-sans tabular-nums text-[#102030]">
                {formatUsd(totalAllocated)}
              </span>
            </div>
          </div>

          <div className="flex-1 w-full grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 gap-y-2.5 text-xs">
            {portfolioSummary.map((bucket) => {
              const color = SECTOR_PALETTE[bucket.category] ?? "#1B4962";
              const pct = Math.round(Number(bucket.sharePct) || 0);
              const amount = Number.isFinite(Number(bucket.investedAmount))
                ? Number(bucket.investedAmount)
                : 0;
              return (
                <Fragment key={bucket.category}>
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2.5 h-2.5 shrink-0"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                    <span className="font-semibold text-[#102030] truncate">{bucket.label}</span>
                  </div>
                  <span className="font-tabular-sans tabular-nums text-right text-[#5A6B7C] whitespace-nowrap">
                    {pct}%
                  </span>
                  <span className="font-tabular-sans tabular-nums text-right text-[#5A6B7C] whitespace-nowrap">
                    {formatUsd(amount)}
                  </span>
                </Fragment>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* Account Capital Structure Bar Visualization */}
      <Card className="lg:col-span-7">
        <CardHeader
          title="Capital Structure & Settlement Balance"
          subtitle="Live custody breakdown sourced from verified ledger accounts"
        />
        <CardBody className="space-y-5">
          {/* Stacked Horizontal Ratio Bar */}
          <div
            className="h-4 w-full bg-[#EDF3F7] rounded-[5px] overflow-hidden flex"
            role="img"
            aria-label="Capital distribution ratio bar"
          >
            {totalCapital > 0 ? (
              capitalSlices.map((slice) => {
                const pct = (slice.value / totalCapital) * 100;
                if (pct <= 0) return null;
                return (
                  <div
                    key={slice.label}
                    style={{ width: `${pct}%`, backgroundColor: slice.color }}
                    title={`${slice.label}: ${formatUsd(slice.value)}`}
                  />
                );
              })
            ) : (
              <div className="w-full h-full bg-[#EDF3F7]" />
            )}
          </div>

          {/* Individual Metric Bars */}
          <div className="grid sm:grid-cols-3 gap-4 pt-1">
            {capitalSlices.map((slice) => {
              const pct = totalCapital > 0 ? Math.round((slice.value / totalCapital) * 100) : 0;
              return (
                <div
                  key={slice.label}
                  className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-3.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#5A6B7C]">{slice.label}</span>
                    <span className="font-tabular-sans tabular-nums text-[#102030] font-semibold">
                      {pct}%
                    </span>
                  </div>
                  <p className="text-base font-bold font-tabular-sans tabular-nums text-[#102030]">
                    {formatUsd(slice.value)}
                  </p>
                  <div className="h-1.5 w-full bg-[#DCE4EC] rounded-[5px] overflow-hidden">
                    <div
                      className="h-full"
                      style={{ width: `${pct}%`, backgroundColor: slice.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
