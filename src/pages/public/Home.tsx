import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeftRight,
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  HandCoins,
  Handshake,
  Mail,
  ShieldCheck,
} from "lucide-react";
import PublicLayout from "../../components/PublicLayout";
import CompanyLogoSlideshow from "../../components/CompanyLogoSlideshow";
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
import InvestorTestimonials from "../../components/InvestorTestimonials";
import BoardLeadershipSection from "../../components/BoardLeadershipSection";
import PaymentMethods from "../../components/PaymentMethods";
import AnimatedStatValue from "../../components/AnimatedStatValue";
import { PropertyOffering } from "../../services/dashboardApi";
import { formatUsd, MandateCategory } from "../../trading/tradingPage";
import { ASSET_CLASS_GUIDES } from "./assetClassData";

const HERO_SLIDES = [
  {
    id: "institutional-custody",
    kicker: "Bitfury Tech Investment · Est. 2017",
    headline: "Algorithmic trading precision and multi-asset wealth management you can verify.",
    description:
      "Founded in 2017 by financial analysts, fund managers, and research scientists, Bitfury Tech Investment applies mathematical and statistical discipline with direct access to over 50 financial markets through one unified account.",
    image: "/assets/aistudio/c9d1cd5d-361a-72ac-7842-0d0d62fc526e_b56f286f.jpeg",
    imageAlt: "Bitfury Tech Investment data center facility and power infrastructure",
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
      "Compare 15 transparent mandate tiers governed by our Investment Policy Committee (IPC), inspect monthly benchmarks and referral tiers, and manage custody inside a segregated ledger.",
    image: "/images/global-equities.jpg",
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
    image: "/images/digital-assets.jpg",
    to: "/sectors/crypto",
  },
  {
    index: "02",
    category: "stock" as MandateCategory,
    title: "Stocks",
    description:
      "Access structured equity mandates centered on publicly traded company shares across global markets. Share ownership exposes capital to corporate earnings performance, sector demand, interest-rate expectations, and broader economic developments that can cause stock values to rise or decline.",
    riskNote: "Equity market, earnings & macroeconomic risk",
    image: "/images/global-equities.jpg",
    to: "/sectors/stocks",
  },
  {
    index: "03",
    category: "estate" as MandateCategory,
    title: "Real Estate",
    description:
      "Review commercial property offerings and asset-backed real estate mandates. Property participation considers potential rental income, tenant occupancy stability, and long-term property value changes—always review full valuation, location, and offering terms before committing capital.",
    riskNote: "Tenancy, valuation & property liquidity risk",
    image: "/images/commercial-property.jpg",
    to: "/sectors/real-estate",
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

const PUBLISHED_MILESTONES = [
  { label: "Total Members", value: "1,865+", icon: Handshake },
  { label: "Total Returns Distributed", value: "$604,585", icon: HandCoins },
  { label: "Total Transactions", value: "4,180+", icon: ArrowLeftRight },
  { label: "Total Deposited", value: "$695,535", icon: Coins },
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
  const { user } = useAuth();
  const { plans, loading: plansLoading, error: plansError } = useInvestmentPlans();

  const [slideIdx, setSlideIdx] = useState(0);

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
    let active = true;
    fetch("/api/properties", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { properties: [] }))
      .then((data: { properties?: PropertyOffering[] }) => {
        if (!active) return;
        setProperties(Array.isArray(data.properties) ? data.properties : []);
        setPropertiesLoading(false);
      })
      .catch(() => {
        if (active) setLoadingSafe();
      });
    function setLoadingSafe() {
      setPropertiesLoading(false);
    }
    return () => {
      active = false;
    };
  }, []);

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
        detail: "Live commercial real estate catalog",
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
      <section aria-label="Featured investment overview" className="relative isolate overflow-hidden bg-[#102f43] text-white">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_12%_12%,rgba(233,77,101,0.2),transparent_36%),linear-gradient(115deg,#102f43_0%,#1B4962_58%,#112e3e_100%)]" />
        <div className="relative mx-auto grid max-w-7xl items-stretch gap-10 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center space-y-6 lg:col-span-7">
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-heading font-bold uppercase tracking-[0.16em] text-[#ffd0d7]">
              {activeSlide.kicker}
            </p>
            <h1
              className="max-w-3xl font-heading font-bold tracking-[-0.035em] text-white text-balance leading-[1.04]"
              style={{ fontSize: "clamp(2.5rem, 5vw, 4.35rem)" }}
            >
              {activeSlide.headline}
            </h1>
            <p className="text-base sm:text-lg text-slate-200 max-w-2xl leading-relaxed">
              {activeSlide.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              {user ? (
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
                to={user ? "/investments-catalog" : activeSlide.secondaryTo}
                className={buttonClasses({ variant: "outlineDark", size: "lg" })}
              >
                {user ? "Explore Opportunities" : activeSlide.secondaryLabel}
              </Link>
            </div>

            {/* Banner Slide Controls */}
            <div className="flex items-center gap-4 pt-3" aria-label="Hero carousel controls">
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

          <div className="relative min-h-[300px] overflow-hidden rounded-2xl border border-white/15 bg-[#14374B] shadow-[0_28px_80px_rgba(4,18,29,0.35)] lg:col-span-5 lg:min-h-[460px]">
            <ResilientImage
              src={activeSlide.image}
              alt={activeSlide.imageAlt}
              fallbackLabel="BitfuryTech Custody Architecture"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#112E3E]/90 via-[#112E3E]/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#102f43]/95 via-[#102f43]/65 to-transparent px-6 pb-6 pt-20 text-xs text-slate-200 sm:px-8 sm:pb-8">
              <p className="font-heading font-bold text-white text-sm">{activeSlide.kicker}</p>
              <p className="text-slate-200 mt-1">
                Cryptocurrency · Stocks · Commercial Real Estate
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Additional TradingView Ticker Tape */}
      <section
        aria-label="Live TradingView market ticker"
        className="bg-[#112E3E] text-white border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1">
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

          <section className="grid items-center gap-8 rounded-2xl border border-[#DCE4EC] bg-white p-5 shadow-[0_2px_8px_rgba(27,73,98,0.06)] sm:p-7 lg:grid-cols-12">
            <div className="space-y-3 lg:col-span-4">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Company Introduction
              </p>
              <h3 className="text-2xl font-heading font-bold tracking-tight text-[#102030]">
                A closer look at Bitfury Tech Investment
              </h3>
              <p className="text-sm leading-relaxed text-[#5A6B7C]">
                Watch the company introduction from Bitfury Tech Investment&apos;s original website.
                Investment involves risk, and outcomes are never guaranteed.
              </p>
            </div>
            <div className="lg:col-span-8">
              <video
                controls
                playsInline
                preload="none"
                poster="/images/hero-private-capital.jpg"
                aria-label="Bitfury Tech Investment company introduction video"
                className="aspect-video w-full rounded-xl bg-slate-950 object-cover"
              >
                <source src="/videos/bitfurytechinvestment.mp4" type="video/mp4" />
                Your browser does not support HTML video.
              </video>
            </div>
          </section>
        </div>
      </section>

      {/* 5. Featured Opportunities Grouped by Asset Class */}
      <section className="bg-white border-b border-[#DCE4EC]" aria-labelledby="featured-sectors-heading">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
          <div className="max-w-3xl space-y-2">
            <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
              Featured investment areas
            </p>
            <h2 id="featured-sectors-heading" className="text-3xl font-heading font-bold tracking-tight text-[#102030]">
              Three sectors, three different value drivers
            </h2>
            <p className="text-sm leading-relaxed text-[#5A6B7C]">
              Explore what the company describes in each market, how returns may be generated, and the risks to examine. Mandates are grouped by asset class below; no return is promised.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {ASSET_CLASS_GUIDES.map((guide, index) => {
              const groupPlans = plans.filter((plan) => plan.category === guide.id);
              return (
                <article key={guide.id} className="flex flex-col overflow-hidden rounded-xl border border-[#DCE4EC] bg-white shadow-[0_2px_8px_rgba(27,73,98,0.06)]">
                  <ResilientImage
                    src={guide.image}
                    alt=""
                    fallbackLabel={guide.title}
                    className="h-40 w-full border-b border-[#DCE4EC] object-cover"
                  />
                  <div className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
                    <div>
                      <p className="text-xs font-mono font-semibold text-[#B92841]">0{index + 1} · {guide.label}</p>
                      <h3 className="mt-2 text-lg font-heading font-bold text-[#102030]">{guide.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-[#5A6B7C]">{guide.approach}</p>
                    </div>
                    <div className="rounded-lg bg-[#F6F8FA] p-4">
                      <h4 className="text-xs font-heading font-bold text-[#102030]">Potential value drivers</h4>
                      <ul className="mt-2 space-y-2">
                        {guide.valueDrivers.slice(0, 2).map((driver) => (
                          <li key={driver} className="text-xs leading-relaxed text-[#5A6B7C]">{driver}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-heading font-bold uppercase tracking-wide text-[#1B4962]">Mandates in this group</h4>
                      {plansLoading ? (
                        <p className="mt-2 text-xs text-[#5A6B7C]">Loading current mandate groups…</p>
                      ) : plansError ? (
                        <p className="mt-2 text-xs text-[#5A6B7C]">Current mandate list is temporarily unavailable.</p>
                      ) : groupPlans.length ? (
                        <ul className="mt-2 space-y-1.5">
                          {groupPlans.slice(0, 3).map((plan) => (
                            <li key={plan.id} className="text-xs text-[#46596B]">{plan.name}</li>
                          ))}
                          {groupPlans.length > 3 && <li className="text-xs text-[#667789]">And {groupPlans.length - 3} more</li>}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs text-[#5A6B7C]">No active mandates are currently listed.</p>
                      )}
                    </div>
                    <div className="mt-auto flex flex-col gap-2 border-t border-[#DCE4EC] pt-4">
                      <Link to={`/sectors/${guide.slug}`} className={buttonClasses({ variant: "primary", size: "sm" })}>
                        Read sector guide <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                      </Link>
                      <Link to={`/investments-catalog?category=${guide.id}`} className="inline-flex min-h-11 items-center justify-center text-xs font-heading font-bold text-[#1B4962] hover:text-[#B92841]">
                        View grouped mandates
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Featured Property Listings */}
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
                Commercial real estate offerings synced live from the BitfuryTech catalog.
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
                  administrator publishes them to the catalog. You can inspect our Real Estate mandate
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
                        src={p.image || "/images/commercial-property.jpg"}
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
              Live catalog counters computed directly from active mandate definitions and property
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

        </div>
      </section>

      <section aria-labelledby="our-numbers-heading" className="bg-[#F6F8FA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <span aria-hidden="true" className="h-1.5 w-24 rounded-full bg-[#E94D65]" />
            <h2 id="our-numbers-heading" className="mt-6 font-heading text-4xl font-bold tracking-tight text-[#102030] sm:text-5xl">
              Our <span className="text-[#E94D65]">Numbers</span>
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-[#5B5B61] sm:text-base">
              Historical figures as reported by the company; not independently audited.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-7 lg:mt-14 lg:gap-10">
            {PUBLISHED_MILESTONES.map((item, index) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.label}
                  className={`bf-reveal flex min-h-[210px] flex-col items-center justify-center rounded-2xl border border-[#DCE4EC] bg-white px-5 py-7 text-center shadow-[0_18px_48px_rgba(27,73,98,0.08)] transition duration-300 hover:-translate-y-1 hover:border-[#E94D65]/50 hover:shadow-[0_22px_55px_rgba(27,73,98,0.14)] sm:min-h-[250px] sm:py-9 ${index % 2 === 1 ? "lg:translate-y-8" : ""}` } style={{ animationDelay: `${index * 120}ms` }}
                >
                  <Icon aria-hidden="true" className="mb-5 h-14 w-14 text-[#1B4962] sm:h-16 sm:w-16" strokeWidth={1.5} />
                  <p className="text-lg font-medium text-[#3F3F46] sm:text-xl">{item.label}</p>
                  <p className="mt-2 text-3xl font-extrabold tabular-nums text-[#1B4962] sm:text-4xl">
                    <AnimatedStatValue value={item.value} />
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <PaymentMethods />

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

      {/* 10. Executive Board & Investor Testimonials */}
      <BoardLeadershipSection />
      <section className="bg-white border-b border-[#DCE4EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <InvestorTestimonials />
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
                  Office: 171 Crescent Road, Oxford, England, OX4 2NX
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

      <CompanyLogoSlideshow />
    </PublicLayout>
  );
}
