import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, KeyRound, LogOut, ShieldAlert, ShieldCheck } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { buttonClasses, Card, ErrorState, Spinner } from "./ui";

interface AdminAccessStatusResponse {
  ok?: boolean;
  mode?: "env_passcode" | "claimed_passcode" | "setup_required";
  requiresSetup?: boolean;
  passcodeConfigured?: boolean;
  isAdmin?: boolean;
  error?: string;
}

export function FullPageLoader({
  label = "Verifying BitfuryTech session...",
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-screen bg-[#f5f8fa] text-slate-900 flex flex-col items-center justify-center p-6"
    >
      <Card padding="md" className="px-7 py-5">
        <Spinner label={label} />
      </Card>
    </div>
  );
}

export function RouteErrorState({
  title = "Workspace Connection Interrupted",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#f5f8fa] text-slate-900 flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-3">
        <ErrorState title={title} message={message} onRetry={onRetry} />
        <div className="text-center">
          <Link to="/" className={buttonClasses({ variant: "outline", size: "sm" })}>
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export function UnauthorizedState() {
  const { user, refreshUserSession, signOutUser } = useAuth();
  const navigate = useNavigate();

  const [statusLoading, setStatusLoading] = useState(true);
  const [requiresSetup, setRequiresSetup] = useState(false);
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [showPasscode, setShowPasscode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadStatus = async () => {
      setStatusLoading(true);
      try {
        const res = await fetch("/api/auth/admin-access/status", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
        });
        const body = (await res.json().catch(() => ({}))) as AdminAccessStatusResponse;
        if (!active) return;
        if (res.ok) {
          if (body.isAdmin) {
            await refreshUserSession();
            return;
          }
          setRequiresSetup(Boolean(body.requiresSetup));
        }
      } catch {
        if (active) {
          setRequiresSetup(false);
        }
      } finally {
        if (active) setStatusLoading(false);
      }
    };
    void loadStatus();
    return () => {
      active = false;
    };
  }, [refreshUserSession]);

  const handleActivateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const trimmed = passcode.trim();
    if (trimmed.length < 8) {
      setError("Administrator passcode must be at least 8 characters.");
      return;
    }
    if (requiresSetup && trimmed !== confirmPasscode.trim()) {
      setError("Passcode and confirmation do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = requiresSetup
        ? "/api/auth/admin-access/setup"
        : "/api/auth/admin-access/unlock";
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
        },
        body: JSON.stringify({ passcode: trimmed }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        if (res.status === 409) {
          setRequiresSetup(false);
        }
        throw new Error(body.error || "Unable to verify administrator authorization.");
      }

      setNotice("Administrator access activated. Opening console...");
      setPasscode("");
      setConfirmPasscode("");
      await refreshUserSession();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to activate administrator access."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSwitchAccount = async () => {
    setSwitchingAccount(true);
    try {
      await signOutUser();
      navigate("/login", { state: { from: { pathname: "/admin" } }, replace: true });
    } catch {
      setSwitchingAccount(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f8fa] text-slate-900 flex items-center justify-center p-6">
      <Card padding="lg" className="max-w-lg w-full space-y-5 border-slate-200">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 text-[#E94D65]">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <h1 className="text-base font-bold font-heading text-slate-900">
              Administrator Access Required
            </h1>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your signed-in account
            {user?.email ? (
              <>
                {" "}
                (<span className="font-semibold text-slate-900">{user.email}</span>)
              </>
            ) : null}{" "}
            does not hold settlement administrator privileges yet.{" "}
            {requiresSetup
              ? "Set the administrator passcode below to activate the Admin Panel for this account."
              : "Enter your administrator access passcode to unlock the Admin Panel, or switch to a designated administrator account."}
          </p>
        </div>

        <div className="rounded-[5px] border border-[#DCE4EC] bg-[#F8FAFC] p-4 space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1B4962]">
            <ShieldCheck className="w-4 h-4 text-[#E94D65] shrink-0" />
            <span>
              {statusLoading
                ? "Checking Activation Status..."
                : requiresSetup
                  ? "First-Run Admin Activation"
                  : "Unlock Admin Panel"}
            </span>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-[5px] bg-[#FDF1F3] border border-[#E94D65]/40 px-3.5 py-2.5 text-xs text-[#9F1239]"
            >
              {error}
            </div>
          )}

          {notice && (
            <div
              role="status"
              className="rounded-[5px] bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-xs text-emerald-800"
            >
              {notice}
            </div>
          )}

          {!statusLoading && (
            <form onSubmit={handleActivateAdmin} noValidate className="space-y-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-access-passcode"
                  className="block text-xs font-semibold text-slate-800"
                >
                  {requiresSetup ? "Create Administrator Passcode" : "Administrator Passcode"}
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-access-passcode"
                    type={showPasscode ? "text" : "password"}
                    autoComplete={requiresSetup ? "new-password" : "current-password"}
                    required
                    minLength={8}
                    maxLength={128}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder={
                      requiresSetup
                        ? "Choose at least 8 characters"
                        : "Enter administrator passcode"
                    }
                    className="w-full rounded-[5px] border border-[#CBD6E2] bg-white pl-9 pr-10 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1B4962] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasscode((prev) => !prev)}
                    aria-label={showPasscode ? "Hide passcode" : "Show passcode"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {showPasscode ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {requiresSetup && (
                <div className="space-y-1.5">
                  <label
                    htmlFor="admin-access-passcode-confirm"
                    className="block text-xs font-semibold text-slate-800"
                  >
                    Confirm Administrator Passcode
                  </label>
                  <input
                    id="admin-access-passcode-confirm"
                    type={showPasscode ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={128}
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    placeholder="Repeat administrator passcode"
                    className="w-full rounded-[5px] border border-[#CBD6E2] bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1B4962] focus:outline-none"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#1B4962] hover:bg-[#14374B] disabled:opacity-60 text-white font-heading font-bold text-xs py-2.5 px-4 rounded-none transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#E94D65]" />
                <span>
                  {submitting
                    ? "Verifying..."
                    : requiresSetup
                      ? "Activate Admin Panel"
                      : "Unlock Admin Panel"}
                </span>
              </button>
            </form>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Link to="/dashboard" className={buttonClasses({ variant: "primary", size: "md" })}>
            Customer Dashboard
          </Link>
          <Link to="/" className={buttonClasses({ variant: "outline", size: "md" })}>
            Corporate Website
          </Link>
          <button
            type="button"
            disabled={switchingAccount}
            onClick={() => void handleSwitchAccount()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B4962] hover:text-[#E94D65] px-2 py-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{switchingAccount ? "Signing out..." : "Switch Account"}</span>
          </button>
        </div>
      </Card>
    </div>
  );
}
