import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import type { UserAccount } from "../services/dashboardApi";
import { betterAuthClient } from "../lib/better-auth-client";
import { validateUsername } from "../lib/username";

export interface AuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  displayName: string | null;
  photoUrl?: string | null;
}

export interface BackendSessionProfile {
  uid: string;
  email: string | null;
  displayName?: string | null;
  username?: string | null;
  referralCode?: string | null;
  kycStatus?: string | null;
  hasPasswordProvider?: boolean;
  emailVerified: boolean;
  photoUrl?: string | null;
  role: "admin" | "investor";
  isAdmin: boolean;
  authTime?: number;
  expiresAt?: number;
}

export interface AuthActionResult {
  ok: boolean;
  session?: BackendSessionProfile;
  needsVerification?: boolean;
  error?: string;
}
export interface AdminVerifyResult { ok: boolean; status: number; error?: string; }

export interface AuthContextValue {
  user: AuthUser | null;
  profile: UserAccount | null;
  backendSession: BackendSessionProfile | null;
  authReady: boolean;
  authBusy: boolean;
  isAdmin: boolean;
  hasPasswordProvider: boolean;
  needsEmailVerification: boolean;
  authError: string | null;
  clearAuthError: () => void;
  retryAuthSync: () => Promise<void>;
  refreshUserSession: () => Promise<BackendSessionProfile | null>;
  verifyAdminSession: () => Promise<AdminVerifyResult>;
  resendVerificationEmail: (email?: string) => Promise<void>;
  signInWithEmail: (identifier: string, password: string, rememberMe: boolean) => Promise<AuthActionResult>;
  registerWithEmail: (fullName: string, email: string, password: string, username: string, referralCode?: string) => Promise<AuthActionResult>;
  updateAccountPassword: (newPassword: string, currentPassword?: string) => Promise<{ ok: boolean; error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  signInWithGoogle: () => Promise<AuthActionResult>;
  signOutUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

type SessionResponse = {
  authenticated?: boolean;
  user?: {
    id?: string;
    name?: string;
    username?: string | null;
    referralCode?: string | null;
    kycStatus?: string | null;
    hasPasswordProvider?: boolean;
    email?: string | null;
    emailVerified?: boolean;
    photoUrl?: string | null;
    image?: string | null;
    role?: string;
    isAdmin?: boolean;
  };
  session?: { expiresAt?: string | number };
  error?: string;
};

function toAuthErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message || fallback);
  }
  return fallback;
}

async function readSession(): Promise<BackendSessionProfile | null> {
  const response = await fetch("/api/account/session", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (response.status === 401) return null;
  const body = (await response.json().catch(() => ({}))) as SessionResponse;
  if (!response.ok || !body.authenticated || !body.user?.id) {
    throw new Error(body.error || "Unable to verify your Better Auth session.");
  }
  const expiry = body.session?.expiresAt;
  return {
    uid: body.user.id,
    email: body.user.email ?? null,
    displayName: body.user.name ?? null,
    username: body.user.username ?? null,
    referralCode: body.user.referralCode ?? null,
    kycStatus: body.user.kycStatus ?? null,
    hasPasswordProvider: body.user.hasPasswordProvider,
    emailVerified: Boolean(body.user.emailVerified),
    photoUrl: body.user.photoUrl ?? body.user.image ?? null,
    role: body.user.role === "admin" && body.user.isAdmin ? "admin" : "investor",
    isAdmin: Boolean(body.user.isAdmin && body.user.role === "admin" && body.user.emailVerified),
    expiresAt: expiry ? (typeof expiry === "number" ? expiry : Math.floor(Date.parse(expiry) / 1000)) : undefined,
  };
}

function asCompatUser(session: BackendSessionProfile | null): AuthUser | null {
  if (!session) return null;
  return {
    uid: session.uid,
    email: session.email,
    emailVerified: session.emailVerified,
    displayName: session.displayName ?? null,
    photoUrl: session.photoUrl ?? null,
  };
}

const PENDING_REFERRAL_KEY = "bf_pending_referral";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [backendSession, setBackendSession] = useState<BackendSessionProfile | null>(null);
  const [profile, setProfile] = useState<UserAccount | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);

  const syncSession = useCallback(async () => {
    const session = await readSession();
    setBackendSession(session);
    return session;
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const session = await readSession();
        if (active) {
          setBackendSession(session);
          setAuthError(null);
        }
      } catch (error) {
        if (active) setAuthError(toAuthErrorMessage(error, "Unable to verify your session."));
      } finally {
        if (active) setAuthReady(true);
      }
    };
    void load();
    const onFocus = () => { void load(); };
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  useEffect(() => {
    const uid = backendSession?.uid;
    const verified = backendSession?.emailVerified;
    if (!uid || !verified) {
      setProfile(null);
      return;
    }
    let active = true;
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/profile", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const payload = (await res.json().catch(() => ({}))) as { profile?: UserAccount };
        if (active && payload.profile) {
          setProfile(payload.profile);
        }
      } catch {
        // ignore transient profile fetch errors
      }
    };
    void fetchProfile();

    const pendingCode =
      typeof window !== "undefined" ? window.sessionStorage.getItem(PENDING_REFERRAL_KEY) : null;
    if (pendingCode && pendingCode.trim().length >= 4) {
      void fetch("/api/referrals/claim", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({ code: pendingCode.trim().toUpperCase() }),
      })
        .then(() => {
          window.sessionStorage.removeItem(PENDING_REFERRAL_KEY);
        })
        .catch(() => undefined);
    }

    const onProfileUpdated = () => {
      void fetchProfile();
    };
    window.addEventListener("bitfury:profile-updated", onProfileUpdated);
    return () => {
      active = false;
      window.removeEventListener("bitfury:profile-updated", onProfileUpdated);
    };
  }, [backendSession?.uid, backendSession?.emailVerified]);

  const clearAuthError = useCallback(() => setAuthError(null), []);
  const retryAuthSync = useCallback(async () => {
    setAuthReady(false);
    setAuthError(null);
    try { await syncSession(); }
    catch (error) { setAuthError(toAuthErrorMessage(error, "Unable to verify your session.")); }
    finally { setAuthReady(true); }
  }, [syncSession]);

  const refreshUserSession = useCallback(async () => {
    const session = await syncSession();
    setAuthReady(true);
    return session;
  }, [syncSession]);

  const verifyAdminSession = useCallback(async (): Promise<AdminVerifyResult> => {
    try {
      const response = await fetch("/api/auth/better-admin-check", {
        method: "GET", credentials: "include", cache: "no-store",
      });
      if (response.status === 401) return { ok: false, status: 401, error: "Authentication required." };
      if (!response.ok) return { ok: false, status: response.status, error: "Administrator authorization required." };
      return { ok: true, status: 200 };
    } catch (error) {
      return { ok: false, status: 503, error: toAuthErrorMessage(error, "Unable to verify administrator access.") };
    }
  }, []);

  const resendVerificationEmail = useCallback(async (requestedEmail?: string) => {
    const email = requestedEmail?.trim().toLowerCase() || pendingVerificationEmail || backendSession?.email;
    if (!email) throw new Error("Enter your registered email address to resend verification.");
    const result = await betterAuthClient.sendVerificationEmail({
      email,
      callbackURL: `${window.location.origin}/dashboard`,
    });
    if (result.error) throw new Error(result.error.message || "Unable to send verification email.");
  }, [backendSession?.email, pendingVerificationEmail]);

  const signInWithEmail = useCallback(async (
    identifier: string, password: string, rememberMe: boolean
  ): Promise<AuthActionResult> => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const cleanIdentifier = identifier.trim().toLowerCase();
      if (!cleanIdentifier.includes("@")) {
        const check = validateUsername(cleanIdentifier);
        if (!check.valid) throw new Error(check.error || "Enter a valid username or email.");
        const response = await fetch("/api/auth/sign-in-username", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: check.normalized,
            password,
            rememberMe,
            callbackURL: `${window.location.origin}/dashboard`,
          }),
        });
        const body = (await response.json().catch(() => ({}))) as {
          code?: unknown;
          message?: string;
          error?: string;
          user?: { email?: string };
        };
        if (!response.ok) {
          const code = String(body.code || "").toUpperCase();
          const message = body.error || body.message || "Invalid username or password.";
          if (code.includes("EMAIL_NOT_VERIFIED") || /email.*(not verified|verification required|verify)/i.test(message)) {
            if (body.user?.email) setPendingVerificationEmail(body.user.email);
            return {
              ok: false,
              needsVerification: true,
              error: "Your email address must be verified before you can access the dashboard. Enter your email to resend verification.",
            };
          }
          throw new Error(message);
        }
        const session = await syncSession();
        if (!session) throw new Error("Sign-in was accepted, but the server did not return an authenticated session. Please try again; if this continues, contact support.");
        if (!session.emailVerified) {
          if (session.email) setPendingVerificationEmail(session.email);
          return { ok: false, session, needsVerification: true, error: "Your email address is not verified yet. Resend the verification email below, then open its link." };
        }
        return { ok: true, session, needsVerification: false };
      }

      const email = cleanIdentifier;
      const result = await betterAuthClient.signIn.email({
        email,
        password,
        rememberMe,
        callbackURL: `${window.location.origin}/dashboard`,
      });
      if (result.error) {
        const code = String((result.error as { code?: unknown }).code || "").toUpperCase();
        const message = result.error.message || "Sign-in failed.";
        if (code.includes("EMAIL_NOT_VERIFIED") || /email.*(not verified|verification required|verify)/i.test(message)) {
          setPendingVerificationEmail(email);
          return { ok: false, needsVerification: true, error: "Your email address must be verified before you can access the dashboard. Resend the verification email below." };
        }
        throw new Error(message);
      }
      const session = await syncSession();
      if (!session) throw new Error("Sign-in was accepted, but the server did not return an authenticated session. Please try again; if this continues, contact support.");
      if (!session.emailVerified) {
        setPendingVerificationEmail(email);
        return { ok: false, session, needsVerification: true, error: "Your email address is not verified yet. Resend the verification email below, then open its link." };
      }
      return { ok: true, session, needsVerification: false };
    } catch (error) {
      const message = toAuthErrorMessage(error, "Sign-in failed. Verify your credentials.");
      setAuthError(message);
      return { ok: false, error: message };
    } finally {
      setAuthBusy(false);
    }
  }, [syncSession]);

  const registerWithEmail = useCallback(async (
    fullName: string, email: string, password: string, username: string, referralCode?: string
  ): Promise<AuthActionResult> => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const check = validateUsername(username);
      if (!check.valid) throw new Error(check.error || "Enter a valid username.");
      const availability = await fetch("/api/auth/check-username", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: check.normalized }),
      });
      const availabilityBody = await availability.json().catch(() => ({})) as { available?: boolean; error?: string };
      if (!availability.ok || availabilityBody.available !== true) {
        throw new Error(availabilityBody.error || "This username is already taken.");
      }
      const cleanRef = referralCode?.trim().toUpperCase();
      if (cleanRef && typeof window !== "undefined") {
        window.sessionStorage.setItem(PENDING_REFERRAL_KEY, cleanRef);
      }
      const result = await betterAuthClient.signUp.email({
        name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        username: check.normalized,
      } as Parameters<typeof betterAuthClient.signUp.email>[0]);
      if (result.error) throw new Error(result.error.message || "Registration failed.");
      setPendingVerificationEmail(email.trim().toLowerCase());
      const session = await syncSession();
      return { ok: true, session: session ?? undefined, needsVerification: !session?.emailVerified };
    } catch (error) {
      const message = toAuthErrorMessage(error, "Registration failed. Please check your details.");
      setAuthError(message);
      return { ok: false, error: message };
    } finally {
      setAuthBusy(false);
    }
  }, [syncSession]);

  const updateAccountPassword = useCallback(async (
    newPassword: string, currentPassword?: string
  ): Promise<{ ok: boolean; error?: string }> => {
    try {
      if (!currentPassword) return { ok: false, error: "Enter your current password to confirm this change." };
      const result = await betterAuthClient.changePassword({
        currentPassword, newPassword, revokeOtherSessions: true,
      });
      if (result.error) throw new Error(result.error.message || "Unable to update password.");
      return { ok: true };
    } catch (error) {
      return { ok: false, error: toAuthErrorMessage(error, "Unable to update account password.") };
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      const result = await betterAuthClient.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (result.error) throw new Error(result.error.message || "Unable to send password reset email.");
      return { ok: true };
    } catch (error) {
      const message = toAuthErrorMessage(error, "Unable to send password recovery email.");
      setAuthError(message);
      return { ok: false, error: message };
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<AuthActionResult> => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const result = await betterAuthClient.signIn.social({
        provider: "google",
        callbackURL: `${window.location.origin}/dashboard`,
      });
      if (result.error) throw new Error(result.error.message || "Google sign-in failed.");
      return { ok: true };
    } catch (error) {
      const message = toAuthErrorMessage(error, "Google authentication failed.");
      setAuthError(message);
      return { ok: false, error: message };
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const result = await betterAuthClient.signOut({});
      if (result.error) throw new Error(result.error.message || "Unable to sign out.");
      setBackendSession(null);
      setProfile(null);
      setPendingVerificationEmail(null);
    } catch (error) {
      setAuthError(toAuthErrorMessage(error, "Unable to sign out."));
      throw error;
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const user = useMemo(() => asCompatUser(backendSession), [backendSession]);
  const isAdmin = Boolean(backendSession?.isAdmin && backendSession.emailVerified);
  const needsEmailVerification = Boolean(user && !backendSession?.emailVerified);
  const hasPasswordProvider =
    backendSession?.hasPasswordProvider ?? profile?.hasPasswordProvider ?? Boolean(user);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      backendSession,
      authReady,
      authBusy,
      isAdmin,
      hasPasswordProvider,
      needsEmailVerification,
      authError,
      clearAuthError,
      retryAuthSync,
      refreshUserSession,
      verifyAdminSession,
      resendVerificationEmail,
      signInWithEmail,
      registerWithEmail,
      updateAccountPassword,
      sendPasswordReset,
      signInWithGoogle,
      signOutUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
