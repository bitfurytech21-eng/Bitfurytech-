import { useCallback, useEffect, useState } from "react";
import { Bell, FileText, FolderOpen, LifeBuoy, RefreshCw, Share2 } from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  FormField,
  NotificationBanner,
  StatusText,
  TableColumn,
  TextAreaInput,
  TextInput,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import { apiRequest, formatIsoDate } from "../../services/dashboardApi";
import { formatUsd } from "../../trading/tradingPage";

export function AdminTransactionsPage() {
  const { firebaseUser, idToken } = useAuth();
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      const token = idToken || (await firebaseUser.getIdToken());
      const res = await apiRequest<{ transactions: Array<Record<string, unknown>> }>(
        "/api/admin/transactions",
        token
      );
      setRows(res.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load transactions.");
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, idToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: TableColumn<Record<string, unknown>>[] = [
    {
      key: "ref",
      header: "Date / Reference",
      render: (t) => (
        <div>
          <p className="font-mono text-xs font-semibold text-slate-900">
            {String(t.reference || t.id)}
          </p>
          <p className="font-mono text-[11px] text-slate-500">
            {formatIsoDate(typeof t.createdAt === "string" ? t.createdAt : null)}
          </p>
        </div>
      ),
    },
    {
      key: "user",
      header: "Customer",
      render: (t) => <span className="text-slate-800">{String(t.userEmail || t.userId)}</span>,
    },
    {
      key: "type",
      header: "Type / Method",
      render: (t) => (
        <div>
          <p className="font-semibold text-slate-900">{String(t.type)}</p>
          <p className="text-[11px] text-slate-500">{String(t.method || "")}</p>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (t) => (
        <span className="font-mono tabular-nums font-semibold text-slate-900">
          {formatUsd(Number(t.amount ?? 0))}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (t) => <StatusText status={String(t.status || "Pending")} />,
    },
  ];

  return (
    <AdminLayout
      title="Platform Transactions"
      subtitle="Full administrative ledger across all verified customer deposits, withdrawals, investments, and payouts."
      actions={
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      }
    >
      <Card>
        <CardHeader
          title={`All Transactions (${rows.length})`}
          action={<FileText className="w-4 h-4 text-slate-400" />}
        />
        <CardBody>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(t) => String(t.id)}
            loading={loading}
            error={error}
            onRetry={() => void load()}
            emptyTitle="No Platform Transactions"
            emptyDescription="Transactions appear here automatically as customer activity occurs."
          />
        </CardBody>
      </Card>
    </AdminLayout>
  );
}

export function AdminReferralsPage() {
  const { firebaseUser, idToken } = useAuth();
  const [partners, setPartners] = useState<
    Array<{ uid: string; email: string; displayName: string; code: string; referralBonus: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      const token = idToken || (await firebaseUser.getIdToken());
      const res = await apiRequest<{
        partnerSummary: Array<{
          uid: string;
          email: string;
          displayName: string;
          code: string;
          referralBonus: number;
        }>;
      }>("/api/admin/referrals", token);
      setPartners(res.partnerSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load referral data.");
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, idToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: TableColumn<(typeof partners)[number]>[] = [
    {
      key: "partner",
      header: "Partner",
      render: (p) => (
        <div>
          <p className="font-semibold text-slate-900">{p.displayName || "Investor"}</p>
          <p className="text-[11px] text-slate-500">{p.email}</p>
        </div>
      ),
    },
    {
      key: "code",
      header: "Referral Code",
      render: (p) => <span className="font-mono font-semibold text-[#294158]">{p.code}</span>,
    },
    {
      key: "bonus",
      header: "Referral Earnings",
      align: "right",
      render: (p) => (
        <span className="font-mono tabular-nums font-semibold text-slate-900">
          {formatUsd(p.referralBonus)}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Referral Administration"
      subtitle="Oversight of customer referral partner codes and credited referral earnings."
    >
      <Card>
        <CardHeader
          title={`Partner Codes (${partners.length})`}
          action={<Share2 className="w-4 h-4 text-slate-400" />}
        />
        <CardBody>
          <DataTable
            columns={columns}
            rows={partners}
            rowKey={(p) => p.uid}
            loading={loading}
            error={error}
            onRetry={() => void load()}
            emptyTitle="No Partner Records"
            emptyDescription="Customer referral codes appear automatically once accounts register."
          />
        </CardBody>
      </Card>
    </AdminLayout>
  );
}

export function AdminDocumentsPage() {
  const { firebaseUser, idToken } = useAuth();
  const [docs, setDocs] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      const token = idToken || (await firebaseUser.getIdToken());
      const res = await apiRequest<{ documents: Array<Record<string, unknown>> }>(
        "/api/admin/documents",
        token
      );
      setDocs(res.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load documents.");
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, idToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: TableColumn<Record<string, unknown>>[] = [
    {
      key: "title",
      header: "Document",
      render: (d) => (
        <div>
          <p className="font-semibold text-slate-900">{String(d.title || "Record")}</p>
          <p className="font-mono text-[11px] text-slate-500">{String(d.reference || d.id)}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Category",
      render: (d) => <span className="text-xs text-slate-700">{String(d.docType || "Document")}</span>,
    },
    {
      key: "user",
      header: "Customer UID",
      render: (d) => <span className="font-mono text-xs text-slate-500">{String(d.userId || "")}</span>,
    },
    {
      key: "date",
      header: "Issued",
      align: "right",
      render: (d) => (
        <span className="font-mono text-xs text-slate-500">
          {formatIsoDate(typeof d.createdAt === "string" ? d.createdAt : null)}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Documents Vault"
      subtitle="Stored custody agreements, investment confirmations, and compliance records."
    >
      <Card>
        <CardHeader
          title={`Persisted Vault Documents (${docs.length})`}
          action={<FolderOpen className="w-4 h-4 text-slate-400" />}
        />
        <CardBody>
          <DataTable
            columns={columns}
            rows={docs}
            rowKey={(d) => String(d.id)}
            loading={loading}
            error={error}
            onRetry={() => void load()}
            emptyTitle="No Stored Vault Documents Yet"
            emptyDescription="Documents issued during unit purchases and compliance uploads appear here."
          />
        </CardBody>
      </Card>
    </AdminLayout>
  );
}

export function AdminSupportPage() {
  const { firebaseUser, idToken } = useAuth();
  const [inquiries, setInquiries] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      const token = idToken || (await firebaseUser.getIdToken());
      const res = await apiRequest<{ inquiries: Array<Record<string, unknown>> }>(
        "/api/admin/support",
        token
      );
      setInquiries(res.inquiries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load support inquiries.");
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, idToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: TableColumn<Record<string, unknown>>[] = [
    {
      key: "sender",
      header: "Sender",
      render: (i) => (
        <div>
          <p className="font-semibold text-slate-900">{String(i.name || "Visitor")}</p>
          <p className="text-[11px] text-slate-500">{String(i.email || "")}</p>
        </div>
      ),
    },
    {
      key: "subject",
      header: "Subject & Message",
      render: (i) => (
        <div className="max-w-md">
          <p className="font-semibold text-slate-800">{String(i.subject || "Inquiry")}</p>
          <p className="text-xs text-slate-600 line-clamp-2">{String(i.message || "")}</p>
        </div>
      ),
    },
    {
      key: "date",
      header: "Submitted",
      align: "right",
      render: (i) => (
        <span className="font-mono text-xs text-slate-500">
          {formatIsoDate(typeof i.createdAt === "string" ? i.createdAt : null)}
        </span>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Support Inquiries"
      subtitle="Customer and corporate website support requests persisted from the Contact page."
    >
      <Card>
        <CardHeader
          title={`Support Desk Queue (${inquiries.length})`}
          action={<LifeBuoy className="w-4 h-4 text-slate-400" />}
        />
        <CardBody>
          <DataTable
            columns={columns}
            rows={inquiries}
            rowKey={(i) => String(i.id)}
            loading={loading}
            error={error}
            onRetry={() => void load()}
            emptyTitle="No Support Inquiries"
            emptyDescription="Submitted contact messages appear here for team follow-up."
          />
        </CardBody>
      </Card>
    </AdminLayout>
  );
}

export function AdminSettingsPage() {
  const { firebaseUser, idToken } = useAuth();
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const loadLogs = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const token = idToken || (await firebaseUser.getIdToken());
      const res = await apiRequest<{ logs: Array<Record<string, unknown>> }>(
        "/api/admin/audit-logs",
        token
      );
      setLogs(res.logs);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, idToken]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setSending(true);
    setBanner(null);
    try {
      const token = idToken || (await firebaseUser.getIdToken());
      await apiRequest("/api/admin/broadcasts", token, {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      setTitle("");
      setBody("");
      setBanner({
        tone: "success",
        text: "Published platform notification broadcast to all authenticated customers.",
      });
      await loadLogs();
    } catch (err) {
      setBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Unable to publish broadcast.",
      });
    } finally {
      setSending(false);
    }
  };

  const logColumns: TableColumn<Record<string, unknown>>[] = [
    {
      key: "date",
      header: "Timestamp",
      render: (l) => (
        <span className="font-mono text-xs text-slate-500">
          {formatIsoDate(typeof l.createdAt === "string" ? l.createdAt : null)}
        </span>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (l) => (
        <div>
          <p className="font-mono text-xs font-semibold text-[#294158]">{String(l.action)}</p>
          <p className="text-[11px] text-slate-500">{String(l.actorEmail || "")}</p>
        </div>
      ),
    },
    {
      key: "summary",
      header: "Details",
      render: (l) => <p className="text-xs text-slate-700">{String(l.summary || "")}</p>,
    },
  ];

  return (
    <AdminLayout
      title="Admin Settings & Audit Log"
      subtitle="Publish platform-wide announcements and inspect administrative audit records."
    >
      {banner && (
        <NotificationBanner
          tone={banner.tone}
          message={banner.text}
          onDismiss={() => setBanner(null)}
        />
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-5">
          <CardHeader
            title="Publish Customer Broadcast"
            action={<Bell className="w-4 h-4 text-slate-400" />}
          />
          <CardBody>
            <form onSubmit={handleBroadcast} className="space-y-4">
              <FormField id="bc-title" label="Announcement Title">
                <TextInput
                  id="bc-title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Scheduled Settlement Window Update"
                />
              </FormField>
              <FormField id="bc-body" label="Message Body">
                <TextAreaInput
                  id="bc-body"
                  rows={4}
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Enter verified operational update..."
                />
              </FormField>
              <Button type="submit" fullWidth loading={sending}>
                Publish Broadcast
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader title={`Administrative Audit Log (${logs.length})`} />
          <CardBody>
            <DataTable
              columns={logColumns}
              rows={logs}
              rowKey={(l) => String(l.id)}
              loading={loading}
              emptyTitle="No Audit Records Yet"
              emptyDescription="Administrative actions including approvals, catalog edits, and status transitions appear here."
            />
          </CardBody>
        </Card>
      </div>
    </AdminLayout>
  );
}
