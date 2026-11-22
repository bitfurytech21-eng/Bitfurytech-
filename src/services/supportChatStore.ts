import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

export type SupportChannelMode = "twilio-conversations" | "live-websocket";
export type SupportThreadStatus = "Open" | "Resolved";
export type SupportSenderRole = "client" | "agent" | "system";

export interface SupportThread {
  id: string;
  userId: string | null;
  visitorName: string;
  visitorEmail: string;
  topic: string;
  status: SupportThreadStatus;
  channel: SupportChannelMode;
  twilioConversationSid: string | null;
  twilioParticipantIdentity: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  lastMessagePreview: string;
}

export interface SupportMessage {
  id: string;
  threadId: string;
  senderRole: SupportSenderRole;
  senderName: string;
  body: string;
  source: "web" | "twilio";
  twilioMessageSid: string | null;
  clientMessageId?: string | null;
  createdAt: string;
}

interface PersistedSupportStore {
  threads: SupportThread[];
  messages: SupportMessage[];
}

export interface VisitorSessionClaims {
  threadId: string;
  email: string;
  exp: number;
}

const DATA_DIR = path.resolve(process.cwd(), "data");
const STORE_PATH = path.resolve(DATA_DIR, "support-threads.json");
const SESSION_SIGNING_KEY =
  process.env.SESSION_SECRET?.trim() ||
  process.env.TWILIO_SESSION_SECRET?.trim() ||
  crypto.randomBytes(32).toString("hex");

const VALID_THREAD_ID_RE = /^[a-zA-Z0-9_-]{4,80}$/;

const threads = new Map<string, SupportThread>();
const messagesByThread = new Map<string, SupportMessage[]>();
let loadedFromDisk = false;
let persistTimer: NodeJS.Timeout | null = null;

type RealtimeBroadcaster = {
  broadcastMessage: (msg: SupportMessage, thread: SupportThread) => void;
  broadcastThreadUpdate: (thread: SupportThread) => void;
};

let broadcaster: RealtimeBroadcaster | null = null;

export function registerSupportBroadcaster(next: RealtimeBroadcaster): void {
  broadcaster = next;
}

export function isValidThreadId(threadId: string): boolean {
  return VALID_THREAD_ID_RE.test(threadId);
}

export async function initSupportStore(): Promise<void> {
  if (loadedFromDisk) return;
  loadedFromDisk = true;
  if (!STORE_PATH.startsWith(DATA_DIR + path.sep)) {
    throw new Error("Invalid support store path.");
  }
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<PersistedSupportStore>;
    if (Array.isArray(parsed.threads)) {
      for (const t of parsed.threads) {
        if (t && typeof t.id === "string" && isValidThreadId(t.id)) {
          threads.set(t.id, t);
          messagesByThread.set(t.id, []);
        }
      }
    }
    if (Array.isArray(parsed.messages)) {
      for (const m of parsed.messages) {
        if (m && typeof m.threadId === "string" && threads.has(m.threadId)) {
          const list = messagesByThread.get(m.threadId) || [];
          list.push(m);
          messagesByThread.set(m.threadId, list);
        }
      }
    }
  } catch {
    // Store initializes cleanly on first run
  }
}

function schedulePersist(): void {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persistNow();
  }, 200);
}

async function persistNow(): Promise<void> {
  if (!STORE_PATH.startsWith(DATA_DIR + path.sep)) return;
  const payload: PersistedSupportStore = {
    threads: Array.from(threads.values()),
    messages: Array.from(messagesByThread.values()).flat(),
  };
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmpPath = path.resolve(DATA_DIR, `support-threads.${Date.now()}.tmp`);
    if (!tmpPath.startsWith(DATA_DIR + path.sep)) return;
    await fs.writeFile(tmpPath, JSON.stringify(payload, null, 2), "utf8");
    await fs.rename(tmpPath, STORE_PATH);
  } catch (err) {
    console.error("Failed to persist support threads:", err);
  }
}

export function signVisitorToken(threadId: string, email: string): string {
  const claims: VisitorSessionClaims = {
    threadId,
    email: email.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24h session
  };
  const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", SESSION_SIGNING_KEY)
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifyVisitorToken(token: string): VisitorSessionClaims | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;

  const expectedSig = crypto
    .createHmac("sha256", SESSION_SIGNING_KEY)
    .update(payload)
    .digest("base64url");

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as VisitorSessionClaims;
    if (
      !claims ||
      !isValidThreadId(claims.threadId) ||
      typeof claims.email !== "string" ||
      typeof claims.exp !== "number"
    ) {
      return null;
    }
    if (claims.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

export function findOpenThreadForUser(uid: string): SupportThread | null {
  let latest: SupportThread | null = null;
  for (const t of threads.values()) {
    if (t.userId === uid && t.status === "Open") {
      if (!latest || t.updatedAt > latest.updatedAt) {
        latest = t;
      }
    }
  }
  return latest;
}

export function findThreadById(threadId: string): SupportThread | null {
  return threads.get(threadId) || null;
}

export function findThreadByTwilioSid(conversationSid: string): SupportThread | null {
  for (const t of threads.values()) {
    if (t.twilioConversationSid === conversationSid) {
      return t;
    }
  }
  return null;
}

export function listAllThreads(): SupportThread[] {
  return Array.from(threads.values()).sort((a, b) =>
    b.lastMessageAt.localeCompare(a.lastMessageAt)
  );
}

export function getThreadMessages(threadId: string): SupportMessage[] {
  return [...(messagesByThread.get(threadId) || [])];
}

export function createSupportThread(params: {
  userId: string | null;
  visitorName: string;
  visitorEmail: string;
  topic: string;
  channel: SupportChannelMode;
  twilioConversationSid: string | null;
  twilioParticipantIdentity: string;
}): SupportThread {
  const id = `sup_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
  const now = new Date().toISOString();
  const thread: SupportThread = {
    id,
    userId: params.userId,
    visitorName: params.visitorName.slice(0, 120),
    visitorEmail: params.visitorEmail.slice(0, 200),
    topic: params.topic.slice(0, 120),
    status: "Open",
    channel: params.channel,
    twilioConversationSid: params.twilioConversationSid,
    twilioParticipantIdentity: params.twilioParticipantIdentity,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    lastMessagePreview: `Session opened (${params.topic.slice(0, 80)})`,
  };
  threads.set(id, thread);
  messagesByThread.set(id, []);
  schedulePersist();
  broadcaster?.broadcastThreadUpdate(thread);
  return thread;
}

export function updateSupportThreadTwilioSid(
  threadId: string,
  conversationSid: string,
  channel: SupportChannelMode
): SupportThread | null {
  const existing = threads.get(threadId);
  if (!existing) return null;
  existing.twilioConversationSid = conversationSid;
  existing.channel = channel;
  existing.updatedAt = new Date().toISOString();
  schedulePersist();
  broadcaster?.broadcastThreadUpdate(existing);
  return existing;
}

export function setSupportThreadStatus(
  threadId: string,
  status: SupportThreadStatus
): SupportThread | null {
  const existing = threads.get(threadId);
  if (!existing) return null;
  existing.status = status;
  existing.updatedAt = new Date().toISOString();
  schedulePersist();
  broadcaster?.broadcastThreadUpdate(existing);
  return existing;
}

export function appendSupportMessage(params: {
  threadId: string;
  senderRole: SupportSenderRole;
  senderName: string;
  body: string;
  source: "web" | "twilio";
  twilioMessageSid?: string | null;
  clientMessageId?: string | null;
}): { message: SupportMessage; inserted: boolean } | null {
  const thread = threads.get(params.threadId);
  if (!thread) return null;

  const list = messagesByThread.get(params.threadId) || [];

  if (params.twilioMessageSid) {
    const dupTwilio = list.find((m) => m.twilioMessageSid === params.twilioMessageSid);
    if (dupTwilio) {
      return { message: dupTwilio, inserted: false };
    }
  }
  if (params.clientMessageId) {
    const dupClient = list.find((m) => m.clientMessageId === params.clientMessageId);
    if (dupClient) {
      return { message: dupClient, inserted: false };
    }
  }

  const now = new Date().toISOString();
  const msg: SupportMessage = {
    id: `msg_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
    threadId: params.threadId,
    senderRole: params.senderRole,
    senderName: params.senderName.slice(0, 120),
    body: params.body.slice(0, 1500),
    source: params.source,
    twilioMessageSid: params.twilioMessageSid ?? null,
    clientMessageId: params.clientMessageId ?? null,
    createdAt: now,
  };

  list.push(msg);
  messagesByThread.set(params.threadId, list);

  thread.updatedAt = now;
  thread.lastMessageAt = now;
  thread.lastMessagePreview = msg.body.slice(0, 120);
  if (thread.status === "Resolved" && params.senderRole === "client") {
    thread.status = "Open";
  }

  schedulePersist();
  broadcaster?.broadcastMessage(msg, thread);
  return { message: msg, inserted: true };
}
