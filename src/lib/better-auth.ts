import { betterAuth } from "better-auth";
import { databasePool } from "../db/pool.ts";
import { sendBetterAuthEmail } from "../services/betterAuthMailer.ts";

const baseURL = process.env.BETTER_AUTH_URL || process.env.VITE_SITE_URL || "http://localhost:3000";
const secret = process.env.BETTER_AUTH_SECRET;

if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
  throw new Error("BETTER_AUTH_SECRET must be configured with at least 32 characters in production.");
}
if (!databasePool && process.env.NODE_ENV === "production") {
  throw new Error("DATABASE_URL is required for Better Auth in production.");
}

const trustedOrigins = (process.env.BETTER_AUTH_TRUSTED_ORIGINS || baseURL)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const socialProviders: Record<string, { clientId: string; clientSecret: string }> = {};
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  };
}

export const betterAuthInstance = betterAuth({
  appName: "BitfuryTech",
  baseURL,
  basePath: "/api/better-auth",
  secret,
  database: databasePool ?? undefined,
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: false,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendBetterAuthEmail("reset", user.email, url);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendBetterAuthEmail("verify", user.email, url);
    },
  },
  socialProviders,
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: {
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    },
  },
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
});
