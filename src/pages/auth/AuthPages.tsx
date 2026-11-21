import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import AuthLayout from "../../layouts/AuthLayout";
import { useAuth } from "../../hooks/useAuth";

function AuthFormCard({ mode }: { mode: "login" | "register" }) {
  const { firebaseUser, authReady, authBusy, authError, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTarget =
    (location.state as { from?: { pathname?: string; search?: string } } | null)?.from
      ?.pathname || "/dashboard";

  useEffect(() => {
    if (authReady && firebaseUser) {
      navigate(redirectTarget, { replace: true });
    }
  }, [authReady, firebaseUser, navigate, redirectTarget]);

  const handleGoogleAuth = async () => {
    const ok = await signInWithGoogle();
    if (ok) {
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
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-sm p-8 sm:p-10 space-y-7">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#294158]">
            {isRegister ? "New Investor Registration" : "Investor Sign In"}
          </p>
          <h2 className="text-2xl font-bold text-slate-900">
            {isRegister ? "Create BitfuryTech Account" : "Welcome back to BitfuryTech"}
          </h2>
          <p className="text-sm text-slate-600">
            {isRegister
              ? "Verify your identity with Google Authentication to provision your BitfuryTech client wallet."
              : "Continue with your verified Google account to open the BitfuryTech investor portal."}
          </p>
        </div>

        {authError && (
          <div
            role="alert"
            className="rounded-md bg-rose-50 border border-rose-200 px-4 py-3 text-xs text-rose-700"
          >
            {authError}
          </div>
        )}

        <div className="space-y-4">
          <button
            type="button"
            disabled={authBusy}
            onClick={handleGoogleAuth}
            className="w-full inline-flex items-center justify-center gap-3 bg-[#1e2b3c] hover:bg-[#294158] disabled:opacity-60 text-white font-semibold text-sm py-3 px-5 rounded-md transition-colors shadow-sm cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-yellow-400" />
            <span>
              {authBusy
                ? "Verifying Google Session..."
                : isRegister
                  ? "Register with Google Authentication"
                  : "Sign In with Google"}
            </span>
          </button>

          <p className="text-xs text-slate-500 leading-relaxed">
            Your session is protected via verified Firebase Identity tokens. Upon sign-in, your
            account document is provisioned or loaded directly from Firestore.
          </p>
        </div>

        <div className="pt-5 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>{isRegister ? "Already have an account?" : "Need an investor account?"}</span>
          <Link
            to={isRegister ? "/login" : "/register"}
            className="font-semibold text-[#1e2b3c] hover:text-[#294158] underline"
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
