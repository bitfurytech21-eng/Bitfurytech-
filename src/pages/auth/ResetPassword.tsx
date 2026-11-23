import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Lock, CheckCircle2 } from "lucide-react";
import AuthLayout from "../../layouts/AuthLayout";
import { betterAuthClient } from "../../lib/better-auth-client";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(token ? null : "This password reset link is missing its token. Request a new link.");
  const [complete, setComplete] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!token) {
      setError("This password reset link is invalid or expired. Request a new link.");
      return;
    }
    if (password.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result = await betterAuthClient.resetPassword({ newPassword: password, token });
      if (result.error) throw new Error(result.error.message || "Unable to reset password.");
      setComplete(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to reset password. Request a new link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Account Security"
      headline="Choose a new password for your BitfuryTech account."
      description="Your password is securely updated through Better Auth and stored using the Neon-backed authentication service."
    >
      <div className="w-full max-w-md bg-white border border-[#DCE4EC] rounded-[5px] shadow-[0_2px_8px_rgba(16,32,48,0.06)] p-8 sm:p-10 space-y-6">
        {complete ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[5px] bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Password Updated</p>
                <h2 className="text-xl font-bold font-heading text-[#102030]">You can sign in again</h2>
              </div>
            </div>
            <p className="text-sm text-[#4A5B6C]">Your password has been changed and existing sessions have been revoked.</p>
            <button onClick={() => navigate("/login", { replace: true })} className="w-full bg-[#E94D65] hover:bg-[#D43B53] text-white font-heading font-bold text-sm py-3 px-5 rounded-none">Return to Login</button>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#E94D65]">Password Recovery</p>
              <h2 className="text-2xl font-bold font-heading text-[#102030]">Set a New Password</h2>
              <p className="text-sm text-[#4A5B6C]">Enter and confirm your new account password.</p>
            </div>
            {error && <div role="alert" className="rounded-[5px] bg-[#FDF1F3] border border-[#E94D65]/40 px-4 py-3 text-xs text-[#9F1239]">{error}</div>}
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="new-password" className="block text-xs font-semibold text-[#102030]">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#7A8B9C] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-[5px] border border-[#CBD6E2] bg-white pl-9 pr-3 py-2.5 text-sm text-[#102030] focus:border-[#1B4962] focus:outline-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="block text-xs font-semibold text-[#102030]">Confirm New Password</label>
                <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full rounded-[5px] border border-[#CBD6E2] bg-white px-3 py-2.5 text-sm text-[#102030] focus:border-[#1B4962] focus:outline-none" />
              </div>
              <button type="submit" disabled={busy || !token} className="w-full bg-[#E94D65] hover:bg-[#D43B53] disabled:opacity-60 text-white font-heading font-bold text-sm py-3 px-5 rounded-none">{busy ? "Updating Password..." : "Update Password"}</button>
            </form>
            <div className="pt-4 border-t border-[#DCE4EC]">
              <Link to="/forgot-password" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B4962] hover:text-[#E94D65]"><ArrowLeft className="w-3.5 h-3.5" />Request another reset link</Link>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
