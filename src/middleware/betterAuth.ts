import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { betterAuthInstance } from "../lib/better-auth.ts";
import { isDatabaseConfigured, queryDatabase } from "../db/pool.ts";
import { BOOTSTRAP_ADMIN_EMAIL, isUserBlocked } from "../lib/blockedUsers.ts";

export interface BetterAuthRequest extends Request {
  betterAuthSession?: Awaited<ReturnType<typeof betterAuthInstance.api.getSession>>;
  betterAuthRole?: "admin" | "support" | "investor";
}

function noStore(res: Response): void {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
}

function isSafeSameOriginMutation(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  if (req.header("x-requested-with") === "XMLHttpRequest") return true;
  const host = (req.header("x-forwarded-host") || req.header("host") || "").split(",")[0].trim().toLowerCase();
  const originHeader = req.header("origin") || req.header("referer") || "";
  if (!host || !originHeader) return false;
  try {
    return new URL(originHeader).host.toLowerCase() === host;
  } catch {
    return false;
  }
}

export async function requireBetterAuth(
  req: BetterAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  noStore(res);
  if (!isSafeSameOriginMutation(req)) {
    res.status(403).json({ error: "Cross-origin request blocked." });
    return;
  }
  try {
    const session = await betterAuthInstance.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (!session) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    if (await isUserBlocked(session.user.id, session.user.email)) {
      if (isDatabaseConfigured) {
        await queryDatabase('DELETE FROM session WHERE "userId" = $1', [session.user.id]).catch(() => undefined);
      }
      res.status(403).json({ error: "This account has been blocked and removed from the platform." });
      return;
    }
    req.betterAuthSession = session;
    next();
  } catch (error) {
    console.error("Better Auth session verification failed:", error);
    res.status(401).json({ error: "Invalid or expired session." });
  }
}

export async function resolveBetterAuthRole(userId: string, email?: string | null): Promise<"admin" | "support" | "investor"> {
  // The explicitly configured bootstrap identity takes precedence over the default
  // investor role created automatically for every new account.
  if (email && email.trim().toLowerCase() === BOOTSTRAP_ADMIN_EMAIL) return "admin";
  if (!isDatabaseConfigured) return "investor";
  const result = await queryDatabase<{ role: "admin" | "support" | "investor" }>(
    "SELECT role FROM user_roles WHERE user_id = $1 ORDER BY CASE role WHEN 'admin' THEN 0 WHEN 'support' THEN 1 ELSE 2 END LIMIT 1",
    [userId]
  );
  return result.rows[0]?.role ?? "investor";
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
