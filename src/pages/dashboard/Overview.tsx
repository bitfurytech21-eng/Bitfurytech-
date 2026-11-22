import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowRight,
  ArrowUpRight,
  Clock,
  Coins,
  Compass,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import PortfolioCharts from "../../components/dashboard/PortfolioCharts";
import {
  Button,
  buttonClasses,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  SkeletonBlock,
  StatusText,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import {
  DashboardOverviewDTO,
  fetchDashboardOverview,
  formatIsoDate,
} from "../../services/dashboardApi";
import { formatUsd } from "../../trading/tradingPage";

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard metrics">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item} padding="md" className="space-y-3">
            <div className="h-3.5 w-28 rounded bg-slate-200 animate-pulse" />
            <div className="h-7 w-36 rounded bg-slate-200 animate-pulse" />
            <div className="h-3 w-24 rounded bg-slate-100 animate-pulse" />
          </Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-12 gap-6">
        <Card padding="lg" className="lg:col-span-7">
          <SkeletonBlock className="h-56 w-full" />
        </Card>
        <Card padding="lg" className="lg:col-span-5">
          <SkeletonBlock className="h-56 w-full" />
        </Card>
      </div>
    </div>
  );
}

export default function Overview() {
  const { firebaseUser, idToken, profile } = useAuth();
  const [data, setData] = useState<DashboardOverviewDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(
    async (isManualRefresh = false) => {
      if (!firebaseUser) return;
      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const token = idToken || (await firebaseUser.getIdToken());
        const payload = await fetchDashboardOverview(token);
        setData(payload);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to retrieve authenticated account summary."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [firebaseUser, idToken]
  );

  useEffect(() => {
    void loadOverview(false);
  }, [loadOverview]);

  return (
    <DashboardLayout
      title="Overview"
      subtitle="Your account, investment performance, and settlement activity at a glance."
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            loading={refreshing}
            onClick={() => void loadOverview(true)}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Ledger</span>
          </Button>
          <Link to="/deposit" className={buttonClasses({ variant: "primary", size: "sm" })}>
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span>Deposit</span>
          </Link>
          <Link to="/withdrawal" className={buttonClasses({ variant: "secondary", size: "sm" })}>
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Withdraw</span>
          </Link>
        </>
      }
    >
      {loading ? (
        <OverviewSkeleton />
      ) : error || !data ? (
        <ErrorState
          title="Unable to Load Financial Overview"
          message={error || "Authenticated backend response was unavailable."}
          onRetry={() => void loadOverview(false)}
        />
      ) : (
        <div className="space-y-5 sm:space-y-6">
          <section
            aria-label="Investor account snapshot"
            className="flex flex-col gap-5 rounded-lg bg-[#112E3E] px-5 py-5 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B9D1DE]">
                Investor account
              </p>
              <h2 className="mt-1.5 text-xl font-bold font-heading tracking-tight sm:text-2xl">
                Welcome back, {profile?.displayName || firebaseUser?.displayName || "Investor"}
              </h2>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-300">
                Your portfolio activity, settlements, and account figures are ready to review.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-4 border-t border-white/15 pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10 text-[#B9D1DE]">
                <Wallet className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-slate-300">Portfolio synced</p>
                <p className="mt-0.5 text-sm font-semibold text-white">
                  {formatIsoDate(data.syncedAt)}
                </p>
              </div>
            </div>
          </section>

          {/* Primary Financial Figures (server-verified) */}
          <section
            aria-label="Primary financial metrics"
            className="grid grid-cols-1 min-[390px]:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4"
          >
            <Card padding="md" className="space-y-2 border-[#1B4962] bg-[#1B4962] text-white shadow-sm">
              <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-200">
                <span>Available Balance</span>
                <Wallet className="h-4 w-4 shrink-0 text-[#B9D1DE]" aria-hidden="true" />
              </div>
              <p className="text-xl font-bold font-mono tabular-nums text-white sm:text-2xl">
                {formatUsd(data.metrics.availableBalance)}
              </p>
              <p className="text-xs text-slate-300">
                Deposited <span className="font-mono tabular-nums">{formatUsd(data.metrics.totalDeposit)}</span>
              </p>
            </Card>

            <Card padding="md" className="space-y-2 border-[#DCE4EC] shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between gap-2 text-xs font-medium text-[#5A6B7C]">
                <span>Total Invested</span>
                <TrendingUp className="h-4 w-4 shrink-0 text-[#E94D65]" aria-hidden="true" />
              </div>
              <p className="text-xl font-bold font-mono tabular-nums text-[#102030] sm:text-2xl">
                {formatUsd(data.metrics.totalInvested)}
              </p>
              <p className="text-xs text-[#5A6B7C]">
                Active principal <span className="font-mono tabular-nums">{formatUsd(data.metrics.activeInvested)}</span>
              </p>
            </Card>

            <Card padding="md" className="space-y-2 border-[#DCE4EC] shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between gap-2 text-xs font-medium text-[#5A6B7C]">
                <span>Total Earnings</span>
                <Coins className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              </div>
              <p className="text-xl font-bold font-mono tabular-nums text-[#102030] sm:text-2xl">
                {formatUsd(data.metrics.totalEarnings)}
              </p>
              <p className="text-xs text-[#5A6B7C]">
                Profit <span className="font-mono tabular-nums">{formatUsd(data.metrics.totalProfit)}</span> · Referral{" "}
                <span className="font-mono tabular-nums">{formatUsd(data.metrics.referralBonus)}</span>
              </p>
            </Card>

            <Card padding="md" className="space-y-2 border-[#DCE4EC] shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-center justify-between gap-2 text-xs font-medium text-[#5A6B7C]">
                <span>Pending Payments</span>
                <Clock className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              </div>
              <p className="text-xl font-bold font-mono tabular-nums text-[#102030] sm:text-2xl">
                {formatUsd(data.metrics.pendingPayments)}
              </p>
              <p className="text-xs text-[#5A6B7C]">
                {data.metrics.pendingCount} pending settlement{data.metrics.pendingCount === 1 ? "" : "s"}
              </p>
            </Card>
          </section>

          {/* Quick Deposit, Withdrawal & Allocation Bar */}
          <Card padding="md" className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-0.5">
              <h2 className="text-sm font-bold text-slate-900">Quick Capital Actions</h2>
              <p className="text-xs text-slate-500">
                Default rail: <span className="font-semibold text-slate-700">{data.account.preferredRail}</span> · Synced{" "}
                <span className="font-mono">{formatIsoDate(data.syncedAt)}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link to="/deposit" className={buttonClasses({ variant: "primary", size: "md" })}>
                <ArrowDownCircle className="w-4 h-4" />
                <span>Deposit Funds</span>
              </Link>
              <Link to="/withdrawal" className={buttonClasses({ variant: "secondary", size: "md" })}>
                <ArrowUpRight className="w-4 h-4" />
                <span>Withdraw Funds</span>
              </Link>
              <Link
                to="/dashboard/opportunities"
                className={buttonClasses({ variant: "outline", size: "md" })}
              >
                <Compass className="w-4 h-4" />
                <span>Explore Opportunities</span>
              </Link>
            </div>
          </Card>

          {/* Portfolio Allocation & Capital Structure Charts */}
          <PortfolioCharts data={data} />

          {/* Active Investments + Portfolio Summary */}
          <div className="grid lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-7">
              <CardHeader
                title={`Active Investments (${data.metrics.activeInvestmentsCount})`}
                subtitle="Current capital allocations, cycle progress, and upcoming maturity dates"
                action={
                  <Link
                    to="/investments"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B4962] hover:text-[#B92841] hover:underline"
                  >
                    <span>Manage All</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                }
              />
              <CardBody>
                {data.activeInvestments.length === 0 ? (
                  <EmptyState
                    title="No Active Investments"
                    description="You do not have active capital allocations yet. Fund your custody wallet and allocate into an institutional mandate."
                    action={
                      <Link
                        to="/dashboard/opportunities"
                        className={buttonClasses({ variant: "primary", size: "sm" })}
                      >
                        Browse Opportunities
                      </Link>
                    }
                  />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.activeInvestments.slice(0, 5).map((inv) => (
                      <div key={inv.id} className="py-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {inv.planName}
                            </p>
                            <p className="text-xs text-slate-500">
                              <span className="font-mono">{inv.reference}</span> · {inv.categoryLabel} ·{" "}
                              {inv.dailyRatePct}% daily · {inv.durationDays}d
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold font-mono tabular-nums text-slate-900">
                              {formatUsd(inv.amount)}
                            </p>
                            <StatusText status={inv.status} />
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 rounded-full bg-[#EDF3F7] overflow-hidden">
                            <div
                              className="h-full bg-[#E94D65] rounded-full"
                              style={{ width: `${inv.progressPct}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono tabular-nums text-[#5A6B7C] shrink-0">
                            {inv.progressPct}% · Matures {formatIsoDate(inv.maturityDate)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card className="lg:col-span-5">
              <CardHeader
                title="Investment Portfolio Summary"
                subtitle="Capital allocation across Digital Assets, Equities, and Real Estate"
              />
              <CardBody className="space-y-5">
                <div className="space-y-4">
                  {data.portfolioSummary.map((bucket) => (
                    <div key={bucket.category} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-[#102030]">{bucket.label}</span>
                        <span className="font-mono tabular-nums text-[#5A6B7C]">
                          {formatUsd(bucket.investedAmount)} ({bucket.sharePct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-[#EDF3F7] overflow-hidden">
                        <div
                          className="h-full bg-[#1B4962] rounded-full"
                          style={{ width: `${bucket.sharePct}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {bucket.activeCount} active · {bucket.totalCount} total mandate
                        {bucket.totalCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <p className="text-slate-500">Active Positions</p>
                    <p className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                      {data.metrics.activeInvestmentsCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Completed Terms</p>
                    <p className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                      {data.metrics.completedInvestmentsCount}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Recent Transactions + Investment Opportunities */}
          <div className="grid lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-6">
              <CardHeader
                title="Recent Transactions"
                subtitle="Latest verified deposits, withdrawals, allocations, and credits"
                action={
                  <Link
                    to="/transactions"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B4962] hover:text-[#B92841] hover:underline"
                  >
                    <span>Full Ledger</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                }
              />
              <CardBody>
                {data.recentTransactions.length === 0 ? (
                  <EmptyState
                    title="No Transactions Yet"
                    description="Submitted deposits, withdrawals, and mandate allocations appear here."
                    action={
                      <Link
                        to="/deposit"
                        className={buttonClasses({ variant: "outline", size: "sm" })}
                      >
                        Submit First Deposit
                      </Link>
                    }
                  />
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.recentTransactions.map((tx) => (
                      <Link
                        key={tx.id}
                        to={`/transactions/${tx.id}`}
                        className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50 -mx-2 px-2 rounded transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {tx.type} · {tx.method}
                          </p>
                          <p className="text-xs text-slate-500">
                            <span className="font-mono">{tx.reference}</span> ·{" "}
                            {formatIsoDate(tx.createdAt)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold font-mono tabular-nums text-slate-900">
                            {formatUsd(tx.amount)}
                          </p>
                          <StatusText status={tx.status} />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card className="lg:col-span-6">
              <CardHeader
                title="Investment Opportunities"
                subtitle="Review published terms before allocating from your available balance"
                action={
                  <Link
                    to="/dashboard/opportunities"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B4962] hover:text-[#B92841] hover:underline"
                  >
                    <span>View All Plans</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                }
              />
              <CardBody>
                <div className="divide-y divide-slate-100">
                  {data.opportunities.slice(0, 4).map((plan) => (
                    <div
                      key={plan.id}
                      className="py-3.5 flex items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">
                          {plan.categoryLabel} · {plan.durationDays} days
                        </p>
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {plan.name}
                        </p>
                        <p className="text-xs font-mono tabular-nums text-slate-600 mt-0.5">
                          Min {formatUsd(plan.minDeposit)} · Target {plan.dailyRatePct}%/day
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          to={`/plans/${plan.id}`}
                          className={buttonClasses({ variant: "ghost", size: "sm" })}
                        >
                          Terms
                        </Link>
                        <Link
                          to={`/investments?plan=${plan.id}`}
                          className={buttonClasses({ variant: "primary", size: "sm" })}
                        >
                          Allocate
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
