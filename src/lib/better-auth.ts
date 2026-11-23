import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { databasePool, isDatabaseConfigured } from "../db/pool.ts";
import { sendBetterAuthEmail } from "../services/betterAuthMailer.ts";
import { registerMockUser } from "../services/inMemoryFinancialMock.ts";

const baseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.VITE_SITE_URL ||
  "http://localhost:3000";

const secret =
  process.env.BETTER_AUTH_SECRET?.trim() ||
  "ai-studio-local-dev-better-auth-secret-32chars";

const configuredTrustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

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
        if (origin) origins.add(origin);
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
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    },
  },
});
