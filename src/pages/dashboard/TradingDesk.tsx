import { useCallback, useEffect, useMemo, useState } from "react";
import FinancialAmount from "../../components/FinancialAmount";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, BarChart3, RefreshCw } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Button,
  buttonClasses,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  NotificationBanner,
  SkeletonBlock,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import { apiRequest } from "../../services/dashboardApi";
import {
  formatUsd,
  INVESTMENT_MANDATES,
  type InvestmentMandate,
  type MandateCategory,
} from "../../trading/tradingPage";

export default function TradingDesk() {
  const { firebaseUser, idToken } = useAuth();
  const [plans, setPlans] = useState<InvestmentMandate[]>(INVESTMENT_MANDATES);
  const [category, setCategory] = useState<"all" | MandateCategory>("all");
  const [selectedId, setSelectedId] = useState<string>(INVESTMENT_MANDATES[0].id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMandates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (firebaseUser) {
        const token = idToken || (await firebaseUser.getIdToken());
        const res = await apiRequest<{ plans: InvestmentMandate[] }>(
          "/api/investments/catalog",
          token
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
  }, [firebaseUser, idToken]);

  useEffect(() => {
    void loadMandates();
  }, [loadMandates]);

  const filteredPlans = useMemo(() => {
    if (category === "all") return plans;
    return plans.filter((p) => p.category === category);
  }, [category, plans]);

  const activePlan =
    filteredPlans.find((p) => p.id === selectedId) || filteredPlans[0] || plans[0];

  // Illustrative indicative benchmark curve strictly labeled as a non-live mandate benchmark
  const benchmarkPoints = useMemo(() => {
    if (!activePlan) return [];
    const days = Math.min(30, activePlan.durationDays);
    const pts: Array<{ day: number; value: number }> = [];
    for (let d = 0; d <= days; d += 3) {
      const value = Number(
        (100 + 100 * (activePlan.dailyRatePct / 100) * d).toFixed(2)
      );
      pts.push({ day: d, value });
    }
    return pts;
  }, [activePlan]);

  const svgPolyline = useMemo(() => {
    if (benchmarkPoints.length < 2) return "";
    const minV = benchmarkPoints[0].value;
    const maxV = Math.max(...benchmarkPoints.map((p) => p.value), minV + 1);
    return benchmarkPoints
      .map((pt, idx) => {
        const x = (idx / (benchmarkPoints.length - 1)) * 560 + 20;
        const y = 160 - ((pt.value - minV) / (maxV - minV)) * 120;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [benchmarkPoints]);

  return (
    <DashboardLayout
      title="Mandate & Market Desk"
      subtitle="Compare structured mandate benchmarks across asset categories. Live external ticker feeds are disabled; values reflect mandate benchmark schedules only."
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
            <SkeletonBlock className="h-72 w-full" />
          </Card>
          <Card padding="lg" className="lg:col-span-8">
            <SkeletonBlock className="h-72 w-full" />
          </Card>
        </div>
      ) : error ? (
        <ErrorState
          title="Unable to Load Mandate Desk"
          message={error}
          onRetry={() => void loadMandates()}
        />
      ) : (
        <div className="space-y-6">
          <NotificationBanner
            tone="info"
            title="Benchmark Data Disclosure"
            message="BitfuryTech does not present simulated prices as live market quotes. External live ticker feeds are not connected; the curve below illustrates the selected mandate's indicative target benchmark index (Base 100) only."
          />

          <div className="flex flex-wrap items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-4 py-3">
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
                onClick={() => setCategory(tab.id)}
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

          <div className="grid lg:grid-cols-12 gap-6 items-start">
            <Card className="lg:col-span-4">
              <CardHeader
                title="Select Mandate"
                subtitle={`${filteredPlans.length} available strategy structures`}
              />
              <CardBody className="divide-y divide-slate-100 p-0">
                {filteredPlans.map((m) => {
                  const selected = activePlan?.id === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedId(m.id)}
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

            {activePlan && (
              <Card className="lg:col-span-8">
                <CardHeader
                  title={`${activePlan.name} — Indicative Benchmark Trajectory`}
                  subtitle={`${activePlan.categoryLabel} · Live exchange ticker unavailable; showing Base-100 mandate target schedule`}
                  action={<BarChart3 className="w-4 h-4 text-slate-400" />}
                />
                <CardBody className="space-y-5">
                  <div className="w-full overflow-x-auto border border-slate-200 rounded-md bg-slate-50 p-3">
                    <svg
                      viewBox="0 0 600 185"
                      className="w-full h-44 min-w-[320px]"
                      role="img"
                      aria-label={`Indicative benchmark curve for ${activePlan.name}`}
                    >
                      <line x1="20" y1="40" x2="580" y2="40" stroke="#e2e8f0" strokeDasharray="4 4" />
                      <line x1="20" y1="100" x2="580" y2="100" stroke="#e2e8f0" strokeDasharray="4 4" />
                      <line x1="20" y1="160" x2="580" y2="160" stroke="#cbd5e1" />
                      {svgPolyline && (
                        <polyline
                          fill="none"
                          stroke="#1B4962"
                          strokeWidth="2.5"
                          points={svgPolyline}
                        />
                      )}
                      <text x="20" y="178" fontSize="10" fill="#64748b">
                        Day 0 (Base 100.00)
                      </text>
                      <text x="485" y="178" fontSize="10" fill="#64748b">
                        Day {Math.min(30, activePlan.durationDays)}
                      </text>
                    </svg>
                  </div>

                  <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <dt className="text-slate-500">Minimum Entry</dt>
                      <dd className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                        {<FinancialAmount value={activePlan.minDeposit} size="md" />}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Maximum Cap</dt>
                      <dd className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                        {<FinancialAmount value={activePlan.maxDeposit} size="md" />}
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
      )}
    </DashboardLayout>
  );
}
