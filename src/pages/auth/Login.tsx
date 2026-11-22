import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Hexagon,
  Lock,
  ShieldCheck,
  User,
} from "lucide-react";
import { BackendSessionProfile } from "../../context/AuthContext";
import { useAuth } from "../../hooks/useAuth";
import { validateUsername } from "../../lib/username";

function resolveAuthorizedDestination(
  session: BackendSessionProfile | undefined,
  fromPath?: string
): string {
  const isAdmin = Boolean(session?.isAdmin);
  if (fromPath) {
    if (fromPath.startsWith("/admin") && !isAdmin) {
      return "/dashboard";
    }
    if (fromPath !== "/login" && fromPath !== "/register") {
      return fromPath;
    }
  }
  return isAdmin ? "/admin" : "/dashboard";
}

export default function Login() {
  const {
    firebaseUser,
    backendSession,
    authReady,
    authBusy,
    authError,
    clearAuthError,
    signInWithEmail,
    signInWithGoogle,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: { pathname?: string } } | null)?.from
    ?.pathname;

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (authReady && firebaseUser && backendSession) {
      navigate(resolveAuthorizedDestination(backendSession, fromPath), {
        replace: true,
      });
    }
  }, [authReady, backendSession, firebaseUser, fromPath, navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    const trimmed = identifier.trim();
    if (!trimmed) {
      setLocalError("Enter your registered username or email address.");
      return;
    }

    if (trimmed.includes("@")) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        setLocalError("Enter a valid email address.");
        return;
      }
    } else {
      const usernameCheck = validateUsername(trimmed);
      if (!usernameCheck.valid) {
        setLocalError(usernameCheck.error || "Enter a valid username or email address.");
        return;
      }
    }

    if (!password) {
      setLocalError("Enter your account password.");
      return;
    }

    const result = await signInWithEmail(trimmed, password, rememberMe);
    if (result.ok) {
      navigate(resolveAuthorizedDestination(result.session, fromPath), {
        replace: true,
      });
    }
  };

  const handleGoogleLogin = async () => {
    setLocalError(null);
    clearAuthError();
    const result = await signInWithGoogle();
    if (result.ok) {
      navigate(resolveAuthorizedDestination(result.session, fromPath), {
        replace: true,
      });
    }
  };

  const displayedError = localError || authError;

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-[#F6F8FA] text-[#102030]">
      {/* Left Branded Column */}
      <aside className="lg:col-span-5 bg-[#1B4962] text-white relative overflow-hidden flex flex-col justify-between p-8 sm:p-12 border-b lg:border-b-0 lg:border-r border-[#14374B]">
        <img
          src="/images/hero-private-capital.png"
          alt="BitfuryTech institutional wealth workspace"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1B4962]/92 via-[#1B4962]/86 to-[#112E3E]/96" />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-heading font-extrabold text-xl text-white whitespace-nowrap shrink-0"
          >
            <Hexagon className="w-6 h-6 text-[#E94D65] fill-[#E94D65]/20 shrink-0" />
            <span>
              Bitfury<span className="text-[#E94D65]">Tech</span>
            </span>
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
            Client Custody Access
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight text-white leading-snug text-balance">
            Welcome back to your BitfuryTech investment workspace.
          </h1>
          <p className="text-sm text-slate-200 leading-relaxed">
            Access your segregated custody wallet, review pending and settled transactions, and
            manage active allocations across Digital Assets, Global Equities, and Commercial Real
            Estate.
          </p>

          <ul className="space-y-3 pt-4 text-xs text-slate-100 border-t border-white/15">
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#E94D65] shrink-0 mt-0.5" />
              <span>Role-isolated Firebase authentication and backend session verification</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-[#E94D65] shrink-0 mt-0.5" />
              <span>Segregated ledger tracking with explicit deposit &amp; payout review</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#E94D65] shrink-0 mt-0.5" />
              <span>Real-time portfolio synchronization across mandates and property listings</span>
            </li>
          </ul>
        </div>

        <div className="relative z-10 text-xs text-slate-300 border-t border-white/15 pt-5">
          © {new Date().getFullYear()} BitfuryTech · Institutional Wealth Administration
        </div>
      </aside>

      {/* Right Authentication Form Column */}
      <main className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white border border-[#DCE4EC] rounded-[5px] shadow-[0_2px_8px_rgba(16,32,48,0.06)] p-8 sm:p-10 space-y-6">
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-[#E94D65]">
              Investor Sign In
            </p>
            <h2 className="text-2xl font-bold font-heading text-[#102030]">Sign in to BitfuryTech</h2>
            <p className="text-sm text-[#4A5B6C]">
              Authenticate with your registered credentials to verify your session and open your
              authorized portal.
            </p>
          </div>

          {displayedError && (
            <div
              role="alert"
              className="rounded-[5px] bg-[#FDF1F3] border border-[#E94D65]/40 px-4 py-3 text-xs text-[#9F1239] leading-relaxed"
            >
              {displayedError}
            </div>
          )}

          <form onSubmit={handleEmailLogin} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="login-identifier"
                  className="block text-xs font-semibold text-[#102030]"
                >
                  Username or Email Address
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#7A8B9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-identifier"
                    type="text"
                    autoComplete="username"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="username or investor@domain.com"
                    className="w-full rounded-[5px] border border-[#CBD6E2] bg-white pl-9 pr-3 py-2.5 text-sm text-[#102030] placeholder:text-[#7A8B9C] focus:border-[#1B4962] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-[#102030]"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7A8B9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-[5px] border border-[#CBD6E2] bg-white pl-9 pr-10 py-2.5 text-sm text-[#102030] placeholder:text-[#7A8B9C] focus:border-[#1B4962] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#5A6B7C] hover:text-[#102030] cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-2 text-xs text-[#4A5B6C] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded-[2px] border-[#CBD6E2] text-[#1B4962] focus:ring-[#1B4962]"
                  />
                  <span>Remember me</span>
                </label>

                <Link
                  to="/forgot-password"
                  state={{ email: identifier.includes("@") ? identifier : "" }}
                  className="text-xs font-semibold text-[#1B4962] hover:text-[#E94D65]"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={authBusy}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#E94D65] hover:bg-[#D43B53] disabled:opacity-60 text-white font-heading font-bold text-sm py-3 px-5 rounded-none transition-colors shadow-sm cursor-pointer"
              >
                <span>{authBusy ? "Authenticating..." : "Login"}</span>
              </button>
          </form>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-[#DCE4EC]" />
            <span className="mx-3 text-[11px] font-medium uppercase tracking-wider text-[#5A6B7C]">
              Or continue with
            </span>
            <div className="flex-grow border-t border-[#DCE4EC]" />
          </div>

          <button
            type="button"
            disabled={authBusy}
            onClick={handleGoogleLogin}
            className="w-full inline-flex items-center justify-center gap-2.5 bg-[#1B4962] hover:bg-[#14374B] disabled:opacity-60 text-white font-heading font-bold text-xs py-3 px-4 rounded-none transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-[#E94D65]" />
            <span>Sign In with Google Authentication</span>
          </button>

          <div className="pt-4 border-t border-[#DCE4EC] flex items-center justify-between text-xs text-[#4A5B6C]">
            <span>New to BitfuryTech?</span>
            <Link
              to="/register"
              className="font-semibold text-[#1B4962] hover:text-[#E94D65] underline"
            >
              Create Account
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
