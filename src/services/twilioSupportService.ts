import twilio from "twilio";

export interface TwilioIntegrationStatus {
  configured: boolean;
  webhookValidationEnabled: boolean;
  smsAlertsEnabled: boolean;
  conversationsServiceConfigured: boolean;
  missingKeys: string[];
  webhookPath: string;
}

function envStr(key: string): string {
  return String(process.env[key] || "").trim();
}

export function getTwilioIntegrationStatus(): TwilioIntegrationStatus {
  const required: Array<{ key: string; val: string }> = [
    { key: "TWILIO_ACCOUNT_SID", val: envStr("TWILIO_ACCOUNT_SID") },
    { key: "TWILIO_API_KEY_SID", val: envStr("TWILIO_API_KEY_SID") },
    { key: "TWILIO_API_KEY_SECRET", val: envStr("TWILIO_API_KEY_SECRET") },
    {
      key: "TWILIO_CONVERSATIONS_SERVICE_SID",
      val: envStr("TWILIO_CONVERSATIONS_SERVICE_SID"),
    },
  ];

  const missingKeys = required.filter((r) => !r.val).map((r) => r.key);
  const authToken = envStr("TWILIO_AUTH_TOKEN");
  const fromNum = envStr("TWILIO_FROM_NUMBER");
  const notifyPhone = envStr("TWILIO_SUPPORT_NOTIFY_PHONE");

  return {
    configured: missingKeys.length === 0,
    webhookValidationEnabled: Boolean(authToken),
    smsAlertsEnabled: Boolean(
      envStr("TWILIO_ACCOUNT_SID") && authToken && fromNum && notifyPhone
    ),
    conversationsServiceConfigured: Boolean(envStr("TWILIO_CONVERSATIONS_SERVICE_SID")),
    missingKeys,
    webhookPath: "/api/webhooks/twilio/conversations",
  };
}

function getTwilioRestClient() {
  const accountSid = envStr("TWILIO_ACCOUNT_SID");
  const authToken = envStr("TWILIO_AUTH_TOKEN");
  const apiKeySid = envStr("TWILIO_API_KEY_SID");
  const apiKeySecret = envStr("TWILIO_API_KEY_SECRET");

  if (!accountSid) return null;
  if (apiKeySid && apiKeySecret) {
    return twilio(apiKeySid, apiKeySecret, { accountSid });
  }
  if (authToken) {
    return twilio(accountSid, authToken);
  }
  return null;
}

export function mintTwilioConversationsToken(identity: string): string | null {
  const accountSid = envStr("TWILIO_ACCOUNT_SID");
  const apiKeySid = envStr("TWILIO_API_KEY_SID");
  const apiKeySecret = envStr("TWILIO_API_KEY_SECRET");
  const serviceSid = envStr("TWILIO_CONVERSATIONS_SERVICE_SID");

  if (!accountSid || !apiKeySid || !apiKeySecret || !serviceSid) {
    return null;
  }

  const { AccessToken } = twilio.jwt;
  const { ChatGrant } = AccessToken;

  const chatGrant = new ChatGrant({
    serviceSid,
  });

  const token = new AccessToken(accountSid, apiKeySid, apiKeySecret, {
    identity: identity.slice(0, 128),
    ttl: 3600,
  });
  token.addGrant(chatGrant);

  return token.toJwt();
}

export async function ensureTwilioConversation(params: {
  uniqueName: string;
  friendlyName: string;
  participantIdentity: string;
}): Promise<string | null> {
  const serviceSid = envStr("TWILIO_CONVERSATIONS_SERVICE_SID");
  const client = getTwilioRestClient();
  if (!serviceSid || !client) {
    return null;
  }

  const service = client.conversations.v1.services(serviceSid);
  let conversationSid: string | null = null;

  try {
    const existing = await service.conversations(params.uniqueName).fetch();
    conversationSid = existing.sid;
  } catch {
    const created = await service.conversations.create({
      uniqueName: params.uniqueName.slice(0, 120),
      friendlyName: params.friendlyName.slice(0, 180),
    });
    conversationSid = created.sid;
  }

  if (!conversationSid) return null;

  const ensureParticipant = async (identity: string) => {
    try {
      await service
        .conversations(conversationSid as string)
        .participants.create({ identity: identity.slice(0, 128) });
    } catch (err) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? Number((err as { code?: unknown }).code)
          : 0;
      // 50433 = Participant already exists in conversation
      if (code !== 50433) {
        console.warn(`Twilio participant add notice (${identity}):`, code || err);
      }
    }
  };

  await Promise.all([
    ensureParticipant(params.participantIdentity),
    ensureParticipant("bf_support_desk"),
  ]);

  return conversationSid;
}

export async function postTwilioConversationMessage(params: {
  conversationSid: string;
  author: string;
  body: string;
}): Promise<string | null> {
  const serviceSid = envStr("TWILIO_CONVERSATIONS_SERVICE_SID");
  const client = getTwilioRestClient();
  if (!serviceSid || !client || !params.conversationSid) {
    return null;
  }

  try {
    const msg = await client.conversations.v1
      .services(serviceSid)
      .conversations(params.conversationSid)
      .messages.create({
        author: params.author.slice(0, 128),
        body: params.body.slice(0, 1500),
      });
    return msg.sid;
  } catch (err) {
    console.error("Twilio message post failed:", err);
    return null;
  }
}

export async function sendSupportSmsAlert(params: {
  visitorName: string;
  visitorEmail: string;
  topic: string;
}): Promise<void> {
  const client = getTwilioRestClient();
  const from = envStr("TWILIO_FROM_NUMBER");
  const to = envStr("TWILIO_SUPPORT_NOTIFY_PHONE");
  if (!client || !from || !to) return;

  try {
    await client.messages.create({
      from,
      to,
      body: `BitfuryTech Live Support: ${params.visitorName} (${params.visitorEmail}) started a chat regarding "${params.topic}".`,
    });
  } catch (err) {
    console.warn("Twilio support SMS notification skipped:", err);
  }
}

export function validateTwilioWebhookSignature(params: {
  signature: string | undefined;
  url: string;
  body: Record<string, unknown>;
}): boolean {
  const authToken = envStr("TWILIO_AUTH_TOKEN");
  if (!authToken || !params.signature) {
    return false;
  }
  const stringParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(params.body || {})) {
    stringParams[k] = typeof v === "string" ? v : String(v ?? "");
  }
  return twilio.validateRequest(authToken, params.signature, params.url, stringParams);
}
