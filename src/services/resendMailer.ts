export interface ResendEmailInput { to: string; subject: string; text: string; html?: string; }

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required Resend setting: ${name}`);
  return value;
}

/** Sends transactional email through Resend. The API key stays server-side. */
export async function sendResendEmail(input: ResendEmailInput): Promise<string> {
  const apiKey = requiredEnv("RESEND_API_KEY");
  const from = requiredEnv("RESEND_FROM_EMAIL");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from, to: [input.to], subject: input.subject, text: input.text,
      ...(input.html ? { html: input.html } : {}),
    }),
    signal: AbortSignal.timeout(15000),
  });
  const payload = await response.json().catch(() => ({})) as { id?: string; message?: string; name?: string };
  if (!response.ok || !payload.id) {
    throw new Error(`Resend email delivery failed: ${payload.message || payload.name || `HTTP ${response.status}`}`);
  }
  return payload.id;
}
