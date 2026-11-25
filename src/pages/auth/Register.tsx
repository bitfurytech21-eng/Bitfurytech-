import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AtSign,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  User,
} from "lucide-react";
import AuthLayout from "../../layouts/AuthLayout";
import { useAuth } from "../../hooks/useAuth";
import { validateUsername } from "../../lib/username";

function generateChallenge() {
  const a = Math.floor(Math.random() * 15) + 4;
  const b = Math.floor(Math.random() * 14) + 3;
  return { a, b, expected: a + b };
}

export default function Register() {
  const {
    user,
    backendSession,
    authReady,
    authBusy,
    authError,
    clearAuthError,
    registerWithEmail,
    signInWithGoogle,
    resendVerificationEmail,
    refreshUserSession,
  } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlReferralCode = (searchParams.get("ref") || "").trim().toUpperCase().slice(0, 40);

  const [fullName, setFullName] = useState("");
  const [referralCode, setReferralCode] = useState(urlReferralCode);
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message?: string;
  }>({ checking: false, available: null });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [challenge, setChallenge] = useState(() => generateChallenge());
  const [captchaInput, setCaptchaInput] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [verifyFeedback, setVerifyFeedback] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);

  useEffect(() => {
    if (authReady && user && user.emailVerified && backendSession) {
      navigate(backendSession.isAdmin ? "/admin" : "/dashboard", { replace: true });
    }
  }, [authReady, backendSession, user, navigate]);

  const refreshChallenge = () => {
    setChallenge(generateChallenge());
    setCaptchaInput("");
  };

  const checkUsernameAvailability = async (rawValue: string) => {
    const check = validateUsername(rawValue);
    if (!check.valid) {
      setUsernameStatus({ checking: false, available: false, message: check.error });
      return;
    }
    setUsernameStatus({ checking: true, available: null });
    try {
      const res = await fetch("/api/auth/check-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: check.normalized }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        available?: boolean | null;
        error?: string;
      };
      if (body.available === true) {
        setUsernameStatus({
          checking: false,
          available: true,
          message: `@${check.normalized} is available.`,
        });
      } else if (body.available === false) {
        setUsernameStatus({
          checking: false,
          available: false,
          message: body.error || "This username is already taken.",
        });
      } else {
        setUsernameStatus({
          checking: false,
          available: null,
          message: body.error,
        });
      }
    } catch {
      setUsernameStatus({ checking: false, available: null });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearAuthError();

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const usernameCheck = validateUsername(username);

    if (trimmedName.length < 2 || trimmedName.length > 120) {
      setLocalError("Enter your full name (2 to 120 characters).");
      return;
    }
    if (!usernameCheck.valid) {
      setLocalError(usernameCheck.error || "Enter a valid username.");
      return;
    }
    if (
      trimmedEmail.length < 3 ||
      trimmedEmail.length > 200 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
    ) {
      setLocalError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setLocalError("Password must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setLocalError("Password and confirm password do not match.");
      return;
    }
    if (!acceptedTerms) {
      setLocalError("You must accept the Terms & Risk Disclosure and Privacy Policy to continue.");
      return;
    }

    const parsedCaptcha = Number(captchaInput.trim());
    if (!Number.isFinite(parsedCaptcha) || parsedCaptcha !== challenge.expected) {
      setLocalError("Security challenge answer is incorrect. Solve the updated arithmetic prompt.");
      refreshChallenge();
      return;
    }

    const result = await registerWithEmail(
      trimmedName,
      trimmedEmail,
      password,
      usernameCheck.normalized,
      referralCode.trim().toUpperCase() || undefined
    );
    if (!result.ok) {
      refreshChallenge();
      return;
    }

    if (result.needsVerification) {
      setRegisteredEmail(trimmedEmail);
    } else {
      navigate(result.session?.isAdmin ? "/admin" : "/dashboard", { replace: true });
    }
  };

  const handleGoogleRegister = async () => {
    setLocalError(null);
    clearAuthError();
    const cleanRef = referralCode.trim().toUpperCase();
    if (cleanRef && typeof window !== "undefined") {
      window.sessionStorage.setItem("bf_pending_referral", cleanRef);
    }
    const result = await signInWithGoogle();
    if (result.ok) {
      navigate(result.session?.isAdmin ? "/admin" : "/dashboard", { replace: true });
    }
  };

  const handleResendVerification = async () => {
    setVerifyBusy(true);
    setVerifyFeedback(null);
    try {
      await resendVerificationEmail();
      setVerifyFeedback("Verification link re-sent. Check your inbox and spam folder.");
    } catch (err) {
      setVerifyFeedback(
        err instanceof Error ? err.message : "Unable to resend verification email right now."
      );
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleCheckVerification = async () => {
    setVerifyBusy(true);
    setVerifyFeedback(null);
    try {
      const session = await refreshUserSession();
      if (session?.emailVerified) {
        navigate(session.isAdmin ? "/admin" : "/dashboard", { replace: true });
      } else {
        setVerifyFeedback("Email verification is still pending. Click the link in your inbox first.");
      }
    } catch (err) {
      setVerifyFeedback(
        err instanceof Error ? err.message : "Unable to check verification status."
      );
    } finally {
      setVerifyBusy(false);
    }
  };

  const displayedError = localError || authError;

  return (
    <AuthLayout
      eyebrow="Investor Onboarding"
      headline="Initialize your segregated BitfuryTech investor account."
      description="Register with verified identity credentials to provision an account-isolated custody ledger initialized cleanly at $0.00."
    >
      <div className="w-full max-w-lg bg-white border border-[#DCE4EC] rounded-[5px] shadow-[0_2px_8px_rgba(16,32,48,0.06)] p-5 sm:p-10 space-y-6">
        {registeredEmail ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[5px] bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                  Account Created
                </p>
                <h2 className="text-xl font-bold font-heading text-[#102030]">
                  Verify Your Email to Continue
                </h2>
              </div>
            </div>

            <p className="text-sm text-[#3B4C5E] leading-relaxed">
              Your BitfuryTech account for{" "}
              <strong className="text-[#102030]">{registeredEmail}</strong> has been created and a
              verification link has been sent to your inbox. Verify your email to provision your
              Neon investor profile.
            </p>

            {verifyFeedback && (
              <div
                role="status"
                className="rounded-[5px] bg-[#F6F8FA] border border-[#DCE4EC] px-4 py-3 text-xs text-[#3B4C5E]"
              >
                {verifyFeedback}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={verifyBusy}
                onClick={handleCheckVerification}
                className="bg-[#E94D65] hover:bg-[#D43B53] disabled:opacity-60 text-white text-xs font-heading font-bold px-5 py-2.5 rounded-none cursor-pointer"
              >
                {verifyBusy ? "Checking..." : "I Have Verified — Continue"}
              </button>
              <button
                type="button"
                disabled={verifyBusy}
                onClick={handleResendVerification}
                className="bg-[#1B4962] hover:bg-[#14374B] disabled:opacity-60 text-white text-xs font-heading font-bold px-5 py-2.5 rounded-none cursor-pointer"
              >
                Resend Verification Email
              </button>
            </div>

            <div className="pt-4 border-t border-[#DCE4EC] text-xs text-[#4A5B6C]">
              <Link to="/login" className="font-semibold text-[#1B4962] hover:text-[#E94D65] underline">
                Return to Login
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-1.5">
              <p className="text-xs font-bold uppercase tracking-wider text-[#E94D65]">
                New Investor Registration
              </p>
              <h2 className="text-2xl font-bold font-heading text-[#102030]">
                Create BitfuryTech Account
              </h2>
              <p className="text-sm text-[#4A5B6C]">
                Complete your investor registration details below or continue with Google
                Authentication.
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

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="reg-name"
                  className="block text-xs font-semibold text-[#102030]"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#7A8B9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-name"
                    type="text"
                    autoComplete="name"
                    maxLength={120}
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full legal name"
                    className="w-full rounded-[5px] border border-[#CBD6E2] bg-white pl-9 pr-3 py-2.5 text-sm text-[#102030] placeholder:text-[#7A8B9C] focus:border-[#1B4962] focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="reg-username"
                    className="block text-xs font-semibold text-[#102030]"
                  >
                    Username
                  </label>
                  <span className="text-[11px] text-[#5A6B7C]">
                    3–30 chars (a-z, 0-9, _)
                  </span>
                </div>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-[#7A8B9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-username"
                    type="text"
                    autoComplete="username"
                    maxLength={30}
                    required
                    value={username}
                    onChange={(e) => {
                      const next = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "");
                      setUsername(next);
                      setUsernameStatus({ checking: false, available: null });
                    }}
                    onBlur={() => {
                      if (username.trim().length >= 3) {
                        void checkUsernameAvailability(username);
                      }
                    }}
                    placeholder="investor_handle"
                    className="w-full rounded-[5px] border border-[#CBD6E2] bg-white pl-9 pr-3 py-2.5 text-sm font-mono text-[#102030] placeholder:text-[#7A8B9C] focus:border-[#1B4962] focus:outline-none"
                  />
                </div>
                {usernameStatus.checking && (
                  <p className="text-[11px] text-[#5A6B7C]">Checking username availability...</p>
                )}
                {!usernameStatus.checking && usernameStatus.message && (
                  <p
                    className={`text-[11px] font-medium ${
                      usernameStatus.available === true
                        ? "text-emerald-700"
                        : usernameStatus.available === false
                          ? "text-[#BE123C]"
                          : "text-amber-700"
                    }`}
                  >
                    {usernameStatus.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-semibold text-[#102030]"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#7A8B9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    maxLength={200}
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="investor@domain.com"
                    className="w-full rounded-[5px] border border-[#CBD6E2] bg-white pl-9 pr-3 py-2.5 text-sm text-[#102030] placeholder:text-[#7A8B9C] focus:border-[#1B4962] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="reg-password"
                    className="block text-xs font-semibold text-[#102030]"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#7A8B9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={8}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full rounded-[5px] border border-[#CBD6E2] bg-white pl-9 pr-9 py-2.5 text-sm text-[#102030] placeholder:text-[#7A8B9C] focus:border-[#1B4962] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#5A6B7C] hover:text-[#102030] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="reg-confirm"
                    className="block text-xs font-semibold text-[#102030]"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#7A8B9C] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reg-confirm"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      minLength={8}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="w-full rounded-[5px] border border-[#CBD6E2] bg-white pl-9 pr-9 py-2.5 text-sm text-[#102030] placeholder:text-[#7A8B9C] focus:border-[#1B4962] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((p) => !p)}
                      aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#5A6B7C] hover:text-[#102030] cursor-pointer"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Numeric Security Challenge (CAPTCHA) */}
              <div className="rounded-[5px] bg-[#F6F8FA] border border-[#DCE4EC] p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="reg-captcha"
                    className="text-xs font-semibold text-[#102030]"
                  >
                    Security Challenge: What is{" "}
                    <span className="font-mono text-[#1B4962]">
                      {challenge.a} + {challenge.b}
                    </span>
                    ?
                  </label>
                  <button
                    type="button"
                    onClick={refreshChallenge}
                    aria-label="Refresh security challenge"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#1B4962] hover:text-[#E94D65] cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>New Prompt</span>
                  </button>
                </div>
                <input
                  id="reg-captcha"
                  type="number"
                  inputMode="numeric"
                  required
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  placeholder="Enter numeric sum"
                  className="w-full rounded-[5px] border border-[#CBD6E2] bg-white px-3 py-2 text-sm font-mono tabular-nums text-[#102030] placeholder:text-[#7A8B9C] focus:border-[#1B4962] focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="reg-ref"
                    className="block text-xs font-semibold text-[#102030]"
                  >
                    Referral Code (Optional)
                  </label>
                  {urlReferralCode && (
                    <span className="text-[11px] font-medium text-emerald-700">
                      Captured from invite link
                    </span>
                  )}
                </div>
                <input
                  id="reg-ref"
                  type="text"
                  maxLength={40}
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="BF-XXXXXXXX"
                  className="w-full rounded-[5px] border border-[#CBD6E2] bg-white px-3 py-2 text-sm font-mono text-[#102030] placeholder:text-[#7A8B9C] focus:border-[#1B4962] focus:outline-none"
                />
              </div>

              <label className="flex items-start gap-2.5 text-xs text-[#4A5B6C] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded-[2px] border-[#CBD6E2] text-[#1B4962] focus:ring-[#1B4962]"
                />
                <span>
                  I accept the BitfuryTech{" "}
                  <Link to="/terms" className="font-semibold text-[#1B4962] hover:text-[#E94D65] underline">
                    Terms &amp; Risk Disclosure
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="font-semibold text-[#1B4962] hover:text-[#E94D65] underline">
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>

              <button
                type="submit"
                disabled={authBusy}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#E94D65] hover:bg-[#D43B53] disabled:opacity-60 text-white font-heading font-bold text-sm py-3 px-5 rounded-none transition-colors shadow-sm cursor-pointer"
              >
                <span>{authBusy ? "Creating Account..." : "Create Account"}</span>
              </button>
            </form>

            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-[#DCE4EC]" />
              <span className="mx-3 text-[11px] font-medium uppercase tracking-wider text-[#5A6B7C]">
                Or register instantly with
              </span>
              <div className="flex-grow border-t border-[#DCE4EC]" />
            </div>

            <button
              type="button"
              disabled={authBusy}
              onClick={handleGoogleRegister}
              className="w-full inline-flex items-center justify-center gap-2.5 bg-[#1B4962] hover:bg-[#14374B] disabled:opacity-60 text-white font-heading font-bold text-xs py-3 px-4 rounded-none transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-[#E94D65]" />
              <span>Register with Google Authentication</span>
            </button>

            <div className="pt-4 border-t border-[#DCE4EC] flex items-center justify-between text-xs text-[#4A5B6C]">
              <span>Already have an investor account?</span>
              <Link
                to="/login"
                className="font-semibold text-[#1B4962] hover:text-[#E94D65] underline"
              >
                Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
