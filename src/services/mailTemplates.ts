export const DEFAULT_MAIL_TEMPLATES = [
  {
    eventType: "client_registration",
    label: "Client registration",
    subject: "Welcome to BitfuryTech",
    body: "Hello {{firstName}}, your client registration is complete. Verify your email using the separate Firebase Authentication message before signing in.",
    enabled: true,
    triggerStatus: "wired",
    triggerDescription: "Queued when a client account is created.",
    editable: true,
  },
  {
    eventType: "deposit_initiated",
    label: "Deposit initiated",
    subject: "Deposit request received — {{reference}}",
    body: "Hello {{firstName}}, we received your deposit request for {{amount}} via {{method}}. Reference: {{reference}}. Current status: pending verification.",
    enabled: true,
    triggerStatus: "wired",
    triggerDescription: "Queued after a deposit request is recorded.",
    editable: true,
  },
  {
    eventType: "deposit_approved",
    label: "Deposit approved",
    subject: "Deposit approved — {{reference}}",
    body: "Hello {{firstName}}, your deposit of {{amount}} has been approved and recorded. Reference: {{reference}}.",
    enabled: true,
    triggerStatus: "wired",
    triggerDescription: "Queued when an administrator approves a deposit.",
    editable: true,
  },
  {
    eventType: "deposit_rejected",
    label: "Deposit not approved",
    subject: "Deposit update — {{reference}}",
    body: "Hello {{firstName}}, your deposit request for {{amount}} was not approved. Reference: {{reference}}. Please review your client portal for details or contact support.",
    enabled: true,
    triggerStatus: "wired",
    triggerDescription: "Queued when an administrator rejects a deposit.",
    editable: true,
  },
  {
    eventType: "withdrawal_initiated",
    label: "Withdrawal initiated",
    subject: "Withdrawal request received — {{reference}}",
    body: "Hello {{firstName}}, we received your withdrawal request for {{amount}}. Reference: {{reference}}. Current status: pending review.",
    enabled: true,
    triggerStatus: "wired",
    triggerDescription: "Queued after a withdrawal request is recorded.",
    editable: true,
  },
  {
    eventType: "withdrawal_approved",
    label: "Withdrawal approved",
    subject: "Withdrawal approved — {{reference}}",
    body: "Hello {{firstName}}, your withdrawal request for {{amount}} has been approved. Reference: {{reference}}.",
    enabled: true,
    triggerStatus: "wired",
    triggerDescription: "Queued when an administrator approves a withdrawal.",
    editable: true,
  },
  {
    eventType: "withdrawal_rejected",
    label: "Withdrawal update — {{reference}}",
    subject: "Withdrawal not approved — {{reference}}",
    body: "Hello {{firstName}}, your withdrawal request for {{amount}} was not approved. Reference: {{reference}}. Any reserved amount has been returned to your available balance.",
    enabled: true,
    triggerStatus: "wired",
    triggerDescription: "Queued when an administrator rejects a withdrawal.",
    editable: true,
  },
  {
    eventType: "daily_roi",
    label: "Daily ROI update",
    subject: "Daily investment update",
    body: "Hello {{firstName}}, an investment update has been posted to your client portal. Review your account activity for the latest recorded details.",
    enabled: true,
    triggerStatus: "workflow_required",
    triggerDescription: "No daily ROI distribution or scheduler currently exists in this app.",
    editable: true,
  },
  {
    eventType: "newsletter_signup",
    label: "Newsletter subscription",
    subject: "You are subscribed to BitfuryTech updates",
    body: "Hello, your address {{email}} has been added to BitfuryTech updates.",
    enabled: true,
    triggerStatus: "workflow_required",
    triggerDescription: "The current public signup stores an inquiry; it has no mail-delivery workflow.",
    editable: true,
  },
  {
    eventType: "kyc_status",
    label: "KYC status update",
    subject: "Identity verification status update",
    body: "Hello {{firstName}}, your identity verification status is now {{status}}. Sign in to your client portal for the latest details.",
    enabled: true,
    triggerStatus: "workflow_required",
    triggerDescription: "No KYC review workflow or status field currently exists in this app.",
    editable: true,
  },
  {
    eventType: "email_verification",
    label: "Email verification",
    subject: "Verify your BitfuryTech email address",
    body: "Complete verification using the secure message sent by Firebase Authentication.",
    enabled: true,
    triggerStatus: "firebase_auth",
    triggerDescription: "Sent by Firebase Authentication; customize its delivery template in Firebase Console.",
    editable: false,
  },
  {
    eventType: "password_reset",
    label: "Forgotten password reset",
    subject: "Reset your BitfuryTech password",
    body: "Use the secure password reset link sent by Firebase Authentication. If you did not request it, you can ignore that message.",
    enabled: true,
    triggerStatus: "firebase_auth",
    triggerDescription: "Sent by Firebase Authentication; the app already calls sendPasswordResetEmail.",
    editable: false,
  },
] as const;

export type MailTemplateEvent = (typeof DEFAULT_MAIL_TEMPLATES)[number]["eventType"];
export type MailTemplateDefinition = (typeof DEFAULT_MAIL_TEMPLATES)[number];

export function getMailTemplateDefinition(
  eventType: string
): MailTemplateDefinition | undefined {
  return DEFAULT_MAIL_TEMPLATES.find((template) => template.eventType === eventType);
}

export function renderMailTemplate(
  template: string,
  values: Record<string, unknown>
): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) =>
    String(values[key] ?? "")
  );
}
