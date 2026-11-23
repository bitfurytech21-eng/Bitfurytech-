import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowRight,
  ArrowUpRight,
  Building2,
  RefreshCw,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import {
  Button,
  buttonClasses,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  ErrorState,
  SkeletonBlock,
  StatusText,
  TableColumn,
} from "../../components/ui";
import { sessionApiRequest, formatIsoDate } from "../../services/dashboardApi";
import { formatUsd } from "../../trading/tradingPage";

interface AdminOverviewResponse {
  stats: {
    totalCustomers: number;
    activeInvestmentsCount: number;
    totalInvested: number;
    pendingDepositsCount: number;
    pendingDepositsAmount: number;
    pendingWithdrawalsCount: number;
    pendingWithdrawalsAmount: number;
    newRegistrations: number;
    propertiesCount: number;
    inquiriesCount: number;
  };
  recentTransactions: Array<{
    id: string;
    userEmail: string;
    type: string;
    method: string;
    amount: number;
    reference: string;
    status: string;
    createdAt: string | null;
  }>;
  recentAuditLogs: Array<{
    id: string;
    actorEmail: string;
    action: string;
    targetType: string;
    targetId: string;
    summary: string;
    createdAt: string | null;
  }>;
}

export default function AdminOverview() {
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await sessionApiRequest<AdminOverviewResponse>("/api/admin/overview");
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load admin metrics.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadOverview(false);
  }, [loadOverview]);

  const txColumns: TableColumn<AdminOverviewResponse["recentTransactions"][number]>[] = [
    {
      key: "date",
      header: "Date",
      render: (tx) => (
        <span className="font-mono text-slate-600">{formatIsoDate(tx.createdAt)}</span>
      ),
    },
    {
      key: "user",
      header: "Customer",
      render: (tx) => (
        <span className="font-medium text-slate-900 truncate max-w-[180px] block">
          {tx.userEmail}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type / Rail",
      render: (tx) => (
        <div>
          <p className="font-semibold text-slate-900">{tx.type}</p>
          <p className="text-[11px] text-slate-500">{tx.method}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (tx) => (
        <span className="font-mono tabular-nums font-semibold text-slate-900">
          {formatUsd(tx.amount)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (tx) => <StatusText status={tx.status} />,
    },
  ];

  const auditColumns: TableColumn<AdminOverviewResponse["recentAuditLogs"][number]>[] = [
    {
      key: "time",
      header: "Date",
      render: (log) => (
        <span className="font-mono text-slate-500">{formatIsoDate(log.createdAt)}</span>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (log) => (
        <div>
          <p className="font-mono text-[11px] font-semibold text-[#1B4962]">{log.action}</p>
          <p className="text-[11px] text-slate-500">{log.actorEmail}</p>
        </div>
      ),
    },
    {
      key: "summary",
      header: "Audit Summary",
      render: (log) => <p className="text-xs text-slate-700 max-w-md">{log.summary}</p>,
    },
  ];

  return (
    <AdminLayout
      title="Administrator Overview"
      subtitle="Capital activity, customer growth, and review queues in one operational view."
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            loading={refreshing}
            onClick={() => void loadOverview(true)}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Data</span>
          </Button>
          <Link to="/admin/deposits" className={buttonClasses({ variant: "primary", size: "sm" })}>
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span>Review Deposits</span>
          </Link>
        </>
      }
    >
      {error ? (
        <ErrorState
          title="Unable to Load Admin Overview"
          message={error}
          onRetry={() => void loadOverview(false)}
        />
      ) : loading || !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} padding="md">
                <SkeletonBlock className="h-16 w-full" />
              </Card>
            ))}
          </div>
          <Card padding="lg">
            <SkeletonBlock className="h-56 w-full" />
          </Card>
        </div>
      ) : (
        <div className="space-y-5 sm:space-y-6">
          <section
            aria-label="Operations snapshot"
            className="flex flex-col gap-4 rounded-lg bg-[#112E3E] px-5 py-5 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-6"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#B9D1DE]">
                Operations console
              </p>
              <h2 className="mt-1.5 text-xl font-bold font-heading tracking-tight sm:text-2xl">
                Platform at a glance
              </h2>
              <p className="mt-1.5 text-sm text-slate-300">
                Review capital movement and customer activity across the platform.
              </p>
            </div>
            <div className="flex items-center gap-4 border-t border-white/15 pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white/10 text-[#FFD1D8]">
                <Shield className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs text-slate-300">Items awaiting review</p>
                <p className="mt-0.5 text-lg font-bold font-mono tabular-nums text-white">
                  {data.stats.pendingDepositsCount + data.stats.pendingWithdrawalsCount}
                </p>
              </div>
            </div>
          </section>

          {/* Primary Operations KPIs */}
          <section
            aria-label="Platform key metrics"
            className="grid grid-cols-1 min-[390px]:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
          >
            <Card padding="md" className="flex min-w-0 items-start justify-between gap-3 border-[#DCE4EC] shadow-sm transition-shadow hover:shadow-md">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#5A6B7C]">Total Customers</p>
                <p className="mt-1 text-xl font-bold font-mono tabular-nums text-[#102030] sm:text-2xl">
                  {data.stats.totalCustomers}
                </p>
                <p className="mt-1 text-xs text-[#5A6B7C]">
                  {data.stats.newRegistrations} registered in past 7 days
                </p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#EDF3F7] text-[#1B4962]">
                <Users className="h-4 w-4" aria-hidden="true" />
              </div>
            </Card>

            <Card padding="md" className="flex min-w-0 items-start justify-between gap-3 border-[#DCE4EC] shadow-sm transition-shadow hover:shadow-md">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#5A6B7C]">Total Invested Capital</p>
                <p className="mt-1 text-xl font-bold font-mono tabular-nums text-[#102030] sm:text-2xl">
                  {formatUsd(data.stats.totalInvested)}
                </p>
                <p className="mt-1 text-xs text-[#5A6B7C]">
                  {data.stats.activeInvestmentsCount} active positions
                </p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#FFF0F2] text-[#B92841]">
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
              </div>
            </Card>

            <Card padding="md" className="flex min-w-0 items-start justify-between gap-3 border-[#DCE4EC] shadow-sm transition-shadow hover:shadow-md">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#5A6B7C]">Pending Deposits</p>
                <p className="mt-1 text-xl font-bold font-mono tabular-nums text-[#102030] sm:text-2xl">
                  {data.stats.pendingDepositsCount}
                </p>
                <p className="mt-1 text-xs text-[#5A6B7C]">
                  Queue volume <span className="font-mono">{formatUsd(data.stats.pendingDepositsAmount)}</span>
                </p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
                <ArrowDownCircle className="h-4 w-4" aria-hidden="true" />
              </div>
            </Card>

            <Card padding="md" className="flex min-w-0 items-start justify-between gap-3 border-[#DCE4EC] shadow-sm transition-shadow hover:shadow-md">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#5A6B7C]">Pending Withdrawals</p>
                <p className="mt-1 text-xl font-bold font-mono tabular-nums text-[#102030] sm:text-2xl">
                  {data.stats.pendingWithdrawalsCount}
                </p>
                <p className="mt-1 text-xs text-[#5A6B7C]">
                  Queue volume <span className="font-mono">{formatUsd(data.stats.pendingWithdrawalsAmount)}</span>
                </p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#FFF0F2] text-[#B92841]">
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </div>
            </Card>

            <Card padding="md" className="flex min-w-0 items-start justify-between gap-3 border-[#DCE4EC] shadow-sm transition-shadow hover:shadow-md">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#5A6B7C]">New Registrations (7d)</p>
                <p className="mt-1 text-xl font-bold font-mono tabular-nums text-[#102030] sm:text-2xl">
                  {data.stats.newRegistrations}
                </p>
                <p className="mt-1 text-xs text-[#5A6B7C]">Verified onboarding flow</p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                <UserPlus className="h-4 w-4" aria-hidden="true" />
              </div>
            </Card>

            <Card padding="md" className="flex min-w-0 items-start justify-between gap-3 border-[#DCE4EC] shadow-sm transition-shadow hover:shadow-md">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#5A6B7C]">Listed Properties & Inquiries</p>
                <p className="mt-1 text-xl font-bold font-mono tabular-nums text-[#102030] sm:text-2xl">
                  {data.stats.propertiesCount} / {data.stats.inquiriesCount}
                </p>
                <p className="mt-1 text-xs text-[#5A6B7C]">
                  Properties cataloged · Support inquiries
                </p>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#EDF3F7] text-[#1B4962]">
                <Building2 className="h-4 w-4" aria-hidden="true" />
              </div>
            </Card>
          </section>

          {/* Operational Queues Quick Links */}
          <Card padding="md" className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Priority Administration Queues</h2>
              <p className="text-xs text-slate-500">
                Navigate directly to settlement verification, portfolio oversight, or catalog controls.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/admin/deposits"
                className={buttonClasses({ variant: "outline", size: "sm" })}
              >
                <span>Deposits ({data.stats.pendingDepositsCount})</span>
              </Link>
              <Link
                to="/admin/withdrawals"
                className={buttonClasses({ variant: "outline", size: "sm" })}
              >
                <span>Withdrawals ({data.stats.pendingWithdrawalsCount})</span>
              </Link>
              <Link
                to="/admin/investments"
                className={buttonClasses({ variant: "outline", size: "sm" })}
              >
                <span>Investments</span>
              </Link>
              <Link
                to="/admin/properties"
                className={buttonClasses({ variant: "outline", size: "sm" })}
              >
                <span>Properties</span>
              </Link>
              <Link
                to="/admin/plans"
                className={buttonClasses({ variant: "outline", size: "sm" })}
              >
                <span>Plans</span>
              </Link>
            </div>
          </Card>

          {/* Recent Transactions & Audit Trail */}
          <div className="grid lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-7">
              <CardHeader
                title="Recent Platform Transactions"
                action={
                  <Link
                    to="/admin/transactions"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B4962] hover:text-[#B92841] hover:underline"
                  >
                    <span>All Transactions</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                }
              />
              <CardBody>
                <DataTable
                  columns={txColumns}
                  rows={data.recentTransactions}
                  rowKey={(tx) => tx.id}
                  emptyTitle="No Platform Transactions"
                  emptyDescription="Customer deposits, withdrawals, and investments appear here."
                />
              </CardBody>
            </Card>

            <Card className="lg:col-span-5">
              <CardHeader
                title="Recent Admin Audit Logs"
                action={
                  <Link
                    to="/admin/settings"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B4962] hover:text-[#B92841] hover:underline"
                  >
                    <span>Full Log</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                }
              />
              <CardBody>
                <DataTable
                  columns={auditColumns}
                  rows={data.recentAuditLogs}
                  rowKey={(log) => log.id}
                  emptyTitle="No Audit Entries Yet"
                  emptyDescription="Administrative actions such as approvals, status changes, and catalog edits are logged here."
                />
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
