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
