import { randomBytes } from "node:crypto";
import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { databasePool, isDatabaseConfigured } from "../db/pool.ts";
import { sendBetterAuthEmail } from "../services/betterAuthMailer.ts";
import { registerMockUser } from "../services/inMemoryFinancialMock.ts";
import { isUserBlocked, isUserSuspended } from "./blockedUsers.ts";

const rawBaseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.VITE_SITE_URL ||
  process.env.APP_URL ||
  "http://localhost:3000";
const baseURL = rawBaseURL.trim().replace(/\/+$/, "");

if (process.env.NODE_ENV === "production" && !process.env.BETTER_AUTH_SECRET?.trim()) {
  console.warn(
    "[CRITICAL] BETTER_AUTH_SECRET is not configured in production; sessions will not survive server restarts."
  );
}

const secret =
  process.env.BETTER_AUTH_SECRET?.trim() ||
  randomBytes(32).toString("hex");

const configuredTrustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isHttpsContext =
  process.env.NODE_ENV === "production" ||
  baseURL.startsWith("https://") ||
  Boolean(process.env.K_SERVICE || process.env.RENDER);

const emailSendingConfigured = Boolean(
  process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim()
);

const socialProviders =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : undefined;

export const betterAuthInstance = betterAuth({
  appName: "BitfuryTech",
  baseURL,
  basePath: "/api/better-auth",
  secret,
  database: databasePool ?? undefined,
  trustedOrigins: configuredTrustedOrigins.length > 0
    ? configuredTrustedOrigins
    : (request) => {
        const origins = new Set<string>([baseURL]);
        const origin = request?.headers.get("origin");
        const hostHeader = (
          request?.headers.get("x-forwarded-host") ||
          request?.headers.get("host") ||
          ""
        )
          .split(",")[0]
          .trim()
          .toLowerCase();
        if (origin && hostHeader) {
          try {
            const parsed = new URL(origin);
            if (parsed.host.toLowerCase() === hostHeader) {
              origins.add(origin);
            }
          } catch {
            // Ignore malformed Origin headers
          }
        }
        return Array.from(origins);
      },
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: true,
        input: true,
        returned: true,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    requireEmailVerification: emailSendingConfigured,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      if (!emailSendingConfigured) {
        console.info(`[AI Studio] Password reset link for ${user.email}: ${url}`);
        return;
      }
      await sendBetterAuthEmail("reset", user.email, url);
    },
  },
  emailVerification: {
    sendOnSignUp: emailSendingConfigured,
    sendOnSignIn: emailSendingConfigured,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      if (!emailSendingConfigured) {
        console.info(`[AI Studio] Email verification link for ${user.email}: ${url}`);
        return;
      }
      await sendBetterAuthEmail("verify", user.email, url);
    },
  },
  socialProviders,
  plugins: [bearer()],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (await isUserBlocked(null, user.email)) {
            throw new Error("This email address is blocked from accessing BitfuryTech.");
          }
          if (!emailSendingConfigured) {
            return { data: { ...user, emailVerified: true } };
          }
          return undefined;
        },
        after: async (user) => {
          if (!isDatabaseConfigured) {
            registerMockUser({
              id: user.id,
              email: user.email,
              name: user.name,
              username: (user as { username?: string | null }).username,
            });
          }
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          if (await isUserBlocked(session.userId, null)) {
            throw new Error("Account access has been blocked by administration.");
          }
          if (await isUserSuspended(session.userId, null)) {
            throw new Error("This account is currently suspended. Contact support for assistance.");
          }
        },
      },
    },
  },
  advanced: {
    useSecureCookies: isHttpsContext,
    defaultCookieAttributes: isHttpsContext
      ? {
          sameSite: "none",
          httpOnly: true,
          secure: true,
          partitioned: true,
        }
      : {
          sameSite: "lax",
          httpOnly: true,
          secure: false,
        },
  },
});
