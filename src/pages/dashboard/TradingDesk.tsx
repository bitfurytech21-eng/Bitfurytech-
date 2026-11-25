import { useCallback, useEffect, useMemo, useState } from "react";
import FinancialAmount from "../../components/FinancialAmount";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, CandlestickChart, RefreshCw } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import TradingViewChart from "../../components/TradingViewChart";
import TradingViewTickerTape from "../../components/TradingViewTickerTape";
import {
  Button,
  buttonClasses,
  Card,
  CardBody,
  CardHeader,
  DashboardSymbol,
  ErrorState,
  NotificationBanner,
  SkeletonBlock,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import { sessionApiRequest } from "../../services/dashboardApi";
import {
  INVESTMENT_MANDATES,
  type InvestmentMandate,
  type MandateCategory,
} from "../../trading/tradingPage";

interface MarketPreset {
  symbol: string;
  label: string;
  category: MandateCategory;
}

const MARKET_PRESETS: MarketPreset[] = [
  { symbol: "BITSTAMP:BTCUSD", label: "BTC / USD", category: "crypto" },
  { symbol: "BITSTAMP:ETHUSD", label: "ETH / USD", category: "crypto" },
  { symbol: "COINBASE:SOLUSD", label: "SOL / USD", category: "crypto" },
  { symbol: "BINANCE:BNBUSDT", label: "BNB / USDT", category: "crypto" },
  { symbol: "FOREXCOM:SPXUSD", label: "S&P 500", category: "stock" },
  { symbol: "NASDAQ:QQQ", label: "Nasdaq 100", category: "stock" },
  { symbol: "NASDAQ:AAPL", label: "Apple (AAPL)", category: "stock" },
  { symbol: "NASDAQ:NVDA", label: "NVIDIA (NVDA)", category: "stock" },
  { symbol: "AMEX:VNQ", label: "Real Estate ETF (VNQ)", category: "estate" },
  { symbol: "NYSE:PLD", label: "Prologis (PLD)", category: "estate" },
  { symbol: "NYSE:O", label: "Realty Income (O)", category: "estate" },
];

const INTERVAL_OPTIONS: Array<{ id: "15" | "60" | "240" | "D" | "W"; label: string }> = [
  { id: "15", label: "15m" },
  { id: "60", label: "1H" },
  { id: "240", label: "4H" },
  { id: "D", label: "1D" },
  { id: "W", label: "1W" },
];

function defaultSymbolForCategory(cat: MandateCategory): string {
  if (cat === "stock") return "FOREXCOM:SPXUSD";
  if (cat === "estate") return "AMEX:VNQ";
  return "BITSTAMP:BTCUSD";
}

export default function TradingDesk() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<InvestmentMandate[]>(INVESTMENT_MANDATES);
  const [category, setCategory] = useState<"all" | MandateCategory>("all");
  const [selectedId, setSelectedId] = useState<string>(INVESTMENT_MANDATES[0].id);
  const [symbol, setSymbol] = useState<string>("BITSTAMP:BTCUSD");
  const [interval, setInterval] = useState<"15" | "60" | "240" | "D" | "W">("60");
  const [chartTheme, setChartTheme] = useState<"light" | "dark">("light");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMandates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (user) {
        const res = await sessionApiRequest<{ plans: InvestmentMandate[] }>(
          "/api/investments/catalog"
        );
        if (res.plans.length > 0) {
          setPlans(res.plans);
          setSelectedId((prev) =>
            res.plans.some((p) => p.id === prev) ? prev : res.plans[0].id
          );
        }
      } else {
        const res = await fetch("/api/trading/plans", { cache: "no-store" });
        const body = (await res.json()) as { mandates?: InvestmentMandate[] };
        if (body.mandates?.length) {
          setPlans(body.mandates);
        }
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load mandate parameters."
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadMandates();
  }, [loadMandates]);

  const filteredPlans = useMemo(() => {
    if (category === "all") return plans;
    return plans.filter((p) => p.category === category);
  }, [category, plans]);

  const visiblePresets = useMemo(() => {
    if (category === "all") return MARKET_PRESETS;
    return MARKET_PRESETS.filter((p) => p.category === category);
  }, [category]);

  const activePlan =
    filteredPlans.find((p) => p.id === selectedId) || filteredPlans[0] || plans[0];

  const handleCategoryChange = (next: "all" | MandateCategory) => {
    setCategory(next);
    if (next !== "all") {
      setSymbol(defaultSymbolForCategory(next));
    }
  };

  const handleSelectMandate = (mandate: InvestmentMandate) => {
    setSelectedId(mandate.id);
    setSymbol(defaultSymbolForCategory(mandate.category));
  };

  return (
    <DashboardLayout
      title="Trade View & Live Market Desk"
      subtitle="Monitor real-time TradingView market charts across Digital Assets, Global Equities, and Real Estate alongside structured mandate benchmarks."
      actions={
        <>
          <Link to="/dashboard" className={buttonClasses({ variant: "outline", size: "sm" })}>
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Overview</span>
          </Link>
          <Button variant="outline" size="sm" onClick={() => void loadMandates()}>
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Mandates</span>
          </Button>
          {activePlan && (
            <Link
              to={`/invest?plan=${activePlan.id}`}
              className={buttonClasses({ variant: "primary", size: "sm" })}
            >
              <span>Purchase Units</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </>
      }
    >
      {loading ? (
        <div className="grid lg:grid-cols-12 gap-6">
          <Card padding="lg" className="lg:col-span-4">
            <SkeletonBlock className="h-96 w-full" />
          </Card>
          <Card padding="lg" className="lg:col-span-8">
            <SkeletonBlock className="h-96 w-full" />
          </Card>
        </div>
      ) : error ? (
        <ErrorState
          title="Unable to Load Trade View"
          message={error}
          onRetry={() => void loadMandates()}
        />
      ) : (
        <div className="space-y-6">
          {/* Live TradingView Ticker Tape */}
          <div className="rounded-lg border border-[#14374B] bg-[#112E3E] px-3 py-1 text-white shadow-sm">
            <TradingViewTickerTape colorTheme="dark" displayMode="adaptive" />
          </div>

          <NotificationBanner
            tone="info"
            title="Live Market Data & Mandate Notice"
            message="Interactive candlestick charts and price quotes below are streamed live via TradingView. Mandate daily rates represent indicative target benchmarks and are non-guaranteed."
          />

          <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-lg px-4 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "all", label: "All Markets" },
                  { id: "crypto", label: "Digital Assets" },
                  { id: "stock", label: "Global Equities" },
                  { id: "estate", label: "Real Estate" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleCategoryChange(tab.id)}
                  className={`px-3 py-1.5 rounded-none text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    category === tab.id
                      ? "bg-[#E94D65] text-white"
                      : "text-[#1B4962] hover:bg-[#F6F8FA]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center border border-slate-200 bg-slate-50 p-0.5 rounded-[5px]">
                {INTERVAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setInterval(opt.id)}
                    className={`px-2.5 py-1 text-[11px] font-mono font-semibold transition-colors cursor-pointer rounded-[3px] ${
                      interval === opt.id
                        ? "bg-[#1B4962] text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center border border-slate-200 bg-slate-50 p-0.5 rounded-[5px]">
                {(["light", "dark"] as const).map((themeOpt) => (
                  <button
                    key={themeOpt}
                    type="button"
                    onClick={() => setChartTheme(themeOpt)}
                    className={`px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors cursor-pointer rounded-[3px] ${
                      chartTheme === themeOpt
                        ? "bg-[#1B4962] text-white"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {themeOpt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-6 items-start">
            <Card className="lg:col-span-4">
              <CardHeader
                title="Select Mandate"
                subtitle={`${filteredPlans.length} available strategy structures`}
              />
              <CardBody className="divide-y divide-slate-100 p-0 max-h-[640px] overflow-y-auto">
                {filteredPlans.map((m) => {
                  const selected = activePlan?.id === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleSelectMandate(m)}
                      className={`w-full text-left px-5 py-3.5 transition-colors cursor-pointer ${
                        selected ? "bg-slate-100" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-amber-700">
                          {m.categoryLabel}
                        </span>
                        <span className="font-mono text-xs text-slate-600">
                          {m.dailyRatePct}% / day (indicative)
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{m.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Min {<FinancialAmount value={m.minDeposit} size="md" />} · {m.durationDays} days
                      </p>
                    </button>
                  );
                })}
              </CardBody>
            </Card>

            <div className="lg:col-span-8 min-w-0 space-y-6">
              <Card>
                <CardHeader
                  title={`Live TradingView Chart — ${symbol}`}
                  subtitle="Real-time market feed with interactive indicators, drawing tools, and symbol search"
                  action={<DashboardSymbol icon={CandlestickChart} tone="amber" size="md" />}
                />
                <CardBody className="space-y-4">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {visiblePresets.map((preset) => (
                      <button
                        key={preset.symbol}
                        type="button"
                        onClick={() => setSymbol(preset.symbol)}
                        className={`px-2.5 py-1 text-xs font-mono font-semibold border rounded-[4px] transition-colors cursor-pointer ${
                          symbol === preset.symbol
                            ? "border-[#1B4962] bg-[#1B4962] text-white"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <TradingViewChart
                    symbol={symbol}
                    interval={interval}
                    colorTheme={chartTheme}
                    height={520}
                    allowSymbolChange
                  />
                </CardBody>
              </Card>

              {activePlan && (
                <Card>
                  <CardHeader
                    title={`${activePlan.name} — Mandate Parameters`}
                    subtitle={`${activePlan.categoryLabel} · ${activePlan.settlementRail}`}
                    action={
                      <Link
                        to={`/invest?plan=${activePlan.id}`}
                        className={buttonClasses({ variant: "primary", size: "sm" })}
                      >
                        <span>Allocate to Plan</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
                    }
                  />
                  <CardBody className="space-y-4">
                    <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                      <div>
                        <dt className="text-slate-500">Minimum Entry</dt>
                        <dd className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                          <FinancialAmount value={activePlan.minDeposit} size="md" />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Maximum Cap</dt>
                        <dd className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                          <FinancialAmount value={activePlan.maxDeposit} size="md" />
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Cycle Duration</dt>
                        <dd className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                          {activePlan.durationDays} days
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Indicative Target</dt>
                        <dd className="font-mono tabular-nums font-bold text-emerald-700 mt-0.5">
                          {activePlan.dailyRatePct}% / day
                        </dd>
                      </div>
                    </dl>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {activePlan.returnTerms}
                    </p>
                  </CardBody>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
