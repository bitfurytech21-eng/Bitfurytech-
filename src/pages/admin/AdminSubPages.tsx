import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CheckCircle2,
  FileText,
  FolderOpen,
  LifeBuoy,
  MessageSquare,
  RefreshCw,
  Send,
  Share2,
  ShieldCheck,
} from "lucide-react";
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
import type {
  SupportMessageDTO,
  SupportThreadDTO,
} from "../../components/LiveSupportWidget";
import { useAuth } from "../../hooks/useAuth";
import { sessionApiRequest, formatIsoDate } from "../../services/dashboardApi";
import { formatUsd } from "../../trading/tradingPage";

export function AdminTransactionsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await sessionApiRequest<{ transactions: Array<Record<string, unknown>> }>(
        "/api/admin/transactions"
      );
      setRows(res.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load transactions.");
    } finally {
      setLoading(false);
    }
  }, [user]);

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
  const { user } = useAuth();
  const [partners, setPartners] = useState<
    Array<{ uid: string; email: string; displayName: string; code: string; referralBonus: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await sessionApiRequest<{
        partnerSummary: Array<{
          uid: string;
          email: string;
          displayName: string;
          code: string;
          referralBonus: number;
        }>;
      }>("/api/admin/referrals");
      setPartners(res.partnerSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load referral data.");
    } finally {
      setLoading(false);
    }
  }, [user]);

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
  const { user } = useAuth();
  const [docs, setDocs] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await sessionApiRequest<{ documents: Array<Record<string, unknown>> }>(
        "/api/admin/documents"
      );
      setDocs(res.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load documents.");
    } finally {
      setLoading(false);
    }
  }, [user]);

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

interface AdminTwilioStatus {
  configured: boolean;
  webhookValidationEnabled: boolean;
  smsAlertsEnabled: boolean;
  conversationsServiceConfigured: boolean;
  missingKeys: string[];
  webhookPath: string;
}

export function AdminSupportPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"desk" | "inquiries">("desk");

  const [threads, setThreads] = useState<SupportThreadDTO[]>([]);
  const [twilioStatus, setTwilioStatus] = useState<AdminTwilioStatus | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedMessages, setSelectedMessages] = useState<SupportMessageDTO[]>([]);
  const [threadFilter, setThreadFilter] = useState<"All" | "Open" | "Resolved">("All");

  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [clientTypingThreadId, setClientTypingThreadId] = useState<string | null>(null);

  const [inquiries, setInquiries] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const selectedThreadIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const lastTypingEmitRef = useRef<number>(0);

  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedMessages.length, clientTypingThreadId]);

  const loadAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [deskRes, inquiriesRes] = await Promise.all([
        sessionApiRequest<{
          threads: SupportThreadDTO[];
          twilioStatus: AdminTwilioStatus;
        }>("/api/admin/support-desk/threads"),
        sessionApiRequest<{ inquiries: Array<Record<string, unknown>> }>("/api/admin/support"),
      ]);

      setThreads(deskRes.threads || []);
      setTwilioStatus(deskRes.twilioStatus || null);
      setInquiries(inquiriesRes.inquiries || []);

      setSelectedThreadId((prev) => {
        if (prev && deskRes.threads.some((t) => t.id === prev)) return prev;
        return deskRes.threads[0]?.id ?? null;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load support desk data.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const loadThreadMessages = useCallback(
    async (threadId: string) => {
      if (!user) return;
      setLoadingMessages(true);
      try {
        const res = await sessionApiRequest<{
          thread: SupportThreadDTO;
          messages: SupportMessageDTO[];
        }>(`/api/admin/support-desk/threads/${encodeURIComponent(threadId)}`);
        if (selectedThreadIdRef.current === threadId) {
          setSelectedMessages(res.messages || []);
          setThreads((prev) =>
            prev.map((t) => (t.id === res.thread.id ? res.thread : t))
          );
        }
      } catch (err) {
        setBanner({
          tone: "error",
          text: err instanceof Error ? err.message : "Unable to load thread transcript.",
        });
      } finally {
        setLoadingMessages(false);
      }
    },
    [user]
  );

  useEffect(() => {
    if (selectedThreadId) {
      void loadThreadMessages(selectedThreadId);
    } else {
      setSelectedMessages([]);
    }
  }, [selectedThreadId, loadThreadMessages]);

  // Real-time WebSocket Admin Inbox Stream
  useEffect(() => {
    if (!user) {
      setWsConnected(false);
      return;
    }

    let closedByCleanup = false;
    let reconnectTimer: number | null = null;
    let pingTimer: number | null = null;
    let attempts = 0;

    const connectAdminSocket = () => {
      if (closedByCleanup) return;
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${proto}//${window.location.host}/ws/support`);
      wsRef.current = ws;

      ws.onopen = () => {
        attempts = 0;
        ws.send(
          JSON.stringify({
            type: "auth",
            mode: "admin",
          })
        );
        pingTimer = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25_000);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as {
            type?: string;
            message?: SupportMessageDTO;
            thread?: SupportThreadDTO;
            threadId?: string;
            senderRole?: string;
            isTyping?: boolean;
          };

          if (payload.type === "auth:ok") {
            setWsConnected(true);
            return;
          }

          if (payload.type === "thread:updated" && payload.thread) {
            const incomingThread = payload.thread;
            setThreads((prev) => {
              const filtered = prev.filter((t) => t.id !== incomingThread.id);
              return [incomingThread, ...filtered].sort((a, b) =>
                b.lastMessageAt.localeCompare(a.lastMessageAt)
              );
            });
            setSelectedThreadId((prev) => prev || incomingThread.id);
            return;
          }

          if (payload.type === "message:created" && payload.message && payload.thread) {
            const incomingMsg = payload.message;
            const incomingThread = payload.thread;

            setThreads((prev) => {
              const filtered = prev.filter((t) => t.id !== incomingThread.id);
              return [incomingThread, ...filtered].sort((a, b) =>
                b.lastMessageAt.localeCompare(a.lastMessageAt)
              );
            });

            if (selectedThreadIdRef.current === incomingMsg.threadId) {
              setClientTypingThreadId(null);
              setSelectedMessages((prev) => {
                const exists = prev.some(
                  (m) =>
                    m.id === incomingMsg.id ||
                    (incomingMsg.twilioMessageSid &&
                      m.twilioMessageSid === incomingMsg.twilioMessageSid) ||
                    (incomingMsg.clientMessageId &&
                      m.clientMessageId === incomingMsg.clientMessageId)
                );
                if (exists) {
                  return prev.map((m) =>
                    m.id === incomingMsg.id ||
                    (incomingMsg.clientMessageId &&
                      m.clientMessageId === incomingMsg.clientMessageId)
                      ? incomingMsg
                      : m
                  );
                }
                return [...prev, incomingMsg].sort((a, b) =>
                  a.createdAt.localeCompare(b.createdAt)
                );
              });
            }
            return;
          }

          if (
            payload.type === "typing:update" &&
            payload.senderRole === "client" &&
            payload.threadId
          ) {
            if (payload.threadId === selectedThreadIdRef.current) {
              setClientTypingThreadId(payload.isTyping ? payload.threadId : null);
              if (typingTimeoutRef.current) {
                window.clearTimeout(typingTimeoutRef.current);
              }
              if (payload.isTyping) {
                typingTimeoutRef.current = window.setTimeout(() => {
                  setClientTypingThreadId(null);
                }, 3500);
              }
            }
          }
        } catch {
          // Ignore malformed WS message
        }
      };

      ws.onclose = () => {
        if (pingTimer) {
          window.clearInterval(pingTimer);
          pingTimer = null;
        }
        if (wsRef.current === ws) wsRef.current = null;
        setWsConnected(false);
        if (!closedByCleanup) {
          attempts += 1;
          const delayMs = Math.min(15_000, 1200 * Math.pow(1.6, attempts));
          reconnectTimer = window.setTimeout(connectAdminSocket, delayMs);
        }
      };
    };

    connectAdminSocket();

    return () => {
      closedByCleanup = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (pingTimer) window.clearInterval(pingTimer);
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [user]);

  const emitAdminTyping = (threadId: string, typing: boolean) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const now = Date.now();
    if (typing && now - lastTypingEmitRef.current < 1500) return;
    lastTypingEmitRef.current = now;
    ws.send(
      JSON.stringify({
        type: "typing:state",
        threadId,
        isTyping: typing,
      })
    );
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedThreadId) return;
    const body = replyText.trim();
    if (!body) return;

    setSendingReply(true);
    setBanner(null);
    const clientMessageId = `adm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    try {
      const res = await sessionApiRequest<{ ok: boolean; message: SupportMessageDTO }>(
        `/api/admin/support-desk/threads/${encodeURIComponent(selectedThreadId)}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ body, clientMessageId }),
        }
      );

      emitAdminTyping(selectedThreadId, false);
      setReplyText("");

      if (res.message) {
        setSelectedMessages((prev) => {
          const exists = prev.some(
            (m) => m.id === res.message.id || m.clientMessageId === clientMessageId
          );
          if (exists) return prev;
          return [...prev, res.message];
        });
      }
    } catch (err) {
      setBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Failed to send support reply.",
      });
    } finally {
      setSendingReply(false);
    }
  };

  const handleToggleThreadStatus = async (thread: SupportThreadDTO) => {
    if (!user) return;
    const nextStatus = thread.status === "Open" ? "Resolved" : "Open";
    setUpdatingStatus(true);
    try {
      const res = await sessionApiRequest<{ ok: boolean; thread: SupportThreadDTO }>(
        `/api/admin/support-desk/threads/${encodeURIComponent(thread.id)}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      setThreads((prev) => prev.map((t) => (t.id === res.thread.id ? res.thread : t)));
      setBanner({
        tone: "success",
        text: `Thread ${thread.id} marked ${nextStatus}.`,
      });
    } catch (err) {
      setBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Unable to update thread status.",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filteredThreads = useMemo(() => {
    if (threadFilter === "All") return threads;
    return threads.filter((t) => t.status === threadFilter);
  }, [threads, threadFilter]);

  const selectedThread = useMemo(
    () => threads.find((t) => t.id === selectedThreadId) || null,
    [threads, selectedThreadId]
  );

  const openThreadCount = useMemo(
    () => threads.filter((t) => t.status === "Open").length,
    [threads]
  );

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
      title="Support Inquiries & Live Chat"
      subtitle="Real-time Twilio Conversations & WebSocket live support desk alongside persisted Contact page inquiries."
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadAll()}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Desk</span>
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

      {error && (
        <NotificationBanner
          tone="error"
          message={error}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Segmented Workspace Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCE4EC] pb-3">
        <div className="inline-flex border border-[#DCE4EC] bg-white rounded-[5px] p-1">
          <button
            type="button"
            onClick={() => setActiveTab("desk")}
            className={`min-h-[38px] px-4 py-1.5 text-xs font-heading font-bold rounded-[3px] transition-colors cursor-pointer ${
              activeTab === "desk"
                ? "bg-[#1B4962] text-white"
                : "text-[#3B4C5E] hover:text-[#102030]"
            }`}
          >
            Live Support Desk ({openThreadCount} Open)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("inquiries")}
            className={`min-h-[38px] px-4 py-1.5 text-xs font-heading font-bold rounded-[3px] transition-colors cursor-pointer ${
              activeTab === "inquiries"
                ? "bg-[#1B4962] text-white"
                : "text-[#3B4C5E] hover:text-[#102030]"
            }`}
          >
            Contact Form Inquiries ({inquiries.length})
          </button>
        </div>

        <span className="text-xs font-mono text-[#5A6B7C]">
          Admin Stream: {wsConnected ? "WebSocket Live" : "Connecting..."}
        </span>
      </div>

      {activeTab === "desk" ? (
        <div className="space-y-6">
          {/* Twilio Integration Readiness Card */}
          <Card>
            <CardHeader
              title="Twilio Conversations Configuration"
              action={<ShieldCheck className="w-4 h-4 text-[#1B4962]" />}
            />
            <CardBody>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-[#5A6B7C]">Channel Mode</p>
                  <p className="font-semibold text-[#102030] mt-1">
                    {twilioStatus?.configured
                      ? "Twilio Conversations + Live WebSocket"
                      : "Built-In Live WebSocket Relay"}
                  </p>
                </div>
                <div>
                  <p className="text-[#5A6B7C]">Webhook Endpoint</p>
                  <p className="font-mono text-[#102030] mt-1">
                    {twilioStatus?.webhookPath || "/api/webhooks/twilio/conversations"}
                  </p>
                </div>
                <div>
                  <p className="text-[#5A6B7C]">Signature Verification &amp; SMS</p>
                  <p className="font-semibold text-[#102030] mt-1">
                    {twilioStatus?.webhookValidationEnabled
                      ? "HMAC Webhook Verified"
                      : "Webhook Secret Unset"}
                    {" · "}
                    {twilioStatus?.smsAlertsEnabled ? "SMS Alerts Active" : "SMS Optional"}
                  </p>
                </div>
                <div>
                  <p className="text-[#5A6B7C]">Missing Twilio Keys</p>
                  <p className="font-mono text-[#102030] mt-1 break-words">
                    {twilioStatus?.missingKeys?.length
                      ? twilioStatus.missingKeys.join(", ")
                      : "None (Fully Configured)"}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Two-Pane Support Console */}
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            <Card className="lg:col-span-5">
              <CardHeader
                title={`Conversation Threads (${filteredThreads.length})`}
                action={<MessageSquare className="w-4 h-4 text-slate-400" />}
              />
              <div className="px-4 py-2.5 border-b border-[#DCE4EC] bg-[#F6F8FA] flex items-center gap-2">
                {(["All", "Open", "Resolved"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setThreadFilter(status)}
                    className={`min-h-[34px] px-3 py-1 text-xs font-heading font-bold rounded-[3px] transition-colors cursor-pointer ${
                      threadFilter === status
                        ? "bg-[#1B4962] text-white"
                        : "bg-white border border-[#DCE4EC] text-[#3B4C5E] hover:text-[#102030]"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <div className="divide-y divide-[#DCE4EC] max-h-[520px] overflow-y-auto">
                {loading && filteredThreads.length === 0 ? (
                  <p className="p-6 text-sm text-[#5A6B7C]">Loading support conversations...</p>
                ) : filteredThreads.length === 0 ? (
                  <p className="p-6 text-sm text-[#5A6B7C]">
                    No live support threads match this filter yet. Threads appear here automatically
                    when visitors or investors start a live chat.
                  </p>
                ) : (
                  filteredThreads.map((t) => {
                    const active = t.id === selectedThreadId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedThreadId(t.id)}
                        className={`w-full text-left p-4 transition-colors cursor-pointer block ${
                          active ? "bg-[#EDF3F7] border-l-4 border-l-[#E94D65]" : "hover:bg-[#F6F8FA]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-[#102030] truncate">
                              {t.visitorName}
                            </p>
                            <p className="text-[11px] text-[#5A6B7C] truncate">{t.visitorEmail}</p>
                          </div>
                          <span
                            className={`text-[11px] font-heading font-bold uppercase shrink-0 ${
                              t.status === "Resolved" ? "text-emerald-700" : "text-[#E94D65]"
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[#1B4962] mt-1.5 truncate">
                          {t.topic}
                        </p>
                        <p className="text-xs text-[#4A5B6C] mt-1 line-clamp-1">
                          {t.lastMessagePreview}
                        </p>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-[#7A8B9C] font-mono tabular-nums">
                          <span>
                            {t.channel === "twilio-conversations" ? "Twilio" : "WebSocket"}
                          </span>
                          <span>{formatIsoDate(t.lastMessageAt)}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </Card>

            <Card className="lg:col-span-7">
              {selectedThread ? (
                <>
                  <div className="px-5 py-4 border-b border-[#DCE4EC] bg-[#F6F8FA] flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-heading font-bold text-base text-[#102030] truncate">
                        {selectedThread.visitorName} · {selectedThread.topic}
                      </h3>
                      <p className="text-xs text-[#5A6B7C] font-mono mt-0.5 truncate">
                        {selectedThread.visitorEmail} · {selectedThread.id}
                        {selectedThread.twilioConversationSid
                          ? ` · Twilio SID: ${selectedThread.twilioConversationSid}`
                          : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={selectedThread.status === "Open" ? "secondary" : "outline"}
                      size="sm"
                      loading={updatingStatus}
                      onClick={() => void handleToggleThreadStatus(selectedThread)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {selectedThread.status === "Open" ? "Mark Resolved" : "Reopen Thread"}
                      </span>
                    </Button>
                  </div>

                  <div className="p-5 space-y-3 h-[390px] overflow-y-auto bg-white">
                    {loadingMessages && selectedMessages.length === 0 ? (
                      <p className="text-sm text-[#5A6B7C]">Loading transcript...</p>
                    ) : (
                      selectedMessages.map((msg) => {
                        if (msg.senderRole === "system") {
                          return (
                            <div
                              key={msg.id}
                              className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] px-3 py-2 text-xs text-[#4A5B6C]"
                            >
                              {msg.body}
                            </div>
                          );
                        }
                        const isAgent = msg.senderRole === "agent";
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isAgent ? "items-end" : "items-start"}`}
                          >
                            <div className="flex items-baseline gap-2 mb-1 text-[11px] text-[#5A6B7C]">
                              <span className="font-semibold text-[#102030]">
                                {msg.senderName}
                              </span>
                              <span className="font-mono tabular-nums">
                                {formatIsoDate(msg.createdAt)}
                              </span>
                              {msg.source === "twilio" && (
                                <span className="font-mono text-[#1B4962]">via Twilio</span>
                              )}
                            </div>
                            <div
                              className={`max-w-[82%] rounded-[5px] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                isAgent
                                  ? "bg-[#1B4962] text-white"
                                  : "bg-[#F6F8FA] border border-[#DCE4EC] text-[#102030]"
                              }`}
                            >
                              {msg.body}
                            </div>
                          </div>
                        );
                      })
                    )}

                    {clientTypingThreadId === selectedThread.id && (
                      <p className="text-xs text-[#5A6B7C] italic">
                        {selectedThread.visitorName} is typing...
                      </p>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <form
                    onSubmit={handleSendReply}
                    className="p-4 border-t border-[#DCE4EC] bg-[#F6F8FA] flex items-center gap-3"
                  >
                    <label htmlFor="admin-support-reply" className="sr-only">
                      Reply to {selectedThread.visitorName}
                    </label>
                    <input
                      id="admin-support-reply"
                      type="text"
                      maxLength={1500}
                      value={replyText}
                      onChange={(e) => {
                        setReplyText(e.target.value);
                        emitAdminTyping(selectedThread.id, Boolean(e.target.value.trim()));
                      }}
                      placeholder={`Reply to ${selectedThread.visitorName}...`}
                      className="flex-1 min-w-0 min-h-[42px] bg-white border border-[#DCE4EC] rounded-[5px] px-3.5 py-2 text-sm text-[#102030] placeholder:text-[#7A8B9C] focus:outline-none focus:ring-2 focus:ring-[#1B4962]"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      loading={sendingReply}
                      disabled={!replyText.trim()}
                    >
                      <Send className="w-4 h-4" />
                      <span>Send Reply</span>
                    </Button>
                  </form>
                </>
              ) : (
                <CardBody>
                  <div className="py-16 text-center space-y-2">
                    <LifeBuoy className="w-8 h-8 text-[#7A8B9C] mx-auto" />
                    <p className="font-heading font-bold text-sm text-[#102030]">
                      Select a Conversation Thread
                    </p>
                    <p className="text-xs text-[#5A6B7C] max-w-sm mx-auto">
                      Choose any active visitor or investor live support conversation on the left to
                      read messages and send real-time replies.
                    </p>
                  </div>
                </CardBody>
              )}
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader
            title={`Contact Form Queue (${inquiries.length})`}
            action={<LifeBuoy className="w-4 h-4 text-slate-400" />}
          />
          <CardBody>
            <DataTable
              columns={columns}
              rows={inquiries}
              rowKey={(i) => String(i.id)}
              loading={loading}
              error={error}
              onRetry={() => void loadAll()}
              emptyTitle="No Support Inquiries"
              emptyDescription="Submitted contact messages appear here for team follow-up."
            />
          </CardBody>
        </Card>
      )}
    </AdminLayout>
  );
}

export function AdminSettingsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const loadLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await sessionApiRequest<{ logs: Array<Record<string, unknown>> }>(
        "/api/admin/audit-logs"
      );
      setLogs(res.logs);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSending(true);
    setBanner(null);
    try {
      await sessionApiRequest("/api/admin/broadcasts", {
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
