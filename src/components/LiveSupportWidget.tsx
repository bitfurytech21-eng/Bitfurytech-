import { useEffect } from "react";

interface TawkApi {
  onLoad?: () => void;
  maximize?: () => void;
  toggle?: () => void;
  setAttributes?: (attributes: Record<string, string>, callback?: () => void) => void;
}

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}

const TAWK_NOISE_PREFIXES = [
  "[Tawk/",
  "[JSAPI/Login]",
  "[JSAPI/Logout]",
];

let pendingOpenTopic: string | null | undefined;

function applyTopicAndOpen(api: TawkApi | undefined, subject?: string) {
  if (subject && typeof api?.setAttributes === "function") {
    api.setAttributes({ topic: subject });
  }

  if (typeof api?.maximize === "function") {
    api.maximize();
    return true;
  }

  if (typeof api?.toggle === "function") {
    api.toggle();
    return true;
  }

  return false;
}

/**
 * Opens the application-wide Tawk.to chat widget and attaches optional topic context.
 */
export function openLiveSupportChat(subject?: string) {
  const api = window.Tawk_API;
  if (applyTopicAndOpen(api, subject)) {
    pendingOpenTopic = undefined;
    return;
  }

  pendingOpenTopic = subject ?? null;
}

/**
 * Application-wide Tawk.to support widget.
 * Mounted by App.tsx so the same support widget is available on public
 * pages and authenticated dashboard routes.
 */
export default function LiveSupportWidget() {
  useEffect(() => {
    const widgetSrc =
      "https://embed.tawk.to/6b03a14ab939fa3cd8ee2298/default";

    const originalConsoleError = console.error;
    console.error = (...args: unknown[]) => {
      const first = args[0];
      if (
        typeof first === "string" &&
        TAWK_NOISE_PREFIXES.some((prefix) => first.startsWith(prefix))
      ) {
        console.warn(...args);
        return;
      }
      originalConsoleError.apply(console, args);
    };

    window.Tawk_API = window.Tawk_API || {};
    const existingOnLoad = window.Tawk_API.onLoad;
    window.Tawk_API.onLoad = () => {
      if (typeof existingOnLoad === "function") {
        existingOnLoad();
      }
      if (pendingOpenTopic !== undefined) {
        const queuedTopic = pendingOpenTopic || undefined;
        pendingOpenTopic = undefined;
        applyTopicAndOpen(window.Tawk_API, queuedTopic);
      }
    };

    // Prevent duplicate embeds if React StrictMode or route rendering
    // causes this effect to run more than once.
    if (!document.querySelector('script[src="' + widgetSrc + '"]')) {
      window.Tawk_LoadStart = new Date();

      const script = document.createElement("script");
      script.async = true;
      script.src = widgetSrc;
      script.charset = "UTF-8";
      script.setAttribute("crossorigin", "*");
      script.setAttribute("data-tawk-widget", "bitfurytech");

      script.onerror = () => {
        console.warn("Unable to load the BitfuryTech Tawk.to support widget.");
      };

      const firstScript = document.getElementsByTagName("script")[0];
      if (firstScript?.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      } else {
        document.head.appendChild(script);
      }
    }

    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  return null;
}
