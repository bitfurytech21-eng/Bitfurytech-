import { useEffect } from "react";

declare global {
  interface Window {
    Tawk_API?: Record<string, unknown>;
    Tawk_LoadStart?: Date;
  }
}

/**
 * Loads the official Tawk.to widget once for the whole single-page application.
 * Keeping it at the app root makes support available on public, auth and dashboard routes.
 */
export default function TawkChatWidget() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = window.Tawk_LoadStart || new Date();

    if (document.getElementById("tawk-to-widget")) return;

    const script = document.createElement("script");
    script.id = "tawk-to-widget";
    script.async = true;
    script.src = "https://embed.tawk.to/6b03a14ab939fa3cd8ee2298/default";
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");

    const firstScript = document.getElementsByTagName("script")[0];
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }
  }, []);

  return null;
}
