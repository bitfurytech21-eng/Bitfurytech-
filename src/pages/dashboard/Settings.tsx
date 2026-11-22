import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { KeyRound, LogOut, Mail, Shield } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Button,
  buttonClasses,
  Card,
  CardBody,
  CardHeader,
  FormField,
  NotificationBanner,
  SelectInput,
  TextInput,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import { apiRequest } from "../../services/dashboardApi";

export default function Settings() {
  const navigate = useNavigate();
  const {
    firebaseUser,
    idToken,
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

  useEffect(() => {
    if (profile) {
      setPreferredRail(profile.preferredRail);
      setEmailAlerts(profile.emailAlerts);
      setTwoFactorEnabled(profile.twoFactorEnabled);
    }
  }, [profile]);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const token = idToken || (await firebaseUser.getIdToken());
      await apiRequest("/api/profile", token, {
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
    if (!firebaseUser?.email) return;
    setResetBusy(true);
    setError(null);
    setResetSent(null);
    try {
      const res = await sendPasswordReset(firebaseUser.email);
      if (res.ok) {
        setResetSent(
          `Password recovery instructions sent to ${firebaseUser.email} via Firebase Authentication.`
        );
      } else {
        setError(res.error || "Unable to trigger password recovery email.");
      }
    } finally {
      setResetBusy(false);
    }
  }, [firebaseUser, sendPasswordReset]);

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
            ? "Account password updated in Firebase Authentication."
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
            action={<Shield className="w-4 h-4 text-slate-400" />}
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

        <div className="lg:col-span-5 space-y-6">
          <Card>
            <CardHeader
              title="Password & Authentication Security"
              action={<KeyRound className="w-4 h-4 text-slate-400" />}
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

              <form onSubmit={handlePasswordChange} className="space-y-3">
                {hasPasswordProvider && (
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
                )}
                <FormField id="set-new-pwd" label={hasPasswordProvider ? "New Password" : "Set Account Password"}>
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
                  {hasPasswordProvider ? "Update Password" : "Enable Password Sign-In"}
                </Button>
              </form>

              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <p className="text-slate-600 leading-relaxed">
                  Or send a Firebase password recovery link to{" "}
                  <strong className="text-slate-900">{firebaseUser?.email}</strong>.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  loading={resetBusy}
                  onClick={() => void handlePasswordReset()}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Send Password Reset Email</span>
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Session Management & Support" />
            <CardBody className="space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Authenticated Identity</span>
                <span className="font-mono text-slate-800">{firebaseUser?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Session Expiration</span>
                <span className="font-mono text-slate-800">
                  {backendSession?.expiresAt
                    ? new Date(backendSession.expiresAt * 1000).toISOString().slice(0, 16).replace("T", " ") + " UTC"
                    : "Active"}
                </span>
              </div>
              <div className="pt-2 flex flex-wrap gap-2">
                <Button variant="danger" size="sm" onClick={() => void handleSignOutAll()}>
                  <LogOut className="w-3.5 h-3.5" />
                  <span>End Current Session</span>
                </Button>
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
