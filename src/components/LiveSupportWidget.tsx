import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Client as TwilioConversationsClient } from "@twilio/conversations";
import {
  CheckCircle2,
  LifeBuoy,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export type SupportChannelMode = "twilio-conversations" | "live-websocket";

export interface SupportThreadDTO {
  id: string;
  userId: string | null;
  visitorName: string;
  visitorEmail: string;
  topic: string;
  status: "Open" | "Resolved";
  channel: SupportChannelMode;
  twilioConversationSid: string | null;
  twilioParticipantIdentity: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  lastMessagePreview: string;
}

export interface SupportMessageDTO {
  id: string;
  threadId: string;
  senderRole: "client" | "agent" | "system";
  senderName: string;
  body: string;
  source: "web" | "twilio";
  twilioMessageSid: string | null;
  clientMessageId?: string | null;
  createdAt: string;
}

interface SupportStatusResponse {
  configured: boolean;
  channelMode: SupportChannelMode;
  smsAlertsEnabled: boolean;
}

interface StartSessionResponse {
  ok: boolean;
  mode: SupportChannelMode;
  thread: SupportThreadDTO;
  messages: SupportMessageDTO[];
  visitorToken: string | null;
  twilioToken: string | null;
  conversationSid: string | null;
  identity: string;
  error?: string;
}

const SUPPORT_TOPICS = [
  "Account Registration & Verification",
  "Deposit & Settlement Verification",
  "Withdrawal & Payout Support",
  "Investment Mandate Specifications",
  "Real Estate Syndicate Participation",
  "Custody Security & Portal Access",
  "Client Relations & Account Support",
] as const;

const OPEN_SUPPORT_EVENT = "bitfurytech:open-support";

export function openLiveSupportChat(topic?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ topic?: string }>(OPEN_SUPPORT_EVENT, {
      detail: { topic },
    })
  );
}

// Keep active support session strictly in module memory (never localStorage/sessionStorage).
interface InMemorySupportState {
  thread: SupportThreadDTO | null;
  messages: SupportMessageDTO[];
  visitorToken: string | null;
  twilioToken: string | null;
  conversationSid: string | null;
  mode: SupportChannelMode;
}

let inMemorySession: InMemorySupportState = {
  thread: null,
  messages: [],
  visitorToken: null,
  twilioToken: null,
  conversationSid: null,
  mode: "live-websocket",
};

function generateClientMessageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `cli_${crypto.randomUUID()}`;
  }
  return `cli_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function formatMessageTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function mergeMessages(
  existing: SupportMessageDTO[],
  incoming: SupportMessageDTO
): SupportMessageDTO[] {
  const alreadyExists = existing.some(
    (m) =>
      m.id === incoming.id ||
      (incoming.twilioMessageSid && m.twilioMessageSid === incoming.twilioMessageSid) ||
      (incoming.clientMessageId && m.clientMessageId === incoming.clientMessageId)
  );
  if (alreadyExists) {
    return existing.map((m) => {
      const match =
        m.id === incoming.id ||
        (incoming.clientMessageId && m.clientMessageId === incoming.clientMessageId);
      return match ? incoming : m;
    });
  }
  return [...existing, incoming].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export default function LiveSupportWidget() {
  const { user, profile } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [statusInfo, setStatusInfo] = useState<SupportStatusResponse>({
    configured: false,
    channelMode: "live-websocket",
    smsAlertsEnabled: false,
  });

  const [thread, setThread] = useState<SupportThreadDTO | null>(inMemorySession.thread);
  const [messages, setMessages] = useState<SupportMessageDTO[]>(inMemorySession.messages);
  const [visitorToken, setVisitorToken] = useState<string | null>(
    inMemorySession.visitorToken
  );
  const [twilioToken, setTwilioToken] = useState<string | null>(
    inMemorySession.twilioToken
  );
  const [conversationSid, setConversationSid] = useState<string | null>(
    inMemorySession.conversationSid
  );
  const [channelMode, setChannelMode] = useState<SupportChannelMode>(inMemorySession.mode);

  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [topicInput, setTopicInput] = useState<string>(SUPPORT_TOPICS[0]);
  const [initialMessageInput, setInitialMessageInput] = useState("");

  const [composerText, setComposerText] = useState("");
  const [startingSession, setStartingSession] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [socketState, setSocketState] = useState<
    "disconnected" | "connecting" | "connected"
  >("disconnected");
  const [twilioSdkConnected, setTwilioSdkConnected] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const isOpenRef = useRef(isOpen);
  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const lastTypingEmitRef = useRef<number>(0);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  // Synchronize in-memory store across public route switches
  useEffect(() => {
    inMemorySession = {
      thread,
      messages,
      visitorToken,
      twilioToken,
      conversationSid,
      mode: channelMode,
    };
  }, [thread, messages, visitorToken, twilioToken, conversationSid, channelMode]);

  // Clear authenticated session cache on sign-out so previous account thread never leaks
  useEffect(() => {
    if (!user && inMemorySession.thread?.userId) {
      inMemorySession = {
        thread: null,
        messages: [],
        visitorToken: null,
        twilioToken: null,
        conversationSid: null,
        mode: "live-websocket",
      };
      setThread(null);
      setMessages([]);
      setVisitorToken(null);
      setTwilioToken(null);
      setConversationSid(null);
    }
  }, [user]);

  // Fetch non-secret Twilio configuration status
  useEffect(() => {
    let active = true;
    fetch("/api/support/status", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: SupportStatusResponse | null) => {
        if (active && data) {
          setStatusInfo(data);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  // Listen for imperative launch requests (e.g. from Contact page)
  useEffect(() => {
    const onOpenEvent = (event: Event) => {
      const custom = event as CustomEvent<{ topic?: string }>;
      if (custom.detail?.topic) {
        setTopicInput(custom.detail.topic);
      }
      setIsOpen(true);
    };
    window.addEventListener(OPEN_SUPPORT_EVENT, onOpenEvent);
    return () => window.removeEventListener(OPEN_SUPPORT_EVENT, onOpenEvent);
  }, []);

  // Scroll transcript to bottom on new messages
  useEffect(() => {
    if (isOpen && threadEndRef.current) {
      threadEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages.length, agentTyping]);

  // Pre-fill investor identity if authenticated
  useEffect(() => {
    if (user) {
      setNameInput(
        profile?.displayName ||
          user.displayName ||
          user.email?.split("@")[0] ||
          "BitfuryTech Investor"
      );
      setEmailInput(user.email || "");
    }
  }, [user, profile]);

  const applySessionPayload = useCallback((data: StartSessionResponse) => {
    setThread(data.thread);
    setMessages(Array.isArray(data.messages) ? data.messages : []);
    setVisitorToken(data.visitorToken ?? null);
    setTwilioToken(data.twilioToken ?? null);
    setConversationSid(data.conversationSid ?? null);
    setChannelMode(data.mode);
    setFormError(null);
  }, []);

  // Refresh existing thread history when widget mounts/opens with an active session
  useEffect(() => {
    if (!isOpen || !thread) return;
    if (!user && !visitorToken) return;

    const controller = new AbortController();
    const headers: Record<string, string> = {};
    if (!user && visitorToken) {
      headers["x-visitor-token"] = visitorToken;
    }

    fetch(`/api/support/threads/${encodeURIComponent(thread.id)}`, {
      cache: "no-store",
      credentials: "include",
      headers,
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { thread?: SupportThreadDTO; messages?: SupportMessageDTO[]; twilioToken?: string | null } | null) => {
        if (!data?.thread) return;
        setThread(data.thread);
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
        if (data.twilioToken) {
          setTwilioToken(data.twilioToken);
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [isOpen, thread?.id, user, visitorToken]);

  // Connect live WebSocket channel whenever a support thread is active
  useEffect(() => {
    if (!thread) {
      setSocketState("disconnected");
      return;
    }
    if (!user && !visitorToken) {
      return;
    }

    let closedByCleanup = false;
    let reconnectTimer: number | null = null;
    let pingTimer: number | null = null;
    let attempts = 0;

    const connectSocket = () => {
      if (closedByCleanup) return;
      setSocketState("connecting");

      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const ws = new WebSocket(`${proto}//${window.location.host}/ws/support`);
      wsRef.current = ws;

      ws.onopen = () => {
        attempts = 0;
        ws.send(
          JSON.stringify({
            type: "auth",
            mode: "client",
            visitorToken: user ? undefined : visitorToken,
            threadId: thread.id,
          })
        );
        pingTimer = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 25_000);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(String(event.data)) as {
            type?: string;
            message?: SupportMessageDTO;
            thread?: SupportThreadDTO;
            senderRole?: string;
            isTyping?: boolean;
            error?: string;
          };

          if (payload.type === "auth:ok") {
            setSocketState("connected");
            return;
          }

          if (payload.type === "message:created" && payload.message) {
            if (payload.message.threadId === thread.id) {
              setMessages((prev) => mergeMessages(prev, payload.message!));
              setAgentTyping(false);
              if (!isOpenRef.current && payload.message.senderRole === "agent") {
                setUnreadCount((c) => c + 1);
              }
            }
            if (payload.thread && payload.thread.id === thread.id) {
              setThread(payload.thread);
            }
            return;
          }

          if (payload.type === "thread:updated" && payload.thread) {
            if (payload.thread.id === thread.id) {
              setThread(payload.thread);
            }
            return;
          }

          if (payload.type === "typing:update" && payload.senderRole === "agent") {
            setAgentTyping(Boolean(payload.isTyping));
            if (typingTimerRef.current) {
              window.clearTimeout(typingTimerRef.current);
            }
            if (payload.isTyping) {
              typingTimerRef.current = window.setTimeout(() => {
                setAgentTyping(false);
              }, 3500);
            }
            return;
          }

          if (payload.type === "error" && payload.error) {
            setFormError(payload.error);
          }
        } catch {
          // Ignore malformed server frame
        }
      };

      ws.onclose = () => {
        if (pingTimer) {
          window.clearInterval(pingTimer);
          pingTimer = null;
        }
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        setSocketState("disconnected");

        if (!closedByCleanup) {
          attempts += 1;
          const delayMs = Math.min(15_000, 1200 * Math.pow(1.6, attempts));
          reconnectTimer = window.setTimeout(connectSocket, delayMs);
        }
      };

      ws.onerror = () => {
        // Closed handler performs bounded reconnect
      };
    };

    connectSocket();

    return () => {
      closedByCleanup = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (pingTimer) window.clearInterval(pingTimer);
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [thread?.id, user, visitorToken]);

  // Optional Twilio Conversations JS Client binding when Twilio credentials are configured
  useEffect(() => {
    if (channelMode !== "twilio-conversations" || !twilioToken || !conversationSid || !thread) {
      setTwilioSdkConnected(false);
      return;
    }

    let cancelled = false;
    let clientInstance: TwilioConversationsClient | null = null;
    let boundConversation: Awaited<
      ReturnType<TwilioConversationsClient["getConversationBySid"]>
    > | null = null;

    const handleTwilioMessageAdded = (twilioMsg: {
      sid: string;
      author: string | null;
      body: string | null;
      dateCreated: Date | null;
    }) => {
      if (cancelled || !twilioMsg.body) return;
      const isClient = twilioMsg.author === thread.twilioParticipantIdentity;
      const normalized: SupportMessageDTO = {
        id: `tw_${twilioMsg.sid}`,
        threadId: thread.id,
        senderRole: isClient ? "client" : "agent",
        senderName: isClient ? thread.visitorName : "BitfuryTech Support Desk",
        body: twilioMsg.body,
        source: "twilio",
        twilioMessageSid: twilioMsg.sid,
        createdAt: (twilioMsg.dateCreated || new Date()).toISOString(),
      };
      setMessages((prev) => mergeMessages(prev, normalized));
      if (!isOpenRef.current && !isClient) {
        setUnreadCount((c) => c + 1);
      }
    };

    try {
      clientInstance = new TwilioConversationsClient(twilioToken);

      clientInstance.on("stateChanged", (state) => {
        if (!cancelled && state === "initialized" && clientInstance && conversationSid) {
          clientInstance
            .getConversationBySid(conversationSid)
            .then((conv) => {
              if (cancelled) return;
              boundConversation = conv;
              setTwilioSdkConnected(true);
              conv.on("messageAdded", handleTwilioMessageAdded);
              conv.on("typingStarted", () => {
                if (!cancelled) setAgentTyping(true);
              });
              conv.on("typingEnded", () => {
                if (!cancelled) setAgentTyping(false);
              });
            })
            .catch(() => {
              if (!cancelled) setTwilioSdkConnected(false);
            });
        }
      });
    } catch {
      setTwilioSdkConnected(false);
    }

    return () => {
      cancelled = true;
      setTwilioSdkConnected(false);
      if (boundConversation) {
        boundConversation.removeAllListeners();
      }
      if (clientInstance) {
        void clientInstance.shutdown().catch(() => undefined);
      }
    };
  }, [channelMode, twilioToken, conversationSid, thread?.id, thread?.twilioParticipantIdentity, thread?.visitorName]);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedName = nameInput.trim();
    const trimmedEmail = emailInput.trim();
    if (!user) {
      if (!trimmedName) {
        setFormError("Enter your full name to connect with our desk.");
        return;
      }
      if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setFormError("Enter a valid email address.");
        return;
      }
    }

    setStartingSession(true);
    try {
      const res = await fetch("/api/support/session", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          topic: topicInput,
          initialMessage: initialMessageInput.trim(),
          visitorToken: user ? undefined : visitorToken || undefined,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as StartSessionResponse;
      if (!res.ok || !data.ok || !data.thread) {
        throw new Error(data.error || "Unable to open live support session.");
      }

      applySessionPayload(data);
      setInitialMessageInput("");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to start live support chat."
      );
    } finally {
      setStartingSession(false);
    }
  };

  const emitTypingIndicator = useCallback(
    (typing: boolean) => {
      if (!thread || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      const now = Date.now();
      if (typing && now - lastTypingEmitRef.current < 1500) return;
      lastTypingEmitRef.current = now;
      wsRef.current.send(
        JSON.stringify({
          type: "typing:state",
          threadId: thread.id,
          isTyping: typing,
        })
      );
    },
    [thread]
  );

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thread) return;
    const text = composerText.trim();
    if (!text) return;

    setFormError(null);
    setSendingMessage(true);
    const clientMessageId = generateClientMessageId();

    try {
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "message:send",
            threadId: thread.id,
            body: text,
            clientMessageId,
          })
        );
        emitTypingIndicator(false);
        setComposerText("");
      } else {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (!user && visitorToken) {
          headers["x-visitor-token"] = visitorToken;
        }

        const res = await fetch(
          `/api/support/threads/${encodeURIComponent(thread.id)}/messages`,
          {
            method: "POST",
            credentials: "include",
            headers,
            body: JSON.stringify({ body: text, clientMessageId }),
          }
        );
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          message?: SupportMessageDTO;
          error?: string;
        };
        if (!res.ok || !data.ok || !data.message) {
          throw new Error(data.error || "Message delivery failed.");
        }
        setMessages((prev) => mergeMessages(prev, data.message!));
        setComposerText("");
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Unable to deliver message.");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleResetSession = () => {
    inMemorySession = {
      thread: null,
      messages: [],
      visitorToken: null,
      twilioToken: null,
      conversationSid: null,
      mode: statusInfo.channelMode,
    };
    setThread(null);
    setMessages([]);
    setVisitorToken(null);
    setTwilioToken(null);
    setConversationSid(null);
    setFormError(null);
  };

  const channelLabel = useMemo(() => {
    if (channelMode === "twilio-conversations" || statusInfo.configured) {
      return twilioSdkConnected
        ? "Twilio Conversations · Active"
        : "Twilio Conversations · Synced";
    }
    return socketState === "connected"
      ? "Live Desk WebSocket · Connected"
      : "Live Desk · Standby";
  }, [channelMode, statusInfo.configured, twilioSdkConnected, socketState]);

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <section
          aria-label="BitfuryTech Live Support Chat"
          className="mb-3 w-[calc(100vw-2rem)] sm:w-[390px] max-h-[78vh] bg-white border border-[#DCE4EC] rounded-[5px] shadow-[0_18px_48px_rgba(17,46,62,0.22)] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="bg-[#1B4962] text-white px-4 py-3.5 border-b border-[#112E3E] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-[#E94D65] shrink-0" />
                <h2 className="font-heading font-bold text-sm tracking-tight truncate">
                  BitfuryTech Live Support
                </h2>
              </div>
              <p className="text-[11px] text-slate-200 mt-0.5 truncate">
                {thread ? channelLabel : statusInfo.configured ? "Twilio Conversations Desk" : "Direct Client Relations Desk"}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {thread && (
                <button
                  type="button"
                  onClick={handleResetSession}
                  title="Start a new inquiry thread"
                  aria-label="Start a new inquiry thread"
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-200 hover:text-white hover:bg-white/10 rounded-[5px] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close live support chat"
                className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-200 hover:text-white hover:bg-white/10 rounded-[5px] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!thread ? (
            /* Session Intake Form */
            <form
              onSubmit={handleStartSession}
              noValidate
              className="p-4 space-y-3.5 overflow-y-auto bg-[#F6F8FA]"
            >
              <div className="bg-white border border-[#DCE4EC] rounded-[5px] p-3 flex items-start gap-2.5 text-xs text-[#3B4C5E]">
                <ShieldCheck className="w-4 h-4 text-[#1B4962] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Connect directly with the BitfuryTech Administration &amp; Settlement Desk. Never
                  share account passwords or recovery codes in chat.
                </p>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="bg-rose-50 border border-rose-200 text-rose-800 rounded-[5px] px-3 py-2 text-xs"
                >
                  {formError}
                </div>
              )}

              {!user ? (
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label
                      htmlFor="live-support-name"
                      className="block text-xs font-semibold text-[#102030] mb-1"
                    >
                      Full Name
                    </label>
                    <input
                      id="live-support-name"
                      type="text"
                      maxLength={120}
                      required
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Your full name"
                      className="w-full min-h-[40px] bg-white border border-[#DCE4EC] rounded-[5px] px-3 py-2 text-sm text-[#102030] placeholder:text-[#7A8B9C] focus:outline-none focus:ring-2 focus:ring-[#1B4962]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="live-support-email"
                      className="block text-xs font-semibold text-[#102030] mb-1"
                    >
                      Email Address
                    </label>
                    <input
                      id="live-support-email"
                      type="email"
                      maxLength={200}
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="you@domain.com"
                      className="w-full min-h-[40px] bg-white border border-[#DCE4EC] rounded-[5px] px-3 py-2 text-sm text-[#102030] placeholder:text-[#7A8B9C] focus:outline-none focus:ring-2 focus:ring-[#1B4962]"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-[#DCE4EC] rounded-[5px] px-3 py-2.5 text-xs">
                  <p className="text-[#5A6B7C]">Authenticated Account</p>
                  <p className="font-semibold text-[#102030] mt-0.5 truncate">
                    {nameInput} · {emailInput}
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="live-support-topic"
                  className="block text-xs font-semibold text-[#102030] mb-1"
                >
                  Support Topic
                </label>
                <select
                  id="live-support-topic"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  className="w-full min-h-[40px] bg-white border border-[#DCE4EC] rounded-[5px] px-3 py-2 text-sm text-[#102030] focus:outline-none focus:ring-2 focus:ring-[#1B4962]"
                >
                  {SUPPORT_TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="live-support-msg"
                  className="block text-xs font-semibold text-[#102030] mb-1"
                >
                  Message
                </label>
                <textarea
                  id="live-support-msg"
                  rows={3}
                  maxLength={1500}
                  value={initialMessageInput}
                  onChange={(e) => setInitialMessageInput(e.target.value)}
                  placeholder="Describe your deposit, withdrawal, verification, or mandate inquiry..."
                  className="w-full bg-white border border-[#DCE4EC] rounded-[5px] px-3 py-2 text-sm text-[#102030] placeholder:text-[#7A8B9C] focus:outline-none focus:ring-2 focus:ring-[#1B4962]"
                />
              </div>

              <button
                type="submit"
                disabled={startingSession}
                className="w-full min-h-[42px] bg-[#E94D65] hover:bg-[#D43B53] disabled:opacity-60 text-white font-heading font-bold text-xs tracking-wide uppercase rounded-none transition-colors cursor-pointer"
              >
                {startingSession ? "Connecting to Support Desk..." : "Start Live Chat"}
              </button>
            </form>
          ) : (
            /* Active Conversation Thread */
            <>
              <div className="px-4 py-2 bg-[#F6F8FA] border-b border-[#DCE4EC] flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-[#102030] truncate">{thread.topic}</p>
                  <p className="font-mono text-[11px] text-[#5A6B7C] truncate">
                    Ref: {thread.id}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-heading font-bold uppercase tracking-wide shrink-0 ${
                    thread.status === "Resolved" ? "text-emerald-700" : "text-[#1B4962]"
                  }`}
                >
                  {thread.status}
                </span>
              </div>

              <div className="flex-1 min-h-[260px] max-h-[360px] overflow-y-auto p-4 space-y-3 bg-white">
                {messages.map((msg) => {
                  if (msg.senderRole === "system") {
                    return (
                      <div
                        key={msg.id}
                        className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] px-3 py-2 text-xs text-[#4A5B6C] leading-relaxed"
                      >
                        {msg.body}
                      </div>
                    );
                  }
                  const isClient = msg.senderRole === "client";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isClient ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-baseline gap-2 mb-1 text-[11px] text-[#5A6B7C]">
                        <span className="font-semibold text-[#102030]">
                          {isClient ? "You" : msg.senderName}
                        </span>
                        <span className="font-mono tabular-nums">
                          {formatMessageTime(msg.createdAt)}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] rounded-[5px] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                          isClient
                            ? "bg-[#1B4962] text-white"
                            : "bg-[#F6F8FA] border border-[#DCE4EC] text-[#102030]"
                        }`}
                      >
                        {msg.body}
                      </div>
                    </div>
                  );
                })}

                {agentTyping && (
                  <p className="text-xs text-[#5A6B7C] italic">
                    BitfuryTech Support Desk is typing...
                  </p>
                )}

                {thread.status === "Resolved" && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-[5px] px-3 py-2 text-xs text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      This thread is marked Resolved. Send a follow-up message to reopen it.
                    </span>
                  </div>
                )}

                <div ref={threadEndRef} />
              </div>

              {formError && (
                <div
                  role="alert"
                  className="mx-3 mb-2 bg-rose-50 border border-rose-200 text-rose-800 rounded-[5px] px-3 py-1.5 text-xs"
                >
                  {formError}
                </div>
              )}

              <form
                onSubmit={handleSendMessage}
                className="p-3 bg-[#F6F8FA] border-t border-[#DCE4EC] flex items-center gap-2"
              >
                <label htmlFor="live-support-reply" className="sr-only">
                  Reply to BitfuryTech Support Desk
                </label>
                <input
                  id="live-support-reply"
                  type="text"
                  maxLength={1500}
                  value={composerText}
                  onChange={(e) => {
                    setComposerText(e.target.value);
                    emitTypingIndicator(Boolean(e.target.value.trim()));
                  }}
                  placeholder="Write a message..."
                  className="flex-1 min-w-0 min-h-[40px] bg-white border border-[#DCE4EC] rounded-[5px] px-3 py-2 text-sm text-[#102030] placeholder:text-[#7A8B9C] focus:outline-none focus:ring-2 focus:ring-[#1B4962]"
                />
                <button
                  type="submit"
                  disabled={sendingMessage || !composerText.trim()}
                  aria-label="Send message"
                  className="min-w-[42px] min-h-[40px] px-3.5 bg-[#E94D65] hover:bg-[#D43B53] disabled:opacity-50 text-white font-heading font-bold text-xs flex items-center justify-center rounded-none transition-colors cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </section>
      )}

      {/* Compact Floating Launcher Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Minimize live support chat" : "Open live support chat"}
        className="min-h-[48px] bg-[#1B4962] hover:bg-[#112E3E] text-white border border-[#DCE4EC]/25 shadow-[0_8px_24px_rgba(17,46,62,0.28)] px-4 py-3 rounded-[5px] inline-flex items-center gap-2.5 font-heading font-bold text-xs tracking-wide transition-colors cursor-pointer"
      >
        <MessageSquare className="w-4 h-4 text-[#E94D65] shrink-0" />
        <span>Live Support</span>
        {unreadCount > 0 && (
          <span className="bg-[#E94D65] text-white font-mono tabular-nums text-[11px] font-bold px-1.5 py-0.5 rounded-[3px]">
            {unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
