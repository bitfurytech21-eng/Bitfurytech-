import { useEffect, useState } from "react";
import { Languages } from "lucide-react";

type GoogleTranslateElementConstructor = new (
  options: { pageLanguage: string; autoDisplay: boolean },
  elementId: string
) => unknown;

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement?: GoogleTranslateElementConstructor;
      };
    };
    googleTranslateElementInit?: () => void;
  }
}

const SCRIPT_ID = "google-translate-element-script";
const WIDGET_ID = "google_translate_element";

export default function LanguageTranslateWidget() {
  const [loadFailed, setLoadFailed] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const initialize = () => {
      const TranslateElement = window.google?.translate?.TranslateElement;
      const widget = document.getElementById(WIDGET_ID);
      if (!TranslateElement || !widget || widget.dataset.initialized === "true") return;

      widget.dataset.initialized = "true";
      new TranslateElement(
        {
          pageLanguage: "en",
          autoDisplay: false,
        },
        WIDGET_ID
      );
      setIsReady(true);
    };

    window.googleTranslateElementInit = initialize;
    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (window.google?.translate?.TranslateElement) {
      initialize();
      return;
    }

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      script.onerror = () => setLoadFailed(true);
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener("error", () => setLoadFailed(true), { once: true });
    }
  }, []);

  return (
    <div role="group" aria-label="Translate this page" className="language-translate-widget fixed bottom-4 left-4 right-4 sm:right-auto z-[60] pointer-events-none">
      <button
        type="button"
        aria-label={isOpen ? "Close language translator" : "Open language translator"}
        aria-expanded={isOpen}
        aria-controls="language-translate-panel"
        onClick={() => setIsOpen((open) => !open)}
        className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#DCE4EC] bg-white text-[#1B4962] shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58A363] sm:hidden"
      >
        <Languages aria-hidden="true" className="h-5 w-5" />
      </button>
      <div
        id="language-translate-panel"
        className={`${isOpen ? "block" : "hidden"} pointer-events-auto absolute bottom-14 left-0 w-full max-w-[18rem] rounded-lg border border-[#DCE4EC] bg-white/95 p-3 shadow-lg backdrop-blur sm:static sm:block sm:w-auto sm:max-w-none`}
      >
        <div className="flex items-start gap-2">
          <Languages aria-hidden="true" className="mt-5 hidden h-5 w-5 shrink-0 text-[#1B4962] sm:block" />
          <div className="min-w-0">
            <p className="mb-1 text-[11px] font-semibold text-[#102030]">Translate this page</p>
            <div id={WIDGET_ID} aria-busy={!isReady && !loadFailed} />
            {loadFailed && (
              <p role="status" className="text-xs text-[#5A6B7C]">
                Translation is temporarily unavailable.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
