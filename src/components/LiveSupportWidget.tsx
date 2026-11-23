import { useEffect } from "react";

declare global {
  interface Window {
    Tawk_API?: Record<string, unknown>;
    Tawk_LoadStart?: Date;
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
