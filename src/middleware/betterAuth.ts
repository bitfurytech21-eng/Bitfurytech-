import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { betterAuthInstance } from "../lib/better-auth.ts";
import { queryDatabase } from "../db/pool.ts";

export interface BetterAuthRequest extends Request {
  betterAuthSession?: Awaited<ReturnType<typeof betterAuthInstance.api.getSession>>;
  betterAuthRole?: "admin" | "support" | "investor";
}

function noStore(res: Response): void {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
}

export async function requireBetterAuth(
  req: BetterAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  noStore(res);
  try {
    const session = await betterAuthInstance.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    req.betterAuthSession = session;
    next();
  } catch (error) {
    console.error("Better Auth session verification failed:", error);
    res.status(401).json({ error: "Invalid or expired session." });
  }
}

const BOOTSTRAP_ADMIN_EMAIL = (process.env.BITFURYTECH_ADMIN_EMAIL || "bitfurytech21@gmail.com").trim().toLowerCase();

export async function resolveBetterAuthRole(userId: string, email?: string | null): Promise<"admin" | "support" | "investor"> {
  const result = await queryDatabase<{ role: "admin" | "support" | "investor" }>(
    "SELECT role FROM user_roles WHERE user_id = $1 ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'support' THEN 1 ELSE 2 END LIMIT 1",
    [userId]
  );
  if (result.rows[0]?.role) return result.rows[0].role;
  // Only the configured bootstrap identity receives this initial admin fallback.
  if (email && email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL) return "admin";
  return "investor";
}

export async function requireBetterVerifiedEmail(
  req: BetterAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  noStore(res);
  if (!req.betterAuthSession) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  if (!req.betterAuthSession.user.emailVerified) {
    res.status(403).json({ error: "Please verify your email address before continuing." });
    return;
  }
  next();
}

export async function requireBetterAdmin(
  req: BetterAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  noStore(res);
  if (!req.betterAuthSession) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  if (!req.betterAuthSession.user.emailVerified) {
    res.status(403).json({ error: "A verified email address is required." });
    return;
  }
  try {
    const role = await resolveBetterAuthRole(req.betterAuthSession.user.id, req.betterAuthSession.user.email);
    req.betterAuthRole = role;
    if (role !== "admin") {
      res.status(403).json({ error: "Administrator authorization required." });
      return;
    }
    next();
  } catch (error) {
    console.error("Better Auth role lookup failed:", error);
    res.status(503).json({ error: "Administrator permissions are temporarily unavailable." });
  }
}
