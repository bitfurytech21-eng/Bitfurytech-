import { useCallback, useEffect, useState } from "react";
import { Bell, Shield, User } from "lucide-react";
import MetronicShell from "../../components/MetronicShell";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  FormField,
  NotificationBanner,
  SelectInput,
  TextInput,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import {
  formatTimestamp,
  NotificationMessage,
  sessionApiRequest,
  UserAccount,
} from "../../services/dashboardApi";

export function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationMessage[]>([]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await sessionApiRequest<{ notifications: NotificationMessage[] }>(
        "/api/notifications"
      );
      setItems(data.notifications ?? []);
    } catch {
      // ignore transient notification load errors
    }
  }, [user]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const handleMarkRead = async (id: string) => {
    await sessionApiRequest(`/api/notifications/${encodeURIComponent(id)}/read`, {
      method: "PATCH",
    });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const handleMarkAllRead = async () => {
    await sessionApiRequest("/api/notifications/read-all", {
      method: "POST",
    });
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const hasUnread = items.some((n) => !n.read);

  return (
    <MetronicShell
      title="Notifications"
      subtitle="Track platform broadcasts alongside personal settlement alerts, deposit confirmations, and withdrawal notices."
    >
      <Card>
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#294158]" />
              <span>Message Feed</span>
            </span>
          }
          subtitle="Mark account notices and broadcasts as read once reviewed"
          action={
            hasUnread ? (
              <Button size="sm" variant="outline" onClick={() => void handleMarkAllRead()}>
                Mark all read
              </Button>
            ) : undefined
          }
        />
        <CardBody>
          {items.length === 0 ? (
            <EmptyState
              title="No Notifications Yet"
              description="Platform broadcasts and settlement alerts appear here as they are published."
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((n) => {
                const canMarkRead = (n.userId === user?.uid || n.userId === "all") && !n.read;
                return (
                  <div key={n.id} className="py-4 flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-400">
                        <span className="font-semibold text-[#294158]">{n.category}</span> ·{" "}
                        {n.userId === "all" ? "Platform Broadcast" : "Account Notice"} ·{" "}
                        {formatTimestamp(n.createdAt)}
                      </p>
                      <h3 className="text-sm font-bold text-slate-900">{n.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{n.body}</p>
                    </div>
                    {canMarkRead && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleMarkRead(n.id)}
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </MetronicShell>
  );
}

export function ProfilePage() {
  const { user, profile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || user?.displayName || "");
  const [country, setCountry] = useState(profile?.country || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [roleLabel, setRoleLabel] = useState(profile?.role || "investor");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    sessionApiRequest<{ profile: UserAccount }>("/api/profile")
      .then((res) => {
        if (!active || !res.profile) return;
        setDisplayName(res.profile.displayName || "");
        setCountry(res.profile.country || "");
        setPhone(res.profile.phone || "");
        setRoleLabel(res.profile.role || "investor");
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setSaved(false);

    if (!displayName.trim()) {
      setError("Display name cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      await sessionApiRequest("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: displayName.trim().slice(0, 120),
          country: country.trim().slice(0, 80),
          phone: phone.trim().slice(0, 40),
        }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MetronicShell
      title="Investor Profile"
      subtitle="Manage your verified BitfuryTech investor contact details."
    >
      <Card padding="lg" className="max-w-2xl space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
          <div className="w-10 h-10 rounded-md bg-[#1e2b3c] text-white flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">{user?.email}</p>
            <p className="text-xs text-slate-500">Account Role: {roleLabel}</p>
          </div>
        </div>

        {error && (
          <NotificationBanner tone="error" message={error} onDismiss={() => setError(null)} />
        )}
        {saved && (
          <NotificationBanner
            tone="success"
            message="Investor profile details saved."
            onDismiss={() => setSaved(false)}
          />
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <FormField id="prof-name" label="Full Name / Entity Title">
            <TextInput
              id="prof-name"
              required
              maxLength={120}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </FormField>

          <div className="grid sm:grid-cols-2 gap-4">
            <FormField id="prof-country" label="Country / Jurisdiction">
              <TextInput
                id="prof-country"
                maxLength={80}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. United Kingdom"
              />
            </FormField>

            <FormField id="prof-phone" label="Telephone">
              <TextInput
                id="prof-phone"
                maxLength={40}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+44 ..."
              />
            </FormField>
          </div>

          <Button type="submit" loading={saving}>
            Save Profile
          </Button>
        </form>
      </Card>
    </MetronicShell>
  );
}

export function SettingsPage() {
  const { user, profile } = useAuth();
  const [preferredRail, setPreferredRail] = useState<
    "USDT (TRC20)" | "Bitcoin (BTC)" | "Ethereum (ETH)" | "Bank Wire"
  >(profile?.preferredRail || "USDT (TRC20)");
  const [emailAlerts, setEmailAlerts] = useState(profile?.emailAlerts ?? true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(profile?.twoFactorEnabled ?? false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    sessionApiRequest<{ profile: UserAccount }>("/api/profile")
      .then((res) => {
        if (!active || !res.profile) return;
        setPreferredRail(res.profile.preferredRail || "USDT (TRC20)");
        setEmailAlerts(res.profile.emailAlerts ?? true);
        setTwoFactorEnabled(res.profile.twoFactorEnabled ?? false);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaved(false);
    try {
      await sessionApiRequest("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          preferredRail,
          emailAlerts,
          twoFactorEnabled,
        }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <MetronicShell
      title="Account Settings"
      subtitle="Configure default settlement rails and security alert preferences."
    >
      <Card padding="lg" className="max-w-2xl space-y-5">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-200">
          <Shield className="w-4 h-4 text-[#294158]" />
          <h2 className="text-sm font-bold text-slate-900">Custody &amp; Security Preferences</h2>
        </div>

        {saved && (
          <NotificationBanner
            tone="success"
            message="Settings updated cleanly."
            onDismiss={() => setSaved(false)}
          />
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <FormField id="set-rail" label="Default Settlement Rail">
            <SelectInput
              id="set-rail"
              value={preferredRail}
              onChange={(e) =>
                setPreferredRail(
                  e.target.value as
                    | "USDT (TRC20)"
                    | "Bitcoin (BTC)"
                    | "Ethereum (ETH)"
                    | "Bank Wire"
                )
              }
            >
              <option value="USDT (TRC20)">USDT (TRC20)</option>
              <option value="Bitcoin (BTC)">Bitcoin (BTC)</option>
              <option value="Ethereum (ETH)">Ethereum (ETH)</option>
              <option value="Bank Wire">Bank Wire</option>
            </SelectInput>
          </FormField>

          <label className="flex items-center justify-between gap-4 py-2 cursor-pointer">
            <div>
              <p className="text-xs font-semibold text-slate-800">Settlement Email Alerts</p>
              <p className="text-xs text-slate-500">
                Receive notifications when deposits or withdrawals are verified.
              </p>
            </div>
            <input
              type="checkbox"
              checked={emailAlerts}
              onChange={(e) => setEmailAlerts(e.target.checked)}
              className="w-4 h-4 accent-[#1e2b3c]"
            />
          </label>

          <label className="flex items-center justify-between gap-4 py-2 cursor-pointer">
            <div>
              <p className="text-xs font-semibold text-slate-800">
                Enhanced Payout Verification Flag
              </p>
              <p className="text-xs text-slate-500">
                Require manual settlement sign-off prior to outbound transfers.
              </p>
            </div>
            <input
              type="checkbox"
              checked={twoFactorEnabled}
              onChange={(e) => setTwoFactorEnabled(e.target.checked)}
              className="w-4 h-4 accent-[#1e2b3c]"
            />
          </label>

          <Button type="submit" loading={saving}>
            Save Settings
          </Button>
        </form>
      </Card>
    </MetronicShell>
  );
}
