import { sendResendEmail } from "./resendMailer.ts";

type AuthMailKind = "verify" | "reset";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);
}

export async function sendBetterAuthEmail(kind: AuthMailKind, recipient: string, actionUrl: string): Promise<void> {
  const safeUrl = escapeHtml(actionUrl);
  const isVerify = kind === "verify";
  const subject = isVerify ? "Verify your BitfuryTech email" : "Reset your BitfuryTech password";
  const action = isVerify ? "Verify email address" : "Reset password";
  const intro = isVerify
    ? "Confirm your email address to activate your BitfuryTech account."
    : "We received a request to reset your BitfuryTech password.";

  await sendResendEmail({
    to: recipient,
    subject,
    text: `${intro}\n\n${action}: ${actionUrl}\n\nIf you did not request this, you can ignore this email.`,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#171717;line-height:1.6"><h2>BitfuryTech</h2><p>${intro}</p><p><a href="${safeUrl}" style="display:inline-block;padding:12px 20px;background:#3F8A3F;color:#FFFFFF;font-weight:bold;text-decoration:none;border-radius:6px">${action}</a></p><p>If you did not request this, you can ignore this email.</p></body></html>`,
  });
}
