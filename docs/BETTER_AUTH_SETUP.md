# Better Auth setup (migration branch)

Better Auth is mounted separately at `/api/better-auth/*` so existing Firebase-backed routes at `/api/auth/*` remain available during the transition. The React client is in `src/lib/better-auth-client.ts`.

## Required Render environment

Add these as server environment variables (not Vite/browser variables):

- `DATABASE_URL`: Neon connection string for a dedicated application role.
- `BETTER_AUTH_SECRET`: a newly generated high-entropy secret of at least 32 characters.
- `BETTER_AUTH_URL`: the exact public HTTPS origin of the deployed site.
- `BETTER_AUTH_TRUSTED_ORIGINS`: comma-separated exact trusted origins; normally the production site origin.

For the existing Zoho Mail setup, configure `SMTP_HOST=smtp.zoho.com`, `SMTP_PORT=587`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`. Use an app-specific password if the mailbox requires it. Do not commit real values.

Optional Google sign-in is enabled only when both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are present. The Google OAuth redirect URI must match the Better Auth callback for the deployed origin.

## Database

Run `npm install` to reconcile the dependency lockfile after the Better Auth and SMTP packages were added. Then run `npm run db:migrate` against Neon before deploying the new auth routes. The current additive schema includes Better Auth's core PostgreSQL tables. Do not run this against production until a Neon backup has been taken.

## Endpoints

- `/api/better-auth/*`: Better Auth sign-up, sign-in, sign-out, session, verification and password reset endpoints.
- `/api/account/session`: session summary with the database role from `user_roles`.
- `/api/auth/*`: legacy Firebase authentication endpoints, intentionally retained for compatibility.

## Admin access

New accounts receive no administrator role by default. Grant admin access only to an already-created account using a trusted database operator, for example:

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('<verified-user-id>', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

Never use a public signup field, email match, or client-side flag to grant admin privileges.

## Cutover status

This is the Better Auth backend foundation, not the final Firebase removal. Existing React screens and protected financial APIs still use Firebase tokens and Firestore. Do not disable Firebase or redirect the current login/register screens until the frontend auth provider and all protected API middleware have been migrated and tested. Existing Firebase users also need a controlled account migration or password-reset onboarding; Firebase password hashes must not be copied into Better Auth.

Email verification and password reset callbacks now use SMTP. Until all SMTP settings are present and verified, Better Auth email flows will not deliver messages. Keep the current Firebase sign-in available during this migration stage.
