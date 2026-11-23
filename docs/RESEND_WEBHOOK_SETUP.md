# Resend webhook setup

The BitfuryTech API receives Resend email lifecycle events at:

`POST https://YOUR-PRODUCTION-DOMAIN/api/webhooks/resend`

## Render environment

Add `RESEND_WEBHOOK_SECRET` to the server's Render environment. Copy the signing secret shown by Resend when creating the webhook (it begins with `whsec_`). Do not use the Resend API key here.

Keep the webhook receiver URL public and HTTPS. Do not put the signing secret in a frontend/Vite variable.

## Database

The receiver stores verified, deduplicated events in Neon PostgreSQL table `email_webhook_events`. Apply the additive schema update using the existing migration command:

```sh
npm run db:migrate
```

Run this against the production `DATABASE_URL` before enabling the webhook.

## Resend dashboard

1. Open https://resend.com/webhooks and create a webhook.
2. Set the endpoint URL to `https://YOUR-PRODUCTION-DOMAIN/api/webhooks/resend`.
3. Select the email events you want to monitor, at minimum: `email.sent`, `email.delivered`, `email.delivery_delayed`, `email.bounced`, `email.complained`, and `email.failed`. Add `email.opened` and `email.clicked` only if open/click tracking is enabled and useful.
4. Save the webhook and copy its signing secret into Render as `RESEND_WEBHOOK_SECRET`.
5. Redeploy/restart the Render service so the environment variable is loaded.
6. Use Resend's webhook test/replay controls and confirm a row appears in `email_webhook_events`.

## Security and behavior

- The endpoint verifies the Svix signature against the exact raw request body and rejects stale timestamps.
- Events are deduplicated by Resend's `svix-id`.
- A database failure returns HTTP 500 so Resend can retry delivery.
- This endpoint records email lifecycle events only. It does not approve deposits, withdrawals, KYC, or alter customer balances.
