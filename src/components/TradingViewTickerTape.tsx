import { useEffect, useMemo, useRef, useState } from "react";

export interface TradingViewSymbol {
  proName: string;
  title: string;
}

const DEFAULT_SYMBOLS: TradingViewSymbol[] = [
  { proName: "BITSTAMP:BTCUSD", title: "BTC / USD" },
  { proName: "BITSTAMP:ETHUSD", title: "ETH / USD" },
  { proName: "COINBASE:USDTUSD", title: "USDT / USD" },
  { proName: "BINANCE:BNBUSDT", title: "BNB / USDT" },
  { proName: "COINBASE:SOLUSD", title: "SOL / USD" },
  { proName: "BITSTAMP:XRPUSD", title: "XRP / USD" },
  { proName: "FOREXCOM:SPXUSD", title: "S&P 500" },
  { proName: "NASDAQ:QQQ", title: "Nasdaq 100" },
];

interface TradingViewTickerTapeProps {
  symbols?: TradingViewSymbol[];
  colorTheme?: "dark" | "light";
  displayMode?: "adaptive" | "regular" | "compact";
}

export default function TradingViewTickerTape({
  symbols = DEFAULT_SYMBOLS,
  colorTheme = "dark",
  displayMode = "adaptive",
}: TradingViewTickerTapeProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [height, setHeight] = useState<number>(46);
  const [hasError, setHasError] = useState(false);

  const serializedSymbols = useMemo(() => JSON.stringify(symbols), [symbols]);

  const widgetSrc = useMemo(() => {
    const parsedSymbols = JSON.parse(serializedSymbols) as TradingViewSymbol[];
    const hostname =
      typeof window !== "undefined" ? window.location.hostname : "bitfurytech";
    const pageUri =
      typeof window !== "undefined"
        ? window.location.href.replace(/^https?:(\/\/)?/, "")
        : "";

    const settings = {
      symbols: parsedSymbols,
      showSymbolLogo: true,
      isTransparent: true,
      displayMode,
      colorTheme,
      width: "100%",
      height: 46,
      utm_source: hostname,
      utm_medium: "widget",
      utm_campaign: "ticker-tape",
      ...(pageUri ? { "page-uri": pageUri } : {}),
    };

    const url = new URL("https://www.tradingview-widget.com/embed-widget/ticker-tape/");
    url.searchParams.set("locale", "en");
    url.hash = encodeURIComponent(JSON.stringify(settings));
    return url.toString();
  }, [colorTheme, displayMode, serializedSymbols]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const targetWindow = iframeRef.current?.contentWindow;
      if (!targetWindow || event.source !== targetWindow) return;
      const payload = event.data as {
        name?: string;
        data?: { height?: number };
      } | null;
      if (
        payload?.name === "tv-widget-resize-iframe" &&
        typeof payload.data?.height === "number" &&
        payload.data.height >= 36 &&
        payload.data.height <= 160
      ) {
        setHeight(payload.data.height);
      }
    };

    window.addEventListener("message", handleMessage, false);
    return () => window.removeEventListener("message", handleMessage, false);
  }, []);

  if (hasError) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-xs text-slate-300">
        <span>Live TradingView market ticker could not load in this browser context.</span>
        <a
          href="https://www.tradingview.com/markets/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-white hover:underline"
        >
          Open TradingView Markets
        </a>
      </div>
    );
  }

  return (
    <div className="tradingview-widget-container w-full overflow-hidden">
      <iframe
        ref={iframeRef}
        src={widgetSrc}
        title="TradingView Live Market Ticker"
        scrolling="no"
        onError={() => setHasError(true)}
        style={{ height: `${height}px` }}
        className="w-full block border-0 bg-transparent select-none"
      />
    </div>
  );
}
