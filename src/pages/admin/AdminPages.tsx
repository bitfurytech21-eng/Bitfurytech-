import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownCircle,
  Bell,
  Building2,
  Check,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react";
import MetronicShell from "../../components/MetronicShell";
import {
  Button,
  buttonClasses,
  Card,
  CardBody,
  CardHeader,
  DashboardSymbol,
  DataTable,
  FormField,
  Modal,
  NotificationBanner,
  SelectInput,
  StatusText,
  TableColumn,
  TextAreaInput,
  TextInput,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import {
  DashboardTransactionDTO,
  formatTimestamp,
  PropertyOffering,
  sessionApiRequest,
  UserAccount,
} from "../../services/dashboardApi";
import { formatUsd } from "../../trading/tradingPage";

type TransactionRecord = DashboardTransactionDTO;

function AdminUnauthorizedNotice() {
  return (
    <MetronicShell
      title="Restricted Operations"
      subtitle="Administrative authorization is required to inspect or modify settlement records."
      section="admin"
    >
      <Card padding="lg" className="max-w-xl space-y-4 border-rose-200">
        <div className="flex items-center gap-2.5 text-rose-700">
          <Shield className="w-5 h-5" />
          <h2 className="text-base font-bold">Administrator Access Denied</h2>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          This workspace is restricted to verified BitfuryTech settlement administrators. Return to
          your investor portal to manage your personal wallet and mandates.
        </p>
        <Link to="/dashboard" className={buttonClasses({ variant: "primary", size: "md" })}>
          Return to Investor Dashboard
        </Link>
      </Card>
    </MetronicShell>
  );
}

export function AdminOverviewPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [properties, setProperties] = useState<PropertyOffering[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    Promise.all([
      sessionApiRequest<{ customers: UserAccount[] }>("/api/admin/customers"),
      sessionApiRequest<{ transactions: TransactionRecord[] }>("/api/admin/transactions"),
      sessionApiRequest<{ properties: PropertyOffering[] }>("/api/admin/properties"),
    ])
      .then(([custRes, txRes, propRes]) => {
        if (!active) return;
        setUsers(custRes.customers ?? []);
        setTransactions(txRes.transactions ?? []);
        setProperties(propRes.properties ?? []);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [isAdmin]);

  if (!isAdmin) return <AdminUnauthorizedNotice />;

  const pendingCount = transactions.filter((t) => t.status === "Pending").length;
  const totalWalletLiquidity = users.reduce((sum, u) => sum + (u.walletBalance || 0), 0);

  return (
    <MetronicShell
      title="Admin Overview"
      subtitle="BitfuryTech institutional treasury oversight, settlement verification, and asset administration."
      section="admin"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card padding="md" className="flex items-center gap-4">
          <DashboardSymbol icon={Users} tone="navy" size="lg" />
          <div>
            <p className="text-xs font-medium text-slate-500">Registered Investors</p>
            <p className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
              {users.length}
            </p>
          </div>
        </Card>

        <Card padding="md" className="flex items-center gap-4">
          <DashboardSymbol icon={ArrowDownCircle} tone="amber" size="lg" />
          <div>
            <p className="text-xs font-medium text-slate-500">Pending Settlements</p>
            <p className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
              {pendingCount}
            </p>
          </div>
        </Card>

        <Card padding="md" className="flex items-center gap-4">
          <DashboardSymbol icon={Shield} tone="green" size="lg" />
          <div>
            <p className="text-xs font-medium text-slate-500">Aggregate Wallet Balances</p>
            <p className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
              {formatUsd(totalWalletLiquidity)}
            </p>
          </div>
        </Card>

        <Card padding="md" className="flex items-center gap-4">
          <DashboardSymbol icon={Building2} tone="navy" size="lg" />
          <div>
            <p className="text-xs font-medium text-slate-500">Listed Properties</p>
            <p className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
              {properties.length}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          to="/admin/deposits"
          className="bg-white border border-slate-200 hover:border-[#294158] rounded-md p-5 space-y-1 transition-colors"
        >
          <p className="text-sm font-bold text-slate-900">Settlement Queue</p>
          <p className="text-xs text-slate-500">Approve or decline pending deposits and payouts.</p>
        </Link>
        <Link
          to="/admin/properties"
          className="bg-white border border-slate-200 hover:border-[#294158] rounded-md p-5 space-y-1 transition-colors"
        >
          <p className="text-sm font-bold text-slate-900">Manage Properties</p>
          <p className="text-xs text-slate-500">Publish or edit commercial real estate listings.</p>
        </Link>
        <Link
          to="/admin/users"
          className="bg-white border border-slate-200 hover:border-[#294158] rounded-md p-5 space-y-1 transition-colors"
        >
          <p className="text-sm font-bold text-slate-900">Investor Accounts</p>
          <p className="text-xs text-slate-500">Inspect verified account profiles and balances.</p>
        </Link>
        <Link
          to="/admin/notifications"
          className="bg-white border border-slate-200 hover:border-[#294158] rounded-md p-5 space-y-1 transition-colors"
        >
          <p className="text-sm font-bold text-slate-900">Platform Broadcasts</p>
          <p className="text-xs text-slate-500">Send official announcements to all client portals.</p>
        </Link>
      </div>
    </MetronicShell>
  );
}

export function AdminSettlementQueuePage() {
  const { isAdmin } = useAuth();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const res = await sessionApiRequest<{ transactions: TransactionRecord[] }>(
        "/api/admin/transactions"
      );
      setTransactions(res.transactions ?? []);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  if (!isAdmin) return <AdminUnauthorizedNotice />;

  const handleResolve = async (tx: TransactionRecord, decision: "Completed" | "Rejected") => {
    setBusyId(tx.id);
    setFeedback(null);
    try {
      const endpoint =
        tx.type === "Deposit"
          ? `/api/admin/deposits/${encodeURIComponent(tx.id)}/resolve`
          : `/api/admin/withdrawals/${encodeURIComponent(tx.id)}/resolve`;
      await sessionApiRequest(endpoint, {
        method: "POST",
        body: JSON.stringify({
          decision,
          evidenceNote: "Reviewed via administrator settlement queue",
          note: "Reviewed via administrator settlement queue",
        }),
      });
      setFeedback(`${tx.type} (${tx.reference}) marked as ${decision}.`);
      await loadTransactions();
    } finally {
      setBusyId(null);
    }
  };

  const columns: TableColumn<TransactionRecord>[] = [
    {
      key: "date",
      header: "Date",
      render: (tx) => <span className="text-slate-600">{formatTimestamp(tx.createdAt)}</span>,
    },
    {
      key: "email",
      header: "Investor",
      render: (tx) => <span className="text-slate-800">{tx.userEmail}</span>,
    },
    {
      key: "type",
      header: "Type",
      render: (tx) => <span className="font-semibold text-slate-900">{tx.type}</span>,
    },
    {
      key: "method",
      header: "Method",
      render: (tx) => <span className="text-slate-600">{tx.method}</span>,
    },
    {
      key: "reference",
      header: "Reference",
      render: (tx) => <span className="font-mono text-slate-500">{tx.reference}</span>,
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
      key: "action",
      header: "Status / Action",
      align: "right",
      render: (tx) =>
        tx.status === "Pending" ? (
          <div className="inline-flex items-center gap-1.5">
            <Button
              size="sm"
              variant="primary"
              loading={busyId === tx.id}
              onClick={() => handleResolve(tx, "Completed")}
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Approve</span>
            </Button>
            <Button
              size="sm"
              variant="danger"
              loading={busyId === tx.id}
              onClick={() => handleResolve(tx, "Rejected")}
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject</span>
            </Button>
          </div>
        ) : (
          <StatusText status={tx.status} />
        ),
    },
  ];

  return (
    <MetronicShell
      title="Settlement Queue"
      subtitle="Verify investor deposits and approve or decline withdrawal disbursements."
      section="admin"
    >
      {feedback && (
        <NotificationBanner
          tone="success"
          message={feedback}
          onDismiss={() => setFeedback(null)}
        />
      )}

      <Card>
        <CardHeader title="Platform Settlement Ledger" />
        <CardBody>
          <DataTable
            columns={columns}
            rows={transactions}
            rowKey={(tx) => tx.id}
            loading={loading}
            emptyTitle="No Settlement Requests"
            emptyDescription="Submitted investor deposits and withdrawals will appear here for review."
          />
        </CardBody>
      </Card>
    </MetronicShell>
  );
}

const LOCAL_IMAGES = [
  { label: "Commercial Real Estate", value: "/images/commercial-property.jpg" },
  { label: "Institutional Plaza", value: "/images/hero-private-capital.jpg" },
  { label: "Financial Operations", value: "/images/digital-assets.jpg" },
];

export function AdminPropertiesPage() {
  const { isAdmin } = useAuth();
  const [properties, setProperties] = useState<PropertyOffering[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [assetType, setAssetType] = useState("Commercial Logistics");
  const [targetYieldPct, setTargetYieldPct] = useState("8.5");
  const [minEntry, setMinEntry] = useState("5000");
  const [valuation, setValuation] = useState("2500000");
  const [occupancyPct, setOccupancyPct] = useState("96");
  const [status, setStatus] = useState<"Open" | "Fully Subscribed">("Open");
  const [image, setImage] = useState(LOCAL_IMAGES[0].value);
  const [summary, setSummary] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PropertyOffering | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadProperties = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await sessionApiRequest<{ properties: PropertyOffering[] }>(
        "/api/admin/properties"
      );
      setProperties(res.properties ?? []);
    } catch {
      // ignore transient error
    }
  }, [isAdmin]);

  useEffect(() => {
    void loadProperties();
  }, [loadProperties]);

  if (!isAdmin) return <AdminUnauthorizedNotice />;

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setLocation("");
    setAssetType("Commercial Logistics");
    setTargetYieldPct("8.5");
    setMinEntry("5000");
    setValuation("2500000");
    setOccupancyPct("96");
    setStatus("Open");
    setImage(LOCAL_IMAGES[0].value);
    setSummary("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        location: location.trim(),
        assetType: assetType.trim(),
        targetYieldPct: Number(targetYieldPct) || 0,
        minEntry: Number(minEntry) || 1000,
        valuation: Number(valuation) || 100000,
        occupancyPct: Number(occupancyPct) || 0,
        status,
        image,
        summary: summary.trim(),
      };
      if (editingId) {
        await sessionApiRequest(`/api/admin/properties/${encodeURIComponent(editingId)}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await sessionApiRequest("/api/admin/properties", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      resetForm();
      await loadProperties();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await sessionApiRequest(`/api/admin/properties/${encodeURIComponent(deleteTarget.id)}`, {
        method: "DELETE",
      });
      setDeleteTarget(null);
      await loadProperties();
    } finally {
      setDeleting(false);
    }
  };

  const startEdit = (p: PropertyOffering) => {
    setEditingId(p.id);
    setTitle(p.title);
    setLocation(p.location);
    setAssetType(p.assetType);
    setTargetYieldPct(String(p.targetYieldPct));
    setMinEntry(String(p.minEntry));
    setValuation(String(p.valuation));
    setOccupancyPct(String(p.occupancyPct));
    setStatus(p.status);
    setImage(p.image || LOCAL_IMAGES[0].value);
    setSummary(p.summary);
  };

  return (
    <MetronicShell
      title="Manage Properties"
      subtitle="Create, update, or retire real estate offerings shown on the public BitfuryTech catalog."
      section="admin"
    >
      <div className="grid lg:grid-cols-12 gap-6">
        <Card padding="lg" className="lg:col-span-5 self-start">
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                {editingId ? "Edit Property Offering" : "Publish New Property"}
              </h2>
              {editingId && (
                <Button size="sm" variant="ghost" onClick={resetForm}>
                  Cancel Edit
                </Button>
              )}
            </div>

            <FormField id="prop-title" label="Property Title">
              <TextInput
                id="prop-title"
                required
                maxLength={140}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Property Title"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField id="prop-loc" label="Location">
                <TextInput
                  id="prop-loc"
                  required
                  maxLength={140}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, Country"
                />
              </FormField>
              <FormField id="prop-type" label="Asset Class">
                <TextInput
                  id="prop-type"
                  required
                  maxLength={80}
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value)}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField id="prop-min" label="Min Entry (USD)">
                <TextInput
                  id="prop-min"
                  type="number"
                  numeric
                  min="1"
                  required
                  value={minEntry}
                  onChange={(e) => setMinEntry(e.target.value)}
                />
              </FormField>
              <FormField id="prop-val" label="Valuation (USD)">
                <TextInput
                  id="prop-val"
                  type="number"
                  numeric
                  min="1"
                  required
                  value={valuation}
                  onChange={(e) => setValuation(e.target.value)}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField id="prop-yield" label="Yield %">
                <TextInput
                  id="prop-yield"
                  type="number"
                  numeric
                  min="0"
                  step="0.1"
                  required
                  value={targetYieldPct}
                  onChange={(e) => setTargetYieldPct(e.target.value)}
                />
              </FormField>
              <FormField id="prop-occ" label="Occupancy %">
                <TextInput
                  id="prop-occ"
                  type="number"
                  numeric
                  min="0"
                  max="100"
                  required
                  value={occupancyPct}
                  onChange={(e) => setOccupancyPct(e.target.value)}
                />
              </FormField>
              <FormField id="prop-status" label="Status">
                <SelectInput
                  id="prop-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "Open" | "Fully Subscribed")}
                >
                  <option value="Open">Open</option>
                  <option value="Fully Subscribed">Fully Subscribed</option>
                </SelectInput>
              </FormField>
            </div>

            <FormField id="prop-img" label="Local Showcase Asset">
              <SelectInput id="prop-img" value={image} onChange={(e) => setImage(e.target.value)}>
                {LOCAL_IMAGES.map((img) => (
                  <option key={img.value} value={img.value}>
                    {img.label}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField id="prop-summary" label="Overview">
              <TextAreaInput
                id="prop-summary"
                rows={3}
                required
                maxLength={600}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Investment thesis and tenancy overview..."
              />
            </FormField>

            <Button type="submit" fullWidth loading={saving}>
              {editingId ? "Update Property" : "Publish Property"}
            </Button>
          </form>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader title="Published Property Offerings" />
          <CardBody>
            {properties.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                No commercial properties published yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {properties.map((p) => (
                  <div key={p.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{p.title}</p>
                      <p className="text-xs text-slate-500">
                        {p.location} · Min {formatUsd(p.minEntry)} · {p.status}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => startEdit(p)}>
                        Edit
                      </Button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                        aria-label={`Delete ${p.title}`}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Retire Property Offering"
        description="This removes the listing immediately from the BitfuryTech property catalog."
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={deleting} onClick={confirmDelete}>
              Remove Listing
            </Button>
          </>
        }
      >
        <p className="text-xs text-slate-600">
          Are you sure you want to remove{" "}
          <strong className="text-slate-900">{deleteTarget?.title}</strong>?
        </p>
      </Modal>
    </MetronicShell>
  );
}

export function AdminUsersPage() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    let active = true;
    sessionApiRequest<{ customers: UserAccount[] }>("/api/admin/customers")
      .then((res) => {
        if (active) setUsers(res.customers ?? []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  if (!isAdmin) return <AdminUnauthorizedNotice />;

  const columns: TableColumn<UserAccount>[] = [
    {
      key: "name",
      header: "Investor",
      render: (u) => <span className="font-semibold text-slate-900">{u.displayName}</span>,
    },
    {
      key: "email",
      header: "Email",
      render: (u) => <span className="text-slate-600">{u.email}</span>,
    },
    {
      key: "role",
      header: "Role",
      render: (u) => <span className="text-slate-700 capitalize">{u.role}</span>,
    },
    {
      key: "wallet",
      header: "Wallet Balance",
      align: "right",
      render: (u) => (
        <span className="font-mono tabular-nums font-semibold text-slate-900">
          {formatUsd(u.walletBalance)}
        </span>
      ),
    },
    {
      key: "deposit",
      header: "Total Deposit",
      align: "right",
      render: (u) => (
        <span className="font-mono tabular-nums text-slate-700">
          {formatUsd(u.totalDeposit)}
        </span>
      ),
    },
    {
      key: "joined",
      header: "Joined",
      align: "right",
      render: (u) => <span className="text-slate-500">{formatTimestamp(u.createdAt)}</span>,
    },
  ];

  return (
    <MetronicShell
      title="Investor Accounts"
      subtitle="Registered BitfuryTech client accounts and live custody wallet balances."
      section="admin"
    >
      <Card>
        <CardHeader title="Client Directory" />
        <CardBody>
          <DataTable
            columns={columns}
            rows={users}
            rowKey={(u) => u.uid}
            loading={loading}
            emptyTitle="No Registered Investors"
            emptyDescription="Verified investor accounts appear here upon onboarding."
          />
        </CardBody>
      </Card>
    </MetronicShell>
  );
}

export function AdminNotificationsPage() {
  const { isAdmin } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isAdmin) return <AdminUnauthorizedNotice />;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    setSent(false);
    try {
      await sessionApiRequest("/api/admin/broadcasts", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      setSent(true);
      setTitle("");
      setBody("");
    } finally {
      setSending(false);
    }
  };

  return (
    <MetronicShell
      title="Platform Broadcasts"
      subtitle="Publish official announcements to every authenticated investor notification feed."
      section="admin"
    >
      <Card padding="lg" className="max-w-2xl space-y-5">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-200">
          <Bell className="w-4 h-4 text-[#294158]" />
          <h2 className="text-sm font-bold text-slate-900">Compose Global Broadcast</h2>
        </div>

        {sent && (
          <NotificationBanner
            tone="success"
            message="Broadcast published to all investor portals."
            onDismiss={() => setSent(false)}
          />
        )}

        <form onSubmit={handleSend} className="space-y-4">
          <FormField id="bc-title" label="Announcement Title">
            <TextInput
              id="bc-title"
              required
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scheduled Custody Settlement Window"
            />
          </FormField>

          <FormField id="bc-body" label="Message Content">
            <TextAreaInput
              id="bc-body"
              rows={4}
              required
              maxLength={600}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the platform announcement..."
            />
          </FormField>

          <Button type="submit" loading={sending}>
            Send Broadcast
          </Button>
        </form>
      </Card>
    </MetronicShell>
  );
}
