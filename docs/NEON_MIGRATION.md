# Neon PostgreSQL migration foundation

This branch introduces an additive PostgreSQL foundation. It intentionally does not remove Firebase or change live customer authentication, balances, deposits, withdrawals, investments, referrals, or admin flows yet.

## Runtime configuration

Set `DATABASE_URL` only in the server environment (Render), never in Vite variables or browser code. Use a dedicated application database role with only the privileges the app needs. Keep the connection string private and rotate any credential that has been pasted into chat or committed.

The pool uses TLS for Neon and a small connection limit suitable for a Render web service.

## Apply the schema

After installing dependencies and setting `DATABASE_URL`, run:

```sh
npm install
npm run db:migrate
```

The migration creates Better Auth-compatible user/session/account/verification tables plus BitfuryTech profile, role, plan, investment, transaction, immutable ledger, referral, notification, property, inquiry, email outbox, and audit tables. It is additive and safe to run repeatedly.

## Verify connectivity

After deploying the branch, visit:

- `/api/health` — application process health
- `/api/health/database` — PostgreSQL connection readiness

A healthy database response only proves connectivity. It does not mean the app has switched its business operations to PostgreSQL.

## Migration safety sequence

1. Back up/export Firebase Auth and Firestore data.
2. Implement Better Auth against the PostgreSQL auth tables and verify email/password, verification, reset, sessions, and admin role checks.
3. Migrate profile, plans, properties, notifications, email outbox, and historical transaction data with reconciliation counts.
4. Move deposits, withdrawals, investment creation, approvals, and referral rewards to server-side SQL transactions with idempotency and balanced ledger entries.
5. Switch each UI service only after its replacement endpoint is tested.
6. Keep Firebase available for rollback until parity, balances, documents, and authentication are reconciled and production sign-off is complete.

Neon is a relational database, not file/object storage. Uploaded property images and documents need a persistent object-storage provider before removing the current upload path.
