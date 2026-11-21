import {
  createContext,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { auth, googleAuthProvider } from "../lib/firebase";
import {
  ensureUserAccount,
  subscribeUserProfile,
  UserAccount,
} from "../services/firestoreService";

export interface AuthContextValue {
  firebaseUser: User | null;
  idToken: string | null;
  profile: UserAccount | null;
  authReady: boolean;
  authBusy: boolean;
  isAdmin: boolean;
  authError: string | null;
  clearAuthError: () => void;
  retryAuthSync: () => Promise<void>;
  signInWithGoogle: () => Promise<boolean>;
  signOutUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserAccount | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncNonce, setSyncNonce] = useState(0);

  useEffect(() => {
    let unsubProfile: (() => void) | undefined;
    let cancelled = false;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = undefined;
      }

      if (cancelled) return;
      setFirebaseUser(user);
      setAuthError(null);

      if (!user) {
        setIdToken(null);
        setProfile(null);
        setAuthReady(true);
        return;
      }

      try {
        const token = await user.getIdToken();
        if (cancelled) return;
        setIdToken(token);

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
        console.error("Auth initialization error:", err);
        if (!cancelled) {
          setAuthError(
            err instanceof Error ? err.message : "Failed to initialize BitfuryTech account."
          );
          setAuthReady(true);
        }
      }
    });

    return () => {
      cancelled = true;
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, [syncNonce]);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
  }, []);

  const retryAuthSync = useCallback(async () => {
    setAuthError(null);
    setAuthReady(false);
    setSyncNonce((n) => n + 1);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      setIdToken(token);
      return true;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Google authentication cancelled or failed.";
      setAuthError(msg);
      return false;
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthError(null);
    setAuthBusy(true);
    try {
      await signOut(auth);
      setIdToken(null);
      setProfile(null);
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const isAdmin =
    Boolean(firebaseUser?.emailVerified) &&
    firebaseUser?.email === "bitfurytech21@gmail.com";

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        idToken,
        profile,
        authReady,
        authBusy,
        isAdmin,
        authError,
        clearAuthError,
        retryAuthSync,
        signInWithGoogle,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
