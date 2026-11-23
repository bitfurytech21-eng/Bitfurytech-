import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  Calendar,
  Eye,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  ErrorState,
  FormField,
  Modal,
  NotificationBanner,
  SelectInput,
  StatusText,
  TableColumn,
  TextInput,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import {
  DashboardInvestmentDTO,
  DashboardInvestmentsDTO,
  DashboardTransactionDTO,
  fetchDashboardInvestments,
  formatIsoDate,
} from "../../services/dashboardApi";
import { createInvestmentAllocation } from "../../services/firestoreService";
import {
  formatUsd,
  getMandateById,
  INVESTMENT_MANDATES,
  validateAllocation,
} from "../../trading/tradingPage";

export default function MyInvestments() {
  const { firebaseUser, backendSession, authReady, profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPlanId = searchParams.get("plan");

  const [data, setData] = useState<DashboardInvestmentsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Completed">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvestment, setSelectedInvestment] =
    useState<DashboardInvestmentDTO | null>(null);

  // Allocation modal state
  const [allocateOpen, setAllocateOpen] = useState(Boolean(requestedPlanId));
  const [planId, setPlanId] = useState(
    (requestedPlanId && getMandateById(requestedPlanId)?.id) || INVESTMENT_MANDATES[0].id
  );
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [allocateError, setAllocateError] = useState<string | null>(null);
  const [allocateSuccess, setAllocateSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (requestedPlanId) {
      const found = getMandateById(requestedPlanId);
      if (found) {
        setPlanId(found.id);
        setAllocateOpen(true);
      }
    }
  }, [requestedPlanId]);

  const loadInvestments = useCallback(
    async (isRefresh = false) => {
      if (!authReady || !backendSession) return;
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const payload = await fetchDashboardInvestments();
        setData(payload);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your authenticated investment portfolio."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [backendSession, authReady]
  );

  useEffect(() => {
    void loadInvestments(false);
  }, [loadInvestments]);

  const activeMandate = getMandateById(planId) || INVESTMENT_MANDATES[0];
  const availableBalance = profile?.walletBalance ?? 0;

  const filteredInvestments = useMemo(() => {
    const items = data?.investments ?? [];
    const q = searchQuery.trim().toLowerCase();
    return items.filter((inv) => {
      if (statusFilter !== "All" && inv.status !== statusFilter) return false;
      if (!q) return true;
      return (
        inv.planName.toLowerCase().includes(q) ||
        inv.reference.toLowerCase().includes(q) ||
        inv.categoryLabel.toLowerCase().includes(q)
      );
    });
  }, [data, searchQuery, statusFilter]);

  const investmentHistory = useMemo(() => {
    return (data?.allTransactions ?? []).filter(
      (tx) => tx.type === "Investment" || tx.type === "Profit"
    );
  }, [data]);

  const handleCloseAllocate = () => {
    setAllocateOpen(false);
    setAllocateError(null);
    if (requestedPlanId) {
      searchParams.delete("plan");
      setSearchParams(searchParams, { replace: true });
    }
  };

  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setAllocateError(null);
    setAllocateSuccess(null);

    const parsed = Number(amount);
    const check = validateAllocation(planId, parsed, availableBalance);
    if (!check.valid) {
      setAllocateError(check.error || "Invalid allocation amount.");
      return;
    }

    setSubmitting(true);
    try {
      await createInvestmentAllocation(
        firebaseUser.uid,
        firebaseUser.email || "",
        planId,
        parsed
      );
      setAllocateSuccess(
        `Allocated ${formatUsd(parsed)} to ${activeMandate.name}. Your ledger and active mandates are updated.`
      );
      setAmount("");
      handleCloseAllocate();
      await loadInvestments(true);
    } catch (err) {
      setAllocateError(err instanceof Error ? err.message : "Failed to allocate mandate.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: TableColumn<DashboardInvestmentDTO>[] = [
    {
      key: "reference",
      header: "Reference / Plan",
      render: (inv) => (
        <div className="min-w-[180px]">
          <p className="font-mono text-xs text-slate-500">{inv.reference}</p>
          <p className="font-semibold text-slate-900">{inv.planName}</p>
          <p className="text-[11px] text-slate-500">{inv.categoryLabel}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount Invested",
      align: "right",
      render: (inv) => (
        <span className="font-mono tabular-nums font-semibold text-slate-900">
          {formatUsd(inv.amount)}
        </span>
      ),
    },
    {
      key: "dates",
      header: "Investment / Start / Maturity",
      render: (inv) => (
        <div className="text-xs text-slate-600 space-y-0.5 font-mono tabular-nums whitespace-nowrap">
          <p>Invested: {formatIsoDate(inv.investmentDate)}</p>
          <p>Start: {formatIsoDate(inv.startDate)}</p>
          <p>Maturity: {formatIsoDate(inv.maturityDate)}</p>
        </div>
      ),
    },
    {
      key: "terms",
      header: "Duration & Payment Terms",
      render: (inv) => (
        <div className="max-w-[230px] space-y-0.5">
          <p className="text-xs font-semibold text-slate-800">{inv.durationDays} Days</p>
          <p className="text-[11px] text-slate-600 line-clamp-2">{inv.expectedPaymentTerms}</p>
        </div>
      ),
    },
    {
      key: "progress",
      header: "Progress",
      render: (inv) => (
        <div className="min-w-[130px] space-y-1">
          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-600">
            <span>{inv.progressPct}%</span>
            <span>
              {inv.daysElapsed}/{inv.durationDays}d
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-[#E94D65] rounded-full"
              style={{ width: `${inv.progressPct}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (inv) => <StatusText status={inv.status} />,
    },
    {
      key: "details",
      header: "Details",
      align: "right",
      render: (inv) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setSelectedInvestment(inv)}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Inspect</span>
        </Button>
      ),
    },
  ];

  const txColumns: TableColumn<DashboardTransactionDTO>[] = [
    {
      key: "date",
      header: "Date",
      render: (tx) => (
        <span className="font-mono text-slate-600">{formatIsoDate(tx.createdAt)}</span>
      ),
    },
    {
      key: "reference",
      header: "Reference",
      render: (tx) => <span className="font-mono text-slate-700">{tx.reference}</span>,
    },
    {
      key: "type",
      header: "Type",
      render: (tx) => <span className="font-semibold text-slate-900">{tx.type}</span>,
    },
    {
      key: "method",
      header: "Mandate / Method",
      render: (tx) => <span className="text-slate-600">{tx.method}</span>,
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
    {
      key: "receipt",
      header: "Receipt",
      align: "right",
      render: (tx) => (
        <Link
          to={`/transactions/${tx.id}`}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B4962] hover:text-[#B92841] hover:underline"
        >
          <span>View</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="My Investments"
      subtitle="Track active mandates, cycle progress, maturity dates, and allocation history for your authenticated BitfuryTech account."
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            loading={refreshing}
            onClick={() => void loadInvestments(true)}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
          <Button variant="primary" size="sm" onClick={() => setAllocateOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            <span>New Investment</span>
          </Button>
        </>
      }
    >
      {allocateSuccess && (
        <NotificationBanner
          tone="success"
          message={allocateSuccess}
          onDismiss={() => setAllocateSuccess(null)}
        />
      )}

      {error ? (
        <ErrorState
          title="Unable to Load Your Investments"
          message={error}
          onRetry={() => void loadInvestments(false)}
        />
      ) : (
        <div className="space-y-6">
          {/* Summary KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card padding="md">
              <p className="text-xs text-slate-500">Total Invested</p>
              <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {formatUsd(data?.summary.totalInvested ?? 0)}
              </p>
            </Card>
            <Card padding="md">
              <p className="text-xs text-slate-500">Active Capital</p>
              <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {formatUsd(data?.summary.activeCapital ?? 0)}
              </p>
            </Card>
            <Card padding="md">
              <p className="text-xs text-slate-500">Active Mandates</p>
              <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {data?.summary.activeCount ?? 0}
              </p>
            </Card>
            <Card padding="md">
              <p className="text-xs text-slate-500">Completed Mandates</p>
              <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {data?.summary.completedCount ?? 0}
              </p>
            </Card>
          </div>

          {/* Investments Table */}
          <Card>
            <CardHeader
              title="Active &amp; Completed Positions"
              subtitle="Inspect cycle duration, elapsed days, expected payment terms, and attached receipts"
              action={
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search ref or plan..."
                      aria-label="Search investments"
                      className="rounded-[5px] border border-[#CBD6E2] bg-white pl-8 pr-3 py-1.5 text-xs text-[#102030] placeholder:text-[#7A8B9C] focus:border-[#1B4962] focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center gap-1 p-1 bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px]">
                    {(["All", "Active", "Completed"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setStatusFilter(tab)}
                        className={`px-3 py-1 rounded-none text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                          statusFilter === tab
                            ? "bg-[#1B4962] text-white"
                            : "text-[#5A6B7C] hover:text-[#102030]"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>
              }
            />
            <CardBody>
              <DataTable
                columns={columns}
                rows={filteredInvestments}
                rowKey={(inv) => inv.id}
                loading={loading}
                emptyTitle="No Matching Investments"
                emptyDescription="Only investments owned by your authenticated account appear here. Allocate capital to start your first mandate."
                emptyAction={
                  <Button size="sm" onClick={() => setAllocateOpen(true)}>
                    Allocate Capital
                  </Button>
                }
              />
            </CardBody>
          </Card>

          {/* Investment Transaction History */}
          <Card>
            <CardHeader
              title="Investment Transaction History"
              subtitle="Capital allocations and settled return entries recorded for your holdings"
              action={
                <Link
                  to="/transactions"
                  className="text-xs font-semibold text-[#1B4962] hover:text-[#B92841] hover:underline"
                >
                  Open Full Ledger
                </Link>
              }
            />
            <CardBody>
              <DataTable
                columns={txColumns}
                rows={investmentHistory}
                rowKey={(tx) => tx.id}
                loading={loading}
                emptyTitle="No Investment Transactions Yet"
                emptyDescription="Mandate allocations and profit settlements for your account will appear here."
              />
            </CardBody>
          </Card>
        </div>
      )}

      {/* Investment Details & Related Transactions Modal */}
      <Modal
        open={Boolean(selectedInvestment)}
        onClose={() => setSelectedInvestment(null)}
        title={selectedInvestment?.planName || "Investment Details"}
        description={
          selectedInvestment
            ? `Reference ${selectedInvestment.reference} · ${selectedInvestment.categoryLabel}`
            : undefined
        }
        footer={
          <Button variant="outline" size="sm" onClick={() => setSelectedInvestment(null)}>
            Close
          </Button>
        }
      >
        {selectedInvestment && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="text-slate-500">Amount Invested</p>
                <p className="text-lg font-bold font-mono tabular-nums text-slate-900">
                  {formatUsd(selectedInvestment.amount)}
                </p>
              </div>
              <StatusText status={selectedInvestment.status} />
            </div>

            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-slate-500">Investment Date</dt>
                <dd className="font-mono text-slate-900 mt-0.5">
                  {formatIsoDate(selectedInvestment.investmentDate)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Start Date</dt>
                <dd className="font-mono text-slate-900 mt-0.5">
                  {formatIsoDate(selectedInvestment.startDate)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Maturity Date</dt>
                <dd className="font-mono text-slate-900 mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatIsoDate(selectedInvestment.maturityDate)}</span>
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Investment Duration</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">
                  {selectedInvestment.durationDays} Days ({selectedInvestment.daysRemaining}d remaining)
                </dd>
              </div>
            </dl>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-slate-600">
                <span>Cycle Progress</span>
                <span className="font-mono tabular-nums font-semibold">
                  {selectedInvestment.progressPct}% ({selectedInvestment.daysElapsed}/
                  {selectedInvestment.durationDays} days)
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#EDF3F7] overflow-hidden">
                <div
                  className="h-full bg-[#1B4962] rounded-full"
                  style={{ width: `${selectedInvestment.progressPct}%` }}
                />
              </div>
            </div>

            <div className="rounded-md bg-slate-50 border border-slate-200 p-3 space-y-1.5">
              <p className="font-semibold text-slate-800">Expected Payment Terms</p>
              <p className="text-slate-600 leading-relaxed">
                {selectedInvestment.expectedPaymentTerms}
              </p>
              <p className="text-slate-500">
                Frequency: {selectedInvestment.paymentFrequency} · Rail:{" "}
                {selectedInvestment.settlementRail}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <p className="font-semibold text-slate-800">
                Related Account Transactions ({selectedInvestment.transactions.length})
              </p>
              {selectedInvestment.transactions.length === 0 ? (
                <p className="text-slate-500">No matching ledger entries attached yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                  {selectedInvestment.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="px-3 py-2 flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">
                          {tx.type} · <span className="font-mono">{tx.reference}</span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {formatIsoDate(tx.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono tabular-nums font-semibold text-slate-900">
                          {formatUsd(tx.amount)}
                        </p>
                        <StatusText status={tx.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* New Investment Allocation Modal */}
      <Modal
        open={allocateOpen}
        onClose={handleCloseAllocate}
        title="Allocate Capital to Mandate"
        description={`Available custody balance: ${formatUsd(availableBalance)}`}
      >
        <form onSubmit={handleAllocateSubmit} className="space-y-4">
          {allocateError && (
            <NotificationBanner
              tone="error"
              message={allocateError}
              onDismiss={() => setAllocateError(null)}
            />
          )}

          <FormField id="alloc-plan" label="Select Investment Mandate">
            <SelectInput
              id="alloc-plan"
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
            >
              {INVESTMENT_MANDATES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.categoryLabel} — {m.name} ({formatUsd(m.minDeposit)}+)
                </option>
              ))}
            </SelectInput>
          </FormField>

          <div className="rounded-md bg-slate-50 border border-slate-200 p-3 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Target Daily Rate</span>
              <span className="font-mono font-semibold text-slate-900">
                {activeMandate.dailyRatePct}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Duration</span>
              <span className="font-semibold text-slate-900">
                {activeMandate.durationDays} Days
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Allocation Range</span>
              <span className="font-mono text-slate-900">
                {formatUsd(activeMandate.minDeposit)} – {formatUsd(activeMandate.maxDeposit)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-200">
              {activeMandate.returnTerms}
            </p>
          </div>

          <FormField id="alloc-amount" label="Allocation Amount (USD)">
            <TextInput
              id="alloc-amount"
              type="number"
              numeric
              min={activeMandate.minDeposit}
              max={activeMandate.maxDeposit}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Min ${activeMandate.minDeposit}`}
            />
          </FormField>

          <div className="flex items-center justify-between gap-3 pt-1">
            {availableBalance < activeMandate.minDeposit ? (
              <Link
                to="/deposit"
                onClick={handleCloseAllocate}
                className="text-xs font-semibold text-[#1B4962] hover:text-[#B92841] hover:underline"
              >
                Fund Custody Wallet First
              </Link>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleCloseAllocate}>
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={submitting}>
                Confirm Allocation
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </DashboardLayout>
  );
}
