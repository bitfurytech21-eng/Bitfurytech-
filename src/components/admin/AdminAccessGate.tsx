import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Shield,
  ShieldCheck,
  User,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Button, Card } from "../ui";

interface AdminAccessStatus {
  envPasscodeConfigured: boolean;
  claimed: boolean;
  claimAllowed: boolean;
  hasAdminAccount: boolean;
  databaseConfigured: boolean;
}

export interface AdminAccessGateProps {
  onUnlocked?: () => void;
}

export default function AdminAccessGate({ onUnlocked }: AdminAccessGateProps) {
  const navigate = useNavigate();
  const {
    user,
    backendSession,
    authReady,
    isAdmin,
    refreshUserSession,
    signInWithEmail,
    signOutUser,
  } = useAuth();

  const [status, setStatus] = useState<AdminAccessStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [tab, setTab] = useState<"primary" | "secondary">("primary");

  // Form states
  const [name, setName] = useState("BitfuryTech Administrator");
  const [username, setUsername] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/auth/admin-access-status", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const data = (await res.json().catch(() => null)) as AdminAccessStatus | null;
      if (res.ok && data) {
        setStatus(data);
      }
    } catch {
      // Leave status null so user still sees standard sign-in fallback
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  if (authReady && user && backendSession && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const handleFirstRunClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const trimmedPasscode = passcode.trim();
    if (trimmedPasscode.length < 8) {
      setError("Choose an administrator access passcode of at least 8 characters.");
      return;
    }
    if (trimmedPasscode !== confirmPasscode.trim()) {
      setError("Administrator passcodes do not match.");
      return;
    }

    const payload: Record<string, string> = { passcode: trimmedPasscode };
    if (!user || !backendSession) {
      const cleanEmail = identifier.trim().toLowerCase();
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setError("Enter a valid administrator email address.");
        return;
      }
      if (password.length < 8) {
        setError("Account password must be at least 8 characters long.");
        return;
      }
      payload.email = cleanEmail;
      payload.password = password;
      if (name.trim()) payload.name = name.trim();
      if (username.trim()) payload.username = username.trim().toLowerCase();
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/admin-claim", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        throw new Error(body.error || "Unable to complete administrator setup.");
      }
      const updated = await refreshUserSession();
      if (updated?.isAdmin) {
        onUnlocked?.();
        navigate("/admin", { replace: true });
      } else {
        setNotice("Administrator access claimed. Opening console...");
        await loadStatus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Administrator setup failed.");
    } finally {
      setBusy(false);
    }
  };

  const handlePasscodeUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const trimmedPasscode = passcode.trim();
    if (!trimmedPasscode) {
      setError("Enter the administrator access passcode.");
      return;
    }

    const payload: Record<string, string> = { passcode: trimmedPasscode };
    if (!user || !backendSession) {
      const cleanEmail = identifier.trim().toLowerCase();
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        setError("Enter your administrator email address.");
        return;
      }
      if (password.length < 8) {
        setError("Enter your account password (minimum 8 characters).");
        return;
      }
      payload.email = cleanEmail;
      payload.password = password;
      if (name.trim()) payload.name = name.trim();
      if (username.trim()) payload.username = username.trim().toLowerCase();
    }

    setBusy(true);
    try {
      const res = await fetch("/api/auth/admin-unlock", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        throw new Error(body.error || "Invalid administrator passcode or credentials.");
      }
      const updated = await refreshUserSession();
      if (updated?.isAdmin) {
        onUnlocked?.();
        navigate("/admin", { replace: true });
      } else {
        setError("Passcode verified, but session refresh is still pending. Please refresh.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to unlock admin panel.");
    } finally {
      setBusy(false);
    }
  };

  const handleStandardSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!identifier.trim() || !password) {
      setError("Enter your administrator username or email and password.");
      return;
    }

    setBusy(true);
    try {
      const result = await signInWithEmail(identifier.trim(), password, true);
      if (result.needsVerification) {
        setError(
          result.error ||
            "Your email address requires verification. If you have an admin passcode, use the Unlock with Passcode tab."
        );
        return;
      }
      if (!result.ok) {
        setError(result.error || "Sign-in failed. Verify your credentials.");
        return;
      }
      if (result.session?.isAdmin) {
        onUnlocked?.();
        navigate("/admin", { replace: true });
      } else {
        setNotice(
          "Signed in successfully. Enter the administrator passcode below if this account needs admin elevation."
        );
      }
    } finally {
      setBusy(false);
    }
  };

  const handleSignOutSwitch = async () => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await signOutUser();
      setPasscode("");
      setConfirmPasscode("");
      await loadStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign out.");
    } finally {
      setBusy(false);
    }
  };

  const passcodeReady = Boolean(status?.envPasscodeConfigured || status?.claimed);
  const claimAllowed = Boolean(status?.claimAllowed);

  // Authenticated non-admin user view
  if (user) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] text-[#102030] flex items-center justify-center p-6">
        <Card padding="lg" className="max-w-lg w-full space-y-5 border-[#DCE4EC]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[5px] bg-[#1B4962] text-[#E94D65] flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#E94D65]">
                  Operations Console Access
                </p>
                <h1 className="text-lg font-bold font-heading text-[#102030]">
                  {claimAllowed ? "Claim Administrator Access" : "Unlock Admin Panel"}
                </h1>
              </div>
            </div>
            <Link
              to="/"
              className="text-xs font-medium text-[#5A6B7C] hover:text-[#102030] whitespace-nowrap"
            >
              Home
            </Link>
          </div>

          <div className="rounded-[5px] bg-[#F6F8FA] border border-[#DCE4EC] px-3.5 py-2.5 text-xs text-[#3B4C5E] flex items-center justify-between gap-2">
            <span>
              Signed in as <strong className="text-[#102030]">{user.email}</strong>
            </span>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleSignOutSwitch()}
              className="inline-flex items-center gap-1 font-semibold text-[#1B4962] hover:text-[#E94D65] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Switch Account</span>
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-[5px] bg-[#FDF1F3] border border-[#E94D65]/40 px-4 py-3 text-xs text-[#9F1239]"
            >
              {error}
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="rounded-[5px] bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-800"
            >
              {notice}
            </div>
          )}

          {statusLoading ? (
            <p className="text-xs text-[#5A6B7C]">Checking administrator access policy...</p>
          ) : claimAllowed ? (
            <form onSubmit={handleFirstRunClaim} className="space-y-4">
              <p className="text-xs text-[#4A5B6C] leading-relaxed">
                No administrator passcode has been configured yet. Set an administrator access
                passcode below to claim ownership and unlock the Admin Panel for this account.
              </p>
              <div className="space-y-1.5">
                <label htmlFor="claim-passcode" className="block text-xs font-semibold text-[#102030]">
                  Create Admin Access Passcode
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#7A8B9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="claim-passcode"
                    type={showPasscode ? "text" : "password"}
                    minLength={8}
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-[5px] border border-[#CBD6E2] bg-white pl-9 pr-10 py-2.5 text-sm text-[#102030] focus:border-[#1B4962] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode((p) => !p)}
                    aria-label={showPasscode ? "Hide passcode" : "Show passcode"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#5A6B7C] cursor-pointer"
                  >
                    {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="claim-passcode-confirm"
                  className="block text-xs font-semibold text-[#102030]"
                >
                  Confirm Admin Passcode
                </label>
                <input
                  id="claim-passcode-confirm"
                  type={showPasscode ? "text" : "password"}
                  minLength={8}
                  required
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  placeholder="Repeat administrator passcode"
                  className="w-full rounded-[5px] border border-[#CBD6E2] bg-white px-3 py-2.5 text-sm text-[#102030] focus:border-[#1B4962] focus:outline-none"
                />
              </div>
              <Button type="submit" fullWidth loading={busy}>
                Claim &amp; Unlock Admin Panel
              </Button>
            </form>
          ) : passcodeReady ? (
            <form onSubmit={handlePasscodeUnlock} className="space-y-4">
              <p className="text-xs text-[#4A5B6C] leading-relaxed">
                Enter the server administrator access passcode to elevate your current session and
                unlock the Operations Console.
              </p>
              <div className="space-y-1.5">
                <label htmlFor="unlock-passcode" className="block text-xs font-semibold text-[#102030]">
                  Administrator Access Passcode
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#7A8B9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="unlock-passcode"
                    type={showPasscode ? "text" : "password"}
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter administrator passcode"
                    className="w-full rounded-[5px] border border-[#CBD6E2] bg-white pl-9 pr-10 py-2.5 text-sm text-[#102030] focus:border-[#1B4962] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode((p) => !p)}
                    aria-label={showPasscode ? "Hide passcode" : "Show passcode"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#5A6B7C] cursor-pointer"
                  >
                    {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" fullWidth loading={busy}>
                Unlock Admin Panel
              </Button>
            </form>
          ) : (
            <div className="space-y-3 text-xs text-[#4A5B6C] leading-relaxed">
              <p>
                This account does not hold administrator privileges. Sign out and sign in with your
                designated administrator account, or configure{" "}
                <code className="font-mono text-[#102030]">ADMIN_ACCESS_PASSCODE</code> in server
                settings to unlock via passcode.
              </p>
              <Button type="button" fullWidth loading={busy} onClick={() => void handleSignOutSwitch()}>
                Sign Out &amp; Sign In as Administrator
              </Button>
            </div>
          )}

          <div className="pt-3 border-t border-[#DCE4EC] flex flex-wrap gap-3 text-xs">
            <Link to="/dashboard" className="font-semibold text-[#1B4962] hover:text-[#E94D65]">
              ← Customer Dashboard
            </Link>
            <Link to="/" className="font-medium text-[#5A6B7C] hover:text-[#102030] ml-auto">
              Corporate Website
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Unauthenticated view: dedicated Administrator Sign-In / First-Run Claim / Passcode Unlock
  const showFirstRunPrimary = claimAllowed && tab === "primary";
  const showPasscodeUnlockTab = passcodeReady && tab === "secondary";

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-[#F6F8FA] text-[#102030]">
      <aside className="lg:col-span-5 bg-[#1B4962] text-white relative overflow-hidden flex flex-col justify-between p-8 sm:p-12 border-b lg:border-b-0 lg:border-r border-[#14374B]">
        <img
          src="/images/hero-private-capital.jpg"
          alt="BitfuryTech institutional operations"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1B4962]/92 via-[#1B4962]/86 to-[#112E3E]/96" />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center rounded-md bg-white px-2 py-1 shrink-0">
            <img
              src="/images/brand/bitfurylogo.png"
              alt="Bitfury Tech Investment"
              className="h-8 w-auto"
            />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-200 hover:text-white whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        <div className="relative z-10 my-10 space-y-6">
          <p className="text-xs font-bold uppercase tracking-wider text-[#FFD1D8]">
            Administrator Operations Console
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight text-white leading-snug text-balance">
            Unlock BitfuryTech administrative governance.
          </h1>
          <p className="text-sm text-slate-200 leading-relaxed">
            Manage customer custody approvals, deposit &amp; withdrawal reviews, investment plans,
            property offerings, payment wallets, and live support desks from a server-verified
            session.
          </p>

          <ul className="space-y-3 pt-4 text-xs text-slate-100 border-t border-white/15">
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#E94D65] shrink-0 mt-0.5" />
              <span>Server-verified role enforcement across every administrative route</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-[#E94D65] shrink-0 mt-0.5" />
              <span>Hashed administrator passcode protection and audit trail logging</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#E94D65] shrink-0 mt-0.5" />
              <span>Supports first-run setup, passcode elevation, and direct admin sign-in</span>
            </li>
          </ul>
        </div>

        <div className="relative z-10 text-xs text-slate-300 border-t border-white/15 pt-5">
          © {new Date().getFullYear()} BitfuryTech · Institutional Wealth Administration
        </div>
      </aside>

      <main className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white border border-[#DCE4EC] rounded-[5px] shadow-[0_2px_8px_rgba(16,32,48,0.06)] p-8 sm:p-10 space-y-6">
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#E94D65]">
              Admin Panel Access
            </p>
            <h2 className="text-2xl font-bold font-heading text-[#102030]">
              {showFirstRunPrimary
                ? "First-Run Admin Setup"
                : showPasscodeUnlockTab
                  ? "Unlock with Admin Passcode"
                  : "Administrator Sign In"}
            </h2>
            <p className="text-sm text-[#4A5B6C]">
              {showFirstRunPrimary
                ? "Initialize your administrator account and choose a server-hashed access passcode."
                : showPasscodeUnlockTab
                  ? "Sign in or create an admin session using the server administrator passcode."
                  : "Sign in with your administrator credentials to enter the Operations Console."}
            </p>
          </div>

          {(claimAllowed || passcodeReady) && (
            <div className="grid grid-cols-2 border border-[#DCE4EC] rounded-[5px] p-1 bg-[#F6F8FA] text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setTab("primary");
                  setError(null);
                  setNotice(null);
                }}
                className={`py-2 px-3 rounded-[4px] transition-colors cursor-pointer ${
                  tab === "primary"
                    ? "bg-[#1B4962] text-white"
                    : "text-[#4A5B6C] hover:text-[#102030]"
                }`}
              >
                {claimAllowed ? "Setup Admin" : "Admin Sign In"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("secondary");
                  setError(null);
                  setNotice(null);
                }}
                className={`py-2 px-3 rounded-[4px] transition-colors cursor-pointer ${
                  tab === "secondary"
                    ? "bg-[#1B4962] text-white"
                    : "text-[#4A5B6C] hover:text-[#102030]"
                }`}
              >
                {claimAllowed ? "Existing Sign In" : "Unlock Passcode"}
              </button>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="rounded-[5px] bg-[#FDF1F3] border border-[#E94D65]/40 px-4 py-3 text-xs text-[#9F1239] leading-relaxed"
            >
              {error}
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="rounded-[5px] bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs text-emerald-800 leading-relaxed"
            >
              {notice}
            </div>
          )}

          {statusLoading ? (
            <p className="text-xs text-[#5A6B7C]">Loading administrator access options...</p>
          ) : showFirstRunPrimary ? (
            <form onSubmit={handleFirstRunClaim} noValidate className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="admin-claim-name" className="block text-xs font-semibold text-[#102030]">
                    Display Name
                  </label>
                  <input
                    id="admin-claim-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Administrator"
                    className="w-full rounded-[5px] border border-[#CBD6E2] bg-white px-3 py-2 text-sm text-[#102030] focus:border-[#1B4962] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-claim-username"
                    className="block text-xs font-semibold text-[#102030]"
                  >
                    Username (Optional)
                  </label>
                  <input
                    id="admin-claim-username"
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                    }
                    placeholder="ops_lead"
                    className="w-full rounded-[5px] border border-[#CBD6E2] bg-white px-3 py-2 text-sm font-mono text-[#102030] focus:border-[#1B4962] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="admin-claim-email" className="block text-xs font-semibold text-[#102030]">
                  Administrator Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7A8B9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-claim-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="admin@bitfurytech.cloud"
                    className="w-full rounded-[5px] border border-[#CBD6E2] bg-white pl-9 pr-3 py-2.5 text-sm text-[#102030] focus:border-[#1B4962] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="admin-claim-password"
                  className="block text-xs font-semibold text-[#102030]"
                >
                  Account Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7A8B9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-claim-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-[5px] border border-[#CBD6E2] bg-white pl-9 pr-10 py-2.5 text-sm text-[#102030] focus:border-[#1B4962] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#5A6B7C] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-claim-passcode"
                    className="block text-xs font-semibold text-[#102030]"
                  >
                    Admin Passcode
                  </label>
                  <input
                    id="admin-claim-passcode"
                    type={showPasscode ? "text" : "password"}
                    required
                    minLength={8}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Min. 8 chars"
                    className="w-full rounded-[5px] border border-[#CBD6E2] bg-white px-3 py-2.5 text-sm text-[#102030] focus:border-[#1B4962] focus:outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-claim-confirm"
                    className="block text-xs font-semibold text-[#102030]"
                  >
                    Confirm Passcode
                  </label>
                  <input
                    id="admin-claim-confirm"
                    type={showPasscode ? "text" : "password"}
                    required
                    minLength={8}
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    placeholder="Repeat passcode"
                    className="w-full rounded-[5px] border border-[#CBD6E2] bg-white px-3 py-2.5 text-sm text-[#102030] focus:border-[#1B4962] focus:outline-none"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-[#4A5B6C] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPasscode}
                  onChange={(e) => setShowPasscode(e.target.checked)}
                  className="h-4 w-4 rounded-[2px] border-[#CBD6E2] text-[#1B4962]"
                />
                <span>Show admin passcode</span>
              </label>

              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#E94D65] hover:bg-[#D43B53] disabled:opacity-60 text-white font-heading font-bold text-sm py-3 px-5 rounded-none transition-colors shadow-sm cursor-pointer"
              >
                <span>{busy ? "Initializing Admin..." : "Claim & Unlock Admin Panel"}</span>
              </button>
            </form>
          ) : showPasscodeUnlockTab ? (
            <form onSubmit={handlePasscodeUnlock} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="admin-unlock-email" className="block text-xs font-semibold text-[#102030]">
                  Administrator Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7A8B9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-unlock-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="admin@bitfurytech.cloud"
                    className="w-full rounded-[5px] border border-[#CBD6E2] bg-white pl-9 pr-3 py-2.5 text-sm text-[#102030] focus:border-[#1B4962] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="admin-unlock-password"
                  className="block text-xs font-semibold text-[#102030]"
                >
                  Account Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7A8B9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-unlock-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-[5px] border border-[#CBD6E2] bg-white pl-9 pr-10 py-2.5 text-sm text-[#102030] focus:border-[#1B4962] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#5A6B7C] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="admin-unlock-passcode"
                  className="block text-xs font-semibold text-[#102030]"
                >
                  Administrator Access Passcode
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-[#7A8B9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-unlock-passcode"
                    type={showPasscode ? "text" : "password"}
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter server admin passcode"
                    className="w-full rounded-[5px] border border-[#CBD6E2] bg-white pl-9 pr-10 py-2.5 text-sm text-[#102030] focus:border-[#1B4962] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode((p) => !p)}
                    aria-label={showPasscode ? "Hide passcode" : "Show passcode"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#5A6B7C] cursor-pointer"
                  >
                    {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#E94D65] hover:bg-[#D43B53] disabled:opacity-60 text-white font-heading font-bold text-sm py-3 px-5 rounded-none transition-colors shadow-sm cursor-pointer"
              >
                <span>{busy ? "Verifying Access..." : "Unlock Admin Panel"}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleStandardSignIn} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-login-identifier"
                  className="block text-xs font-semibold text-[#102030]"
                >
                  Administrator Username or Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#7A8B9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-login-identifier"
                    type="text"
                    autoComplete="username"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="admin@bitfurytech.cloud"
                    className="w-full rounded-[5px] border border-[#CBD6E2] bg-white pl-9 pr-3 py-2.5 text-sm text-[#102030] focus:border-[#1B4962] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="admin-login-password"
                  className="block text-xs font-semibold text-[#102030]"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7A8B9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter administrator password"
                    className="w-full rounded-[5px] border border-[#CBD6E2] bg-white pl-9 pr-10 py-2.5 text-sm text-[#102030] focus:border-[#1B4962] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#5A6B7C] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#E94D65] hover:bg-[#D43B53] disabled:opacity-60 text-white font-heading font-bold text-sm py-3 px-5 rounded-none transition-colors shadow-sm cursor-pointer"
              >
                <span>{busy ? "Authenticating..." : "Sign In to Admin Panel"}</span>
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-[#DCE4EC] flex items-center justify-between text-xs text-[#4A5B6C]">
            <Link to="/login" className="font-semibold text-[#1B4962] hover:text-[#E94D65] underline">
              Investor Sign In
            </Link>
            <Link to="/" className="font-medium text-[#5A6B7C] hover:text-[#102030]">
              Corporate Website
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
