import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, ShieldCheck } from "lucide-react";
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
  SelectInput,
  StatusText,
  TableColumn,
  TextAreaInput,
} from "../../components/ui";
import { sessionApiRequest, formatIsoDate } from "../../services/dashboardApi";
import { formatUsd } from "../../trading/tradingPage";

interface AdminInvestmentRow {
  id: string;
  reference: string;
  userId: string;
  userEmail: string;
  userName: string;
  planId: string;
  planName: string;
  category: string;
  amount: number;
  dailyRatePct: number;
  durationDays: number;
  status: "Active" | "Completed";
  startDate: string;
  maturityDate: string;
}

export default function AdminInvestments() {
  const [investments, setInvestments] = useState<AdminInvestmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Completed">("All");

  const [editing, setEditing] = useState<AdminInvestmentRow | null>(null);
  const [nextStatus, setNextStatus] = useState<"Active" | "Completed">("Completed");
  const [auditReason, setAuditReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadInvestments = useCallback(
    async (isRefresh = false) => {
            if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
                const res = await sessionApiRequest<{ investments: AdminInvestmentRow[] }>(
          "/api/admin/investments");
        setInvestments(res.investments);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load platform investments.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadInvestments(false);
  }, [loadInvestments]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return investments.filter((inv) => {
      if (statusFilter !== "All" && inv.status !== statusFilter) return false;
      if (!q) return true;
      return (
        inv.reference.toLowerCase().includes(q) ||
        inv.planName.toLowerCase().includes(q) ||
        inv.userEmail.toLowerCase().includes(q) ||
        inv.userName.toLowerCase().includes(q)
      );
    });
  }, [investments, search, statusFilter]);

  const openUpdate = (inv: AdminInvestmentRow) => {
    setEditing(inv);
    setNextStatus(inv.status === "Active" ? "Completed" : "Active");
    setAuditReason("");
  };

  const handleStatusSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (auditReason.trim().length < 4) {
      setBanner({
        tone: "error",
        text: "Provide a brief administrative audit reason before modifying investment status.",
      });
      return;
    }

    setSubmitting(true);
    setBanner(null);
    try {
            await sessionApiRequest(`/api/admin/investments/${editing.id}/status`, {
        method: "POST",
        body: JSON.stringify({
          status: nextStatus,
          reason: auditReason.trim(),
        }),
      });
      setBanner({
        tone: "success",
        text: `Updated investment ${editing.reference} status to ${nextStatus} with audit entry recorded.`,
      });
      setEditing(null);
      await loadInvestments(true);
    } catch (err) {
      setBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Unable to update investment status.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const columns: TableColumn<AdminInvestmentRow>[] = [
    {
      key: "ref",
      header: "Reference / Plan",
      render: (inv) => (
        <div>
          <p className="font-mono text-xs font-semibold text-slate-900">{inv.reference}</p>
          <p className="font-semibold text-slate-800">{inv.planName}</p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (inv) => (
        <div>
          <p className="font-medium text-slate-900">{inv.userName || "Investor"}</p>
          <p className="text-[11px] text-slate-500">{inv.userEmail}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Principal",
      align: "right",
      render: (inv) => (
        <span className="font-mono tabular-nums font-semibold text-slate-900">
          {formatUsd(inv.amount)}
        </span>
      ),
    },
    {
      key: "schedule",
      header: "Maturity Schedule",
      render: (inv) => (
        <div className="font-mono text-[11px] text-slate-600 whitespace-nowrap">
          <p>Start: {formatIsoDate(inv.startDate)}</p>
          <p>Maturity: {formatIsoDate(inv.maturityDate)}</p>
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
      key: "actions",
      header: "Audit Action",
      align: "right",
      render: (inv) => (
        <Button size="sm" variant="outline" onClick={() => openUpdate(inv)}>
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Update Status</span>
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Investment Administration"
      subtitle="Monitor customer investment positions, maturity schedules, and apply audited lifecycle status updates."
      actions={
        <Button
          variant="outline"
          size="sm"
          loading={refreshing}
          onClick={() => void loadInvestments(true)}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      }
    >
      <NotificationBanner
        tone="info"
        message="Principal amounts and contracted rates remain immutable. Status transitions require an administrative audit reason."
      />

      {banner && (
        <NotificationBanner
          tone={banner.tone}
          message={banner.text}
          onDismiss={() => setBanner(null)}
        />
      )}

      <Card>
        <CardHeader
          title={`Active & Completed Positions (${filtered.length})`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ref, email, plan..."
                  aria-label="Search customer investments"
                  className="rounded-md border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#294158] focus:outline-none"
                />
              </div>
              <SelectInput
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "All" | "Active" | "Completed")
                }
                aria-label="Filter investment status"
                className="w-auto py-1.5 text-xs"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
              </SelectInput>
            </div>
          }
        />
        <CardBody>
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(inv) => inv.id}
            loading={loading}
            error={error}
            onRetry={() => void loadInvestments(false)}
            emptyTitle="No Customer Investments"
            emptyDescription="Customer allocations into mandates and properties appear here."
          />
        </CardBody>
      </Card>

      <Modal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Audited Status Transition"
        description={
          editing
            ? `${editing.reference} · ${editing.userEmail} · Principal ${formatUsd(editing.amount)}`
            : undefined
        }
      >
        {editing && (
          <form onSubmit={handleStatusSave} className="space-y-4 text-xs">
            <FormField id="inv-next-status" label="Target Lifecycle Status">
              <SelectInput
                id="inv-next-status"
                value={nextStatus}
                onChange={(e) =>
                  setNextStatus(e.target.value === "Active" ? "Active" : "Completed")
                }
              >
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
              </SelectInput>
            </FormField>

            <FormField
              id="inv-audit-reason"
              label="Administrative Audit Reason (Required)"
            >
              <TextAreaInput
                id="inv-audit-reason"
                rows={3}
                required
                minLength={4}
                value={auditReason}
                onChange={(e) => setAuditReason(e.target.value)}
                placeholder="Document maturity completion or administrative review justification..."
              />
            </FormField>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={submitting}>
                Record Status Update
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </AdminLayout>
  );
}
