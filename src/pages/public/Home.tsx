import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  MessageSquareQuote,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import PublicLayout from "../../components/PublicLayout";
import ResilientImage from "../../components/ResilientImage";
import {
  Button,
  buttonClasses,
  FormField,
  SelectInput,
  TextAreaInput,
  TextInput,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import { useInvestmentPlans } from "../../hooks/useInvestmentPlans";
import {
  PropertyOffering,
  subscribeProperties,
} from "../../services/firestoreService";
import { formatUsd, MandateCategory } from "../../trading/tradingPage";

interface MarketQuote {
  symbol: string;
  name: string;
  priceUsd: number;
  change24hPct: number | null;
}

interface MarketTickerResponse {
  available: boolean;
  source: string;
  fetchedAt: string;
  quotes: MarketQuote[];
}

const HERO_SLIDES = [
  {
    id: "institutional-custody",
    kicker: "BitfuryTech Institutional Wealth Custody",
    headline: "Disciplined capital custody across digital assets, equities, and real estate.",
    description:
      "Unite structured portfolio mandates, multi-rail settlement verification, and account-isolated ledger reporting inside one institutional portal.",
    image: "/images/hero_institutional_wealth.jpg",
    imageAlt: "BitfuryTech financial district architectural skyline",
    primaryLabel: "Create Account",
    primaryTo: "/register",
    secondaryLabel: "Browse Investment Plans",
    secondaryTo: "/investments-catalog",
  },
  {
    id: "digital-liquidity",
    kicker: "Multi-Rail Digital Liquidity",
    headline: "Transparent allocation tracking backed by verified settlement records.",
    description:
      "Fund custody wallets via USDT (TRC20), Bitcoin, Ethereum, or Bank Wire with administrator confirmation prior to live mandate deployment.",
    image: "/images/hero_digital_liquidity.jpg",
    imageAlt: "Institutional multi-asset portfolio management boardroom",
    primaryLabel: "Explore Mandates",
    primaryTo: "/investments-catalog",
    secondaryLabel: "How It Works",
    secondaryTo: "/how-it-works",
  },
  {
    id: "commercial-holdings",
    kicker: "Commercial Real Estate Syndicates",
    headline: "Fractional participation in institutional commercial property offerings.",
    description:
      "Inspect live property valuations, occupancy benchmarks, and minimum participation thresholds synchronized directly from our portfolio desk.",
    image: "/images/hero_commercial_skyline.jpg",
    imageAlt: "Class-A commercial office towers in global financial district",
    primaryLabel: "Inspect Properties",
    primaryTo: "/properties",
    secondaryLabel: "Contact Desk",
    secondaryTo: "/contact",
  },
];

const SECTOR_BLOCKS = [
  {
    index: "01",
    category: "crypto" as MandateCategory,
    title: "Digital Assets",
    description:
      "Structured BTC, ETH, and USDT liquidity tiers governed by segregated wallet tracking and clear entry bounds.",
    image: "/images/asset_algo_trading.jpg",
    to: "/investments-catalog",
  },
  {
    index: "02",
    category: "stock" as MandateCategory,
    title: "Global Equities",
    description:
      "Fixed-cycle equity basket mandates focused on large-cap industrial, semiconductor, and index liquidity.",
    image: "/images/hero_digital_liquidity.jpg",
    to: "/investments-catalog",
  },
  {
    index: "03",
    category: "estate" as MandateCategory,
    title: "Commercial Real Estate",
    description:
      "Property syndicates and commercial real estate offerings with verified occupancy and asset valuation metrics.",
    image: "/images/asset_real_estate.jpg",
    to: "/properties",
  },
];

const CATEGORY_TABS: Array<{ id: MandateCategory | "all"; label: string }> = [
  { id: "all", label: "All Mandates" },
  { id: "crypto", label: "Digital Assets" },
  { id: "stock", label: "Global Equities" },
  { id: "estate", label: "Real Estate" },
];

const BENEFITS = [
  {
    index: "01",
    title: "Segregated Client Custody",
    description:
      "Every investor account operates under strict identity-scoped access rules so wallet balances, deposits, and mandates remain isolated per account.",
  },
  {
    index: "02",
    title: "Multi-Asset Allocation Access",
    description:
      "Deploy verified liquidity across Digital Assets, Global Equities, and Commercial Real Estate mandates from one unified workspace.",
  },
  {
    index: "03",
    title: "Verified Settlement Review",
    description:
      "Deposits and withdrawal disbursements pass through an explicit Pending-to-Completed review cycle before custody balances are adjusted.",
  },
  {
    index: "04",
    title: "Zero-Ambiguity Ledger Records",
    description:
      "New accounts initialize at $0.00 with zero simulated balances; every dashboard figure reflects verified ledger records.",
  },
];

const PROCESS_STEPS = [
  {
    step: "01",
    title: "Create & Verify Account",
    description:
      "Register with email/password or Google sign-in and verify your identity to initialize your isolated BitfuryTech investor profile.",
  },
  {
    step: "02",
    title: "Submit Deposit Notice",
    description:
      "Select USDT (TRC20), Bitcoin, Ethereum, or Bank Wire and log your transfer reference in the Deposit Desk.",
  },
  {
    step: "03",
    title: "Settlement Verification",
    description:
      "Once confirmed by the settlement administration desk, funds credit immediately to your verified wallet balance.",
  },
  {
    step: "04",
    title: "Allocate into Mandates",
    description:
      "Choose an eligible investment plan matching your capital range and track active cycle records in real time.",
  },
];

const HOME_FAQS = [
  {
    q: "How do I open a BitfuryTech investor account?",
    a: "Click Register to create an account with your username, email, and password (or Google sign-in). Your segregated investor profile and transaction ledger initialize immediately.",
  },
  {
    q: "Why do new accounts start with a $0.00 balance?",
    a: "BitfuryTech enforces strict ledger integrity. Accounts never display fabricated or placeholder balances—funds appear only after a verified deposit is approved.",
  },
  {
    q: "Are mandate return rates guaranteed?",
    a: "No. Published daily target rates are indicative benchmark parameters for each mandate structure and are never guaranteed. All digital asset, equity, and property allocations involve market and liquidity risk.",
  },
  {
    q: "How are commercial property offerings updated?",
    a: "Property offerings are published directly by BitfuryTech administrators into Firestore with verified valuation, occupancy, and minimum entry details.",
  },
];

export default function Home() {
  const { firebaseUser } = useAuth();
  const { plans, loading: plansLoading, error: plansError, reload: reloadPlans } =
    useInvestmentPlans();

  const [slideIdx, setSlideIdx] = useState(0);
  const [ticker, setTicker] = useState<MarketTickerResponse | null>(null);
  const [tickerLoading, setTickerLoading] = useState(true);

  const [filter, setFilter] = useState<MandateCategory | "all">("all");
  const [properties, setProperties] = useState<PropertyOffering[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Contact inquiry form state
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactTopic, setContactTopic] = useState("Institutional Custody Inquiry");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactStatus, setContactStatus] = useState<{ ok: boolean; text: string } | null>(null);

  // Rotate hero slides cleanly every 7s unless reduced-motion is preferred
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const timer = window.setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  const loadTicker = useCallback(async () => {
    setTickerLoading(true);
    try {
      const res = await fetch("/api/market/ticker");
      if (!res.ok) throw new Error("Ticker unavailable");
      const json = (await res.json()) as MarketTickerResponse;
      setTicker(json);
    } catch {
      setTicker({
        available: false,
        source: "Market Feed",
        fetchedAt: new Date().toISOString(),
        quotes: [],
      });
    } finally {
      setTickerLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTicker();
  }, [loadTicker]);

  useEffect(() => {
    const unsub = subscribeProperties((items) => {
      setProperties(items);
      setPropertiesLoading(false);
    });
    return () => unsub();
  }, []);

  const visibleMandates = useMemo(() => {
    if (filter === "all") return plans;
    return plans.filter((m) => m.category === filter);
  }, [filter, plans]);

  const featuredProperties = useMemo(
    () => properties.filter((p) => p.published !== false).slice(0, 3),
    [properties]
  );

  const verifiedStats = useMemo(() => {
    const minEntry = plans.length ? Math.min(...plans.map((p) => p.minDeposit)) : null;
    const categoryCount = new Set(plans.map((p) => p.category)).size;
    return [
      {
        label: "Active Mandate Tiers",
        value: plansLoading ? "—" : String(plans.length),
        detail: `${categoryCount || 3} asset classes served via API`,
      },
      {
        label: "Minimum Mandate Entry",
        value: minEntry !== null ? formatUsd(minEntry) : "—",
        detail: "Lowest published entry threshold",
      },
      {
        label: "Verified Settlement Rails",
        value: "4",
        detail: "USDT (TRC20) · BTC · ETH · Bank Wire",
      },
      {
        label: "Published Property Offerings",
        value: propertiesLoading ? "—" : String(properties.length),
        detail: "Live Firestore real estate catalog",
      },
    ];
  }, [plans, plansLoading, properties.length, propertiesLoading]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactStatus(null);
    const trimmedName = contactName.trim();
    const trimmedEmail = contactEmail.trim();
    const trimmedMessage = contactMessage.trim();

    if (!trimmedName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail) || !trimmedMessage) {
      setContactStatus({
        ok: false,
        text: "Provide your name, a valid email address, and your inquiry message.",
      });
      return;
    }

    setContactSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          subject: contactTopic,
          message: trimmedMessage,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        inquiryId?: string;
        error?: string;
      };
      if (!response.ok || !data.ok || !data.inquiryId) {
        throw new Error(
          data.error || "Unable to confirm inquiry submission with the server."
        );
      }
      setContactStatus({
        ok: true,
        text: `Inquiry confirmed (${data.inquiryId}) and logged with the BitfuryTech desk.`,
      });
      setContactName("");
      setContactEmail("");
      setContactMessage("");
    } catch (err) {
      setContactStatus({
        ok: false,
        text:
          err instanceof Error
            ? err.message
            : "Unable to submit inquiry right now. Please try again.",
      });
    } finally {
      setContactSubmitting(false);
    }
  };

  const activeSlide = HERO_SLIDES[slideIdx];

  return (
    <PublicLayout>
      {/* 1. Large Rotating Hero Banner Carousel */}
      <section aria-label="Featured investment overview" className="relative bg-[#1B4962] text-white overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20 grid lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
              {activeSlide.kicker}
            </p>
            <h1
              className="font-heading font-bold tracking-tight text-white text-balance leading-[1.08]"
              style={{ fontSize: "clamp(2.25rem, 4vw, 3.5rem)" }}
            >
              {activeSlide.headline}
            </h1>
            <p className="text-base sm:text-lg text-slate-200 max-w-2xl leading-relaxed">
              {activeSlide.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {firebaseUser ? (
                <Link
                  to="/dashboard"
                  className={buttonClasses({ variant: "primary", size: "lg" })}
                >
                  <span>Open Client Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  to={activeSlide.primaryTo}
                  className={buttonClasses({ variant: "primary", size: "lg" })}
                >
                  <span>{activeSlide.primaryLabel}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}

              <Link
                to={activeSlide.secondaryTo}
                className={buttonClasses({ variant: "outlineDark", size: "lg" })}
              >
                {activeSlide.secondaryLabel}
              </Link>
            </div>

            {/* Banner Slide Controls */}
            <div className="flex items-center gap-4 pt-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setSlideIdx((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)
                  }
                  aria-label="Previous hero banner"
                  className="w-9 h-9 border border-white/30 hover:bg-white/10 text-white flex items-center justify-center rounded-none cursor-pointer transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSlideIdx((prev) => (prev + 1) % HERO_SLIDES.length)}
                  aria-label="Next hero banner"
                  className="w-9 h-9 border border-white/30 hover:bg-white/10 text-white flex items-center justify-center rounded-none cursor-pointer transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2" role="tablist" aria-label="Hero banner slides">
                {HERO_SLIDES.map((s, idx) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={slideIdx === idx}
                    aria-label={`Slide ${idx + 1}: ${s.kicker}`}
                    onClick={() => setSlideIdx(idx)}
                    className={`h-2 transition-all cursor-pointer rounded-none ${
                      slideIdx === idx ? "w-8 bg-[#E94D65]" : "w-3 bg-white/35 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[280px] lg:min-h-[420px] rounded-[5px] overflow-hidden border border-white/20 bg-[#14374B]">
            <ResilientImage
              src={activeSlide.image}
              alt={activeSlide.imageAlt}
              fallbackLabel="BitfuryTech Custody Architecture"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#112E3E]/90 via-[#112E3E]/20 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-xs text-slate-200">
              <p className="font-heading font-bold text-white text-sm">{activeSlide.kicker}</p>
              <p className="text-slate-200 mt-1">
                Digital Assets · Global Equities · Commercial Real Estate
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Live Cryptocurrency Market Ticker */}
      <section aria-label="Cryptocurrency spot market ticker" className="bg-[#112E3E] text-white border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          {tickerLoading ? (
            <div className="flex items-center justify-between gap-4 text-xs text-slate-300">
              <span>Loading cryptocurrency spot quotes...</span>
            </div>
          ) : ticker && ticker.available && ticker.quotes.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {ticker.quotes.map((q) => {
                  const positive = (q.change24hPct ?? 0) >= 0;
                  return (
                    <div key={q.symbol} className="flex items-center gap-2 text-xs">
                      <span className="font-heading font-bold text-white">{q.symbol}</span>
                      <span className="font-mono tabular-nums text-slate-200">
                        {q.priceUsd < 2
                          ? `$${q.priceUsd.toFixed(4)}`
                          : formatUsd(q.priceUsd)}
                      </span>
                      {q.change24hPct !== null && (
                        <span
                          className={`inline-flex items-center gap-0.5 font-mono tabular-nums font-semibold ${
                            positive ? "text-emerald-300" : "text-[#F899A7]"
                          }`}
                        >
                          {positive ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {positive ? "+" : ""}
                          {q.change24hPct.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => void loadTicker()}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-300 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh Spots ({ticker.source})</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 text-xs text-slate-300">
              <span>Live cryptocurrency spot feed temporarily unavailable.</span>
              <button
                type="button"
                onClick={() => void loadTicker()}
                className="inline-flex items-center gap-1.5 font-semibold text-white hover:underline cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Feed</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 3. Investment-Sector Feature Blocks */}
      <section className="bg-white border-b border-[#DCE4EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
              Core Investment Sectors
            </p>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-[#102030]">
              Three Institutional Asset Classes Under Unified Custody
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {SECTOR_BLOCKS.map((sector) => (
              <article
                key={sector.index}
                className="bg-white border border-[#DCE4EC] rounded-[5px] overflow-hidden flex flex-col justify-between shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
              >
                <div>
                  <div className="h-44 w-full overflow-hidden border-b border-[#DCE4EC]">
                    <ResilientImage
                      src={sector.image}
                      alt={sector.title}
                      fallbackLabel={sector.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-6 space-y-2.5">
                    <p className="text-xs font-mono font-semibold text-[#B92841]">
                      {sector.index}. Asset Sector
                    </p>
                    <h3 className="text-lg font-heading font-bold text-[#102030]">
                      {sector.title}
                    </h3>
                    <p className="text-sm text-[#5A6B7C] leading-relaxed">{sector.description}</p>
                  </div>
                </div>
                <div className="px-6 pb-6">
                  <Link
                    to={sector.to}
                    className={buttonClasses({ variant: "secondary", size: "sm" })}
                  >
                    <span>Explore Sector</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Company Introduction Section */}
      <section className="bg-[#F6F8FA] border-b border-[#DCE4EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7 space-y-4">
            <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
              About BitfuryTech
            </p>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-[#102030] text-balance">
              Account-isolated investment administration built on verified settlement records.
            </h2>
            <p className="text-sm sm:text-base text-[#5A6B7C] leading-relaxed">
              BitfuryTech connects private and institutional participants to structured investment
              mandates across cryptocurrency liquidity, global equity indices, and commercial
              property syndicates. Every account begins with verified identity onboarding and logs
              all deposits, withdrawals, and active mandates in an auditable client ledger.
            </p>
            <div className="pt-2">
              <Link
                to="/about"
                className={buttonClasses({ variant: "secondary", size: "md" })}
              >
                <span>Read Corporate Profile</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-[#DCE4EC] rounded-[5px] p-6 sm:p-7 space-y-4 shadow-[0_2px_8px_rgba(27,73,98,0.06)]">
            <div className="flex items-center gap-2.5 text-[#1B4962]">
              <ShieldCheck className="w-5 h-5 text-[#E94D65] shrink-0" />
              <h3 className="text-base font-heading font-bold text-[#102030]">
                Core Custody Principles
              </h3>
            </div>
            <ul className="space-y-3 text-sm text-[#5A6B7C] border-t border-[#DCE4EC] pt-4">
              <li>Verified authentication session &amp; username isolation</li>
              <li>Explicit administrator confirmation on all deposits and payouts</li>
              <li>Real-time ledger visibility with zero simulated balances</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 5. Featured Investment Opportunities (Live Backend Source) */}
      <section className="bg-white border-b border-[#DCE4EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Investment Opportunities
              </p>
              <h2 className="text-3xl font-heading font-bold tracking-tight text-[#102030]">
                Featured Mandate Tiers
              </h2>
              <p className="text-sm text-[#5A6B7C]">
                Live mandate specifications retrieved from the BitfuryTech portfolio catalog. Target
                rates represent non-guaranteed mandate benchmarks.
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Filter investment mandates by category"
              className="flex flex-wrap gap-1 p-1 bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] self-start"
            >
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={filter === tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`px-3.5 py-2 rounded-none text-xs font-heading font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filter === tab.id
                      ? "bg-[#E94D65] text-white"
                      : "text-[#1B4962] hover:bg-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {plansLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-80 rounded-[5px] bg-[#F6F8FA] border border-[#DCE4EC] animate-pulse"
                />
              ))}
            </div>
          ) : plansError ? (
            <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-[5px] p-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-[#9F1239]">{plansError}</p>
              <Button variant="primary" size="sm" onClick={reloadPlans}>
                Retry Loading Plans
              </Button>
            </div>
          ) : visibleMandates.length === 0 ? (
            <div className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-8 text-center">
              <p className="text-sm text-[#5A6B7C]">
                No investment plans are currently active in this category.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleMandates.map((m) => (
                <article
                  key={m.id}
                  className="bg-white border border-[#DCE4EC] rounded-[5px] overflow-hidden flex flex-col justify-between shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
                >
                  <div>
                    <div className="h-44 w-full overflow-hidden border-b border-[#DCE4EC]">
                      <ResilientImage
                        src={m.image}
                        alt={`${m.name} — ${m.categoryLabel}`}
                        fallbackLabel={m.categoryLabel}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="text-xs text-[#5A6B7C]">
                        <span className="font-semibold text-[#B92841]">{m.categoryLabel}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{m.durationDays}-Day Cycle</span>
                      </div>

                      <div>
                        <h3 className="text-xl font-heading font-bold text-[#102030]">{m.name}</h3>
                        <p className="text-xs text-[#5A6B7C] mt-1">{m.audience}</p>
                      </div>

                      <dl className="space-y-2 border-y border-[#DCE4EC] py-4 text-xs">
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#5A6B7C]">Indicative Daily Target</dt>
                          <dd className="font-mono tabular-nums font-semibold text-[#B92841]">
                            {m.dailyRatePct}% (Non-Guaranteed)
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#5A6B7C]">Entry Range</dt>
                          <dd className="font-mono tabular-nums font-semibold text-[#102030]">
                            {formatUsd(m.minDeposit)} – {formatUsd(m.maxDeposit)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#5A6B7C]">Settlement Rail</dt>
                          <dd className="text-[#102030] text-right">{m.settlementRail}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  <div className="px-6 pb-6 flex items-center gap-3">
                    <Link
                      to={`/investments-catalog/${m.id}`}
                      className={`flex-1 ${buttonClasses({ variant: "primary", size: "sm" })}`}
                    >
                      See Details
                    </Link>
                    <Link
                      to={`/investments?plan=${m.id}`}
                      className={buttonClasses({ variant: "secondary", size: "sm" })}
                    >
                      Allocate
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 6. Featured Property Listings (Live Firestore Collection) */}
      <section className="bg-[#F6F8FA] border-b border-[#DCE4EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Real Estate Holdings
              </p>
              <h2 className="text-3xl font-heading font-bold tracking-tight text-[#102030]">
                Featured Property Listings
              </h2>
              <p className="text-sm text-[#5A6B7C]">
                Commercial real estate offerings synced live from the BitfuryTech Firestore catalog.
              </p>
            </div>
            <Link
              to="/properties"
              className="text-xs font-heading font-bold text-[#1B4962] hover:text-[#B92841] hover:underline whitespace-nowrap"
            >
              View All Properties
            </Link>
          </div>

          {propertiesLoading ? (
            <div className="grid md:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-72 rounded-[5px] bg-white border border-[#DCE4EC] animate-pulse"
                />
              ))}
            </div>
          ) : featuredProperties.length === 0 ? (
            <div className="bg-white border border-[#DCE4EC] rounded-[5px] p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <h3 className="text-lg font-heading font-bold text-[#102030]">
                  No Property Listings Currently Published
                </h3>
                <p className="text-sm text-[#5A6B7C] leading-relaxed">
                  Verified commercial real estate offerings appear here automatically as soon as an
                  administrator publishes them to Firestore. You can inspect our Real Estate mandate
                  tiers in the interim.
                </p>
              </div>
              <Link
                to="/investments-catalog"
                className={buttonClasses({ variant: "primary", size: "md" })}
              >
                View Real Estate Mandates
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProperties.map((p) => (
                <article
                  key={p.id}
                  className="bg-white border border-[#DCE4EC] rounded-[5px] overflow-hidden flex flex-col justify-between shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
                >
                  <div>
                    <div className="h-44 w-full overflow-hidden border-b border-[#DCE4EC]">
                      <ResilientImage
                        src={p.image || "/images/asset_real_estate.jpg"}
                        alt={p.title}
                        fallbackLabel={p.assetType}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-6 space-y-3">
                      <p className="text-xs text-[#5A6B7C]">
                        <span className="text-[#B92841] font-semibold">{p.assetType}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{p.status}</span>
                      </p>
                      <h3 className="text-lg font-heading font-bold text-[#102030]">{p.title}</h3>
                      <p className="text-xs text-[#5A6B7C]">{p.location}</p>
                      <dl className="grid grid-cols-2 gap-3 pt-3 border-t border-[#DCE4EC] text-xs">
                        <div>
                          <dt className="text-[#5A6B7C]">Min Entry</dt>
                          <dd className="font-mono tabular-nums font-semibold text-[#102030]">
                            {formatUsd(p.minEntry)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[#5A6B7C]">Target Yield</dt>
                          <dd className="font-mono tabular-nums font-semibold text-[#B92841]">
                            {p.targetYieldPct}%
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                  <div className="px-6 pb-6">
                    <Link
                      to="/properties"
                      className={buttonClasses({ variant: "secondary", size: "sm", fullWidth: true })}
                    >
                      Inspect Offering
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 7. Verified Investment Statistics Band */}
      <section className="bg-[#1B4962] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
              Verified Platform Parameters
            </p>
            <h2 className="text-3xl font-heading font-bold tracking-tight text-white">
              Live Catalog &amp; Infrastructure Metrics
            </h2>
            <p className="text-sm text-slate-200">
              All figures below are computed strictly from active backend mandate definitions and
              live Firestore catalog records.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {verifiedStats.map((stat) => (
              <div
                key={stat.label}
                className="bg-[#14374B] border border-white/15 rounded-[5px] p-6 space-y-2"
              >
                <p className="text-xs font-medium text-slate-200">{stat.label}</p>
                <p className="text-3xl font-bold font-mono tabular-nums text-white">
                  {stat.value}
                </p>
                <p className="text-xs text-slate-300">{stat.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Service & Benefits Cards */}
      <section className="bg-white border-b border-[#DCE4EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
              Platform Advantages
            </p>
            <h2 className="text-3xl font-heading font-bold tracking-tight text-[#102030]">
              Investment Custody Benefits
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {BENEFITS.map((item) => (
              <div
                key={item.index}
                className="bg-white border border-[#DCE4EC] rounded-[5px] p-6 space-y-2.5 shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
              >
                <p className="text-xs font-mono font-semibold text-[#B92841]">{item.index}.</p>
                <h3 className="text-lg font-heading font-bold text-[#102030]">{item.title}</h3>
                <p className="text-sm text-[#5A6B7C] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. How the Investment Process Works */}
      <section className="bg-[#F6F8FA] border-b border-[#DCE4EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Onboarding &amp; Allocation Workflow
              </p>
              <h2 className="text-3xl font-heading font-bold tracking-tight text-[#102030]">
                How the Investment Process Works
              </h2>
            </div>
            <Link
              to="/how-it-works"
              className="text-xs font-heading font-bold text-[#1B4962] hover:text-[#B92841] hover:underline whitespace-nowrap"
            >
              View Full 9-Step Guide
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROCESS_STEPS.map((s) => (
              <div
                key={s.step}
                className="bg-white border border-[#DCE4EC] rounded-[5px] p-6 space-y-3 shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
              >
                <p className="text-xs font-mono font-semibold text-[#B92841]">Step {s.step}</p>
                <h3 className="text-base font-heading font-bold text-[#102030]">{s.title}</h3>
                <p className="text-sm text-[#5A6B7C] leading-relaxed">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Verified Client Testimonials Section (Genuine Approved Only) */}
      <section className="bg-white border-b border-[#DCE4EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-6">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
              Client Endorsements
            </p>
            <h2 className="text-3xl font-heading font-bold tracking-tight text-[#102030]">
              Verified Client Testimonials
            </h2>
          </div>

          <div className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2 text-[#1B4962]">
                <MessageSquareQuote className="w-5 h-5 text-[#E94D65] shrink-0" />
                <h3 className="text-base font-heading font-bold text-[#102030]">
                  Compliance-Verified Endorsement Policy
                </h3>
              </div>
              <p className="text-sm text-[#5A6B7C] leading-relaxed">
                BitfuryTech displays only written client reviews approved through settlement
                verification—never unverified quotes or synthetic ratings. Verified participants may
                submit account feedback for compliance review at any time.
              </p>
            </div>
            <Link
              to="/contact"
              className={buttonClasses({ variant: "secondary", size: "md" })}
            >
              Submit Verified Feedback
            </Link>
          </div>
        </div>
      </section>

      {/* 11. Frequently Asked Questions */}
      <section className="bg-[#F6F8FA] border-b border-[#DCE4EC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Investor FAQ
              </p>
              <h2 className="text-3xl font-heading font-bold tracking-tight text-[#102030]">
                Frequently Asked Questions
              </h2>
            </div>
            <Link
              to="/faq"
              className="text-xs font-heading font-bold text-[#1B4962] hover:text-[#B92841] hover:underline"
            >
              View Full FAQ
            </Link>
          </div>

          <div className="space-y-3">
            {HOME_FAQS.map((item, idx) => {
              const open = openFaq === idx;
              return (
                <div
                  key={item.q}
                  className="bg-white border border-[#DCE4EC] rounded-[5px] overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : idx)}
                    aria-expanded={open}
                    className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-[#F6F8FA] cursor-pointer transition-colors"
                  >
                    <span className="text-sm sm:text-base font-heading font-bold text-[#102030]">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-[#E94D65] shrink-0 transition-transform ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {open && (
                    <div className="px-6 pb-5 pt-3 border-t border-[#DCE4EC] text-sm text-[#5A6B7C] leading-relaxed">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 12. Direct Investor Contact Section */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-5 space-y-4">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Client Relations Desk
              </p>
              <h2 className="text-3xl font-heading font-bold tracking-tight text-[#102030] text-balance">
                Direct Institutional &amp; Investor Inquiries
              </h2>
              <p className="text-sm text-[#5A6B7C] leading-relaxed">
                Submit questions regarding custody onboarding, settlement rails, or published real
                estate offerings directly to the BitfuryTech administration desk.
              </p>
              <div className="pt-2 space-y-2 text-sm text-[#102030]">
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#E94D65] shrink-0" />
                  <span>bitfurytech21@gmail.com</span>
                </p>
              </div>
              <div className="pt-4 flex flex-wrap gap-3">
                <Link
                  to="/register"
                  className={buttonClasses({ variant: "primary", size: "md" })}
                >
                  Create Account
                </Link>
                <Link
                  to="/login"
                  className={buttonClasses({ variant: "secondary", size: "md" })}
                >
                  Login
                </Link>
              </div>
            </div>

            <div className="lg:col-span-7 bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 sm:p-8">
              <form onSubmit={handleContactSubmit} className="space-y-4">
                {contactStatus && (
                  <div
                    role="status"
                    className={`rounded-[5px] p-3.5 text-sm border ${
                      contactStatus.ok
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                  >
                    {contactStatus.text}
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  <FormField id="home-inq-name" label="Full Name">
                    <TextInput
                      id="home-inq-name"
                      type="text"
                      maxLength={120}
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      required
                    />
                  </FormField>
                  <FormField id="home-inq-email" label="Email Address">
                    <TextInput
                      id="home-inq-email"
                      type="email"
                      maxLength={200}
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      required
                    />
                  </FormField>
                </div>

                <FormField id="home-inq-topic" label="Subject">
                  <SelectInput
                    id="home-inq-topic"
                    value={contactTopic}
                    onChange={(e) => setContactTopic(e.target.value)}
                  >
                    <option>Institutional Custody Inquiry</option>
                    <option>Real Estate Syndicate Participation</option>
                    <option>Deposit &amp; Settlement Verification</option>
                    <option>Compliance &amp; Account Review</option>
                  </SelectInput>
                </FormField>

                <FormField id="home-inq-msg" label="Message">
                  <TextAreaInput
                    id="home-inq-msg"
                    rows={4}
                    maxLength={1500}
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    required
                  />
                </FormField>

                <Button type="submit" variant="primary" size="lg" loading={contactSubmitting}>
                  Submit Inquiry
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
