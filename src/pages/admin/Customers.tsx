import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, RefreshCw, Search } from "lucide-react";
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
} from "../../components/ui";
import { sessionApiRequest, formatIsoDate } from "../../services/dashboardApi";
import { formatUsd } from "../../trading/tradingPage";

interface AdminCustomerRow {
  uid: string;
  username?: string;
  email: string;
  displayName: string;
  country: string;
  phone: string;
  walletBalance: number;
  totalDeposit: number;
  totalProfit: number;
  referralBonus: number;
  role: string;
  accountStatus: string;
  createdAt: string | null;
  investmentsCount: number;
  transactionsCount: number;
  investments: Array<Record<string, unknown>>;
  transactions: Array<Record<string, unknown>>;
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<AdminCustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selected, setSelected] = useState<AdminCustomerRow | null>(null);
  const [editStatus, setEditStatus] = useState("Active");
  const [savingStatus, setSavingStatus] = useState(false);

  const loadCustomers = useCallback(
    async (isRefresh = false) => {
            if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
                const res = await sessionApiRequest<{ customers: AdminCustomerRow[] }>(
          "/api/admin/customers");
        setCustomers(res.customers);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load customer accounts.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadCustomers(false);
  }, [loadCustomers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      if (statusFilter !== "All" && c.accountStatus !== statusFilter) return false;
      if (!q) return true;
      return (
        c.displayName.toLowerCase().includes(q) ||
        (c.username || "").toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.uid.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q)
      );
    });
  }, [customers, search, statusFilter]);

  const openInspector = (customer: AdminCustomerRow) => {
    setSelected(customer);
    setEditStatus(customer.accountStatus || "Active");
  };

  const handleStatusUpdate = async () => {
    if (!selected) return;
    setSavingStatus(true);
    setBanner(null);
    try {
            await sessionApiRequest(`/api/admin/customers/${selected.uid}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: editStatus }),
      });
      setBanner({
        tone: "success",
        text: `Updated ${selected.email} account status to ${editStatus}.`,
      });
      setSelected((prev) => (prev ? { ...prev, accountStatus: editStatus } : null));
      await loadCustomers(true);
    } catch (err) {
      setBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Unable to update customer status.",
      });
    } finally {
      setSavingStatus(false);
    }
  };

  const columns: TableColumn<AdminCustomerRow>[] = [
    {
      key: "customer",
      header: "Customer",
      render: (c) => (
        <div className="min-w-[180px]">
          <p className="font-semibold text-slate-900">
            {c.displayName}
            {c.username && (
              <span className="ml-1.5 font-mono text-[11px] font-medium text-slate-500">
                @{c.username}
              </span>
            )}
          </p>
          <p className="text-[11px] text-slate-500">{c.email}</p>
        </div>
      ),
    },
    {
      key: "country",
      header: "Country / Phone",
      render: (c) => (
        <div className="text-xs text-slate-600">
          <p>{c.country || "Not provided"}</p>
          <p className="font-mono text-[11px] text-slate-500">{c.phone || "—"}</p>
        </div>
      ),
    },
    {
      key: "balance",
      header: "Available Balance",
      align: "right",
      render: (c) => (
        <span className="font-mono tabular-nums font-semibold text-slate-900">
          {formatUsd(c.walletBalance)}
        </span>
      ),
    },
    {
      key: "deposits",
      header: "Total Deposits",
      align: "right",
      render: (c) => (
        <span className="font-mono tabular-nums text-slate-700">{formatUsd(c.totalDeposit)}</span>
      ),
    },
    {
      key: "activity",
      header: "Positions / Txs",
      align: "right",
      render: (c) => (
        <span className="font-mono text-xs text-slate-600">
          {c.investmentsCount} / {c.transactionsCount}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (c) => <StatusText status={c.accountStatus} />,
    },
    {
      key: "actions",
      header: "Inspect",
      align: "right",
      render: (c) => (
        <Button size="sm" variant="outline" onClick={() => openInspector(c)}>
          <Eye className="w-3.5 h-3.5" />
          <span>Details</span>
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Customer Management"
      subtitle="Search verified investor accounts, inspect balances and portfolios, and update account compliance statuses."
      actions={
        <Button
          variant="outline"
          size="sm"
          loading={refreshing}
          onClick={() => void loadCustomers(true)}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
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
          title={`Customer Directory (${filtered.length})`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, country..."
                  aria-label="Search customers"
                  className="rounded-md border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#294158] focus:outline-none"
                />
              </div>
              <SelectInput
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter customer status"
                className="w-auto py-1.5 text-xs"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Review">Review</option>
                <option value="Suspended">Suspended</option>
              </SelectInput>
            </div>
          }
        />
        <CardBody>
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(c) => c.uid}
            loading={loading}
            error={error}
            onRetry={() => void loadCustomers(false)}
            emptyTitle="No Matching Customers"
            emptyDescription="No registered accounts match your current search or filter."
          />
        </CardBody>
      </Card>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.displayName || "Customer Details"}
        description={
          selected
            ? `${selected.username ? `@${selected.username} · ` : ""}${selected.email} · UID ${selected.uid}`
            : undefined
        }
        maxWidthClass="max-w-2xl"
        footer={
          <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
            Close
          </Button>
        }
      >
        {selected && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 rounded-md p-3">
              <div>
                <p className="text-slate-500">Wallet Balance</p>
                <p className="font-mono font-bold text-slate-900 mt-0.5">
                  {formatUsd(selected.walletBalance)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Total Deposited</p>
                <p className="font-mono font-bold text-slate-900 mt-0.5">
                  {formatUsd(selected.totalDeposit)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Total Profit</p>
                <p className="font-mono font-bold text-slate-900 mt-0.5">
                  {formatUsd(selected.totalProfit)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Joined</p>
                <p className="font-mono text-slate-900 mt-0.5">
                  {formatIsoDate(selected.createdAt)}
                </p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-md p-4 space-y-3">
              <p className="font-bold text-slate-900">Account Compliance Status</p>
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[180px]">
                  <FormField id="cust-status" label="Account Status">
                    <SelectInput
                      id="cust-status"
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                    >
                      <option value="Active">Active</option>
                      <option value="Review">Review</option>
                      <option value="Suspended">Suspended</option>
                    </SelectInput>
                  </FormField>
                </div>
                <Button
                  size="md"
                  loading={savingStatus}
                  disabled={editStatus === selected.accountStatus}
                  onClick={() => void handleStatusUpdate()}
                >
                  Save Status
                </Button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-md p-3 space-y-2">
                <p className="font-bold text-slate-900">
                  Investments ({selected.investments.length})
                </p>
                {selected.investments.length === 0 ? (
                  <p className="text-slate-500">No investments recorded.</p>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {selected.investments.map((inv, idx) => (
                      <div key={String(inv.id || idx)} className="py-1.5 flex justify-between gap-2">
                        <span className="text-slate-800 font-medium truncate">
                          {String(inv.planName || "Mandate")}
                        </span>
                        <span className="font-mono text-slate-900 shrink-0">
                          {formatUsd(Number(inv.amount ?? 0))} ({String(inv.status ?? "Active")})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border border-slate-200 rounded-md p-3 space-y-2">
                <p className="font-bold text-slate-900">
                  Transactions ({selected.transactions.length})
                </p>
                {selected.transactions.length === 0 ? (
                  <p className="text-slate-500">No transactions recorded.</p>
                ) : (
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {selected.transactions.slice(0, 15).map((tx, idx) => (
                      <div key={String(tx.id || idx)} className="py-1.5 flex justify-between gap-2">
                        <span className="text-slate-700 truncate">
                          {String(tx.type)} · {String(tx.reference || "")}
                        </span>
                        <span className="font-mono text-slate-900 shrink-0">
                          {formatUsd(Number(tx.amount ?? 0))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
