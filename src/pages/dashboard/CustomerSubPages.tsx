import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Building2,
  Check,
  Copy,
  Download,
  Eye,
  FileText,
  RefreshCw,
  Share2,
  ShieldCheck,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Button,
  buttonClasses,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  EmptyState,
  ErrorState,
  Modal,
  NotificationBanner,
  SkeletonBlock,
  StatusText,
  TableColumn,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import {
  DashboardInvestmentsDTO,
  DashboardOverviewDTO,
  DashboardTransactionDTO,
  fetchDashboardInvestments,
  fetchDashboardOverview,
  formatIsoDate,
} from "../../services/dashboardApi";
import {
  PropertyOffering,
  subscribeProperties,
} from "../../services/firestoreService";
import {
  formatUsd,
  INVESTMENT_MANDATES,
  InvestmentMandate,
  MandateCategory,
} from "../../trading/tradingPage";

export function InvestmentOpportunitiesPage() {
  const { profile } = useAuth();
  const [categoryFilter, setCategoryFilter] = useState<"all" | MandateCategory>("all");
  const [inspectMandate, setInspectMandate] = useState<InvestmentMandate | null>(null);

  const mandates = useMemo(() => {
    if (categoryFilter === "all") return INVESTMENT_MANDATES;
    return INVESTMENT_MANDATES.filter((m) => m.category === categoryFilter);
  }, [categoryFilter]);

  return (
    <DashboardLayout
      title="Investment Opportunities"
      subtitle="Compare Cryptocurrency, Equities, and Real Estate mandates—review entry limits, durations, and non-guaranteed return terms before allocating."
      actions={
        <Link
          to="/investments"
          className={buttonClasses({ variant: "primary", size: "sm" })}
        >
          <span>My Investments</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      }
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-[#DCE4EC] rounded-[5px] px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by asset category">
          {(
            [
              { id: "all", label: "All Categories" },
              { id: "crypto", label: "Digital Assets" },
              { id: "stock", label: "Global Equities" },
              { id: "estate", label: "Real Estate" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-none text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                categoryFilter === tab.id
                  ? "bg-[#E94D65] text-white"
                  : "text-[#1B4962] hover:bg-[#F6F8FA]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-600">
          Available Custody Balance:{" "}
          <span className="font-mono tabular-nums font-semibold text-slate-900">
            {formatUsd(profile?.walletBalance ?? 0)}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {mandates.map((m) => (
          <Card key={m.id} className="overflow-hidden flex flex-col justify-between">
            <div>
              <img
                src={m.image}
                alt={m.name}
                referrerPolicy="no-referrer"
                className="h-44 w-full object-cover border-b border-slate-200"
              />
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-amber-700">{m.categoryLabel}</span>
                  <span className="font-mono tabular-nums text-slate-500">
                    {m.durationDays} days
                  </span>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{m.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{m.audience}</p>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{m.description}</p>

                <dl className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <dt className="text-slate-500">Minimum Entry</dt>
                    <dd className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                      {formatUsd(m.minDeposit)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Maximum Cap</dt>
                    <dd className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                      {formatUsd(m.maxDeposit)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Indicative Target</dt>
                    <dd className="font-mono tabular-nums font-semibold text-emerald-700 mt-0.5">
                      {m.dailyRatePct}% / day
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Settlement Rail</dt>
                    <dd className="text-slate-800 font-medium mt-0.5 truncate">
                      {m.settlementRail}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="px-5 pb-5 pt-2 flex items-center gap-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectMandate(m)}
                className="flex-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Terms</span>
              </Button>
              <Link
                to={`/investments?plan=${m.id}`}
                className={`${buttonClasses({ variant: "primary", size: "sm" })} flex-1`}
              >
                <span>Allocate</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        ))}
      </div>

      <NotificationBanner
        tone="info"
        title="Return Disclosure"
        message="Indicative daily benchmark rates reflect target portfolio structures and are not guaranteed. Capital allocation remains subject to market liquidity, asset performance, and account verification terms."
      />

      <Modal
        open={Boolean(inspectMandate)}
        onClose={() => setInspectMandate(null)}
        title={inspectMandate ? `${inspectMandate.name} — Mandate Terms` : "Mandate Terms"}
        description={inspectMandate?.categoryLabel}
        maxWidthClass="max-w-xl"
      >
        {inspectMandate && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700 leading-relaxed">{inspectMandate.description}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-md p-3.5 text-xs">
              <div>
                <p className="text-slate-500">Minimum</p>
                <p className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {formatUsd(inspectMandate.minDeposit)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Maximum</p>
                <p className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {formatUsd(inspectMandate.maxDeposit)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Duration</p>
                <p className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
                  {inspectMandate.durationDays} days
                </p>
              </div>
              <div>
                <p className="text-slate-500">Indicative Benchmark</p>
                <p className="font-mono tabular-nums font-semibold text-emerald-700 mt-0.5">
                  {inspectMandate.dailyRatePct}% / day
                </p>
              </div>
            </div>
            <div className="space-y-2 text-xs text-slate-700">
              <p>
                <span className="font-semibold text-slate-900">Payment Frequency: </span>
                {inspectMandate.paymentFrequency}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Expected Return Terms: </span>
                {inspectMandate.returnTerms}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Settlement Rail: </span>
                {inspectMandate.settlementRail}
              </p>
            </div>
            <div className="border-t border-slate-200 pt-3">
              <p className="text-xs font-semibold text-slate-900 mb-2">Structure Highlights</p>
              <ul className="space-y-1.5 text-xs text-slate-600 list-disc pl-5">
                {inspectMandate.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setInspectMandate(null)}>
                Close
              </Button>
              <Link
                to={`/investments?plan=${inspectMandate.id}`}
                className={buttonClasses({ variant: "primary", size: "sm" })}
              >
                Allocate Capital
              </Link>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}

export function DashboardPropertiesPage() {
  const [properties, setProperties] = useState<PropertyOffering[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeProperties((items) => {
      setProperties(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return (
    <DashboardLayout
      title="Properties"
      subtitle="Inspect commercial real estate offerings published by BitfuryTech administrators, including valuation, occupancy, and target yield disclosures."
      actions={
        <Link
          to="/investments?plan=estate-beginner"
          className={buttonClasses({ variant: "primary", size: "sm" })}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Allocate Estate Mandate</span>
        </Link>
      }
    >
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((item) => (
            <Card key={item} padding="lg">
              <SkeletonBlock className="h-60 w-full" />
            </Card>
          ))}
        </div>
      ) : properties.length === 0 ? (
        <Card padding="lg">
          <EmptyState
            title="No Active Property Offerings Listed"
            description="Verified commercial property listings appear here once published by an administrator. You can still allocate into Real Estate mandates directly from My Investments."
            action={
              <Link
                to="/dashboard/opportunities"
                className={buttonClasses({ variant: "primary", size: "sm" })}
              >
                Browse Investment Mandates
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((p) => (
            <Card key={p.id} className="overflow-hidden flex flex-col justify-between">
              <div>
                <img
                  src={p.image || "/images/asset_real_estate.jpg"}
                  alt={p.title}
                  referrerPolicy="no-referrer"
                  className="h-44 w-full object-cover border-b border-slate-200"
                />
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-amber-700">{p.assetType}</span>
                    <StatusText status={p.status} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{p.title}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{p.location}</p>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{p.summary}</p>
                  <dl className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <dt className="text-slate-500">Min Entry</dt>
                      <dd className="font-mono tabular-nums font-semibold text-slate-900">
                        {formatUsd(p.minEntry)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Appraised Valuation</dt>
                      <dd className="font-mono tabular-nums font-semibold text-slate-900">
                        {formatUsd(p.valuation)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Target Yield</dt>
                      <dd className="font-mono tabular-nums font-semibold text-emerald-700">
                        {p.targetYieldPct}%
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Occupancy</dt>
                      <dd className="font-mono tabular-nums font-semibold text-slate-900">
                        {p.occupancyPct}%
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
              <div className="px-5 pb-5">
                <Link
                  to="/investments?plan=estate-beginner"
                  className={buttonClasses({ variant: "primary", size: "sm", fullWidth: true })}
                >
                  Participate via Estate Mandate
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}

export function ReferralProgramPage() {
  const { firebaseUser, idToken } = useAuth();
  const [overview, setOverview] = useState<DashboardOverviewDTO | null>(null);
  const [referralTxs, setReferralTxs] = useState<DashboardTransactionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadReferralLedger = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      const token = idToken || (await firebaseUser.getIdToken());
      const [ov, inv] = await Promise.all([
        fetchDashboardOverview(token),
        fetchDashboardInvestments(token),
      ]);
      setOverview(ov);
      setReferralTxs(inv.allTransactions.filter((tx) => tx.type === "Referral"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load referral account ledger."
      );
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, idToken]);

  useEffect(() => {
    void loadReferralLedger();
  }, [loadReferralLedger]);

  const referralCode = firebaseUser
    ? `BF-${firebaseUser.uid.slice(0, 8).toUpperCase()}`
    : "BF-PENDING";

  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/register?ref=${referralCode}`
      : `/register?ref=${referralCode}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const columns: TableColumn<DashboardTransactionDTO>[] = [
    {
      key: "reference",
      header: "Reference",
      render: (tx) => (
        <span className="font-mono text-xs text-slate-700">{tx.reference}</span>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (tx) => (
        <span className="font-mono text-xs text-slate-600">{formatIsoDate(tx.createdAt)}</span>
      ),
    },
    {
      key: "method",
      header: "Credit Channel",
      render: (tx) => <span className="text-slate-700">{tx.method || "Partner Ledger"}</span>,
    },
    {
      key: "amount",
      header: "Credit Amount",
      align: "right",
      render: (tx) => (
        <span className="font-mono tabular-nums font-semibold text-emerald-700">
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

  return (
    <DashboardLayout
      title="Referral Program"
      subtitle="Share your verified partner referral identifier and monitor settled referral credits."
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadReferralLedger()}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      }
    >
      {error ? (
        <ErrorState
          title="Referral Ledger Unavailable"
          message={error}
          onRetry={() => void loadReferralLedger()}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card padding="md">
              <p className="text-xs font-medium text-slate-500">Verified Referral Bonus</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
                {loading ? "—" : formatUsd(overview?.metrics.referralBonus ?? 0)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Credited by settlement review</p>
            </Card>
            <Card padding="md">
              <p className="text-xs font-medium text-slate-500">Account Referral Identifier</p>
              <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
                {referralCode}
              </p>
              <p className="text-xs text-slate-500 mt-1">Linked to your verified UID</p>
            </Card>
            <Card padding="md">
              <p className="text-xs font-medium text-slate-500">Referral Ledger Entries</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
                {loading ? "—" : referralTxs.length}
              </p>
              <p className="text-xs text-slate-500 mt-1">Recorded referral settlements</p>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Partner Registration Link"
              subtitle="Provide this link to prospective institutional or individual clients registering an account."
              action={<Share2 className="w-4 h-4 text-slate-400" />}
            />
            <CardBody className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralLink}
                  aria-label="Referral registration link"
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-md px-3.5 py-2 text-xs font-mono text-slate-800"
                />
                <Button variant="primary" size="md" onClick={() => void handleCopy()}>
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? "Copied Link" : "Copy Referral Link"}</span>
                </Button>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Referral credits are reviewed against verified onboarding and qualifying custody
                activity prior to ledger posting. Only settled amounts posted by BitfuryTech
                settlement administrators appear in your verified balance.
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Referral Settlement History"
              subtitle="Verified referral transactions credited to your account"
            />
            <DataTable
              columns={columns}
              rows={referralTxs}
              rowKey={(tx) => tx.id}
              loading={loading}
              emptyTitle="No Referral Settlements Recorded"
              emptyDescription="Settled referral credits associated with your partner identifier will appear here once approved."
            />
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}

export function DocumentsPage() {
  const { firebaseUser, idToken } = useAuth();
  const [data, setData] = useState<DashboardInvestmentsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<{ title: string; body: string } | null>(null);

  const loadStatements = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      const token = idToken || (await firebaseUser.getIdToken());
      const payload = await fetchDashboardInvestments(token);
      setData(payload);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load authenticated statement records."
      );
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, idToken]);

  useEffect(() => {
    void loadStatements();
  }, [loadStatements]);

  const downloadCsvStatement = () => {
    if (!data) return;
    const headers = [
      "Reference",
      "Plan",
      "Category",
      "AmountUSD",
      "InvestmentDate",
      "MaturityDate",
      "DurationDays",
      "Status",
      "IndicativeDailyRatePct",
    ];
    const rows = data.investments.map((inv) => [
      inv.reference,
      `"${inv.planName.replace(/"/g, '""')}"`,
      inv.categoryLabel,
      inv.amount.toFixed(2),
      inv.investmentDate,
      inv.maturityDate,
      String(inv.durationDays),
      inv.status,
      String(inv.dailyRatePct),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bitfurytech-portfolio-statement-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadJsonLedger = () => {
    if (!data) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      accountEmail: firebaseUser?.email || "",
      summary: data.summary,
      investments: data.investments,
      transactions: data.allTransactions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bitfurytech-ledger-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout
      title="Documents"
      subtitle="Export verified portfolio statements and review mandate disclosure schedules."
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadStatements()}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Statements</span>
        </Button>
      }
    >
      {error ? (
        <ErrorState
          title="Unable to Load Statements"
          message={error}
          onRetry={() => void loadStatements()}
        />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Authenticated Account Statements"
              subtitle="Generated directly from your verified server-side investment and transaction ledger"
              action={<FileText className="w-4 h-4 text-slate-400" />}
            />
            <CardBody className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 text-xs text-slate-600">
                <p>
                  Active Positions:{" "}
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {loading ? "—" : data?.summary.activeCount ?? 0}
                  </span>{" "}
                  · Total Invested:{" "}
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {loading ? "—" : formatUsd(data?.summary.totalInvested ?? 0)}
                  </span>
                </p>
                <p>
                  Recorded Ledger Transactions:{" "}
                  <span className="font-mono tabular-nums font-semibold text-slate-900">
                    {loading ? "—" : data?.allTransactions.length ?? 0}
                  </span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={loading || !data}
                  onClick={downloadCsvStatement}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Portfolio CSV</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={loading || !data}
                  onClick={downloadJsonLedger}
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Full Ledger JSON</span>
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Mandate Term Sheets & Compliance Disclosures"
              subtitle="Standard governance documents applicable to BitfuryTech client accounts"
              action={<ShieldCheck className="w-4 h-4 text-slate-400" />}
            />
            <CardBody className="divide-y divide-slate-100 p-0">
              <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Client Custody & Risk Disclosure Memorandum
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Explains variable return benchmarks, non-guaranteed yield disclaimers, and
                    settlement verification procedures.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setActiveDoc({
                      title: "Client Custody & Risk Disclosure Memorandum",
                      body:
                        "BitfuryTech mandates provide structured access across Digital Assets, Global Equities, and Real Estate holdings. All indicative daily target percentages represent benchmark targets and are not guaranteed returns. Deposits and withdrawals undergo administrative settlement review prior to ledger execution.",
                    })
                  }
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Read Disclosure</span>
                </Button>
              </div>

              {INVESTMENT_MANDATES.map((m) => (
                <div
                  key={m.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {m.name} — Term Schedule
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {m.categoryLabel} · {m.durationDays} days · Min {formatUsd(m.minDeposit)} ·{" "}
                      {m.paymentFrequency}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setActiveDoc({
                        title: `${m.name} — Term Schedule`,
                        body: `${m.description}\n\nPayment Frequency: ${m.paymentFrequency}\nSettlement Rail: ${m.settlementRail}\nReturn Terms: ${m.returnTerms}`,
                      })
                    }
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Schedule</span>
                  </Button>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      <Modal
        open={Boolean(activeDoc)}
        onClose={() => setActiveDoc(null)}
        title={activeDoc?.title || "Document"}
        maxWidthClass="max-w-lg"
      >
        {activeDoc && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
              {activeDoc.body}
            </p>
            <div className="flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setActiveDoc(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
