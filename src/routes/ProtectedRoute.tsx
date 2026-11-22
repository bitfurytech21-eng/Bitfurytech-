import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import {
  FullPageLoader,
  RouteErrorState,
  UnauthorizedState,
} from "../components/RouteStates";

interface ProtectedRouteProps {
  mode?: "customer" | "admin" | "guestOnly";
  children?: React.ReactNode;
}

type AdminGateState = "checking" | "authorized" | "unauthorized" | "unauthenticated";

function EmailVerificationGate() {
  const {
    firebaseUser,
    resendVerificationEmail,
    refreshUserSession,
    signOutUser,
  } = useAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleResend = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await resendVerificationEmail();
      setNotice("Verification email sent. Check your inbox and then click Refresh Status.");
    } catch (err) {
      setNotice(
        err instanceof Error ? err.message : "Unable to resend verification email right now."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const session = await refreshUserSession();
      if (session && !session.emailVerified) {
        setNotice("Email is still pending verification. Complete the link in your inbox.");
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed to refresh verification status.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-[#DCE4EC] rounded-[5px] shadow-[0_2px_8px_rgba(16,32,48,0.06)] p-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[5px] bg-[#1B4962] text-[#E94D65] flex items-center justify-center shrink-0">
            <MailCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#1B4962]">
              Identity Verification Required
            </p>
            <h1 className="text-lg font-bold font-heading text-[#102030]">Verify Your Email Address</h1>
          </div>
        </div>

        <p className="text-sm text-[#3B4C5E] leading-relaxed">
          Your account (<span className="font-semibold text-[#102030]">{firebaseUser?.email}</span>
          ) must have a verified email before Firestore custody records can be initialized.
        </p>

        {notice && (
          <div className="rounded-[5px] bg-[#F6F8FA] border border-[#DCE4EC] p-3 text-xs text-[#102030]">
            {notice}
          </div>
        )}

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={handleRefresh}
            className="bg-[#E94D65] hover:bg-[#D43B53] disabled:opacity-60 text-white text-xs font-heading font-bold px-4 py-2.5 rounded-none cursor-pointer"
          >
            Refresh Verification Status
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleResend}
            className="bg-[#1B4962] hover:bg-[#14374B] disabled:opacity-60 text-white text-xs font-heading font-bold px-4 py-2.5 rounded-none cursor-pointer"
          >
            Resend Email
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void signOutUser()}
            className="text-xs font-medium text-[#5A6B7C] hover:text-[#102030] px-3 py-2 cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProtectedRoute({
  mode = "customer",
  children,
}: ProtectedRouteProps) {
  const {
    firebaseUser,
    backendSession,
    authReady,
    isAdmin,
    needsEmailVerification,
    authError,
    retryAuthSync,
    verifyAdminSession,
  } = useAuth();
  const location = useLocation();
  const [adminGate, setAdminGate] = useState<AdminGateState>("checking");

  useEffect(() => {
    if (mode !== "admin") return;

    if (!authReady) {
      setAdminGate("checking");
      return;
    }

    if (!firebaseUser || !backendSession) {
      setAdminGate("unauthenticated");
      return;
    }

    if (!isAdmin) {
      setAdminGate("unauthorized");
      return;
    }

    let cancelled = false;
    setAdminGate("checking");

    void verifyAdminSession().then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setAdminGate("authorized");
      } else if (res.status === 401) {
        setAdminGate("unauthenticated");
      } else {
        setAdminGate("unauthorized");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authReady, backendSession, firebaseUser, idToken, isAdmin, location.pathname, mode, verifyAdminSession]);

  if (!authReady) {
    return (
      <FullPageLoader
        label={
          mode === "admin"
            ? "Verifying administrator privileges..."
            : "Verifying BitfuryTech session..."
        }
      />
    );
  }

  if (mode === "guestOnly") {
    if (firebaseUser && backendSession && firebaseUser.emailVerified) {
      const requestedFrom = (location.state as { from?: { pathname?: string } } | null)?.from
        ?.pathname;
      const target =
        requestedFrom && !(requestedFrom.startsWith("/admin") && !isAdmin)
          ? requestedFrom
          : isAdmin
            ? "/admin"
            : "/dashboard";
      return <Navigate to={target} replace />;
    }
    return <>{children ?? <Outlet />}</>;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (needsEmailVerification) {
    return <EmailVerificationGate />;
  }

  if (!backendSession) {
    if (authError) {
      return <RouteErrorState message={authError} onRetry={retryAuthSync} />;
    }
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (mode === "admin") {
    if (adminGate === "checking") {
      return <FullPageLoader label="Confirming server-side administrator authorization..." />;
    }
    if (adminGate === "unauthenticated") {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    if (adminGate === "unauthorized" || !isAdmin) {
      return <UnauthorizedState />;
    }
  }

  return <>{children ?? <Outlet />}</>;
}
