import {
  createContext,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  fetchSignInMethodsForEmail,
  linkWithCredential,
  onIdTokenChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile,
  User,
} from "firebase/auth";
import { auth, googleAuthProvider } from "../lib/firebase";
import { validateUsername } from "../lib/username";
import {
  ensureUserAccount,
  subscribeUserProfile,
  UserAccount,
} from "../services/firestoreService";

export interface BackendSessionProfile {
  uid: string;
  email: string | null;
  emailVerified: boolean;
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

export interface AdminVerifyResult {
  ok: boolean;
  status: number;
  error?: string;
}

export interface AuthContextValue {
  firebaseUser: User | null;
  idToken: string | null;
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
  resendVerificationEmail: () => Promise<void>;
  signInWithEmail: (
    identifier: string,
    password: string,
    rememberMe: boolean
  ) => Promise<AuthActionResult>;
  registerWithEmail: (
    fullName: string,
    email: string,
    password: string,
    username: string
  ) => Promise<AuthActionResult>;
  updateAccountPassword: (
    newPassword: string,
    currentPassword?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  signInWithGoogle: () => Promise<AuthActionResult>;
  signOutUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

class BackendSessionError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "BackendSessionError";
    this.status = status;
  }
}

function formatFirebaseAuthError(err: unknown, fallback: string): string {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code?: unknown }).code)
      : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid username, email address, or password.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/email-already-in-use":
      return "An account with this email address already exists. Sign in or reset your password.";
    case "auth/weak-password":
      return "Password is too weak. Use at least 8 characters including letters and numbers.";
    case "auth/requires-recent-login":
      return "For security, confirm your current password or sign in again before updating your password.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact BitfuryTech support.";
    case "auth/too-many-requests":
      return "Too many login attempts. Wait a moment or reset your password.";
    case "auth/operation-not-allowed":
      return "Email/Password authentication is not yet enabled in Firebase Console (Authentication -> Sign-in method). Enable Email/Password in Firebase Console or continue with Google Sign-In.";
    case "auth/popup-closed-by-user":
      return "Google sign-in popup was closed before completion.";
    default:
      return err instanceof Error ? err.message : fallback;
  }
}

async function fetchBackendSession(token: string): Promise<BackendSessionProfile> {
  const res = await fetch("/api/auth/session", {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const body = (await res.json().catch(() => ({}))) as Partial<BackendSessionProfile> & {
    error?: string;
  };

  if (!res.ok) {
    throw new BackendSessionError(
      body.error || `Backend session verification failed (HTTP ${res.status}).`,
      res.status
    );
  }

  if (typeof body.uid !== "string" || !body.uid) {
    throw new BackendSessionError("Invalid backend session response.", 401);
  }

  return {
    uid: body.uid,
    email: body.email ?? null,
    emailVerified: Boolean(body.emailVerified),
    role: body.role === "admin" && body.isAdmin === true ? "admin" : "investor",
    isAdmin: Boolean(body.isAdmin) && body.role === "admin" && Boolean(body.emailVerified),
    authTime: body.authTime,
    expiresAt: body.expiresAt,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserAccount | null>(null);
  const [backendSession, setBackendSession] = useState<BackendSessionProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncNonce, setSyncNonce] = useState(0);

  const resetLocalSessionState = useCallback((errorMsg: string | null = null) => {
    setFirebaseUser(null);
    setIdToken(null);
    setProfile(null);
    setBackendSession(null);
    setAuthError(errorMsg);
  }, []);

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;
    let cancelled = false;

    const unsubToken = onIdTokenChanged(auth, async (user) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = undefined;
      }

      if (cancelled) return;

      if (!user) {
        setFirebaseUser(null);
        setIdToken(null);
        setProfile(null);
        setBackendSession(null);
        setAuthReady(true);
        return;
      }

      setFirebaseUser(user);
      setAuthError(null);

      try {
        let token = await user.getIdToken();
        if (cancelled) return;

        let session: BackendSessionProfile;
        try {
          session = await fetchBackendSession(token);
        } catch (err) {
          if (err instanceof BackendSessionError && err.status === 401) {
            // Attempt one forced token refresh in case the cached token just expired
            token = await user.getIdToken(true);
            if (cancelled) return;
            session = await fetchBackendSession(token);
          } else {
            throw err;
          }
        }

        if (cancelled) return;
        setIdToken(token);
        setBackendSession(session);

        if (!user.emailVerified) {
          setProfile(null);
          setAuthReady(true);
          return;
        }

        await ensureUserAccount(
          user.uid,
          user.email || "",
          user.displayName || "BitfuryTech Investor"
        );
        if (cancelled) return;

        unsubProfile = subscribeUserProfile(user.uid, (account) => {
          setProfile(account);
          setAuthReady(true);
        });
      } catch (err) {
        console.error("Auth token/session verification error:", err);
        if (cancelled) return;

        if (
          err instanceof BackendSessionError &&
          (err.status === 401 || err.status === 403)
        ) {
          await signOut(auth).catch(() => undefined);
          resetLocalSessionState("Your session token was rejected or expired. Please sign in again.");
        } else {
          setIdToken(null);
          setBackendSession(null);
          setProfile(null);
          setAuthError(
            err instanceof Error
              ? err.message
              : "Unable to verify your session with the server."
          );
        }
        setAuthReady(true);
      }
    });

    return () => {
      cancelled = true;
      unsubToken();
      if (unsubProfile) unsubProfile();
    };
  }, [resetLocalSessionState, syncNonce]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const retryAuthSync = useCallback(async () => {
    setAuthError(null);
    setAuthReady(false);
    setSyncNonce((n) => n + 1);
  }, []);

  const refreshUserSession = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) return null;
    await current.reload();
    const token = await current.getIdToken(true);
    const session = await fetchBackendSession(token);
    setIdToken(token);
    setBackendSession(session);
    setSyncNonce((n) => n + 1);
    return session;
  }, []);

  const verifyAdminSession = useCallback(async (): Promise<AdminVerifyResult> => {
    const current = auth.currentUser;
    if (!current) {
      return { ok: false, status: 401, error: "Authentication required." };
    }

    try {
      const token = await current.getIdToken();
      const res = await fetch("/api/auth/admin-check", {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 401) {
        await signOut(auth).catch(() => undefined);
        resetLocalSessionState("Session token invalid or expired. Please sign in again.");
        return { ok: false, status: 401, error: "Invalid or expired token." };
      }

      if (!res.ok) {
        setBackendSession((prev) =>
          prev ? { ...prev, isAdmin: false, role: "investor" } : prev
        );
        return { ok: false, status: res.status, error: "Administrator authorization required." };
      }

      return { ok: true, status: 200 };
    } catch (err) {
      return {
        ok: false,
        status: 503,
        error: err instanceof Error ? err.message : "Unable to verify administrator privileges.",
      };
    }
  }, [resetLocalSessionState]);

  const resendVerificationEmail = useCallback(async () => {
    const current = auth.currentUser;
    if (!current) {
      throw new Error("No active user session to verify.");
    }
    await sendEmailVerification(current);
  }, []);

  const signInWithEmail = useCallback(
    async (
      identifier: string,
      password: string,
      rememberMe: boolean
    ): Promise<AuthActionResult> => {
      setAuthError(null);
      setAuthBusy(true);
      try {
        const cleanIdentifier = identifier.trim();
        let loginEmail = cleanIdentifier;

        if (!cleanIdentifier.includes("@")) {
          const check = validateUsername(cleanIdentifier);
          if (!check.valid) {
            const invalidMsg = check.error || "Enter a valid username or email address.";
            setAuthError(invalidMsg);
            return { ok: false, error: invalidMsg };
          }

          const resolveRes = await fetch("/api/auth/username-signin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: check.normalized,
              password,
            }),
          });
          const resolveBody = (await resolveRes.json().catch(() => ({}))) as {
            ok?: boolean;
            email?: string;
            error?: string;
          };
          if (!resolveRes.ok || !resolveBody.email) {
            const msg = resolveBody.error || "Invalid username or password.";
            setAuthError(msg);
            return { ok: false, error: msg };
          }
          loginEmail = resolveBody.email;
        }

        await setPersistence(
          auth,
          rememberMe ? browserLocalPersistence : browserSessionPersistence
        );
        const cred = await signInWithEmailAndPassword(auth, loginEmail, password);
        const token = await cred.user.getIdToken(true);
        const session = await fetchBackendSession(token);

        setIdToken(token);
        setBackendSession(session);

        if (!cred.user.emailVerified) {
          return {
            ok: true,
            session,
            needsVerification: true,
          };
        }

        await ensureUserAccount(
          cred.user.uid,
          cred.user.email || "",
          cred.user.displayName || "BitfuryTech Investor"
        );

        return { ok: true, session, needsVerification: false };
      } catch (err) {
        if (err instanceof BackendSessionError && (err.status === 401 || err.status === 403)) {
          await signOut(auth).catch(() => undefined);
          resetLocalSessionState(err.message);
        }
        const msg = formatFirebaseAuthError(err, "Sign-in failed. Verify your credentials.");
        setAuthError(msg);
        return { ok: false, error: msg };
      } finally {
        setAuthBusy(false);
      }
    },
    [resetLocalSessionState]
  );

  const registerWithEmail = useCallback(
    async (
      fullName: string,
      email: string,
      password: string,
      username: string
    ): Promise<AuthActionResult> => {
      setAuthError(null);
      setAuthBusy(true);
      try {
        const cleanEmail = email.trim().toLowerCase();
        const cleanName = fullName.trim().slice(0, 120);
        const usernameCheck = validateUsername(username);
        if (!usernameCheck.valid) {
          const errMsg = usernameCheck.error || "Enter a valid username.";
          setAuthError(errMsg);
          return { ok: false, error: errMsg };
        }
        const cleanUsername = usernameCheck.normalized;

        const availRes = await fetch("/api/auth/check-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: cleanUsername }),
        });
        const availBody = (await availRes.json().catch(() => ({}))) as {
          available?: boolean | null;
          error?: string;
        };
        if (availRes.status === 503 || availBody.available === false) {
          const msg =
            availBody.error ||
            "This username is already taken. Please choose another username.";
          setAuthError(msg);
          return { ok: false, error: msg };
        }

        const methods = await fetchSignInMethodsForEmail(auth, cleanEmail).catch(
          () => [] as string[]
        );
        if (methods.length > 0) {
          const dupMsg =
            "An account with this email address already exists. Sign in or reset your password.";
          setAuthError(dupMsg);
          return { ok: false, error: dupMsg };
        }

        const cred = await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );
        await updateProfile(cred.user, { displayName: cleanName });

        const token = await cred.user.getIdToken(true);
        const claimRes = await fetch("/api/auth/claim-username", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ username: cleanUsername }),
        });
        const claimBody = (await claimRes.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
        };
        if (claimRes.status === 409) {
          await cred.user.delete().catch(() => undefined);
          const dupUserMsg =
            claimBody.error || "This username was just claimed. Please choose another.";
          setAuthError(dupUserMsg);
          return { ok: false, error: dupUserMsg };
        }

        await sendEmailVerification(cred.user);

        const session = await fetchBackendSession(token);
        setIdToken(token);
        setBackendSession(session);

        if (cred.user.emailVerified) {
          await ensureUserAccount(
            cred.user.uid,
            cred.user.email || cleanEmail,
            cleanName,
            cleanUsername
          );
        }

        return {
          ok: true,
          session,
          needsVerification: !cred.user.emailVerified,
        };
      } catch (err) {
        if (err instanceof BackendSessionError && (err.status === 401 || err.status === 403)) {
          await signOut(auth).catch(() => undefined);
          resetLocalSessionState(err.message);
        }
        const msg = formatFirebaseAuthError(
          err,
          "Registration failed. Please check your details and try again."
        );
        setAuthError(msg);
        return { ok: false, error: msg };
      } finally {
        setAuthBusy(false);
      }
    },
    [resetLocalSessionState]
  );

  const updateAccountPassword = useCallback(
    async (
      newPassword: string,
      currentPassword?: string
    ): Promise<{ ok: boolean; error?: string }> => {
      const current = auth.currentUser;
      if (!current || !current.email) {
        return { ok: false, error: "Authenticated email session required." };
      }
      if (newPassword.length < 8) {
        return { ok: false, error: "New password must be at least 8 characters long." };
      }

      try {
        const hasPwd = current.providerData.some((p) => p.providerId === "password");
        if (hasPwd) {
          if (!currentPassword) {
            return { ok: false, error: "Enter your current password to confirm this change." };
          }
          const credential = EmailAuthProvider.credential(current.email, currentPassword);
          await reauthenticateWithCredential(current, credential);
          await updatePassword(current, newPassword);
        } else {
          const credential = EmailAuthProvider.credential(current.email, newPassword);
          await linkWithCredential(current, credential);
        }
        await current.reload();
        setSyncNonce((n) => n + 1);
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: formatFirebaseAuthError(
            err,
            "Unable to update account password. Verify your current password."
          ),
        };
      }
    },
    []
  );

  const sendPasswordReset = useCallback(async (email: string) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { ok: true };
    } catch (err) {
      const msg = formatFirebaseAuthError(
        err,
        "Unable to send password reset email. Verify the email address."
      );
      return { ok: false, error: msg };
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<AuthActionResult> => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      await setPersistence(auth, browserLocalPersistence);
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken(true);
      const session = await fetchBackendSession(token);

      setIdToken(token);
      setBackendSession(session);

      if (cred.user.emailVerified) {
        await ensureUserAccount(
          cred.user.uid,
          cred.user.email || "",
          cred.user.displayName || "BitfuryTech Investor"
        );
      }

      return { ok: true, session, needsVerification: !cred.user.emailVerified };
    } catch (err) {
      if (err instanceof BackendSessionError && (err.status === 401 || err.status === 403)) {
        await signOut(auth).catch(() => undefined);
        resetLocalSessionState(err.message);
      }
      const msg = formatFirebaseAuthError(err, "Google authentication cancelled or failed.");
      setAuthError(msg);
      return { ok: false, error: msg };
    } finally {
      setAuthBusy(false);
    }
  }, [resetLocalSessionState]);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" }).catch(
        () => undefined
      );
      await signOut(auth);
      try {
        window.sessionStorage.clear();
      } catch {
        // Ignore storage errors in restricted contexts
      }
      resetLocalSessionState(null);
    } finally {
      setAuthBusy(false);
    }
  }, [resetLocalSessionState]);

  // Role authorization is derived strictly from the server-verified backendSession.
  const isAdmin = Boolean(
    firebaseUser &&
      backendSession &&
      backendSession.emailVerified &&
      backendSession.isAdmin === true &&
      backendSession.role === "admin"
  );

  const hasPasswordProvider = Boolean(
    firebaseUser?.providerData.some((p) => p.providerId === "password")
  );
  const needsEmailVerification = Boolean(firebaseUser && !firebaseUser.emailVerified);

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        idToken,
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
