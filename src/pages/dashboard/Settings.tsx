import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, LogOut, Mail, Monitor, Shield, Trash2 } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Button,
  buttonClasses,
  Card,
  CardBody,
  CardHeader,
  DashboardSymbol,
  FormField,
  NotificationBanner,
  SelectInput,
  TextInput,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import { sessionApiRequest } from "../../services/dashboardApi";

interface ActiveSessionDTO {
  id: string;
  current: boolean;
  createdAt: string | null;
  expiresAt: string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export default function Settings() {
  const navigate = useNavigate();
  const {
    user,
    profile,
    backendSession,
    hasPasswordProvider,
    updateAccountPassword,
    sendPasswordReset,
    signOutUser,
  } = useAuth();

  const [preferredRail, setPreferredRail] = useState(
    profile?.preferredRail || "USDT (TRC20)"
  );
  const [emailAlerts, setEmailAlerts] = useState(profile?.emailAlerts ?? true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(
    profile?.twoFactorEnabled ?? false
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ActiveSessionDTO[]>([]);
  const [sessionsBusy, setSessionsBusy] = useState(false);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    if (!user) return;
    setSessionsBusy(true);
    try {
      const res = await sessionApiRequest<{ sessions?: ActiveSessionDTO[] }>("/api/account/sessions");
      setSessions(res.sessions ?? []);
    } catch {
      // ignore transient session load failure
    } finally {
      setSessionsBusy(false);
    }
  }, [user]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    if (profile) {
      setPreferredRail(profile.preferredRail);
      setEmailAlerts(profile.emailAlerts);
      setTwoFactorEnabled(profile.twoFactorEnabled);
      return;
    }
    if (!user) return;
    let active = true;
    void sessionApiRequest<{
      profile?: {
        preferredRail?: "USDT (TRC20)" | "Bitcoin (BTC)" | "Ethereum (ETH)" | "Bank Wire";
        emailAlerts?: boolean;
        twoFactorEnabled?: boolean;
      };
    }>("/api/profile")
      .then((res) => {
        if (!active || !res.profile) return;
        if (res.profile.preferredRail) setPreferredRail(res.profile.preferredRail);
        if (typeof res.profile.emailAlerts === "boolean") setEmailAlerts(res.profile.emailAlerts);
        if (typeof res.profile.twoFactorEnabled === "boolean") {
          setTwoFactorEnabled(res.profile.twoFactorEnabled);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [profile, user]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setSaved(false);
    setError(null);
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update settings.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = useCallback(async () => {
    if (!user?.email) return;
    setResetBusy(true);
    setError(null);
    setResetSent(null);
    try {
      const res = await sendPasswordReset(user.email);
      if (res.ok) {
        setResetSent(
          `Password recovery instructions sent to ${user.email}.`
        );
      } else {
        setError(res.error || "Unable to trigger password recovery email.");
      }
    } finally {
      setResetBusy(false);
    }
  }, [user, sendPasswordReset]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (hasPasswordProvider && !currentPassword) {
      setPwdError("Enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      setPwdError("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPwdError("New password and confirmation do not match.");
      return;
    }

    setPwdBusy(true);
    try {
      const res = await updateAccountPassword(newPassword, currentPassword);
      if (res.ok) {
        setPwdSuccess(
          hasPasswordProvider
            ? "Account password updated."
            : "Password sign-in enabled on your BitfuryTech account."
        );
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
      } else {
        setPwdError(res.error || "Unable to update account password.");
      }
    } finally {
      setPwdBusy(false);
    }
  };

  const handleSignOutAll = async () => {
    await signOutUser();
    navigate("/login", { replace: true });
  };

  const handleRevokeSession = async (sessionId: string) => {
    setSessionNotice(null);
    setSessionsBusy(true);
    try {
      await sessionApiRequest(`/api/account/sessions/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      });
      setSessionNotice("Selected session revoked.");
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to revoke session.");
    } finally {
      setSessionsBusy(false);
    }
  };

  const handleRevokeOtherSessions = async () => {
    setSessionNotice(null);
    setSessionsBusy(true);
    try {
      const res = await sessionApiRequest<{ revokedCount?: number }>("/api/account/sessions/revoke-others", {
        method: "POST",
      });
      setSessionNotice(
        res.revokedCount
          ? `Signed out ${res.revokedCount} other active session${res.revokedCount === 1 ? "" : "s"}.`
          : "No other active sessions were found."
      );
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to revoke other sessions.");
    } finally {
      setSessionsBusy(false);
    }
  };

  return (
    <DashboardLayout
      title="Settings"
      subtitle="Configure your default settlement rail, ledger email alerts, Enhanced Payout Verification Flag, password updates, and active session controls."
    >
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <Card className="lg:col-span-7">
          <CardHeader
            title="Notification & Payout Security Preferences"
            subtitle="Saved securely through authenticated backend profile validation"
            action={<DashboardSymbol icon={Shield} tone="navy" size="md" />}
          />
          <CardBody className="space-y-5">
            {error && (
              <NotificationBanner
                tone="error"
                message={error}
                onDismiss={() => setError(null)}
              />
            )}
            {saved && (
              <NotificationBanner
                tone="success"
                message="Security and notification settings updated."
                onDismiss={() => setSaved(false)}
              />
            )}

            <form onSubmit={handleSavePreferences} className="space-y-4">
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

              <label className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 cursor-pointer">
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    Settlement &amp; Ledger Email Alerts
                  </p>
                  <p className="text-xs text-slate-500">
                    Receive alerts when deposits, withdrawals, or allocations settle.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="w-4 h-4 accent-[#1B4962]"
                />
              </label>

              <label className="flex items-center justify-between gap-4 py-2 cursor-pointer">
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    Enhanced Payout Verification Flag
                  </p>
                  <p className="text-xs text-slate-500">
                    Require manual confirmation sign-off prior to outbound withdrawal settlement.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                  className="w-4 h-4 accent-[#1B4962]"
                />
              </label>

              <Button type="submit" loading={saving}>
                Save Preferences
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="lg:col-span-5 min-w-0 space-y-6">
          <Card>
            <CardHeader
              title="Password & Authentication Security"
              action={<DashboardSymbol icon={KeyRound} tone="amber" size="md" />}
            />
            <CardBody className="space-y-4 text-xs">
              {pwdError && (
                <NotificationBanner
                  tone="error"
                  message={pwdError}
                  onDismiss={() => setPwdError(null)}
                />
              )}
              {pwdSuccess && (
                <NotificationBanner
                  tone="success"
                  message={pwdSuccess}
                  onDismiss={() => setPwdSuccess(null)}
                />
              )}
              {resetSent && (
                <NotificationBanner
                  tone="success"
                  message={resetSent}
                  onDismiss={() => setResetSent(null)}
                />
              )}

              {hasPasswordProvider ? (
                <form onSubmit={handlePasswordChange} className="space-y-3">
                  <FormField id="set-cur-pwd" label="Current Password">
                    <TextInput
                      id="set-cur-pwd"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </FormField>
                  <FormField id="set-new-pwd" label="New Password">
                    <TextInput
                      id="set-new-pwd"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                    />
                  </FormField>
                  <FormField id="set-conf-pwd" label="Confirm New Password">
                    <TextInput
                      id="set-conf-pwd"
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Repeat new password"
                    />
                  </FormField>
                  <Button type="submit" size="sm" loading={pwdBusy}>
                    Update Password
                  </Button>
                </form>
              ) : (
                <div className="rounded-md bg-slate-50 border border-slate-200 p-3 text-slate-600 leading-relaxed">
                  Your account signs in with Google Authentication and does not have an email password set yet. Use the reset link below to configure a password.
                </div>
              )}

              <div className={hasPasswordProvider ? "pt-3 border-t border-slate-100 space-y-2.5" : "space-y-2.5"}>
                <p className="text-slate-600 leading-relaxed">
                  {hasPasswordProvider ? "Or send a password recovery link to" : "Send a secure password setup link to"}{" "}
                  <strong className="text-slate-900 break-all">{user?.email}</strong>.
                </p>
                <Button
                  variant={hasPasswordProvider ? "outline" : "primary"}
                  size="sm"
                  loading={resetBusy}
                  onClick={() => void handlePasswordReset()}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{hasPasswordProvider ? "Send Password Reset Email" : "Send Password Setup Email"}</span>
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Active Sessions & Support"
              action={<DashboardSymbol icon={Monitor} tone="navy" size="md" />}
            />
            <CardBody className="space-y-3 text-xs">
              {sessionNotice && (
                <NotificationBanner
                  tone="success"
                  message={sessionNotice}
                  onDismiss={() => setSessionNotice(null)}
                />
              )}
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-slate-500">Authenticated Identity</span>
                <span className="font-mono text-slate-800 break-all">{user?.email}</span>
              </div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-slate-500">Session Expiration</span>
                <span className="font-mono text-slate-800">
                  {backendSession?.expiresAt
                    ? new Date(backendSession.expiresAt * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC"
                    : "Active"}
                </span>
              </div>

              {sessions.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Active Browser Sessions ({sessions.length})
                  </p>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {sessions.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-slate-50/70 px-2.5 py-2"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">
                            {s.current ? "Current Browser Session" : "Signed-In Device"}
                            {s.ipAddress ? ` · ${s.ipAddress}` : ""}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {s.userAgent ? s.userAgent.slice(0, 48) : "Web Client"}
                          </p>
                        </div>
                        {s.current ? (
                          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={sessionsBusy}
                            onClick={() => void handleRevokeSession(s.id)}
                            aria-label="Revoke session"
                            className="shrink-0 p-1 text-slate-500 hover:text-[#E94D65] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex flex-wrap gap-2">
                <Button variant="danger" size="sm" onClick={() => void handleSignOutAll()}>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>End Current Session</span>
                </Button>
                {sessions.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    loading={sessionsBusy}
                    onClick={() => void handleRevokeOtherSessions()}
                  >
                    <span>Sign Out Other Devices</span>
                  </Button>
                )}
                <Link to="/contact" className={buttonClasses({ variant: "outline", size: "sm" })}>
                  Account Support
                </Link>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
