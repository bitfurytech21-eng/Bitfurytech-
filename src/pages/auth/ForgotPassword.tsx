import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import AuthLayout from "../../layouts/AuthLayout";
import { useAuth } from "../../hooks/useAuth";

export default function ForgotPassword() {
  const { sendPasswordReset } = useAuth();
  const location = useLocation();
  const initialEmail =
    (location.state as { email?: string } | null)?.email ?? "";

  const [email, setEmail] = useState(initialEmail);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid registered email address.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await sendPasswordReset(trimmed);
      if (!result.ok) {
        setError(result.error || "Unable to send password recovery email.");
        return;
      }
      setSentTo(trimmed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Account Recovery"
      headline="Recover access to your BitfuryTech client portal."
      description="Request a secure Firebase password reset link for your registered email address."
    >
      <div className="w-full max-w-md bg-white border border-[#DCE4EC] rounded-[5px] shadow-[0_2px_8px_rgba(16,32,48,0.06)] p-8 sm:p-10 space-y-6">
        {sentTo ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[5px] bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Recovery Dispatched
                </p>
                <h2 className="text-xl font-bold font-heading text-[#102030]">Check Your Inbox</h2>
              </div>
            </div>

            <p className="text-sm text-[#3B4C5E] leading-relaxed">
              If a BitfuryTech account is registered for{" "}
              <strong className="text-[#102030]">{sentTo}</strong>, Firebase Authentication has sent
              a password reset link. Check your inbox and spam folder to complete recovery.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link
                to="/login"
                className="bg-[#E94D65] hover:bg-[#D43B53] text-white text-xs font-heading font-bold px-5 py-2.5 rounded-none"
              >
                Return to Login
              </Link>
              <button
                type="button"
                onClick={() => setSentTo(null)}
                className="bg-[#1B4962] hover:bg-[#14374B] text-white text-xs font-heading font-bold px-4 py-2.5 rounded-none cursor-pointer"
              >
                Try Another Email
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#E94D65]">
                Password Recovery
              </p>
              <h2 className="text-2xl font-bold font-heading text-[#102030]">Reset Your Password</h2>
              <p className="text-sm text-[#4A5B6C]">
                Enter the email address linked to your BitfuryTech account to receive a password
                reset link.
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-[5px] bg-[#FDF1F3] border border-[#E94D65]/40 px-4 py-3 text-xs text-[#9F1239] leading-relaxed"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="forgot-email"
                  className="block text-xs font-semibold text-[#102030]"
                >
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7A8B9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="investor@domain.com"
                    className="w-full rounded-[5px] border border-[#CBD6E2] bg-white pl-9 pr-3 py-2.5 text-sm text-[#102030] placeholder:text-[#7A8B9C] focus:border-[#1B4962] focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center bg-[#E94D65] hover:bg-[#D43B53] disabled:opacity-60 text-white font-heading font-bold text-sm py-3 px-5 rounded-none transition-colors shadow-sm cursor-pointer"
              >
                {submitting ? "Sending Recovery Email..." : "Send Password Reset Link"}
              </button>
            </form>

            <div className="pt-4 border-t border-[#DCE4EC]">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B4962] hover:text-[#E94D65]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Login</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
