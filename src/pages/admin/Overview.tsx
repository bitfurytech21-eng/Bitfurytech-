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
import { useAuth } from "../../hooks/useAuth";
import { apiRequest, formatIsoDate } from "../../services/dashboardApi";
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
  const { firebaseUser, idToken } = useAuth();
  const [data, setData] = useState<AdminOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(
    async (isRefresh = false) => {
      if (!firebaseUser) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const token = idToken || (await firebaseUser.getIdToken());
        const res = await apiRequest<AdminOverviewResponse>("/api/admin/overview", token);
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load admin metrics.");
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
      subtitle="Platform treasury metrics, pending customer settlements, property catalog count, and governance audit trail."
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
        <div className="space-y-6">
          {/* Primary Operations KPIs */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card padding="md" className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">Total Customers</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {data.stats.totalCustomers}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {data.stats.newRegistrations} registered in past 7 days
                </p>
              </div>
              <div className="w-10 h-10 rounded-[5px] bg-[#1B4962] text-white flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </Card>

            <Card padding="md" className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">Total Invested Capital</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {formatUsd(data.stats.totalInvested)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {data.stats.activeInvestmentsCount} active positions
                </p>
              </div>
              <div className="w-10 h-10 rounded-[5px] bg-[#E94D65] text-white flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </Card>

            <Card padding="md" className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">Pending Deposits</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {data.stats.pendingDepositsCount}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Queue volume:{" "}
                  <span className="font-mono">{formatUsd(data.stats.pendingDepositsAmount)}</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <ArrowDownCircle className="w-5 h-5" />
              </div>
            </Card>

            <Card padding="md" className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">Pending Withdrawals</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {data.stats.pendingWithdrawalsCount}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Queue volume:{" "}
                  <span className="font-mono">{formatUsd(data.stats.pendingWithdrawalsAmount)}</span>
                </p>
              </div>
              <div className="w-10 h-10 rounded-md bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </Card>

            <Card padding="md" className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">New Registrations (7d)</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {data.stats.newRegistrations}
                </p>
                <p className="text-xs text-slate-500 mt-1">Verified onboarding flow</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <UserPlus className="w-5 h-5" />
              </div>
            </Card>

            <Card padding="md" className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500">Listed Properties & Inquiries</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                  {data.stats.propertiesCount} / {data.stats.inquiriesCount}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Properties cataloged · Support inquiries
                </p>
              </div>
              <div className="w-10 h-10 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
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
