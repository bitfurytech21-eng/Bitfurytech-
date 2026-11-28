# Resend email delivery

All transactional email is sent server-side through Resend. The API key must never be exposed to the browser or committed to the repository.

## Required Render environment variables

- `RESEND_API_KEY`: API key created in the Resend dashboard.
- `RESEND_FROM_EMAIL`: verified sender identity, for example `BitfuryTech <notifications@your-verified-domain.example>`.

Verify the sender domain in Resend and publish the exact DNS records Resend provides before testing. Use a sender address on that verified domain.

## Connected flows

- Better Auth email verification and password reset use Resend.
- Wired account registration, deposit and withdrawal notification hooks send directly through Resend.
- Delivery errors are logged and returned to the calling route. A successful response means Resend accepted the message, not that it reached the recipient's inbox.
- Daily ROI, newsletter campaigns and KYC notifications remain workflow-required until their underlying business workflows exist.

Keep both settings in Render's server environment only. Do not prefix the API key with `VITE_`. Rotate any exposed key.


## Template coverage

The admin Email Templates page includes editable message definitions for:
- Welcome/registration, email verification, successful sign-in alert, password reset, and password-changed alert.
- Deposit received, approved, and declined.
- Withdrawal requested, approved, and declined.
- KYC status plus separate KYC submission, approval, and rejection messages.
- Investment allocation confirmation, pending return settlement, daily recorded-return summary, and investment maturity.
- Internal transfer received, newsletter subscription, support-ticket acknowledgement, and account-suspension notice.

Templates labelled **Workflow not connected** are intentionally stored as editable drafts and are not sent until their corresponding business event is implemented and verified. This prevents a template being mistaken for a live notification. The currently wired Resend events remain registration, deposit initiation, withdrawal initiation, investment confirmation, and KYC status where their route hooks are present. Better Auth continues to own email verification and password reset. The daily return scheduler sends only for completed return transactions already present in the ledger.
