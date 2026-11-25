import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";

export interface TradingViewChartProps {
  symbol?: string;
  interval?: "1" | "5" | "15" | "60" | "240" | "D" | "W";
  colorTheme?: "light" | "dark";
  height?: number;
  allowSymbolChange?: boolean;
}

export default function TradingViewChart({
  symbol = "BITSTAMP:BTCUSD",
  interval = "60",
  colorTheme = "light",
  height = 520,
  allowSymbolChange = true,
}: TradingViewChartProps) {
  const [hasError, setHasError] = useState(false);

  const widgetSrc = useMemo(() => {
    const hostname =
      typeof window !== "undefined" ? window.location.hostname : "bitfurytech";
    const pageUri =
      typeof window !== "undefined"
        ? window.location.href.replace(/^https?:(\/\/)?/, "")
        : "";

    const settings = {
      autosize: true,
      symbol,
      interval,
      timezone: "Etc/UTC",
      theme: colorTheme,
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: allowSymbolChange,
      withdateranges: true,
      hide_side_toolbar: false,
      details: false,
      hotlist: false,
      calendar: false,
      support_host: "https://www.tradingview.com",
      utm_source: hostname,
      utm_medium: "widget",
      utm_campaign: "advanced-chart",
      ...(pageUri ? { "page-uri": pageUri } : {}),
    };

    const url = new URL("https://www.tradingview-widget.com/embed-widget/advanced-chart/");
    url.searchParams.set("locale", "en");
    url.hash = encodeURIComponent(JSON.stringify(settings));
    return url.toString();
  }, [allowSymbolChange, colorTheme, interval, symbol]);

  if (hasError) {
    return (
      <div
        style={{ height: `${height}px` }}
        className="flex flex-col items-center justify-center gap-3 rounded-[5px] border border-[#DCE4EC] bg-[#F6F8FA] p-6 text-center"
      >
        <p className="text-sm font-semibold text-[#102030]">
          Live TradingView chart could not load in this browser context.
        </p>
        <p className="max-w-md text-xs text-[#5A6B7C]">
          Verify external embed access or launch the interactive chart directly on TradingView.
        </p>
        <a
          href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-[5px] bg-[#1B4962] px-4 py-2 text-xs font-semibold text-white hover:bg-[#14374B]"
        >
          <span>Open {symbol} on TradingView</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div
      className="tradingview-widget-container w-full overflow-hidden rounded-[5px] border border-[#DCE4EC]"
      style={{ height: `${height}px` }}
    >
      <iframe
        key={`${symbol}-${interval}-${colorTheme}`}
        src={widgetSrc}
        title={`TradingView Live Chart — ${symbol}`}
        allowFullScreen
        onError={() => setHasError(true)}
        style={{ height: `${height}px` }}
        className="block w-full border-0 bg-transparent"
      />
    </div>
  );
}
