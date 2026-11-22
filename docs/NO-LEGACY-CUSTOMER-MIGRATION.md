# Clean Neon + Better Auth cutover (no legacy customers)

BitfuryTech has confirmed that there are no existing customer accounts to migrate.
Do not run a Firebase customer export/import or create legacy identity links.

## Target architecture

- Better Auth owns registration, email/password sign-in, verification, password reset and sessions.
- Neon PostgreSQL is the source of truth for users, profiles, roles, investment plans,
  investments, deposits, withdrawals, transactions, referrals, notifications and audit records.
- All money movement is performed by server-side PostgreSQL transactions. Client code must
  never set balances or mark a deposit/withdrawal as paid.
- Property images and uploaded documents belong in durable object storage, not in PostgreSQL
  byte columns or an ephemeral Render filesystem.
- The public website, investment-plan content, property listings and static assets are retained.

## Cutover sequence

1. Regenerate package-lock.json, then require npm ci and npm run build to pass.
2. Complete Better Auth session integration in the React AuthContext and all login,
   registration, verification, reset-password and logout screens.
3. Replace all Firebase-backed API handlers and client services with authenticated
   PostgreSQL-backed services. Keep authorization checks on the server.
4. Add transactional deposit, withdrawal and investment workflows with idempotency keys,
   immutable ledger entries and audit logs.
5. Replace Firebase uploads with a configured persistent object-storage provider.
6. Remove Firebase SDK/admin imports, Firebase configuration, rules, applet config,
   Firestore REST helpers and Firebase dependencies only after repository-wide searches
   show no remaining references and the production build passes.
7. Run schema migrations and end-to-end auth, role, financial and upload tests against a
   staging Neon database and staging deployment.
8. Switch Render to the verified release. Keep the prior deploy available for rollback.

## Required production secrets

Set these only in the hosting provider's secret environment:
- DATABASE_URL (restricted application database role; never commit or paste it in chat)
- BETTER_AUTH_SECRET (random secret, at least 32 characters)
- BETTER_AUTH_URL (canonical production origin)
- BETTER_AUTH_TRUSTED_ORIGINS (comma-separated exact origins)
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
- Object storage credentials and bucket configuration for the selected provider

Do not put DATABASE_URL or SMTP secrets in VITE_ variables.

## First administrator

Registration always creates the least-privileged investor role. Provision the first
administrator through a one-time, audited server-side administrative command after the
owner's account has been created and email-verified. Never grant admin based on a public
email address, a hard-coded bootstrap email, or client-supplied role.

## Current implementation boundary

The repository still contains Firebase-dependent AuthContext, Firestore services,
middleware and API routes. This document defines the required final state; it does not
claim those modules have already been replaced. Do not delete Firebase packages or
configuration until the replacement code compiles and the repository-wide Firebase scan
is clean.


## Financial-core hardening migration

Apply `src/db/financial-core.sql` after the base schema. It adds wallet reservation records, per-user idempotency keys, audit events, and a database trigger preventing ledger-entry updates/deletes. Every financial state transition must run in one SQL transaction, lock the wallet row with `SELECT ... FOR UPDATE`, and insert balanced ledger entries before committing. Never expose direct wallet or ledger writes to browser clients.
