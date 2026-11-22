import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  MessageSquareQuote,
  ShieldCheck,
} from "lucide-react";
import PublicLayout from "../../components/PublicLayout";
import ResilientImage from "../../components/ResilientImage";
import TradingViewTickerTape from "../../components/TradingViewTickerTape";
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

const HERO_SLIDES = [
  {
    id: "institutional-custody",
    kicker: "Bitfury Tech Investment · Est. 2017",
    headline: "Algorithmic trading precision and multi-asset wealth management you can verify.",
    description:
      "Founded in 2017 by financial analysts, fund managers, and research scientists, Bitfury Tech Investment applies mathematical and statistical discipline with direct access to over 50 financial markets through one unified account.",
    image: "/images/hero_institutional_wealth.jpg",
    imageAlt: "BitfuryTech financial district architectural skyline",
    primaryLabel: "Explore Opportunities",
    primaryTo: "/investments-catalog",
    secondaryLabel: "Create an Account",
    secondaryTo: "/register",
  },
  {
    id: "market-research",
    kicker: "Investment Policy Committee & Market Research",
    headline: "Move beyond conventional strategies across Cryptocurrency, Stocks, and Real Estate.",
    description:
      "Compare 13 transparent mandate tiers governed by our Investment Policy Committee (IPC), inspect monthly benchmarks and referral tiers, and manage custody inside a segregated ledger.",
    image: "/images/hero_digital_liquidity.jpg",
    imageAlt: "Institutional multi-asset portfolio management boardroom",
    primaryLabel: "Explore Opportunities",
    primaryTo: "/investments-catalog",
    secondaryLabel: "How It Works",
    secondaryTo: "/how-it-works",
  },
  {
    id: "commercial-holdings",
    kicker: "Commercial Real Estate Participation",
    headline: "Evaluate property offerings with clear valuations, occupancy data, and entry terms.",
    description:
      "Inspect live commercial property offerings published directly by our portfolio desk, review rental and valuation considerations, and manage your participation inside one client account.",
    image: "/images/hero_commercial_skyline.jpg",
    imageAlt: "Class-A commercial office towers in global financial district",
    primaryLabel: "Inspect Properties",
    primaryTo: "/properties",
    secondaryLabel: "Create an Account",
    secondaryTo: "/register",
  },
];

const SECTOR_BLOCKS = [
  {
    index: "01",
    category: "crypto" as MandateCategory,
    title: "Cryptocurrency",
    description:
      "Explore digital assets built on decentralized blockchain networks, including Bitcoin, Ethereum, and USD-pegged liquidity pools. Cryptocurrency markets operate continuously and can experience sharp price volatility, network congestion, and liquidity shifts, making disciplined position sizing and risk awareness essential.",
    riskNote: "High market volatility & digital asset price risk",
    image: "/images/asset_algo_trading.jpg",
    to: "/investments-catalog?category=crypto",
  },
  {
    index: "02",
    category: "stock" as MandateCategory,
    title: "Stocks",
    description:
      "Access structured equity mandates centered on publicly traded company shares across global markets. Share ownership exposes capital to corporate earnings performance, sector demand, interest-rate expectations, and broader economic developments that can cause stock values to rise or decline.",
    riskNote: "Equity market, earnings & macroeconomic risk",
    image: "/images/hero_digital_liquidity.jpg",
    to: "/investments-catalog?category=stock",
  },
  {
    index: "03",
    category: "estate" as MandateCategory,
    title: "Real Estate",
    description:
      "Review commercial property offerings and asset-backed real estate mandates. Property participation considers potential rental income, tenant occupancy stability, and long-term property value changes—always review full valuation, location, and offering terms before committing capital.",
    riskNote: "Tenancy, valuation & property liquidity risk",
    image: "/images/asset_real_estate.jpg",
    to: "/properties",
  },
];

const RESEARCH_PILLARS = [
  {
    title: "Studying Market Movements",
    description:
      "Tracking price trends, trading volume, and sector rotation helps investors see how digital assets, equities, and property markets respond over different cycles.",
  },
  {
    title: "Understanding Asset Performance",
    description:
      "Comparing historical behaviour, yield drivers, and cost structures clarifies how each asset category contributes differently to growth or income objectives.",
  },
  {
    title: "Monitoring Economic Developments",
    description:
      "Inflation data, central-bank rate policies, employment trends, and industry shifts directly influence borrowing costs, corporate profits, and asset valuations.",
  },
  {
    title: "Assessing Potential Risks",
    description:
      "Evaluating downside volatility, concentration exposure, and liquidity horizons before investing helps prevent decisions driven solely by short-term market sentiment.",
  },
];

const PORTFOLIO_PRINCIPLES = [
  {
    title: "Market Analysis & IPC Governance",
    description:
      "Our Investment Policy Committee (over 10 years combined experience) works alongside network engineers, macroeconomists, research scientists, and quantitative analysts.",
  },
  {
    title: "Flexible Cross-Asset Switching",
    description:
      "Switch across Cryptocurrency (6 tiers), Stocks (4 tiers), and Real Estate (3 tiers) as your financial circumstances evolve without extra switching charges.",
  },
  {
    title: "Long-Term Planning & 24/7 Monitoring",
    description:
      "Algorithms and custody ledgers operate continuously while clear cycle timelines, risk brackets, and transparent records keep allocations auditable.",
  },
];

const LEADERSHIP_TEAM = [
  { name: "Robb Baldwin", role: "President & CEO" },
  { name: "Rob Dilbone", role: "Managing Director" },
  { name: "Cris Frankel", role: "VP of Business Development" },
  { name: "Scott Victoria", role: "Chief Operating Officer" },
];

const PUBLISHED_MILESTONES = [
  { label: "Total Members", value: "1,865+" },
  { label: "Total Returns Distributed", value: "$604,585" },
  { label: "Total Transactions", value: "4,180+" },
  { label: "Total Deposited", value: "$695,535" },
];

const CATEGORY_TABS: Array<{ id: MandateCategory | "all"; label: string }> = [
  { id: "all", label: "All Mandates" },
  { id: "crypto", label: "Cryptocurrency" },
  { id: "stock", label: "Stocks" },
  { id: "estate", label: "Real Estate" },
];

const WHY_CHOOSE_ITEMS = [
  {
    index: "01",
    title: "Research-Driven Decisions",
    description:
      "Platform insights, spot market quotes, and plain-language asset explanations support informed portfolio choices rather than guesswork.",
  },
  {
    index: "02",
    title: "Flexible Opportunities",
    description:
      "Choose across Cryptocurrency, Stocks, and Real Estate mandates with clear minimum and maximum participation thresholds.",
  },
  {
    index: "03",
    title: "Clear Account Information",
    description:
      "Available balances, active principal, and pending settlements are presented cleanly without placeholder or demonstration numbers.",
  },
  {
    index: "04",
    title: "Protected Account Access",
    description:
      "Email verification, password controls, Google sign-in, and UID-isolated database rules protect client account records.",
  },
  {
    index: "05",
    title: "Dedicated Customer Assistance",
    description:
      "Direct inquiry support through our Client Relations & Settlement Desk helps resolve funding, account, and mandate questions.",
  },
  {
    index: "06",
    title: "Complete Transaction Records",
    description:
      "Every deposit notice, allocation, and withdrawal receives a unique reference code and downloadable statement receipt.",
  },
  {
    index: "07",
    title: "Continuous Portfolio Monitoring",
    description:
      "Track active cycles, elapsed days, maturity dates, and asset-class allocation breakdowns in real time from your dashboard.",
  },
  {
    index: "08",
    title: "Transparent Investment Information",
    description:
      "All mandate durations, fee rates, settlement rails, and non-guaranteed benchmark disclosures are displayed clearly before confirmation.",
  },
];

const PROCESS_STEPS = [
  {
    step: "01",
    title: "Create & Verify Account",
    description:
      "Register with your username, email, and password (or Google sign-in), confirm your email address, and open your $0.00 segregated dashboard.",
  },
  {
    step: "02",
    title: "Explore & Select Opportunity",
    description:
      "Review Cryptocurrency, Stock, and Real Estate mandates or live property offerings, inspecting entry thresholds, cycle duration, and risk terms.",
  },
  {
    step: "03",
    title: "Submit & Verify Deposit",
    description:
      "Fund your account via USDT (TRC20), Bitcoin, Ethereum, or Bank Wire and submit your transfer reference for settlement desk confirmation.",
  },
  {
    step: "04",
    title: "Monitor, Withdraw & Review",
    description:
      "Track active positions in real time, request verified withdrawals from available funds, and export complete transaction statements.",
  },
];

const HOME_FAQS = [
  {
    q: "What is BitfuryTech?",
    a: "BitfuryTech is an investment-focused company and portfolio administration platform offering structured access across Cryptocurrency, Stocks, and Commercial Real Estate, supported by market research, portfolio tools, and transparent ledger reporting.",
  },
  {
    q: "How do I create a BitfuryTech investor account?",
    a: "Click Create an Account to register with your full name, unique username, email, and password (or Google sign-in). After confirming your email verification link, your isolated investor dashboard initializes at $0.00.",
  },
  {
    q: "Are mandate returns or yields guaranteed?",
    a: "No. Published daily target percentages and property yield targets are indicative benchmarks only and are never guaranteed. Investment values can rise or fall depending on market conditions, asset performance, and liquidity.",
  },
  {
    q: "How do deposits, withdrawals, and the referral programme work?",
    a: "Deposits submitted via USDT (TRC20), Bitcoin, Ethereum, or Bank Wire enter Pending review and credit once confirmed by our settlement desk. Withdrawals follow published fee terms (1.0%, minimum $2.00 USD) and review checks. Clients can also invite others via a personal referral link, with rewards credited only upon verified qualifying activity.",
  },
];

export default function Home() {
  const { firebaseUser } = useAuth();
  const { plans, loading: plansLoading, error: plansError, reload: reloadPlans } =
    useInvestmentPlans();

  const [slideIdx, setSlideIdx] = useState(0);

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
      {/* 1. Homepage Introduction & Rotating Hero Banner */}
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
                to={firebaseUser ? "/investments-catalog" : activeSlide.secondaryTo}
                className={buttonClasses({ variant: "outlineDark", size: "lg" })}
              >
                {firebaseUser ? "Explore Opportunities" : activeSlide.secondaryLabel}
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
                Cryptocurrency · Stocks · Commercial Real Estate
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Live TradingView Market Ticker */}
      <section
        aria-label="Live TradingView market ticker"
        className="bg-[#112E3E] text-white border-y border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5">
          <TradingViewTickerTape colorTheme="dark" displayMode="adaptive" />
        </div>
      </section>

      {/* 3. Investment Categories: Cryptocurrency, Stocks, and Real Estate */}
      <section className="bg-white border-b border-[#DCE4EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
              Investment Categories
            </p>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-[#102030]">
              Understanding Available Asset Classes
            </h2>
            <p className="text-sm text-[#5A6B7C] leading-relaxed">
              Every asset category behaves differently across market cycles. BitfuryTech presents
              clear background, risk considerations, and entry specifications for Cryptocurrency,
              Stocks, and Real Estate so clients can evaluate opportunities deliberately.
            </p>
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
                      {sector.index}. Asset Category
                    </p>
                    <h3 className="text-lg font-heading font-bold text-[#102030]">
                      {sector.title}
                    </h3>
                    <p className="text-sm text-[#5A6B7C] leading-relaxed">{sector.description}</p>
                    <p className="text-xs text-[#1B4962] font-medium pt-1">
                      Key consideration: {sector.riskNote}
                    </p>
                  </div>
                </div>
                <div className="px-6 pb-6">
                  <Link
                    to={sector.to}
                    className={buttonClasses({ variant: "secondary", size: "sm" })}
                  >
                    <span>See Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* 4. About BitfuryTech & Structured Portfolio Philosophy */}
      <section className="bg-[#F6F8FA] border-b border-[#DCE4EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-4">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                About Bitfury Tech Investment · Est. 2017
              </p>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-[#102030] text-balance">
                Algorithmic research, disciplined risk management, and access to 50+ global markets.
              </h2>
              <p className="text-sm sm:text-base text-[#5A6B7C] leading-relaxed">
                Bitfury Tech Investment is an algorithmic trading and wealth management firm founded
                in 2017 by skilled financial analysts, fund managers, and research scientists. We
                combine mathematical and statistical methodology with custody services across digital
                assets, global equities, and commercial property holdings.
              </p>
              <p className="text-sm text-[#5A6B7C] leading-relaxed">
                Our Investment Policy Committee (IPC) oversees strategic portfolio allocations with
                the support of macroeconomists and quantitative analysts—focusing on financial
                science rather than speculative shortcuts, while clearly disclosing all risk factors.
              </p>
              <div className="pt-2 flex flex-wrap gap-3">
                <Link
                  to="/about"
                  className={buttonClasses({ variant: "secondary", size: "md" })}
                >
                  <span>About Our Company</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/services"
                  className={buttonClasses({ variant: "outline", size: "md" })}
                >
                  Explore Services
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white border border-[#DCE4EC] rounded-[5px] p-6 sm:p-7 space-y-4 shadow-[0_2px_8px_rgba(27,73,98,0.06)]">
              <div className="flex items-center gap-2.5 text-[#1B4962]">
                <ShieldCheck className="w-5 h-5 text-[#E94D65] shrink-0" />
                <h3 className="text-base font-heading font-bold text-[#102030]">
                  Structured Portfolio Principles
                </h3>
              </div>
              <div className="space-y-3 border-t border-[#DCE4EC] pt-4">
                {PORTFOLIO_PRINCIPLES.map((item) => (
                  <div key={item.title} className="space-y-1">
                    <p className="text-xs font-heading font-bold text-[#102030]">{item.title}</p>
                    <p className="text-xs text-[#5A6B7C] leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#5A6B7C] border-t border-[#DCE4EC] pt-3 leading-relaxed">
                Important notice: Investment values can rise or fall depending on market conditions,
                and returns are never guaranteed.
              </p>
            </div>
          </div>

          {/* Market Analysis & Research Sub-Band */}
          <div className="bg-white border border-[#DCE4EC] rounded-[5px] p-6 sm:p-8 space-y-6 shadow-[0_2px_8px_rgba(27,73,98,0.06)]">
            <div className="max-w-3xl space-y-2">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Market Analysis &amp; Research
              </p>
              <h3 className="text-xl sm:text-2xl font-heading font-bold text-[#102030]">
                Why Market Research Guides Portfolio Decisions
              </h3>
              <p className="text-sm text-[#5A6B7C] leading-relaxed">
                Whether you are new to investing or managing an established portfolio, consistent
                research helps replace impulse with clarity across changing economic conditions.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {RESEARCH_PILLARS.map((pillar) => (
                <div key={pillar.title} className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-4 space-y-1.5">
                  <h4 className="text-sm font-heading font-bold text-[#102030]">{pillar.title}</h4>
                  <p className="text-xs text-[#5A6B7C] leading-relaxed">{pillar.description}</p>
                </div>
              ))}
            </div>
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
                        {typeof m.monthlyRatePct === "number" && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-[#5A6B7C]">Monthly Benchmark</dt>
                            <dd className="font-mono tabular-nums font-semibold text-[#102030]">
                              {m.monthlyRatePct}% · {m.referralBonusPct ?? 5}% Referral
                            </dd>
                          </div>
                        )}
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
                Always inspect occupancy, valuation, and rental assumptions before investing.
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
                to="/investments-catalog?category=estate"
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

      {/* 7. Verified Investment Statistics & Platform Milestones Band */}
      <section className="bg-[#1B4962] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
              Platform Scale &amp; Live Catalog Parameters
            </p>
            <h2 className="text-3xl font-heading font-bold tracking-tight text-white">
              Published Milestones &amp; Live API Infrastructure
            </h2>
            <p className="text-sm text-slate-200">
              Live catalog counters computed directly from active mandate definitions and Firestore
              offerings alongside Bitfury Tech Investment&apos;s published operational milestones.
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

          <div className="border-t border-white/15 pt-8 space-y-4">
            <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
              Bitfury Tech Investment Historical Platform Numbers
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {PUBLISHED_MILESTONES.map((item) => (
                <div
                  key={item.label}
                  className="bg-white/5 border border-white/15 rounded-[5px] p-5 space-y-1"
                >
                  <p className="text-xs text-slate-200">{item.label}</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-white">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 8. Why Choose BitfuryTech? (8 Clear Pillars) */}
      <section className="bg-white border-b border-[#DCE4EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
              Why Choose BitfuryTech
            </p>
            <h2 className="text-3xl font-heading font-bold tracking-tight text-[#102030]">
              Eight Pillars of Transparent Portfolio Administration
            </h2>
            <p className="text-sm text-[#5A6B7C]">
              Built around clarity, accountable record-keeping, and investor risk awareness—without
              unrealistic promises or synthetic metrics.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WHY_CHOOSE_ITEMS.map((item) => (
              <div
                key={item.index}
                className="bg-white border border-[#DCE4EC] rounded-[5px] p-6 space-y-2.5 shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
              >
                <p className="text-xs font-mono font-semibold text-[#B92841]">{item.index}.</p>
                <h3 className="text-base font-heading font-bold text-[#102030]">{item.title}</h3>
                <p className="text-xs sm:text-sm text-[#5A6B7C] leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. How the Investment Process Works + Security, Funding & Referrals Overview */}
      <section className="bg-[#F6F8FA] border-b border-[#DCE4EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Onboarding &amp; Allocation Workflow
              </p>
              <h2 className="text-3xl font-heading font-bold tracking-tight text-[#102030]">
                How the Platform Works
              </h2>
            </div>
            <Link
              to="/how-it-works"
              className="text-xs font-heading font-bold text-[#1B4962] hover:text-[#B92841] hover:underline whitespace-nowrap"
            >
              View Complete 9-Step Guide
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

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="bg-white border border-[#DCE4EC] rounded-[5px] p-6 space-y-2.5">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Account Protection
              </p>
              <h3 className="text-base font-heading font-bold text-[#102030]">
                Security &amp; Client Isolation
              </h3>
              <p className="text-xs sm:text-sm text-[#5A6B7C] leading-relaxed">
                Accounts use verified email or Google authentication, runtime-only session tokens,
                optional payout verification flags, and strict UID-isolated database security rules
                with complete ledger history.
              </p>
            </div>
            <div className="bg-white border border-[#DCE4EC] rounded-[5px] p-6 space-y-2.5">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Funding &amp; Payouts
              </p>
              <h3 className="text-base font-heading font-bold text-[#102030]">
                Deposits &amp; Withdrawals
              </h3>
              <p className="text-xs sm:text-sm text-[#5A6B7C] leading-relaxed">
                Fund via USDT (TRC20), Bitcoin, Ethereum, or Bank Wire with administrator settlement
                verification prior to balance credit. Withdrawals reserve requested funds while
                pending and display applicable fees upfront.
              </p>
            </div>
            <div className="bg-white border border-[#DCE4EC] rounded-[5px] p-6 space-y-2.5">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Partner Tracking
              </p>
              <h3 className="text-base font-heading font-bold text-[#102030]">
                Referral Programme (5% – 10%)
              </h3>
              <p className="text-xs sm:text-sm text-[#5A6B7C] leading-relaxed">
                Earn 5% for referrals below $100,000 and 10% above $100,000 (plus 5% Crypto, 6%
                Stock, and 7% Real Estate category tiers) upon administrator verification of settled
                deposits in your dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 10. Executive Leadership & Compliance Endorsement Policy */}
      <section className="bg-white border-b border-[#DCE4EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Our Experts · Est. 2017
              </p>
              <h2 className="text-3xl font-heading font-bold tracking-tight text-[#102030]">
                Executive Leadership &amp; Governance
              </h2>
              <p className="text-sm text-[#5A6B7C]">
                Founded in 2017 by experienced financial analysts, fund managers, and research
                scientists committed to transparent multi-market portfolio stewardship.
              </p>
            </div>
            <Link
              to="/about"
              className="text-xs font-heading font-bold text-[#1B4962] hover:text-[#B92841] hover:underline whitespace-nowrap"
            >
              Meet Full Leadership &amp; IPC
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {LEADERSHIP_TEAM.map((leader) => (
              <div
                key={leader.name}
                className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 space-y-1.5"
              >
                <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                  {leader.role}
                </p>
                <h3 className="text-lg font-heading font-bold text-[#102030]">{leader.name}</h3>
              </div>
            ))}
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
                Bitfury Tech Investment displays only written client reviews approved through
                settlement verification—never unverified quotes or synthetic ratings. Verified
                participants may submit account feedback for compliance review at any time.
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
                  <span>support@bitfurytechinvestment.com</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#E94D65] shrink-0" />
                  <span>admin@bitfurytechinvestment.com · bitfurytech21@gmail.com</span>
                </p>
                <p className="text-xs text-[#5A6B7C] pt-1">
                  Offices: 12 Wren Walk, Tilbury, England, RM18 8EU · 2511 NW 41 St, Gainesville, FL 32606
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
