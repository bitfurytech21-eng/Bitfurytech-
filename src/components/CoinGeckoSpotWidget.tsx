import { useEffect, useState, useCallback } from "react";
import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";

interface SpotItem {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}

const DEFAULT_SPOTS: SpotItem[] = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", price: 60873.00, change24h: 1.04 },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", price: 1710.93, change24h: 1.35 },
  { id: "tether", symbol: "USDT", name: "Tether", price: 0.9989, change24h: 0.01 },
  { id: "binancecoin", symbol: "BNB", name: "Binance Coin", price: 557.45, change24h: 2.02 },
  { id: "solana", symbol: "SOL", name: "Solana", price: 70.26, change24h: -0.46 },
  { id: "ripple", symbol: "XRP", name: "XRP", price: 0.9243, change24h: -0.53 },
];

export default function CoinGeckoSpotWidget() {
  const [spots, setSpots] = useState<SpotItem[]>(DEFAULT_SPOTS);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  const fetchSpots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,binancecoin,solana,ripple&vs_currencies=usd&include_24hr_change=true"
      );
      if (!res.ok) {
        throw new Error(`CoinGecko API error: ${res.status}`);
      }
      const data = await res.json() as Record<string, { usd?: number; usd_24h_change?: number }>;
      
      const updated: SpotItem[] = DEFAULT_SPOTS.map((item) => {
        const live = data[item.id];
        if (live && typeof live.usd === "number") {
          return {
            ...item,
            price: live.usd,
            change24h: typeof live.usd_24h_change === "number" ? Number(live.usd_24h_change.toFixed(2)) : item.change24h,
          };
        }
        return item;
      });

      setSpots(updated);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch live spots");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpots();
    const interval = setInterval(fetchSpots, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [fetchSpots]);

  const formatPrice = (val: number, symbol: string) => {
    if (symbol === "USDT" || symbol === "XRP") {
      return `$${val.toFixed(4)}`;
    }
    if (val >= 1000) {
      return `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return `$${val.toFixed(2)}`;
  };

  return (
    <div className="bg-[#112E3E] text-white border-y border-white/10 px-4 py-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {spots.map((coin) => {
            const isPositive = coin.change24h >= 0;
            return (
              <div
                key={coin.id}
                className="bg-[#14374B]/80 border border-white/10 rounded-lg p-3.5 flex items-center justify-between shadow-[0_2px_8px_rgba(4,18,29,0.2)]"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-bold text-sm tracking-wide text-white">
                      {coin.symbol}
                    </span>
                    <span className="text-xs text-slate-400 font-sans">{coin.name}</span>
                  </div>
                  <div className="text-base font-mono font-bold text-white tabular-nums">
                    {formatPrice(coin.price, coin.symbol)}
                  </div>
                </div>

                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-semibold ${
                    isPositive
                      ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                      : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  <span>
                    {isPositive ? "+" : ""}
                    {coin.change24h.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-300">
          <button
            type="button"
            onClick={fetchSpots}
            disabled={loading}
            className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>
              {loading ? "Refreshing Spot Index..." : "Refresh Spots (CoinGecko Spot Index)"}
            </span>
          </button>
          <div className="flex items-center gap-3">
            <span>Last Updated: {lastUpdated.toLocaleTimeString()}</span>
            {error && <span className="text-amber-300">({error} - showing cached index)</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
