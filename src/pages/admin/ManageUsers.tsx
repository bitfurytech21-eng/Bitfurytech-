import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Ban,
  Mail,
  Pencil,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserMinus,
  Users,
  UserX,
} from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DashboardSymbol,
  DataTable,
  FormField,
  Modal,
  NotificationBanner,
  SelectInput,
  TableColumn,
  TextAreaInput,
  TextInput,
} from "../../components/ui";
import {
  formatIsoDate,
  isSafeProfilePhotoUrl,
  sessionApiRequest,
} from "../../services/dashboardApi";
import { formatUsd } from "../../trading/tradingPage";

interface PlatformUserRow {
  uid: string;
  username?: string | null;
  email: string;
  displayName: string;
  photoUrl?: string | null;
  country: string;
  phone: string;
  walletBalance: number;
  accountStatus: string;
  createdAt: string | null;
}

interface BlockedUserRow {
  id: string;
  userId: string | null;
  email: string;
  displayName: string;
  reason: string;
  blockedBy: string | null;
  createdAt: string | null;
}

interface EmailStatusDTO {
  configured: boolean;
  missingKeys: string[];
}

function getInitials(name: string, email: string): string {
  const source = (name || email || "U").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function isUserActive(status: string): boolean {
  return status === "Active";
}

export default function ManageUsers() {
  const [users, setUsers] = useState<PlatformUserRow[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserRow[]>([]);
  const [emailStatus, setEmailStatus] = useState<EmailStatusDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    tone: "success" | "error" | "info" | "warning";
    text: string;
  } | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [togglingUid, setTogglingUid] = useState<string | null>(null);

  // Edit user modal state
  const [editingUser, setEditingUser] = useState<PlatformUserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editCountry, setEditCountry] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState<"Active" | "Suspended">("Active");
  const [editBalance, setEditBalance] = useState("0.00");
  const [editBalanceNote, setEditBalanceNote] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Add Block user modal state
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockMode, setBlockMode] = useState<"existing" | "email">("existing");
  const [blockTargetUid, setBlockTargetUid] = useState("");
  const [blockEmailInput, setBlockEmailInput] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockingUser, setBlockingUser] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  // Private notice messaging state
  const noticeCardRef = useRef<HTMLDivElement>(null);
  const [noticeRecipientUid, setNoticeRecipientUid] = useState("");
  const [noticeSubject, setNoticeSubject] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [alsoNotifyInApp, setAlsoNotifyInApp] = useState(true);
  const [sendingNotice, setSendingNotice] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [customersRes, blockedRes, mailRes] = await Promise.all([
        sessionApiRequest<{ customers: PlatformUserRow[] }>("/api/admin/customers"),
        sessionApiRequest<{ blockedUsers: BlockedUserRow[] }>("/api/admin/blocked-users"),
        sessionApiRequest<EmailStatusDTO>("/api/admin/email-status").catch(() => null),
      ]);
      const loadedUsers = customersRes.customers ?? [];
      setUsers(loadedUsers);
      setBlockedUsers(blockedRes.blockedUsers ?? []);
      if (mailRes) setEmailStatus(mailRes);
      setNoticeRecipientUid((prev) => {
        if (prev && loadedUsers.some((u) => u.uid === prev)) return prev;
        return loadedUsers[0]?.uid ?? "";
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load platform users.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const active = isUserActive(u.accountStatus);
      if (statusFilter === "Active" && !active) return false;
      if (statusFilter === "Inactive" && active) return false;
      if (!q) return true;
      return (
        u.displayName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q) ||
        u.uid.toLowerCase().includes(q)
      );
    });
  }, [users, search, statusFilter]);

  const stats = useMemo(() => {
    const activeCount = users.filter((u) => isUserActive(u.accountStatus)).length;
    const inactiveCount = users.length - activeCount;
    return {
      total: users.length,
      active: activeCount,
      inactive: inactiveCount,
      blocked: blockedUsers.length,
    };
  }, [users, blockedUsers]);

  const openEditModal = (user: PlatformUserRow) => {
    setEditingUser(user);
    setEditName(user.displayName || "");
    setEditEmail(user.email || "");
    setEditCountry(user.country || "");
    setEditPhone(user.phone || "");
    setEditStatus(isUserActive(user.accountStatus) ? "Active" : "Suspended");
    setEditBalance(Number(user.walletBalance || 0).toFixed(2));
    setEditBalanceNote("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const parsedBalance = Number(editBalance);
    if (!Number.isFinite(parsedBalance) || parsedBalance < 0) {
      setBanner({ tone: "error", text: "Enter a valid non-negative balance amount." });
      return;
    }

    setSavingEdit(true);
    setBanner(null);
    try {
      await sessionApiRequest(`/api/admin/customers/${editingUser.uid}`, {
        method: "PATCH",
        body: JSON.stringify({
          displayName: editName.trim(),
          email: editEmail.trim(),
          country: editCountry.trim(),
          phone: editPhone.trim(),
          accountStatus: editStatus,
          walletBalance: parsedBalance,
          balanceNote: editBalanceNote.trim() || undefined,
        }),
      });
      setBanner({
        tone: "success",
        text: `Updated account details for ${editName.trim() || editingUser.email}.`,
      });
      setEditingUser(null);
      await loadData(true);
    } catch (err) {
      setBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Unable to save user changes.",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleToggleActive = async (user: PlatformUserRow) => {
    const nextStatus = isUserActive(user.accountStatus) ? "Suspended" : "Active";
    setTogglingUid(user.uid);
    setBanner(null);
    try {
      await sessionApiRequest(`/api/admin/customers/${user.uid}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setBanner({
        tone: "success",
        text: `${user.displayName} is now ${nextStatus === "Active" ? "Active" : "Inactive"}.`,
      });
      await loadData(true);
    } catch (err) {
      setBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Unable to update user status.",
      });
    } finally {
      setTogglingUid(null);
    }
  };

  const openBlockModalForUser = (user?: PlatformUserRow) => {
    if (user) {
      setBlockMode("existing");
      setBlockTargetUid(user.uid);
      setBlockEmailInput(user.email);
    } else {
      setBlockMode(users.length > 0 ? "existing" : "email");
      setBlockTargetUid(users[0]?.uid ?? "");
      setBlockEmailInput("");
    }
    setBlockReason("");
    setBlockModalOpen(true);
  };

  const handleBlockUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (blockReason.trim().length < 3) {
      setBanner({
        tone: "error",
        text: "Provide a brief reason (at least 3 characters) for blocking this defaulter.",
      });
      return;
    }

    setBlockingUser(true);
    setBanner(null);
    try {
      const payload =
        blockMode === "existing"
          ? { userId: blockTargetUid, reason: blockReason.trim() }
          : { email: blockEmailInput.trim(), reason: blockReason.trim() };

      const res = await sessionApiRequest<{ blockedUser: BlockedUserRow }>("/api/admin/users/block", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setBanner({
        tone: "success",
        text: `Blocked and removed ${res.blockedUser.email} from the platform.`,
      });
      setBlockModalOpen(false);
      await loadData(true);
    } catch (err) {
      setBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Unable to block user.",
      });
    } finally {
      setBlockingUser(false);
    }
  };

  const handleUnblockUser = async (entry: BlockedUserRow) => {
    setUnblockingId(entry.id);
    setBanner(null);
    try {
      await sessionApiRequest(`/api/admin/blocked-users/${entry.id}`, {
        method: "DELETE",
      });
      setBanner({
        tone: "info",
        text: `Removed ${entry.email} from the blocked defaulter list.`,
      });
      await loadData(true);
    } catch (err) {
      setBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Unable to unblock user.",
      });
    } finally {
      setUnblockingId(null);
    }
  };

  const jumpToNoticeForUser = (user: PlatformUserRow) => {
    setNoticeRecipientUid(user.uid);
    noticeCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      document.getElementById("notice-subject")?.focus();
    }, 250);
  };

  const handleSendPrivateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeRecipientUid) {
      setBanner({ tone: "error", text: "Select a client recipient before sending a notice." });
      return;
    }
    if (noticeSubject.trim().length < 2 || noticeMessage.trim().length < 3) {
      setBanner({
        tone: "error",
        text: "Enter both a clear subject and private notice message.",
      });
      return;
    }

    setSendingNotice(true);
    setBanner(null);
    try {
      const res = await sessionApiRequest<{
        ok: boolean;
        recipient: string;
        emailDelivered: boolean;
        deliveryError: string | null;
        inAppSent: boolean;
      }>(`/api/admin/customers/${noticeRecipientUid}/private-notice`, {
        method: "POST",
        body: JSON.stringify({
          subject: noticeSubject.trim(),
          message: noticeMessage.trim(),
          alsoNotifyInApp,
        }),
      });

      if (res.emailDelivered) {
        setBanner({
          tone: "success",
          text: `Private notice email delivered to ${res.recipient}${res.inAppSent ? " and posted to their portal inbox." : "."}`,
        });
      } else {
        setBanner({
          tone: "warning",
          text: `Notice logged for ${res.recipient}${res.inAppSent ? " and posted in-app" : ""}, but email delivery is pending (${res.deliveryError || "configure Resend email keys"}).`,
        });
      }
      setNoticeSubject("");
      setNoticeMessage("");
    } catch (err) {
      setBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Unable to send private notice.",
      });
    } finally {
      setSendingNotice(false);
    }
  };

  const columns: TableColumn<PlatformUserRow>[] = [
    {
      key: "user",
      header: "User",
      render: (u) => {
        const hasPhoto = isSafeProfilePhotoUrl(u.photoUrl);
        return (
          <div className="flex items-center gap-3 min-w-[200px]">
            {hasPhoto ? (
              <img
                src={u.photoUrl!}
                alt={u.displayName}
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover border border-[#DCE4EC] shrink-0 bg-[#EDF3F7]"
              />
            ) : (
              <span className="w-9 h-9 rounded-full bg-[#1B4962] text-white text-xs font-bold font-heading flex items-center justify-center shrink-0">
                {getInitials(u.displayName, u.email)}
              </span>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-[#102030] truncate">
                {u.displayName}
              </p>
              {u.username ? (
                <p className="text-[11px] text-[#5A6B7C] truncate">@{u.username}</p>
              ) : (
                <p className="text-[11px] text-[#5A6B7C]">Joined {formatIsoDate(u.createdAt)}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "email",
      header: "Email",
      render: (u) => (
        <div className="min-w-[180px]">
          <p className="text-xs text-[#102030] font-medium">{u.email}</p>
          <p className="text-[11px] text-[#5A6B7C]">
            {u.country ? u.country : "No country"} {u.phone ? `· ${u.phone}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (u) => {
        const active = isUserActive(u.accountStatus);
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-[4px] text-[11px] font-semibold border ${
              active
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-[#FDF1F3] text-[#BE123C] border-[#E94D65]/30"
            }`}
          >
            {active ? "Active" : "Inactive"}
          </span>
        );
      },
    },
    {
      key: "balance",
      header: "Balance",
      align: "right",
      render: (u) => (
        <span className="font-semibold text-[#102030] tabular-nums">
          {formatUsd(Number(u.walletBalance || 0))}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (u) => {
        const active = isUserActive(u.accountStatus);
        const busy = togglingUid === u.uid;
        return (
          <div className="flex items-center justify-end gap-1.5 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => openEditModal(u)}>
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit</span>
            </Button>
            <Button
              size="sm"
              variant={active ? "secondary" : "primary"}
              loading={busy}
              onClick={() => void handleToggleActive(u)}
            >
              {active ? (
                <>
                  <UserMinus className="w-3.5 h-3.5" />
                  <span>Deactivate</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Activate</span>
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              title="Send private notice email"
              onClick={() => jumpToNoticeForUser(u)}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Notice</span>
            </Button>
            <Button
              size="sm"
              variant="danger"
              title="Block and remove defaulter"
              onClick={() => openBlockModalForUser(u)}
            >
              <Ban className="w-3.5 h-3.5" />
              <span>Block</span>
            </Button>
          </div>
        );
      },
    },
  ];

  const selectedNoticeUser = useMemo(
    () => users.find((u) => u.uid === noticeRecipientUid) ?? null,
    [users, noticeRecipientUid]
  );

  return (
    <AdminLayout
      title="Manage User"
      subtitle="Review platform user profiles, edit balances and status, remove defaulters, and send private client notices."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="danger"
            size="sm"
            onClick={() => openBlockModalForUser()}
          >
            <UserX className="w-3.5 h-3.5" />
            <span>Add Block User</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            loading={refreshing}
            onClick={() => void loadData(true)}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      }
    >
      {banner && (
        <NotificationBanner
          tone={banner.tone}
          message={banner.text}
          onDismiss={() => setBanner(null)}
        />
      )}

      {/* Manager Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5A6B7C]">
                Platform Users
              </p>
              <p className="text-2xl font-bold font-heading text-[#102030] tabular-nums mt-1">
                {stats.total}
              </p>
            </div>
            <DashboardSymbol icon={Users} tone="navy" size="md" />
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5A6B7C]">
                Active Users
              </p>
              <p className="text-2xl font-bold font-heading text-emerald-700 tabular-nums mt-1">
                {stats.active}
              </p>
            </div>
            <DashboardSymbol icon={UserCheck} tone="green" size="md" />
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5A6B7C]">
                Inactive Users
              </p>
              <p className="text-2xl font-bold font-heading text-[#BE123C] tabular-nums mt-1">
                {stats.inactive}
              </p>
            </div>
            <DashboardSymbol icon={UserCog} tone="amber" size="md" />
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#5A6B7C]">
                Blocked Defaulters
              </p>
              <p className="text-2xl font-bold font-heading text-[#E94D65] tabular-nums mt-1">
                {stats.blocked}
              </p>
            </div>
            <DashboardSymbol icon={ShieldAlert} tone="red" size="md" />
          </div>
        </Card>
      </div>

      {/* Existing Platform Users Table */}
      <Card>
        <CardHeader
          title={`Platform Users (${filteredUsers.length})`}
          subtitle="Users registered on BitfuryTech with current status, balance, and administrative actions."
          action={
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-auto">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, username..."
                  aria-label="Search platform users"
                  className="w-full sm:w-auto rounded-md border border-[#DCE4EC] bg-white pl-8 pr-3 py-1.5 text-xs text-[#102030] placeholder:text-[#5A6B7C] focus:border-[#1B4962] focus:outline-none"
                />
              </div>
              <SelectInput
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "All" | "Active" | "Inactive")
                }
                aria-label="Filter user status"
                className="w-auto py-1.5 text-xs"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </SelectInput>
            </div>
          }
        />
        <CardBody>
          <DataTable
            columns={columns}
            rows={filteredUsers}
            rowKey={(u) => u.uid}
            loading={loading}
            error={error}
            onRetry={() => void loadData(false)}
            emptyTitle="No Platform Users Found"
            emptyDescription="No non-blocked user accounts match your current search or status filter."
          />
        </CardBody>
      </Card>

      {/* Private Notice Email Messaging Space + Blocked Defaulters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div ref={noticeCardRef} className="min-w-0 lg:col-span-7">
          <Card>
            <CardHeader
              title="Private Notice Email Messaging"
              subtitle="Send a private administrative notice directly to an individual client's email and portal inbox."
              action={<DashboardSymbol icon={Mail} tone="navy" size="sm" />}
            />
            <CardBody>
              <form onSubmit={handleSendPrivateNotice} className="space-y-4">
                {emailStatus && !emailStatus.configured && (
                  <NotificationBanner
                    tone="warning"
                    message={`Live email delivery requires ${emailStatus.missingKeys.join(", ")}. Messages will still be recorded in Email Outbox and delivered in-app when checked below.`}
                  />
                )}

                <FormField
                  id="notice-recipient"
                  label="Select Client"
                  hint={
                    selectedNoticeUser
                      ? `Will be addressed to ${selectedNoticeUser.email}`
                      : "Choose a platform user to receive this private notice."
                  }
                >
                  <SelectInput
                    id="notice-recipient"
                    required
                    value={noticeRecipientUid}
                    onChange={(e) => setNoticeRecipientUid(e.target.value)}
                  >
                    {users.length === 0 ? (
                      <option value="">No active platform users available</option>
                    ) : (
                      users.map((u) => (
                        <option key={u.uid} value={u.uid}>
                          {u.displayName} ({u.email}) — {isUserActive(u.accountStatus) ? "Active" : "Inactive"}
                        </option>
                      ))
                    )}
                  </SelectInput>
                </FormField>

                <FormField id="notice-subject" label="Email Subject">
                  <TextInput
                    id="notice-subject"
                    required
                    value={noticeSubject}
                    onChange={(e) => setNoticeSubject(e.target.value)}
                    placeholder="e.g., Important Account Compliance Notice"
                    maxLength={160}
                  />
                </FormField>

                <FormField id="notice-message" label="Private Notice Message">
                  <TextAreaInput
                    id="notice-message"
                    required
                    rows={5}
                    value={noticeMessage}
                    onChange={(e) => setNoticeMessage(e.target.value)}
                    placeholder="Write the private notice message for this client..."
                    maxLength={3000}
                  />
                </FormField>

                <label className="flex items-center gap-2 text-xs text-[#3B4C5E] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alsoNotifyInApp}
                    onChange={(e) => setAlsoNotifyInApp(e.target.checked)}
                    className="rounded border-[#DCE4EC] text-[#1B4962] focus:ring-[#1B4962]"
                  />
                  <span>Also deliver this private notice inside the client&apos;s portal Notifications</span>
                </label>

                <div className="pt-1 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={sendingNotice}
                    disabled={users.length === 0}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Private Notice</span>
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="min-w-0 lg:col-span-5">
          <Card>
            <CardHeader
              title={`Blocked Defaulters (${blockedUsers.length})`}
              subtitle="Accounts removed from the website and blocked from signing in or re-registering."
              action={<DashboardSymbol icon={ShieldAlert} tone="red" size="sm" />}
            />
            <CardBody>
              {blockedUsers.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <p className="text-sm font-semibold font-heading text-[#102030]">
                    No Blocked Defaulters
                  </p>
                  <p className="text-xs text-[#5A6B7C]">
                    Use &ldquo;Add Block User&rdquo; above to remove a defaulter from the platform.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[#EDF2F7] max-h-[380px] overflow-y-auto">
                  {blockedUsers.map((item) => (
                    <div
                      key={item.id}
                      className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-semibold text-[#102030] truncate">
                          {item.displayName || item.email}
                        </p>
                        <p className="text-[11px] text-[#5A6B7C] truncate">{item.email}</p>
                        <p className="text-[11px] text-[#9F1239] break-words">{item.reason}</p>
                        <p className="text-[10px] text-[#5A6B7C]">
                          Blocked {formatIsoDate(item.createdAt)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        loading={unblockingId === item.id}
                        onClick={() => void handleUnblockUser(item)}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Unblock</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Edit User Modal */}
      <Modal
        open={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title="Edit User Account"
        description={
          editingUser ? `Update profile, status, or balance for ${editingUser.email}` : undefined
        }
        maxWidthClass="max-w-lg"
      >
        {editingUser && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField id="edit-user-name" label="Full Name">
                <TextInput
                  id="edit-user-name"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={120}
                />
              </FormField>
              <FormField id="edit-user-email" label="Email Address">
                <TextInput
                  id="edit-user-email"
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  maxLength={200}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField id="edit-user-country" label="Country">
                <TextInput
                  id="edit-user-country"
                  value={editCountry}
                  onChange={(e) => setEditCountry(e.target.value)}
                  maxLength={80}
                />
              </FormField>
              <FormField id="edit-user-phone" label="Phone">
                <TextInput
                  id="edit-user-phone"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  maxLength={40}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField id="edit-user-status" label="Account Status">
                <SelectInput
                  id="edit-user-status"
                  required
                  value={editStatus}
                  onChange={(e) =>
                    setEditStatus(e.target.value as "Active" | "Suspended")
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Suspended">Inactive (Deactivated)</option>
                </SelectInput>
              </FormField>

              <FormField
                id="edit-user-balance"
                label="Available Balance (USD)"
                hint={`Current: ${formatUsd(Number(editingUser.walletBalance || 0))}`}
              >
                <TextInput
                  id="edit-user-balance"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editBalance}
                  onChange={(e) => setEditBalance(e.target.value)}
                />
              </FormField>
            </div>

            <FormField
              id="edit-user-balance-note"
              label="Balance Adjustment Note (Optional)"
              hint="Recorded in ledger & audit logs if the user's balance changes."
            >
              <TextInput
                id="edit-user-balance-note"
                value={editBalanceNote}
                onChange={(e) => setEditBalanceNote(e.target.value)}
                placeholder="e.g., Manual ledger reconciliation"
                maxLength={240}
              />
            </FormField>

            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#DCE4EC]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingUser(null)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={savingEdit}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Add Block User Modal */}
      <Modal
        open={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        title="Add Block User (Remove Defaulter)"
        description="Removes the defaulter from the active platform directory, revokes all sessions, and blocks future sign-ups."
        maxWidthClass="max-w-lg"
      >
        <form onSubmit={handleBlockUser} className="space-y-4">
          <div className="flex gap-2 border-b border-[#DCE4EC] pb-3">
            <Button
              type="button"
              size="sm"
              variant={blockMode === "existing" ? "primary" : "outline"}
              onClick={() => setBlockMode("existing")}
              disabled={users.length === 0}
            >
              Select Existing User
            </Button>
            <Button
              type="button"
              size="sm"
              variant={blockMode === "email" ? "primary" : "outline"}
              onClick={() => setBlockMode("email")}
            >
              Block by Email
            </Button>
          </div>

          {blockMode === "existing" ? (
            <FormField id="block-user-select" label="Platform User">
              <SelectInput
                id="block-user-select"
                required
                value={blockTargetUid}
                onChange={(e) => setBlockTargetUid(e.target.value)}
              >
                {users.map((u) => (
                  <option key={u.uid} value={u.uid}>
                    {u.displayName} ({u.email}) — {formatUsd(Number(u.walletBalance || 0))}
                  </option>
                ))}
              </SelectInput>
            </FormField>
          ) : (
            <FormField id="block-user-email" label="Defaulter Email Address">
              <TextInput
                id="block-user-email"
                type="email"
                required
                value={blockEmailInput}
                onChange={(e) => setBlockEmailInput(e.target.value)}
                placeholder="defaulter@example.com"
                maxLength={200}
              />
            </FormField>
          )}

          <FormField id="block-user-reason" label="Reason for Blocking / Removal">
            <TextAreaInput
              id="block-user-reason"
              required
              rows={3}
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="e.g., Payment default / chargeback violation"
              maxLength={400}
            />
          </FormField>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#DCE4EC]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBlockModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="danger" size="sm" loading={blockingUser}>
              <UserX className="w-3.5 h-3.5" />
              <span>Block & Remove Defaulter</span>
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
