import { useEffect } from "react";

interface TawkApi {
  maximize?: () => void;
  toggle?: () => void;
}

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}

/** Opens the application-wide Tawk.to chat widget. */
export function openLiveSupportChat() {
  const api = window.Tawk_API;

  if (typeof api?.maximize === "function") {
    api.maximize();
    return;
  }

  if (typeof api?.toggle === "function") {
    api.toggle();
  }
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

    // Prevent duplicate embeds if React StrictMode or route rendering
    // causes this effect to run more than once.
    if (document.querySelector('script[src="' + widgetSrc + '"]')) return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    const script = document.createElement("script");
    script.async = true;
    script.src = widgetSrc;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    script.setAttribute("data-tawk-widget", "bitfurytech");

    script.onerror = () => {
      console.error("Unable to load the BitfuryTech Tawk.to support widget.");
    };

    const firstScript = document.getElementsByTagName("script")[0];
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  }, []);

  return null;
}
