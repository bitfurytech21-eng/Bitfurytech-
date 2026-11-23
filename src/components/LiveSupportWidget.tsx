import { useEffect } from "react";

declare global {
  interface Window {
    Tawk_API?: {
      onLoad?: () => void;
      onStatusChange?: (status: string) => void;
    };
    Tawk_LoadStart?: Date;
  }
}

/**
 * Loads the official Tawk.to widget once for the entire application.
 * App.tsx already mounts this component globally, so the widget is available
 * on public pages and inside the authenticated dashboard.
 */
export default function LiveSupportWidget() {
  useEffect(() => {
    const widgetSrc =
      "https://embed.tawk.to/6b03a14ab939fa3cd8ee2298/default";

    // Avoid inserting the same widget more than once during route changes
    // or React StrictMode's development effect cycle.
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="' + widgetSrc + '"]'
    );
    if (existing) return;

    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_LoadStart = new Date();

    const script = document.createElement("script");
    script.async = true;
    script.src = widgetSrc;
    script.charset = "UTF-8";
    script.setAttribute("crossorigin", "*");
    script.setAttribute("data-tawk-widget", "bitfurytech");

    const firstScript = document.getElementsByTagName("script")[0];
    if (firstScript?.parentNode) {
      firstScript.parentNode.insertBefore(script, firstScript);
    } else {
      document.head.appendChild(script);
    }

    return () => {
      // Keep the provider script alive across SPA route changes.
      // Tawk owns its iframe lifecycle after it has loaded.
    };
  }, []);

  return null;
}
