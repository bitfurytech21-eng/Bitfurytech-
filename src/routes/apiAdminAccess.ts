import { Router, type Request, type Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { betterAuthInstance } from "../lib/better-auth.ts";
import {
  isSafeSameOriginMutation,
  noStore,
  requireBetterAdmin,
  requireBetterAuth,
  type BetterAuthRequest,
} from "../middleware/betterAuth.ts";
import { validateUsername } from "../lib/username.ts";
import {
  claimInitialAdminPasscode,
  clearClaimedPasscodeRollback,
  getAdminAccessStatus,
  grantAdminRoleToUser,
  setFallbackAdminPasscodeByAdmin,
  userEmailExists,
  verifyAdminPasscode,
} from "../services/adminAccessService.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const failedAttemptsByIp = new Map<string, { count: number; resetAtMs: number }>();

function clientKey(req: Request): string {
  const forwarded = req.header("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.ip || "unknown";
}

function isRateLimited(req: Request): boolean {
  const key = clientKey(req);
  const entry = failedAttemptsByIp.get(key);
  if (!entry) return false;
  if (Date.now() > entry.resetAtMs) {
    failedAttemptsByIp.delete(key);
    return false;
  }
  return entry.count >= 10;
}

function recordFailedAttempt(req: Request): void {
  const key = clientKey(req);
  const now = Date.now();
  const entry = failedAttemptsByIp.get(key);
  if (!entry || now > entry.resetAtMs) {
    failedAttemptsByIp.set(key, { count: 1, resetAtMs: now + 15 * 60_000 });
    return;
  }
  entry.count += 1;
}

function clearFailedAttempts(req: Request): void {
  failedAttemptsByIp.delete(clientKey(req));
}

function forwardAuthHeaders(authRes: globalThis.Response, res: Response): void {
  const headersObj = authRes.headers as unknown as { getSetCookie?: () => string[] };
  if (typeof headersObj.getSetCookie === "function") {
    for (const cookie of headersObj.getSetCookie()) {
      res.append("Set-Cookie", cookie);
    }
  } else {
    const singleCookie = authRes.headers.get("set-cookie");
    if (singleCookie) res.append("Set-Cookie", singleCookie);
  }
  const authToken = authRes.headers.get("set-auth-token");
  if (authToken) {
    res.setHeader("set-auth-token", authToken);
  }
}

async function authenticateOrRegisterAdminUser(
  req: Request,
  res: Response,
  params: {
    email: string;
    password: string;
    name: string;
    username: string;
  }
): Promise<{ ok: true; userId: string; email: string } | { ok: false; status: number; error: string }> {
  const headers = fromNodeHeaders(req.headers);

  // First try signing in if the account exists.
  const signInRes = await betterAuthInstance.api.signInEmail({
    body: {
      email: params.email,
      password: params.password,
      rememberMe: true,
    },
    headers,
    asResponse: true,
  });

  if (signInRes.ok) {
    const body = (await signInRes.json().catch(() => ({}))) as {
      user?: { id?: string; email?: string };
    };
    if (body.user?.id) {
      forwardAuthHeaders(signInRes, res);
      return {
        ok: true,
        userId: body.user.id,
        email: body.user.email || params.email,
      };
    }
  }

  // If the email already exists, never bypass or overwrite its password.
  if (await userEmailExists(params.email)) {
    return {
      ok: false,
      status: 401,
      error: "An account already exists for this email, and the account password did not match.",
    };
  }

  const signUpRes = await betterAuthInstance.api.signUpEmail({
    body: {
      name: params.name,
      email: params.email,
      password: params.password,
      username: params.username,
    } as Parameters<typeof betterAuthInstance.api.signUpEmail>[0]["body"],
    headers,
    asResponse: true,
  });

  const signUpBody = (await signUpRes.json().catch(() => ({}))) as {
    user?: { id?: string; email?: string };
    message?: string;
    error?: string;
  };

  if (!signUpRes.ok || !signUpBody.user?.id) {
    return {
      ok: false,
      status: signUpRes.status >= 400 ? signUpRes.status : 400,
      error:
        signUpBody.message ||
        signUpBody.error ||
        "Unable to initialize administrator account. Choose a unique username and valid password.",
    };
  }

  forwardAuthHeaders(signUpRes, res);
  return {
    ok: true,
    userId: signUpBody.user.id,
    email: signUpBody.user.email || params.email,
  };
}

function defaultAdminUsername(email: string): string {
  const local = email
    .split("@")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "");
  const suffix = Math.floor(100 + Math.random() * 900);
  const candidate = `${(local || "ops").slice(0, 18)}_ops_${suffix}`;
  const check = validateUsername(candidate);
  return check.valid ? check.normalized : `ops_${Date.now().toString(36).slice(-6)}`;
}

export function createAdminAccessRouter(): Router {
  const router = Router();

  router.get("/admin-access-status", async (_req, res) => {
    noStore(res);
    try {
      const status = await getAdminAccessStatus();
      res.json(status);
    } catch (error) {
      console.error("Admin access status check failed:", error);
      res.status(503).json({
        envPasscodeConfigured: false,
        claimed: false,
        claimAllowed: false,
        hasAdminAccount: false,
        databaseConfigured: false,
        error: "Unable to verify administrator access status.",
      });
    }
  });

  router.post("/admin-claim", async (req, res) => {
    noStore(res);
    if (!isSafeSameOriginMutation(req)) {
      res.status(403).json({ error: "Cross-origin request blocked." });
      return;
    }
    if (isRateLimited(req)) {
      res.status(429).json({ error: "Too many failed attempts. Try again in 15 minutes." });
      return;
    }

    const passcode = typeof req.body?.passcode === "string" ? req.body.passcode.trim() : "";
    if (passcode.length < 8 || passcode.length > 128) {
      res.status(400).json({ error: "Choose an administrator passcode between 8 and 128 characters." });
      return;
    }

    try {
      const existingSession = await betterAuthInstance.api
        .getSession({ headers: fromNodeHeaders(req.headers) })
        .catch(() => null);

      if (existingSession?.user?.id) {
        const claim = await claimInitialAdminPasscode(passcode, existingSession.user.id);
        if (!claim.ok) {
          recordFailedAttempt(req);
          res.status(409).json({ error: claim.error || "Administrator access is already configured." });
          return;
        }
        await grantAdminRoleToUser(
          existingSession.user.id,
          existingSession.user.email || "admin",
          "ADMIN_ACCESS_CLAIMED"
        );
        clearFailedAttempts(req);
        res.status(201).json({ ok: true, unlocked: true, role: "admin" });
        return;
      }

      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const nameRaw = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      const usernameRaw = typeof req.body?.username === "string" ? req.body.username.trim().toLowerCase() : "";

      if (!email || email.length > 200 || !EMAIL_RE.test(email)) {
        res.status(400).json({ error: "Enter a valid administrator email address." });
        return;
      }
      if (password.length < 8 || password.length > 128) {
        res.status(400).json({ error: "Account password must be between 8 and 128 characters." });
        return;
      }

      const usernameCheck = usernameRaw ? validateUsername(usernameRaw) : null;
      if (usernameRaw && usernameCheck && !usernameCheck.valid) {
        res.status(400).json({ error: usernameCheck.error || "Enter a valid username." });
        return;
      }

      const claim = await claimInitialAdminPasscode(passcode, null);
      if (!claim.ok) {
        recordFailedAttempt(req);
        res.status(409).json({ error: claim.error || "Administrator access is already configured." });
        return;
      }

      const authResult = await authenticateOrRegisterAdminUser(req, res, {
        email,
        password,
        name: nameRaw || "BitfuryTech Administrator",
        username: usernameCheck?.valid ? usernameCheck.normalized : defaultAdminUsername(email),
      });

      if (authResult.ok === false) {
        await clearClaimedPasscodeRollback(null).catch(() => undefined);
        recordFailedAttempt(req);
        res.status(authResult.status).json({ error: authResult.error });
        return;
      }

      await grantAdminRoleToUser(authResult.userId, authResult.email, "ADMIN_ACCESS_CLAIMED");
      clearFailedAttempts(req);
      res.status(201).json({ ok: true, unlocked: true, role: "admin" });
    } catch (error) {
      console.error("Admin claim failed:", error);
      res.status(503).json({ error: "Unable to complete administrator setup right now." });
    }
  });

  router.post("/admin-unlock", async (req, res) => {
    noStore(res);
    if (!isSafeSameOriginMutation(req)) {
      res.status(403).json({ error: "Cross-origin request blocked." });
      return;
    }
    if (isRateLimited(req)) {
      res.status(429).json({ error: "Too many failed unlock attempts. Try again in 15 minutes." });
      return;
    }

    const passcode = typeof req.body?.passcode === "string" ? req.body.passcode.trim() : "";
    if (!passcode || passcode.length > 128) {
      res.status(400).json({ error: "Enter the administrator access passcode." });
      return;
    }

    try {
      const validPasscode = await verifyAdminPasscode(passcode);
      if (!validPasscode) {
        recordFailedAttempt(req);
        res.status(401).json({ error: "Invalid administrator access passcode." });
        return;
      }

      const existingSession = await betterAuthInstance.api
        .getSession({ headers: fromNodeHeaders(req.headers) })
        .catch(() => null);

      if (existingSession?.user?.id) {
        await grantAdminRoleToUser(
          existingSession.user.id,
          existingSession.user.email || "admin",
          "ADMIN_ACCESS_UNLOCKED"
        );
        clearFailedAttempts(req);
        res.json({ ok: true, unlocked: true, role: "admin" });
        return;
      }

      const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const nameRaw = typeof req.body?.name === "string" ? req.body.name.trim() : "";
      const usernameRaw = typeof req.body?.username === "string" ? req.body.username.trim().toLowerCase() : "";

      if (!email || email.length > 200 || !EMAIL_RE.test(email)) {
        res.status(400).json({ error: "Enter your administrator email address." });
        return;
      }
      if (password.length < 8 || password.length > 128) {
        res.status(400).json({ error: "Enter your account password (minimum 8 characters)." });
        return;
      }

      const usernameCheck = usernameRaw ? validateUsername(usernameRaw) : null;
      if (usernameRaw && usernameCheck && !usernameCheck.valid) {
        res.status(400).json({ error: usernameCheck.error || "Enter a valid username." });
        return;
      }

      const authResult = await authenticateOrRegisterAdminUser(req, res, {
        email,
        password,
        name: nameRaw || "BitfuryTech Administrator",
        username: usernameCheck?.valid ? usernameCheck.normalized : defaultAdminUsername(email),
      });

      if (authResult.ok === false) {
        recordFailedAttempt(req);
        res.status(authResult.status).json({ error: authResult.error });
        return;
      }

      await grantAdminRoleToUser(authResult.userId, authResult.email, "ADMIN_ACCESS_UNLOCKED");
      clearFailedAttempts(req);
      res.json({ ok: true, unlocked: true, role: "admin" });
    } catch (error) {
      console.error("Admin unlock failed:", error);
      res.status(503).json({ error: "Unable to verify administrator unlock request." });
    }
  });

  router.post(
    "/admin-passcode",
    requireBetterAuth,
    requireBetterAdmin,
    async (req: BetterAuthRequest, res) => {
      noStore(res);
      const passcode = typeof req.body?.passcode === "string" ? req.body.passcode.trim() : "";
      if (passcode.length < 8 || passcode.length > 128) {
        res.status(400).json({ error: "Passcode must be between 8 and 128 characters." });
        return;
      }
      try {
        await setFallbackAdminPasscodeByAdmin(
          passcode,
          req.betterAuthSession!.user.id,
          req.betterAuthSession!.user.email || "admin"
        );
        res.json({ ok: true });
      } catch (error) {
        console.error("Admin passcode update failed:", error);
        res.status(503).json({ error: "Unable to save administrator passcode." });
      }
    }
  );

  return router;
}
