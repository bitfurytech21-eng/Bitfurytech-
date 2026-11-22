import type { Request, Response, NextFunction } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "../lib/firebase-admin.ts";
import firebaseConfig from "../../firebase-applet-config.json" with { type: "json" };

const BOOTSTRAP_ADMIN_EMAIL = "bitfurytech21@gmail.com";
const JWT_FORMAT_REGEX = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const VALID_DOC_ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  rawIdToken?: string;
  isAdmin?: boolean;
}

export interface VerifiedSessionPayload {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  role: "admin" | "investor";
  isAdmin: boolean;
  authTime: number;
  expiresAt: number;
}

function setNoStoreHeaders(res: Response): void {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
}

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader !== "string") {
    return null;
  }

  const match = authHeader.trim().match(/^Bearer\s+(\S+)$/);
  if (!match) {
    return null;
  }

  const token = match[1].trim();
  if (!token || !JWT_FORMAT_REGEX.test(token)) {
    return null;
  }

  return token;
}

async function hasAdminDocument(uid: string, rawToken: string): Promise<boolean> {
  if (!VALID_DOC_ID_REGEX.test(uid)) {
    return false;
  }

  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    firebaseConfig.projectId
  )}/databases/${encodeURIComponent(
    firebaseConfig.firestoreDatabaseId
  )}/documents/admins/${encodeURIComponent(uid)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${rawToken}`,
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!response.ok) {
      return false;
    }

    const doc = (await response.json()) as { name?: string };
    return typeof doc.name === "string" && doc.name.endsWith(`/admins/${uid}`);
  } catch {
    return false;
  }
}

export async function verifyAdminAccess(
  decodedToken: DecodedIdToken,
  rawToken: string
): Promise<boolean> {
  if (!decodedToken.email_verified) {
    return false;
  }

  if (
    typeof decodedToken.email === "string" &&
    decodedToken.email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL
  ) {
    return true;
  }

  const claims = decodedToken as DecodedIdToken & { admin?: unknown; role?: unknown };
  if (claims.admin === true || claims.role === "admin") {
    return true;
  }

  return hasAdminDocument(decodedToken.uid, rawToken);
}

export async function resolveSessionPayload(
  decodedToken: DecodedIdToken,
  rawToken: string
): Promise<VerifiedSessionPayload> {
  const isAdmin = await verifyAdminAccess(decodedToken, rawToken);
  return {
    uid: decodedToken.uid,
    email: decodedToken.email ?? null,
    emailVerified: Boolean(decodedToken.email_verified),
    role: isAdmin ? "admin" : "investor",
    isAdmin,
    authTime: Number(decodedToken.auth_time || 0),
    expiresAt: Number(decodedToken.exp || 0),
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  setNoStoreHeaders(res);

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized: Missing or malformed Bearer token." });
    return;
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);

    if (!decodedToken.uid || decodedToken.firebase?.sign_in_provider === "anonymous") {
      res.status(401).json({ error: "Unauthorized: Anonymous or invalid subject token rejected." });
      return;
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (typeof decodedToken.exp === "number" && decodedToken.exp <= nowSeconds) {
      res.status(401).json({ error: "Unauthorized: Token has expired." });
      return;
    }

    req.user = decodedToken;
    req.rawIdToken = token;
    next();
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    res.status(401).json({ error: "Unauthorized: Invalid or expired Firebase ID token." });
  }
};

export const requireVerifiedEmail = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  setNoStoreHeaders(res);
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized: Authentication required." });
    return;
  }
  if (!req.user.email_verified) {
    res.status(403).json({ error: "Forbidden: Verified email address required." });
    return;
  }
  next();
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  setNoStoreHeaders(res);
  if (!req.user || !req.rawIdToken) {
    res.status(401).json({ error: "Unauthorized: Authentication required." });
    return;
  }

  const authorized = await verifyAdminAccess(req.user, req.rawIdToken);
  if (!authorized) {
    res.status(403).json({ error: "Forbidden: Administrator authorization required." });
    return;
  }

  req.isAdmin = true;
  next();
};
