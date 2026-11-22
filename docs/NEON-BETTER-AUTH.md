# Neon + Better Auth rollout

This branch introduces Better Auth alongside the existing Firebase-backed application. It is intentionally a staged rollout: do not remove Firebase or switch the customer UI until the existing Firestore-backed customer/admin APIs have been migrated and verified.

## Render environment

Set these values in the BitfuryTech Render service. Keep all credentials in Render's environment settings; never commit them.

- `DATABASE_URL`: Neon PostgreSQL connection string (use a restricted application role, not the Neon owner role).
- `BETTER_AUTH_URL`: the canonical public origin of this application, for example `https://your-production-domain.example` (no trailing slash).
- `BETTER_AUTH_SECRET`: a newly generated random secret of at least 32 characters.
- `BETTER_AUTH_TRUSTED_ORIGINS`: comma-separated exact browser origins allowed to use the auth endpoints. Include the production origin and any actively used preview origin only.
- `SMTP_HOST`: `smtp.zoho.com` when using Zoho SMTP.
- `SMTP_PORT`: `587` for STARTTLS.
- `SMTP_USER`: the full Zoho mailbox address.
- `SMTP_PASS`: the Zoho SMTP/app password.
- `SMTP_FROM`: a verified sender, e.g. `BitfuryTech <no-reply@your-domain.example>`.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: optional; configure both only after the Google OAuth client has the exact Better Auth callback URL registered.

The Better Auth callback URL for Google is:

`https://your-production-domain.example/api/better-auth/callback/google`

Use the real production domain in Render. Do not use a Firebase key, Neon password, or JWT signing key as `BETTER_AUTH_SECRET`.

## Database

After confirming `DATABASE_URL` is correct and rotated if it was previously exposed, run:

```bash
npm install
npm run db:migrate
```

The migration creates Better Auth's PostgreSQL tables and the initial BitfuryTech relational tables. It does not import Firebase users, change Firebase data, or make any user an administrator.

## Auth endpoints

- Better Auth handler: `/api/better-auth/*`
- Better Auth session check: `GET /api/auth/better-session`
- Better Auth admin check: `GET /api/auth/better-admin-check`

Email/password sign-up requires email verification. Password reset revokes existing sessions. Bearer support is enabled for authenticated server-to-server/API requests; cookie sessions remain HTTP-only.

## Admin access

Administrator access is granted only by a row in `user_roles` with role `admin`. Do not grant admin status based only on an email address or client-side state. Provision the first administrator manually after confirming the user's Better Auth account ID.

## Cutover checklist

1. Apply the migration and verify `/api/health/database`.
2. Configure SMTP and test registration, verification, sign-in, reset and sign-out on a preview deployment.
3. Migrate or explicitly reconcile existing Firebase user identities and username mappings.
4. Move the customer and admin API routes from Firebase ID-token verification to Better Auth sessions.
5. Move user profiles, documents, uploads, support, deposits, withdrawals, investments and referrals to PostgreSQL/object storage.
6. Test authorization and financial transaction invariants, then switch the UI.
7. Only after successful parity checks and backups should Firebase dependencies/configuration be removed.

Do not deploy this branch to production as a full authentication replacement yet. The existing application UI and several protected API routes still use Firebase until the remaining migration steps are completed.
