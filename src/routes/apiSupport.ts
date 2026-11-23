import express, { Router, type Request } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { betterAuthInstance } from "../lib/better-auth.ts";
import {
  requireBetterAdmin,
  requireBetterAuth,
  requireBetterVerifiedEmail,
  type BetterAuthRequest,
} from "../middleware/betterAuth.ts";
import {
  appendSupportMessage,
  createSupportThread,
  findOpenThreadForUser,
  findThreadById,
  findThreadByTwilioSid,
  getThreadMessages,
  initSupportStore,
  isValidThreadId,
  listAllThreads,
  setSupportThreadStatus,
  signVisitorToken,
  updateSupportThreadTwilioSid,
  verifyVisitorToken,
} from "../services/supportChatStore.ts";
import {
  ensureTwilioConversation,
  getTwilioIntegrationStatus,
  mintTwilioConversationsToken,
  postTwilioConversationMessage,
  sendSupportSmsAlert,
  validateTwilioWebhookSignature,
} from "../services/twilioSupportService.ts";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function resolveCallerAccess(
  req: Request,
  threadId: string
): Promise<{
  ok: boolean;
  isAdmin: boolean;
  uid: string | null;
  visitorName?: string;
}> {
  try {
    const session = await betterAuthInstance.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (session?.user?.id && session.user.emailVerified) {
      const thread = findThreadById(threadId);
      if (thread && thread.userId === session.user.id) {
        return { ok: true, isAdmin: false, uid: session.user.id };
      }
    }
  } catch {
    // Fall through to visitor token check
  }

  const visitorHeader = req.headers["x-visitor-token"];
  const visitorToken = typeof visitorHeader === "string" ? visitorHeader.trim() : "";
  if (visitorToken) {
    const claims = verifyVisitorToken(visitorToken);
    if (claims && claims.threadId === threadId) {
      return { ok: true, isAdmin: false, uid: null, visitorName: claims.email };
    }
  }

  return { ok: false, isAdmin: false, uid: null };
}

export function createSupportRouter(): Router {
  const router = Router();
  void initSupportStore();

  // Public capability check (returns non-secret configuration state only)
  router.get("/support/status", (_req, res) => {
    const status = getTwilioIntegrationStatus();
    res.json({
      configured: status.configured,
      channelMode: status.configured ? "twilio-conversations" : "live-websocket",
      smsAlertsEnabled: status.smsAlertsEnabled,
    });
  });

  // Start or resume a live support chat session (authenticated investor OR public visitor)
  router.post("/support/session", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    await initSupportStore();

    const body = (req.body ?? {}) as Record<string, unknown>;
    const topic =
      typeof body.topic === "string" && body.topic.trim()
        ? body.topic.trim().slice(0, 120)
        : "Client Relations & Account Support";
    const initialMessage =
      typeof body.initialMessage === "string"
        ? body.initialMessage.trim().slice(0, 1500)
        : "";

    let userId: string | null = null;
    let visitorName = typeof body.name === "string" ? body.name.trim().slice(0, 120) : "";
    let visitorEmail =
      typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";

    try {
      const session = await betterAuthInstance.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      if (session?.user?.id && session.user.emailVerified) {
        userId = session.user.id;
        visitorEmail = (session.user.email || visitorEmail || "investor@bitfurytech.com").slice(0, 200);
        visitorName = (
          (typeof session.user.name === "string" && session.user.name) ||
          visitorName ||
          visitorEmail.split("@")[0] ||
          "BitfuryTech Investor"
        ).slice(0, 120);
      }
    } catch {
      // Fall back to visitor token / guest inquiry details
    }

    // Check if an existing visitor token matches an open thread
    const existingVisitorToken =
      typeof body.visitorToken === "string" ? body.visitorToken.trim() : "";
    if (!userId && existingVisitorToken) {
      const claims = verifyVisitorToken(existingVisitorToken);
      if (claims) {
        const existingThread = findThreadById(claims.threadId);
        if (existingThread) {
          const twilioStatus = getTwilioIntegrationStatus();
          const twilioToken = twilioStatus.configured
            ? mintTwilioConversationsToken(existingThread.twilioParticipantIdentity)
            : null;
          res.json({
            ok: true,
            mode:
              twilioToken && existingThread.twilioConversationSid
                ? "twilio-conversations"
                : "live-websocket",
            thread: existingThread,
            messages: getThreadMessages(existingThread.id),
            visitorToken: existingVisitorToken,
            twilioToken,
            conversationSid: existingThread.twilioConversationSid,
            identity: existingThread.twilioParticipantIdentity,
          });
          return;
        }
      }
    }

    if (!userId) {
      if (!visitorName || visitorName.length > 120) {
        res.status(400).json({ error: "Enter your full name (1–120 characters)." });
        return;
      }
      if (!visitorEmail || !EMAIL_RE.test(visitorEmail)) {
        res.status(400).json({ error: "Enter a valid email address to start live support." });
        return;
      }
    }

    const twilioStatus = getTwilioIntegrationStatus();
    let thread = userId ? findOpenThreadForUser(userId) : null;
    let isNewThread = false;

    if (!thread) {
      isNewThread = true;
      const participantIdentity = userId
        ? `bf_user_${userId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64)}`
        : `bf_vis_${Buffer.from(visitorEmail).toString("hex").slice(0, 24)}_${Date.now()
            .toString()
            .slice(-6)}`;

      thread = createSupportThread({
        userId,
        visitorName,
        visitorEmail,
        topic,
        channel: twilioStatus.configured ? "twilio-conversations" : "live-websocket",
        twilioConversationSid: null,
        twilioParticipantIdentity: participantIdentity,
      });

      appendSupportMessage({
        threadId: thread.id,
        senderRole: "system",
        senderName: "BitfuryTech Desk",
        body: `Live support channel initialized for ${visitorName} regarding "${topic}". Our Client Relations Desk responds directly in real time.`,
        source: "web",
      });
    }

    let twilioToken: string | null = null;
    if (twilioStatus.configured) {
      try {
        let convSid = thread.twilioConversationSid;
        if (!convSid) {
          convSid = await ensureTwilioConversation({
            uniqueName: `bitfurytech_${thread.id}`,
            friendlyName: `${thread.visitorName} — ${thread.topic}`,
            participantIdentity: thread.twilioParticipantIdentity,
          });
          if (convSid) {
            updateSupportThreadTwilioSid(thread.id, convSid, "twilio-conversations");
            thread = findThreadById(thread.id) || thread;
          }
        }
        twilioToken = mintTwilioConversationsToken(thread.twilioParticipantIdentity);
      } catch (err) {
        console.warn("Twilio conversation setup fallback to live WebSocket:", err);
      }
    }

    if (initialMessage) {
      let twilioMessageSid: string | null = null;
      if (thread.twilioConversationSid) {
        twilioMessageSid = await postTwilioConversationMessage({
          conversationSid: thread.twilioConversationSid,
          author: thread.twilioParticipantIdentity,
          body: initialMessage,
        });
      }
      appendSupportMessage({
        threadId: thread.id,
        senderRole: "client",
        senderName: thread.visitorName,
        body: initialMessage,
        source: "web",
        twilioMessageSid,
      });
    }

    if (isNewThread) {
      void sendSupportSmsAlert({
        visitorName: thread.visitorName,
        visitorEmail: thread.visitorEmail,
        topic: thread.topic,
      });
    }

    const visitorToken = userId
      ? null
      : signVisitorToken(thread.id, thread.visitorEmail);

    res.status(isNewThread ? 201 : 200).json({
      ok: true,
      mode:
        twilioToken && thread.twilioConversationSid
          ? "twilio-conversations"
          : "live-websocket",
      thread,
      messages: getThreadMessages(thread.id),
      visitorToken,
      twilioToken,
      conversationSid: thread.twilioConversationSid,
      identity: thread.twilioParticipantIdentity,
    });
  });

  // Fetch thread history + refreshed Twilio token
  router.get("/support/threads/:threadId", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    await initSupportStore();

    const threadId = req.params.threadId?.trim() || "";
    if (!isValidThreadId(threadId)) {
      res.status(400).json({ error: "Invalid thread identifier." });
      return;
    }

    const access = await resolveCallerAccess(req, threadId);
    if (!access.ok) {
      res.status(401).json({ error: "Unauthorized to access this support thread." });
      return;
    }

    const thread = findThreadById(threadId);
    if (!thread) {
      res.status(404).json({ error: "Support thread not found." });
      return;
    }

    const twilioStatus = getTwilioIntegrationStatus();
    const twilioToken = twilioStatus.configured
      ? mintTwilioConversationsToken(thread.twilioParticipantIdentity)
      : null;

    res.json({
      ok: true,
      thread,
      messages: getThreadMessages(threadId),
      twilioToken,
    });
  });

  // REST fallback / synced message send for client/visitor
  router.post("/support/threads/:threadId/messages", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    await initSupportStore();

    const threadId = req.params.threadId?.trim() || "";
    if (!isValidThreadId(threadId)) {
      res.status(400).json({ error: "Invalid thread identifier." });
      return;
    }

    const access = await resolveCallerAccess(req, threadId);
    if (!access.ok) {
      res.status(401).json({ error: "Unauthorized to post to this support thread." });
      return;
    }

    const thread = findThreadById(threadId);
    if (!thread) {
      res.status(404).json({ error: "Support thread not found." });
      return;
    }

    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    const clientMessageId =
      typeof req.body?.clientMessageId === "string"
        ? req.body.clientMessageId.trim().slice(0, 80)
        : null;

    if (!body || body.length > 1500) {
      res.status(400).json({ error: "Message must be between 1 and 1,500 characters." });
      return;
    }

    let twilioMessageSid: string | null = null;
    if (thread.twilioConversationSid) {
      twilioMessageSid = await postTwilioConversationMessage({
        conversationSid: thread.twilioConversationSid,
        author: thread.twilioParticipantIdentity,
        body,
      });
    }

    const result = appendSupportMessage({
      threadId,
      senderRole: "client",
      senderName: thread.visitorName,
      body,
      source: "web",
      twilioMessageSid,
      clientMessageId,
    });

    res.status(201).json({ ok: true, message: result?.message });
  });

  // Verified Twilio Conversations Webhook (handles replies from Twilio Console / Flex / SMS)
  router.post(
    "/webhooks/twilio/conversations",
    express.urlencoded({ extended: false }),
    async (req, res) => {
      await initSupportStore();

      const signature = req.header("x-twilio-signature");
      const proto = req.header("x-forwarded-proto") || req.protocol || "https";
      const host = req.header("x-forwarded-host") || req.header("host") || "";
      const fullUrl = `${proto}://${host}${req.originalUrl}`;

      const valid = validateTwilioWebhookSignature({
        signature,
        url: fullUrl,
        body: (req.body ?? {}) as Record<string, unknown>,
      });

      if (!valid) {
        res.status(403).send("Invalid Twilio webhook signature.");
        return;
      }

      const payload = (req.body ?? {}) as Record<string, string>;
      const eventType = payload.EventType || "";

      if (eventType === "onMessageAdded") {
        const conversationSid = payload.ConversationSid || "";
        const messageSid = payload.MessageSid || "";
        const author = payload.Author || "";
        const body = (payload.Body || "").trim();

        const thread = findThreadByTwilioSid(conversationSid);
        if (thread && body) {
          const isClient = author === thread.twilioParticipantIdentity;
          appendSupportMessage({
            threadId: thread.id,
            senderRole: isClient ? "client" : "agent",
            senderName: isClient ? thread.visitorName : "BitfuryTech Support Desk",
            body,
            source: "twilio",
            twilioMessageSid: messageSid || null,
          });
        }
      }

      res.status(200).json({ ok: true });
    }
  );

  // Admin Live Support Desk Router
  const adminSupport = Router();
  adminSupport.use(requireBetterAuth, requireBetterVerifiedEmail, requireBetterAdmin);

  adminSupport.get("/threads", async (_req: BetterAuthRequest, res) => {
    await initSupportStore();
    const twilioStatus = getTwilioIntegrationStatus();
    const adminTwilioToken = twilioStatus.configured
      ? mintTwilioConversationsToken("bf_support_desk")
      : null;

    res.json({
      threads: listAllThreads(),
      twilioStatus,
      adminTwilioToken,
    });
  });

  adminSupport.get("/threads/:threadId", async (req: BetterAuthRequest, res) => {
    await initSupportStore();
    const threadId = String(req.params.threadId || "").trim();
    if (!isValidThreadId(threadId)) {
      res.status(400).json({ error: "Invalid thread identifier." });
      return;
    }
    const thread = findThreadById(threadId);
    if (!thread) {
      res.status(404).json({ error: "Support thread not found." });
      return;
    }
    res.json({ thread, messages: getThreadMessages(threadId) });
  });

  adminSupport.post("/threads/:threadId/messages", async (req: BetterAuthRequest, res) => {
    await initSupportStore();
    const threadId = String(req.params.threadId || "").trim();
    if (!isValidThreadId(threadId)) {
      res.status(400).json({ error: "Invalid thread identifier." });
      return;
    }
    const thread = findThreadById(threadId);
    if (!thread) {
      res.status(404).json({ error: "Support thread not found." });
      return;
    }

    const body = typeof req.body?.body === "string" ? req.body.body.trim() : "";
    const clientMessageId =
      typeof req.body?.clientMessageId === "string"
        ? req.body.clientMessageId.trim().slice(0, 80)
        : null;

    if (!body || body.length > 1500) {
      res.status(400).json({ error: "Reply message must be 1–1,500 characters." });
      return;
    }

    let twilioMessageSid: string | null = null;
    if (thread.twilioConversationSid) {
      twilioMessageSid = await postTwilioConversationMessage({
        conversationSid: thread.twilioConversationSid,
        author: "bf_support_desk",
        body,
      });
    }

    const result = appendSupportMessage({
      threadId,
      senderRole: "agent",
      senderName: "BitfuryTech Support Desk",
      body,
      source: "web",
      twilioMessageSid,
      clientMessageId,
    });

    res.status(201).json({ ok: true, message: result?.message });
  });

  adminSupport.patch("/threads/:threadId/status", async (req: BetterAuthRequest, res) => {
    await initSupportStore();
    const threadId = String(req.params.threadId || "").trim();
    const status = req.body?.status === "Resolved" ? "Resolved" : "Open";
    if (!isValidThreadId(threadId)) {
      res.status(400).json({ error: "Invalid thread identifier." });
      return;
    }
    const updated = setSupportThreadStatus(threadId, status);
    if (!updated) {
      res.status(404).json({ error: "Support thread not found." });
      return;
    }
    res.json({ ok: true, thread: updated });
  });

  router.use("/admin/support-desk", adminSupport);

  return router;
}
