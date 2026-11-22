import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  FormField,
  Modal,
  NotificationBanner,
  StatusText,
  TableColumn,
  TextAreaInput,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import { apiRequest, formatIsoDate } from "../../services/dashboardApi";
import { formatUsd } from "../../trading/tradingPage";

interface AdminDepositRow {
  id: string;
  userId: string;
  userEmail: string;
  method: string;
  amount: number;
  destination: string;
  reference: string;
  status: string;
  createdAt: string | null;
}

export default function AdminDeposits() {
  const { firebaseUser, idToken } = useAuth();
  const [deposits, setDeposits] = useState<AdminDepositRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState<"All" | "Pending" | "Completed" | "Rejected">("All");

  const [reviewItem, setReviewItem] = useState<{
    tx: AdminDepositRow;
    decision: "Completed" | "Rejected";
  } | null>(null);
  const [evidenceNote, setEvidenceNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadDeposits = useCallback(
    async (isRefresh = false) => {
      if (!firebaseUser) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const token = idToken || (await firebaseUser.getIdToken());
        const res = await apiRequest<{ deposits: AdminDepositRow[] }>(
          "/api/admin/deposits",
          token
        );
        setDeposits(res.deposits);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load deposit queue.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [firebaseUser, idToken]
  );

  useEffect(() => {
    void loadDeposits(false);
  }, [loadDeposits]);

  const filtered = useMemo(() => {
    if (filter === "All") return deposits;
    return deposits.filter((d) => d.status === filter);
  }, [deposits, filter]);

  const openDecision = (tx: AdminDepositRow, decision: "Completed" | "Rejected") => {
    setReviewItem({ tx, decision });
    setEvidenceNote("");
  };

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser || !reviewItem) return;
    if (reviewItem.decision === "Completed" && !evidenceNote.trim()) {
      setBanner({
        tone: "error",
        text: "Enter payment evidence or bank/blockchain reference before approving.",
      });
      return;
    }

    setSubmitting(true);
    setBanner(null);
    try {
      const token = idToken || (await firebaseUser.getIdToken());
      await apiRequest(`/api/admin/deposits/${reviewItem.tx.id}/resolve`, token, {
        method: "POST",
        body: JSON.stringify({
          decision: reviewItem.decision,
          evidenceNote: evidenceNote.trim(),
        }),
      });
      setBanner({
        tone: "success",
        text:
          reviewItem.decision === "Completed"
            ? `Approved deposit ${reviewItem.tx.reference} (${formatUsd(reviewItem.tx.amount)}) and credited customer wallet.`
            : `Rejected deposit ${reviewItem.tx.reference}. No balance credited.`,
      });
      setReviewItem(null);
      await loadDeposits(true);
    } catch (err) {
      setBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Unable to resolve deposit.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const columns: TableColumn<AdminDepositRow>[] = [
    {
      key: "date",
      header: "Date / Reference",
      render: (d) => (
        <div>
          <p className="font-mono text-xs font-semibold text-slate-900">{d.reference}</p>
          <p className="font-mono text-[11px] text-slate-500">{formatIsoDate(d.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (d) => (
        <div>
          <p className="font-medium text-slate-900">{d.userEmail}</p>
          <p className="text-[11px] text-slate-500">
            {d.method} · {d.destination}
          </p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (d) => (
        <span className="font-mono tabular-nums font-semibold text-slate-900">
          {formatUsd(d.amount)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (d) => <StatusText status={d.status} />,
    },
    {
      key: "actions",
      header: "Verification",
      align: "right",
      render: (d) =>
        d.status === "Pending" ? (
          <div className="inline-flex items-center gap-1.5">
            <Button size="sm" onClick={() => openDecision(d, "Completed")}>
              <Check className="w-3.5 h-3.5" />
              <span>Approve</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
              onClick={() => openDecision(d, "Rejected")}
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject</span>
            </Button>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Resolved</span>
        ),
    },
  ];

  return (
    <AdminLayout
      title="Deposit Administration"
      subtitle="Verify incoming customer funding transfers against payment evidence before crediting custody balances."
      actions={
        <Button
          variant="outline"
          size="sm"
          loading={refreshing}
          onClick={() => void loadDeposits(true)}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </Button>
      }
    >
      {banner && (
        <NotificationBanner
          tone={banner.tone}
          message={banner.text}
          onDismiss={() => setBanner(null)}
        />
      )}

      <Card>
        <CardHeader
          title={`Customer Deposits (${filtered.length})`}
          action={
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
              {(["All", "Pending", "Completed", "Rejected"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1 rounded-none text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    filter === tab
                      ? "bg-[#1B4962] text-white"
                      : "text-[#5A6B7C] hover:text-[#102030]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          }
        />
        <CardBody>
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(d) => d.id}
            loading={loading}
            error={error}
            onRetry={() => void loadDeposits(false)}
            emptyTitle="No Deposits in Queue"
            emptyDescription="Customer deposit requests submitted on the Funding Desk appear here for verification."
          />
        </CardBody>
      </Card>

      <Modal
        open={Boolean(reviewItem)}
        onClose={() => setReviewItem(null)}
        title={
          reviewItem?.decision === "Completed"
            ? "Verify & Credit Deposit"
            : "Reject Deposit Request"
        }
        description={
          reviewItem
            ? `${reviewItem.tx.reference} · ${reviewItem.tx.userEmail} · ${formatUsd(reviewItem.tx.amount)}`
            : undefined
        }
      >
        {reviewItem && (
          <form onSubmit={handleResolve} className="space-y-4 text-xs">
            <div className="rounded-md bg-slate-50 border border-slate-200 p-3 space-y-1">
              <p className="text-slate-600">
                Rail: <span className="font-semibold text-slate-900">{reviewItem.tx.method}</span>
              </p>
              <p className="text-slate-600">
                Custody Reference:{" "}
                <span className="font-mono text-slate-900">{reviewItem.tx.destination}</span>
              </p>
            </div>

            <FormField
              id="dep-evidence"
              label={
                reviewItem.decision === "Completed"
                  ? "Payment Verification Evidence / Settlement Reference (Required)"
                  : "Rejection Reason (Logged in Audit Trail)"
              }
            >
              <TextAreaInput
                id="dep-evidence"
                rows={3}
                required={reviewItem.decision === "Completed"}
                value={evidenceNote}
                onChange={(e) => setEvidenceNote(e.target.value)}
                placeholder={
                  reviewItem.decision === "Completed"
                    ? "Enter confirmed blockchain txid or bank wire settlement reference..."
                    : "Optional reason for rejecting this deposit request..."
                }
              />
            </FormField>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setReviewItem(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                variant={reviewItem.decision === "Completed" ? "primary" : "danger"}
                loading={submitting}
              >
                {reviewItem.decision === "Completed"
                  ? "Confirm & Credit Balance"
                  : "Confirm Rejection"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </AdminLayout>
  );
}
