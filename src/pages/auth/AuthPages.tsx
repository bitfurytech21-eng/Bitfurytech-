import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import AuthLayout from "../../layouts/AuthLayout";
import { useAuth } from "../../hooks/useAuth";

function AuthFormCard({ mode }: { mode: "login" | "register" }) {
  const { user, authReady, authBusy, authError, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTarget =
    (location.state as { from?: { pathname?: string; search?: string } } | null)?.from
      ?.pathname || "/dashboard";

  useEffect(() => {
    if (authReady && user) {
      navigate(redirectTarget, { replace: true });
    }
  }, [authReady, user, navigate, redirectTarget]);

  const handleGoogleAuth = async () => {
    const result = await signInWithGoogle();
    if (result.ok) {
      navigate(redirectTarget, { replace: true });
    }
  };

  const isRegister = mode === "register";

  return (
    <AuthLayout
      headline={
        isRegister
          ? "Initialize your segregated BitfuryTech investor account."
          : "Sign in to your BitfuryTech portfolio workspace."
      }
    >
      <div className="w-full max-w-md bg-white border border-[#DCE4EC] rounded-[5px] shadow-[0_2px_8px_rgba(27,73,98,0.06)] p-8 sm:p-10 space-y-7">
        <div className="space-y-2">
          <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
            {isRegister ? "New Investor Registration" : "Investor Sign In"}
          </p>
          <h2 className="text-2xl font-heading font-bold text-[#102030]">
            {isRegister ? "Create BitfuryTech Account" : "Welcome back to BitfuryTech"}
          </h2>
          <p className="text-sm text-[#5A6B7C]">
            {isRegister
              ? "Verify your identity with Google Authentication to provision your BitfuryTech client wallet."
              : "Continue with your verified Google account to open the BitfuryTech investor portal."}
          </p>
        </div>

        {authError && (
          <div
            role="alert"
            className="rounded-[5px] bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-700"
          >
            {authError}
          </div>
        )}

        <div className="space-y-4">
          <button
            type="button"
            disabled={authBusy}
            onClick={handleGoogleAuth}
            className="w-full inline-flex items-center justify-center gap-3 bg-[#E94D65] hover:bg-[#D43B53] disabled:opacity-60 text-white font-heading font-bold text-sm py-3 px-5 rounded-none transition-colors shadow-sm cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {authBusy
                ? "Verifying Google Session..."
                : isRegister
                  ? "Register with Google Authentication"
                  : "Sign In with Google"}
            </span>
          </button>

          <p className="text-xs text-[#5A6B7C] leading-relaxed">
            Your session is protected via Better Auth HTTP-only cookies and verified PostgreSQL
            custody ledger records.
          </p>
        </div>

        <div className="pt-5 border-t border-[#DCE4EC] flex items-center justify-between text-xs text-[#5A6B7C]">
          <span>{isRegister ? "Already have an account?" : "Need an investor account?"}</span>
          <Link
            to={isRegister ? "/login" : "/register"}
            className="font-semibold text-[#1B4962] hover:text-[#B92841] underline"
          >
            {isRegister ? "Sign In" : "Register Account"}
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}

export function LoginPage() {
  return <AuthFormCard mode="login" />;
}

export function RegisterPage() {
  return <AuthFormCard mode="register" />;
}
