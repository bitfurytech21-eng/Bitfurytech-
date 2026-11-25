import TradingViewTickerTape from "./TradingViewTickerTape";

export default function HomeLiveTradeSection() {
  return (
    <section
      aria-label="Live market ticker"
      className="bg-[#112E3E] border-y border-white/10 text-white"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <TradingViewTickerTape colorTheme="dark" displayMode="adaptive" />
      </div>
    </section>
  );
}
