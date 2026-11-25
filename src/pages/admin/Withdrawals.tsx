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
import { sessionApiRequest, formatIsoDate } from "../../services/dashboardApi";
import { formatUsd } from "../../trading/tradingPage";

interface AdminWithdrawalRow {
  id: string;
  userId: string;
  userEmail: string;
  method: string;
  amount: number;
  destination: string;
  reference: string;
  status: string;
  createdAt: string | null;
  metadata?: { fee?: number; netPayout?: number };
}

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState<"All" | "Pending" | "Completed" | "Rejected">("All");

  const [reviewItem, setReviewItem] = useState<{
    tx: AdminWithdrawalRow;
    decision: "Completed" | "Rejected";
  } | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadWithdrawals = useCallback(
    async (isRefresh = false) => {
            if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
                const res = await sessionApiRequest<{ withdrawals: AdminWithdrawalRow[] }>(
          "/api/admin/withdrawals");
        setWithdrawals(res.withdrawals);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load withdrawal queue.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadWithdrawals(false);
  }, [loadWithdrawals]);

  const filtered = useMemo(() => {
    if (filter === "All") return withdrawals;
    return withdrawals.filter((w) => w.status === filter);
  }, [withdrawals, filter]);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewItem) return;
    setSubmitting(true);
    setBanner(null);

    try {
            await sessionApiRequest(`/api/admin/withdrawals/${reviewItem.tx.id}/resolve`, {
        method: "POST",
        body: JSON.stringify({
          decision: reviewItem.decision,
          note: note.trim(),
        }),
      });
      setBanner({
        tone: "success",
        text:
          reviewItem.decision === "Completed"
            ? `Marked withdrawal ${reviewItem.tx.reference} (${formatUsd(reviewItem.tx.amount)}) as completed.`
            : `Rejected withdrawal ${reviewItem.tx.reference} and refunded ${formatUsd(reviewItem.tx.amount)} to customer balance.`,
      });
      setReviewItem(null);
      await loadWithdrawals(true);
    } catch (err) {
      setBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Unable to resolve withdrawal request.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const columns: TableColumn<AdminWithdrawalRow>[] = [
    {
      key: "date",
      header: "Date / Reference",
      render: (w) => (
        <div>
          <p className="font-mono text-xs font-semibold text-slate-900">{w.reference}</p>
          <p className="font-mono text-[11px] text-slate-500">{formatIsoDate(w.createdAt)}</p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer & Destination",
      render: (w) => (
        <div className="max-w-[260px]">
          <p className="font-medium text-slate-900 truncate">{w.userEmail}</p>
          <p className="text-[11px] text-slate-500 truncate">
            {w.method} · {w.destination}
          </p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Reserved Amount",
      align: "right",
      render: (w) => (
        <div className="text-right">
          <span className="font-mono tabular-nums font-semibold text-slate-900">
            {formatUsd(w.amount)}
          </span>
          {w.metadata && (
            <p className="mt-0.5 text-[11px] text-slate-500">
              Fee {formatUsd(Number(w.metadata.fee ?? 0))} · Net payout {formatUsd(Number(w.metadata.netPayout ?? w.amount))}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (w) => <StatusText status={w.status} />,
    },
    {
      key: "actions",
      header: "Settlement",
      align: "right",
      render: (w) =>
        w.status === "Pending" ? (
          <div className="inline-flex items-center gap-1.5">
            <Button
              size="sm"
              onClick={() => {
                setReviewItem({ tx: w, decision: "Completed" });
                setNote("");
              }}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-rose-600 border-rose-200 hover:bg-rose-50"
              onClick={() => {
                setReviewItem({ tx: w, decision: "Rejected" });
                setNote("");
              }}
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject &amp; Refund</span>
            </Button>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Resolved</span>
        ),
    },
  ];

  return (
    <AdminLayout
      title="Withdrawal Administration"
      subtitle="Inspect customer withdrawal destinations, confirm payout execution, or reject and automatically refund reserved funds."
      actions={
        <Button
          variant="outline"
          size="sm"
          loading={refreshing}
          onClick={() => void loadWithdrawals(true)}
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
          title={`Withdrawal Requests (${filtered.length})`}
          action={
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md">
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
            rowKey={(w) => w.id}
            loading={loading}
            error={error}
            onRetry={() => void loadWithdrawals(false)}
            emptyTitle="No Withdrawal Requests"
            emptyDescription="Customer payout requests appear here for treasury review."
          />
        </CardBody>
      </Card>

      <Modal
        open={Boolean(reviewItem)}
        onClose={() => setReviewItem(null)}
        title={
          reviewItem?.decision === "Completed"
            ? "Confirm Payout Settlement"
            : "Reject Withdrawal & Refund Customer"
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
                Payout Method:{" "}
                <span className="font-semibold text-slate-900">{reviewItem.tx.method}</span>
              </p>
              <p className="text-slate-600">
                Destination:{" "}
                <span className="font-mono text-slate-900">{reviewItem.tx.destination}</span>
              </p>
            </div>

            {reviewItem.decision === "Rejected" && (
              <NotificationBanner
                tone="warning"
                message={`Rejecting this request immediately restores ${formatUsd(reviewItem.tx.amount)} back to the customer's custody balance.`}
              />
            )}

            <FormField id="wd-note" label="Settlement Reference / Audit Note">
              <TextAreaInput
                id="wd-note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  reviewItem.decision === "Completed"
                    ? "Enter wire confirmation or transaction hash..."
                    : "Enter reason for rejecting this payout request..."
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
                  ? "Confirm Payout Completed"
                  : "Reject & Refund Balance"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </AdminLayout>
  );
}
