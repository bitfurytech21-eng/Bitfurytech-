import { randomUUID } from "node:crypto";
import { isDatabaseConfigured, queryDatabase } from "../db/pool.ts";
import { sendResendEmail } from "./resendMailer.ts";
import { getMailTemplateDefinition, renderMailTemplate, type MailTemplateEvent } from "./mailTemplates.ts";
import { addMockEmailOutbox, getMockEmailTemplates } from "./inMemoryFinancialMock.ts";

export interface EnqueueMailEventInput {
  eventType: MailTemplateEvent;
  userId: string;
  recipient: string;
  /** Kept for legacy callers during cutover; never sent to Resend. */
  rawToken?: string;
  values: Record<string, unknown>;
}

export function getMailDeliveryStatus(): {
  configured: boolean;
  hasApiKey: boolean;
  hasFromEmail: boolean;
  missingKeys: string[];
} {
  const hasApiKey = Boolean(process.env.RESEND_API_KEY?.trim());
  const hasFromEmail = Boolean(process.env.RESEND_FROM_EMAIL?.trim());
  const missingKeys: string[] = [];
  if (!hasApiKey) missingKeys.push("RESEND_API_KEY");
  if (!hasFromEmail) missingKeys.push("RESEND_FROM_EMAIL");
  return {
    configured: hasApiKey && hasFromEmail,
    hasApiKey,
    hasFromEmail,
    missingKeys,
  };
}

async function resolveEffectiveTemplate(eventType: MailTemplateEvent): Promise<{
  subject: string;
  body: string;
  enabled: boolean;
} | null> {
  const def = getMailTemplateDefinition(eventType);
  if (!def || def.triggerStatus !== "wired") return null;

  if (!isDatabaseConfigured) {
    const mock = getMockEmailTemplates().find((item) => item.eventType === eventType);
    return {
      subject: mock?.subject ?? def.subject,
      body: mock?.body ?? def.body,
      enabled: mock?.enabled ?? def.enabled,
    };
  }

  try {
    const saved = await queryDatabase<{ subject: string; body: string; enabled: boolean }>(
      "SELECT subject, body, enabled FROM email_templates WHERE event_type = $1 LIMIT 1",
      [eventType]
    );
    const row = saved.rows[0];
    if (row) {
      return {
        subject: row.subject,
        body: row.body,
        enabled: row.enabled,
      };
    }
  } catch (error) {
    console.warn("Unable to read email_templates override; falling back to default:", error);
  }

  return {
    subject: def.subject,
    body: def.body,
    enabled: def.enabled,
  };
}

async function recordOutboxAttempt(params: {
  eventType: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
  status: "sent" | "failed";
  resendId?: string;
  lastError?: string | null;
}): Promise<void> {
  const id = `mail_${randomUUID()}`;
  const payload = {
    subject: params.subject,
    body: params.body,
    ...(params.resendId ? { resendId: params.resendId } : {}),
    ...(params.lastError ? { error: params.lastError } : {}),
  };

  if (!isDatabaseConfigured) {
    addMockEmailOutbox({
      id,
      eventType: params.eventType,
      recipient: params.recipient,
      subject: params.subject,
      body: params.body,
      status: params.status,
      lastError: params.lastError ?? null,
    });
    return;
  }

  try {
    await queryDatabase(
      `INSERT INTO email_outbox (id, event_type, user_id, recipient, payload, status, attempts, last_error, sent_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, 1, $7, CASE WHEN $6 = 'sent' THEN now() ELSE NULL END)`,
      [
        id,
        params.eventType,
        params.userId,
        params.recipient,
        JSON.stringify(payload),
        params.status,
        params.lastError ?? null,
      ]
    );
  } catch (error) {
    console.error("Failed to record email_outbox entry:", error);
  }
}

/** Sends the notification directly and records the outcome in email_outbox. A true result means Resend accepted the message. */
export async function enqueueMailEvent({ eventType, userId, recipient, values }: EnqueueMailEventInput): Promise<boolean> {
  const cleanRecipient = recipient.trim().toLowerCase().slice(0, 200);
  if (!cleanRecipient || !userId) return false;

  const template = await resolveEffectiveTemplate(eventType);
  if (!template || !template.enabled) return false;

  const subject = renderMailTemplate(template.subject, values).trim().slice(0, 160);
  const body = renderMailTemplate(template.body, values).trim().slice(0, 3000);
  if (!subject || !body) return false;

  const delivery = getMailDeliveryStatus();
  if (!delivery.configured) {
    const reason = `Resend is not configured (missing ${delivery.missingKeys.join(", ")}).`;
    await recordOutboxAttempt({
      eventType,
      userId,
      recipient: cleanRecipient,
      subject,
      body,
      status: "failed",
      lastError: reason,
    });
    return false;
  }

  const escapedBody = body.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char] ?? char);

  try {
    const resendId = await sendResendEmail({
      to: cleanRecipient,
      subject,
      text: body,
      html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#171717;line-height:1.6"><h2>BitfuryTech</h2><p>${escapedBody.replace(/\n/g, "<br>")}</p></body></html>`,
    });
    await recordOutboxAttempt({
      eventType,
      userId,
      recipient: cleanRecipient,
      subject,
      body,
      status: "sent",
      resendId,
    });
    console.info("Transactional email accepted by Resend", {
      eventType, userId: userId.slice(0, 128), recipient: cleanRecipient, resendId,
    });
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Unknown Resend delivery failure";
    await recordOutboxAttempt({
      eventType,
      userId,
      recipient: cleanRecipient,
      subject,
      body,
      status: "failed",
      lastError: message,
    });
    throw error;
  }
}

export interface SendCustomMailInput {
  eventType?: string;
  userId: string;
  recipient: string;
  subject: string;
  body: string;
}

export async function sendCustomMailEvent({
  eventType = "admin_private_notice",
  userId,
  recipient,
  subject,
  body,
}: SendCustomMailInput): Promise<{ delivered: boolean; error?: string }> {
  const cleanRecipient = recipient.trim().toLowerCase().slice(0, 200);
  const cleanSubject = subject.trim().slice(0, 160);
  const cleanBody = body.trim().slice(0, 3000);
  if (!cleanRecipient || !userId || !cleanSubject || !cleanBody) {
    return { delivered: false, error: "Recipient, subject, and message body are required." };
  }

  const delivery = getMailDeliveryStatus();
  if (!delivery.configured) {
    const reason = `Resend is not configured (missing ${delivery.missingKeys.join(", ")}).`;
    await recordOutboxAttempt({
      eventType,
      userId,
      recipient: cleanRecipient,
      subject: cleanSubject,
      body: cleanBody,
      status: "failed",
      lastError: reason,
    });
    return { delivered: false, error: reason };
  }

  const escapeHtml = (input: string) =>
    input.replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[char] ?? char);

  const escapedSubject = escapeHtml(cleanSubject);
  const escapedBody = escapeHtml(cleanBody).replace(/\n/g, "<br>");

  try {
    const resendId = await sendResendEmail({
      to: cleanRecipient,
      subject: cleanSubject,
      text: cleanBody,
      html: `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;color:#102030;line-height:1.6;background:#F6F8FA;padding:24px"><div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #DCE4EC;border-radius:5px;overflow:hidden"><div style="background:#1B4962;color:#ffffff;padding:18px 24px"><h2 style="margin:0;font-size:18px">BitfuryTech Private Notice</h2></div><div style="padding:24px"><h3 style="margin:0 0 12px;font-size:15px;color:#102030">${escapedSubject}</h3><p style="margin:0;font-size:14px;color:#3B4C5E">${escapedBody}</p></div></div></body></html>`,
    });
    await recordOutboxAttempt({
      eventType,
      userId,
      recipient: cleanRecipient,
      subject: cleanSubject,
      body: cleanBody,
      status: "sent",
      resendId,
    });
    return { delivered: true };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : "Unknown Resend delivery failure";
    await recordOutboxAttempt({
      eventType,
      userId,
      recipient: cleanRecipient,
      subject: cleanSubject,
      body: cleanBody,
      status: "failed",
      lastError: message,
    });
    return { delivered: false, error: message };
  }
}


