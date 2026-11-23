import { sendResendEmail } from "./resendMailer.ts";
import { getMailTemplateDefinition, renderMailTemplate, type MailTemplateEvent } from "./mailTemplates.ts";

export interface EnqueueMailEventInput {
  eventType: MailTemplateEvent;
  userId: string;
  recipient: string;
  /** Kept for legacy callers during cutover; never sent to Resend. */
  rawToken?: string;
  values: Record<string, unknown>;
}

/** Sends the notification directly. A true result means Resend accepted the message. */
export async function enqueueMailEvent({ eventType, userId, recipient, values }: EnqueueMailEventInput): Promise<boolean> {
  if (!process.env.RESEND_API_KEY?.trim() || !process.env.RESEND_FROM_EMAIL?.trim()) {
    return false;
  }
  const template = getMailTemplateDefinition(eventType);
  if (!template || template.triggerStatus !== "wired") return false;
  const cleanRecipient = recipient.trim().toLowerCase().slice(0, 200);
  if (!cleanRecipient || !userId) return false;

  const subject = renderMailTemplate(template.subject, values).trim().slice(0, 160);
  const body = renderMailTemplate(template.body, values).trim().slice(0, 3000);
  if (!subject || !body) return false;
  const escapedBody = body.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);

  const resendId = await sendResendEmail({
    to: cleanRecipient,
    subject,
    text: body,
    html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#171717;line-height:1.6"><h2>BitfuryTech</h2><p>${escapedBody.replace(/\n/g, "<br>")}</p></body></html>`,
  });
  console.info("Transactional email accepted by Resend", {
    eventType, userId: userId.slice(0, 128), recipient: cleanRecipient, resendId,
  });
  return true;
}
