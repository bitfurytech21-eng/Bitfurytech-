import type http from "http";
import { WebSocket, WebSocketServer } from "ws";
import { fromNodeHeaders } from "better-auth/node";
import { betterAuthInstance } from "../lib/better-auth.ts";
import { resolveBetterAuthRole } from "../middleware/betterAuth.ts";
import {
  appendSupportMessage,
  findThreadById,
  isValidThreadId,
  registerSupportBroadcaster,
  verifyVisitorToken,
  type SupportMessage,
  type SupportThread,
} from "./supportChatStore.ts";
import { postTwilioConversationMessage } from "./twilioSupportService.ts";

interface SocketSession {
  ws: WebSocket;
  authenticated: boolean;
  role: "admin" | "client" | null;
  userId: string | null;
  displayName: string;
  visitorThreadId: string | null;
  subscribedThreadIds: Set<string>;
  subscribedAdminInbox: boolean;
}

const activeSessions = new Set<SocketSession>();

function safeSend(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastToThreadAndAdmins(
  thread: SupportThread,
  payload: unknown
): void {
  for (const session of activeSessions) {
    if (!session.authenticated) continue;
    if (
      session.subscribedAdminInbox ||
      session.subscribedThreadIds.has(thread.id)
    ) {
      safeSend(session.ws, payload);
    }
  }
}

export function attachSupportWebSocketServer(httpServer: http.Server): void {
  const wss = new WebSocketServer({ noServer: true });

  registerSupportBroadcaster({
    broadcastMessage: (message: SupportMessage, thread: SupportThread) => {
      broadcastToThreadAndAdmins(thread, {
        type: "message:created",
        message,
        thread,
      });
    },
    broadcastThreadUpdate: (thread: SupportThread) => {
      broadcastToThreadAndAdmins(thread, {
        type: "thread:updated",
        thread,
      });
    },
  });

  httpServer.on("upgrade", (request, socket, head) => {
    try {
      const host = request.headers.host || "localhost";
      const parsed = new URL(request.url || "/", `http://${host}`);
      if (parsed.pathname !== "/ws/support") {
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } catch {
      socket.destroy();
    }
  });

  wss.on("connection", (ws, request) => {
    const session: SocketSession = {
      ws,
      authenticated: false,
      role: null,
      userId: null,
      displayName: "Visitor",
      visitorThreadId: null,
      subscribedThreadIds: new Set<string>(),
      subscribedAdminInbox: false,
    };

    activeSessions.add(session);

    const authTimeout = setTimeout(() => {
      if (!session.authenticated) {
        safeSend(ws, { type: "error", error: "Authentication timeout." });
        ws.close(4001, "Auth timeout");
      }
    }, 10_000);

    ws.on("message", async (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString("utf8")) as Record<string, unknown>;
      } catch {
        safeSend(ws, { type: "error", error: "Malformed WebSocket JSON payload." });
        return;
      }

      const type = typeof msg.type === "string" ? msg.type : "";

      if (type === "ping") {
        safeSend(ws, { type: "pong" });
        return;
      }

      if (type === "auth") {
        const requestedMode = msg.mode === "admin" ? "admin" : "client";
        const visitorToken =
          typeof msg.visitorToken === "string" ? msg.visitorToken.trim() : "";
        const threadId =
          typeof msg.threadId === "string" ? msg.threadId.trim() : "";

        try {
          const authSession = await betterAuthInstance.api.getSession({
            headers: fromNodeHeaders(request.headers),
          });
          if (authSession?.user?.id && authSession.user.emailVerified) {
            if (requestedMode === "admin") {
              const role = await resolveBetterAuthRole(authSession.user.id, authSession.user.email);
              if (role !== "admin") {
                safeSend(ws, { type: "error", error: "Admin authorization required." });
                ws.close(4003, "Forbidden");
                return;
              }
              session.authenticated = true;
              session.role = "admin";
              session.userId = authSession.user.id;
              session.displayName = "BitfuryTech Support Desk";
              session.subscribedAdminInbox = true;
              clearTimeout(authTimeout);
              safeSend(ws, { type: "auth:ok", role: "admin" });
              return;
            }

            session.authenticated = true;
            session.role = "client";
            session.userId = authSession.user.id;
            session.displayName =
              typeof authSession.user.name === "string" && authSession.user.name
                ? authSession.user.name
                : authSession.user.email || "Investor";
            if (threadId && isValidThreadId(threadId)) {
              const t = findThreadById(threadId);
              if (t && t.userId === authSession.user.id) {
                session.subscribedThreadIds.add(threadId);
              }
            }
            clearTimeout(authTimeout);
            safeSend(ws, { type: "auth:ok", role: "client" });
            return;
          }
          if (requestedMode === "admin") {
            safeSend(ws, { type: "error", error: "Admin authorization required." });
            ws.close(4003, "Forbidden");
            return;
          }
        } catch {
          if (requestedMode === "admin") {
            safeSend(ws, { type: "error", error: "Unable to verify administrator session." });
            ws.close(4001, "Invalid session");
            return;
          }
        }

        if (visitorToken) {
          const claims = verifyVisitorToken(visitorToken);
          if (!claims) {
            safeSend(ws, { type: "error", error: "Invalid or expired visitor session." });
            ws.close(4001, "Invalid visitor token");
            return;
          }
          const t = findThreadById(claims.threadId);
          if (!t) {
            safeSend(ws, { type: "error", error: "Support thread not found." });
            ws.close(4004, "Thread missing");
            return;
          }
          session.authenticated = true;
          session.role = "client";
          session.visitorThreadId = claims.threadId;
          session.displayName = t.visitorName;
          session.subscribedThreadIds.add(claims.threadId);
          clearTimeout(authTimeout);
          safeSend(ws, { type: "auth:ok", role: "client" });
          return;
        }

        safeSend(ws, { type: "error", error: "Authentication credentials required." });
        return;
      }

      if (!session.authenticated) {
        safeSend(ws, { type: "error", error: "Authenticate socket session first." });
        return;
      }

      if (type === "thread:subscribe") {
        const threadId =
          typeof msg.threadId === "string" ? msg.threadId.trim() : "";
        if (!isValidThreadId(threadId)) return;
        const thread = findThreadById(threadId);
        if (!thread) return;

        const allowed =
          session.role === "admin" ||
          (session.userId && thread.userId === session.userId) ||
          session.visitorThreadId === threadId;
        if (allowed) {
          session.subscribedThreadIds.add(threadId);
          safeSend(ws, { type: "thread:subscribed", threadId });
        }
        return;
      }

      if (type === "typing:state") {
        const threadId =
          typeof msg.threadId === "string" ? msg.threadId.trim() : "";
        const isTyping = msg.isTyping === true;
        if (!isValidThreadId(threadId)) return;
        const thread = findThreadById(threadId);
        if (!thread) return;

        const allowed =
          session.role === "admin" ||
          (session.userId && thread.userId === session.userId) ||
          session.visitorThreadId === threadId;
        if (!allowed) return;

        broadcastToThreadAndAdmins(thread, {
          type: "typing:update",
          threadId,
          senderRole: session.role === "admin" ? "agent" : "client",
          senderName: session.displayName,
          isTyping,
        });
        return;
      }

      if (type === "message:send") {
        const threadId =
          typeof msg.threadId === "string" ? msg.threadId.trim() : "";
        const body = typeof msg.body === "string" ? msg.body.trim() : "";
        const clientMessageId =
          typeof msg.clientMessageId === "string"
            ? msg.clientMessageId.trim().slice(0, 80)
            : null;

        if (!isValidThreadId(threadId) || !body || body.length > 1500) {
          safeSend(ws, { type: "error", error: "Valid threadId and message body (1-1500 chars) required." });
          return;
        }

        const thread = findThreadById(threadId);
        if (!thread) {
          safeSend(ws, { type: "error", error: "Support thread not found." });
          return;
        }

        const allowed =
          session.role === "admin" ||
          (session.userId && thread.userId === session.userId) ||
          session.visitorThreadId === threadId;
        if (!allowed) {
          safeSend(ws, { type: "error", error: "Unauthorized to message this support thread." });
          return;
        }

        const senderRole = session.role === "admin" ? "agent" : "client";
        const senderName =
          session.role === "admin"
            ? "BitfuryTech Support Desk"
            : thread.visitorName;

        let twilioMessageSid: string | null = null;
        if (thread.twilioConversationSid) {
          twilioMessageSid = await postTwilioConversationMessage({
            conversationSid: thread.twilioConversationSid,
            author:
              senderRole === "agent"
                ? "bf_support_desk"
                : thread.twilioParticipantIdentity,
            body,
          });
        }

        appendSupportMessage({
          threadId,
          senderRole,
          senderName,
          body,
          source: "web",
          twilioMessageSid,
          clientMessageId,
        });
      }
    });

    ws.on("close", () => {
      clearTimeout(authTimeout);
      activeSessions.delete(session);
    });
  });
}
