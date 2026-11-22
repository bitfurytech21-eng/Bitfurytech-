import { useCallback, useEffect, useState } from "react";
import { Check, Copy, RefreshCw, Share2 } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  ErrorState,
  StatusText,
  TableColumn,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import {
  apiRequest,
  DashboardTransactionDTO,
  formatIsoDate,
} from "../../services/dashboardApi";
import { formatUsd } from "../../trading/tradingPage";

interface ReferralResponse {
  referralCode: string;
  totalReferrals: number;
  qualifiedReferrals: number;
  referralEarnings: number;
  referrals: Array<{
    id: string;
    referredEmail: string;
    status: string;
    rewardAmount: number;
    createdAt: string | null;
  }>;
  transactions: DashboardTransactionDTO[];
  ruleSummary: string;
}

export default function Referrals() {
  const { firebaseUser, idToken } = useAuth();
  const [data, setData] = useState<ReferralResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadReferrals = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      const token = idToken || (await firebaseUser.getIdToken());
      const payload = await apiRequest<ReferralResponse>("/api/referrals", token);
      setData(payload);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load referral records."
      );
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, idToken]);

  useEffect(() => {
    void loadReferrals();
  }, [loadReferrals]);

  const code =
    data?.referralCode ||
    (firebaseUser ? `BF-${firebaseUser.uid.slice(0, 8).toUpperCase()}` : "BF-PENDING");
  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/register?ref=${code}`
      : `/register?ref=${code}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const txColumns: TableColumn<DashboardTransactionDTO>[] = [
    {
      key: "reference",
      header: "Reference",
      render: (tx) => <span className="font-mono text-slate-800">{tx.reference}</span>,
    },
    {
      key: "date",
      header: "Date",
      render: (tx) => (
        <span className="font-mono text-slate-600">{formatIsoDate(tx.createdAt)}</span>
      ),
    },
    {
      key: "method",
      header: "Source",
      render: (tx) => <span className="text-slate-700">{tx.method || "Partner Credit"}</span>,
    },
    {
      key: "amount",
      header: "Earnings",
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
      subtitle="Share your unique referral identifier and review verified referral earnings."
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadReferrals()}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      }
    >
      {error ? (
        <ErrorState
          title="Referral Ledger Unavailable"
          message={error}
          onRetry={() => void loadReferrals()}
        />
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card padding="md">
              <p className="text-xs font-medium text-slate-500">Unique Referral Code</p>
              <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
                {code}
              </p>
              <p className="text-xs text-slate-500 mt-1">Assigned to your account</p>
            </Card>
            <Card padding="md">
              <p className="text-xs font-medium text-slate-500">Total Referrals</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
                {loading ? "—" : data?.totalReferrals ?? 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">Registered attributions</p>
            </Card>
            <Card padding="md">
              <p className="text-xs font-medium text-slate-500">Qualified Referrals</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
                {loading ? "—" : data?.qualifiedReferrals ?? 0}
              </p>
              <p className="text-xs text-slate-500 mt-1">Verified &amp; settled</p>
            </Card>
            <Card padding="md">
              <p className="text-xs font-medium text-slate-500">Referral Earnings</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-emerald-700 mt-1.5">
                {loading ? "—" : formatUsd(data?.referralEarnings ?? 0)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Verified backend total</p>
            </Card>
          </div>

          <Card>
            <CardHeader
              title="Referral Link"
              subtitle={data?.ruleSummary || "Credits apply strictly under backend settlement rules."}
              action={<Share2 className="w-4 h-4 text-slate-400" />}
            />
            <CardBody className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                readOnly
                value={referralLink}
                aria-label="Unique referral link"
                className="flex-1 bg-slate-50 border border-slate-300 rounded-md px-3.5 py-2 text-xs font-mono text-slate-800"
              />
              <Button variant="primary" size="md" onClick={() => void handleCopy()}>
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                <span>{copied ? "Copied Link" : "Copy Referral Link"}</span>
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Referral Transaction History"
              subtitle="Settled referral payouts posted to your custody ledger"
            />
            <CardBody>
              <DataTable
                columns={txColumns}
                rows={data?.transactions ?? []}
                rowKey={(tx) => tx.id}
                loading={loading}
                emptyTitle="No Referral Payouts Recorded"
                emptyDescription="Verified referral commissions appear here once qualifying client activity settles."
              />
            </CardBody>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
