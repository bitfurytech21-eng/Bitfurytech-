import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  ShieldCheck,
} from "lucide-react";
import PublicLayout from "../../components/PublicLayout";
import CompanyLogoSlideshow from "../../components/CompanyLogoSlideshow";
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
import InvestorTestimonials from "../../components/InvestorTestimonials";
import PaymentMethods from "../../components/PaymentMethods";
import { PropertyOffering } from "../../services/dashboardApi";
import { MandateCategory } from "../../trading/tradingPage";
import { ASSET_CLASS_GUIDES } from "./assetClassData";

const HERO_SLIDES = [
  {
    id: "institutional-custody",
    kicker: "Bitfury Tech Investment",
    headline: "Explore investment options with clear terms and reporting.",
    description:
      "Review opportunities across digital assets, equities, and commercial property. Compare published terms and risks, then manage your account online.",
    image: "/images/hero-private-capital.jpg",
    imageAlt: "BitfuryTech financial district architectural skyline",
    primaryLabel: "Explore Opportunities",
    primaryTo: "/investments-catalog",
    secondaryLabel: "Create an Account",
    secondaryTo: "/register",
  },
  {
    id: "market-research",
    kicker: "Investment information",
    headline: "Compare plans across digital assets, equities, and property.",
    description:
      "Compare opportunities by asset type, then review each plan’s terms, fees, and information before proceeding.",
    image: "/images/global-equities.jpg",
    imageAlt: "Institutional multi-asset portfolio management boardroom",
    primaryLabel: "Explore Opportunities",
    primaryTo: "/investments-catalog",
    secondaryLabel: "How It Works",
    secondaryTo: "/how-it-works",
  },
  {
    id: "commercial-holdings",
    kicker: "Commercial property",
    headline: "Review property details before making a decision.",
    description:
      "Explore current property listings and review their location, occupancy information, valuations, and supporting documents.",
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
      "Learn about digital assets such as Bitcoin and Ethereum. Prices can change quickly, and transactions may be affected by network fees, congestion, and regulatory changes.",
    riskNote: "Prices can be highly volatile; you could lose your capital.",
    image: "/images/digital-assets.jpg",
    to: "/sectors/crypto",
  },
  {
    index: "02",
    category: "stock" as MandateCategory,
    title: "Stocks",
    description:
      "Stocks are shares in publicly listed companies. Their prices can be affected by company performance, market conditions, interest rates, and economic events.",
    riskNote: "Share prices can fall as well as rise.",
    image: "/images/global-equities.jpg",
    to: "/sectors/stocks",
  },
  {
    index: "03",
    category: "estate" as MandateCategory,
    title: "Real Estate",
    description:
      "Review commercial property listings, including location, occupancy, and published entry terms. Rental income and property values are uncertain; read the available documents before deciding.",
    riskNote: "Property may be difficult to sell and can lose value.",
    image: "/images/commercial-property.jpg",
    to: "/sectors/real-estate",
  },
];

const RESEARCH_PILLARS = [
  {
    title: "Studying Market Movements",
    description:
      "Review price changes and market activity to understand how markets move over time.",
  },
  {
    title: "Understanding Asset Performance",
    description:
      "Compare the features, costs, and risks listed for each asset type.",
  },
  {
    title: "Monitoring Economic Developments",
    description:
      "Economic changes can affect borrowing costs, company results, and property values.",
  },
  {
    title: "Assessing Potential Risks",
    description:
      "Consider potential losses, how long funds may be committed, and how easily an asset can be sold.",
  },
];

const PORTFOLIO_PRINCIPLES = [
  {
    title: "Investment Policy & Research",
    description:
      "The Investment Policy Committee oversees investment policy with support from research and market analysis.",
  },
  {
    title: "Options Across Asset Types",
    description:
      "Compare opportunities in digital assets, equities, and commercial property using the terms published for each plan.",
  },
  {
    title: "Account Records & Support",
    description:
      "Use the client portal to review account activity and contact support about payments, withdrawals, or property inquiries.",
  },
];

const WHY_CHOOSE_ITEMS = [
  {
    title: "Market information",
    description:
      "Read company-published information about digital assets, equities, and commercial property.",
  },
  {
    title: "Investment options",
    description:
      "Browse available plans by asset type and compare the information provided for each option.",
  },
  {
    title: "Account records",
    description:
      "Review balances, payment requests, withdrawals, and transaction history in the client portal.",
  },
  {
    title: "Account access",
    description:
      "Use email verification and account controls to manage access to your profile.",
  },
  {
    title: "Customer support",
    description:
      "Contact the support team with questions about account access, requests, or available services.",
  },
  {
    title: "Transaction history",
    description:
      "Review transaction references and available account records from your dashboard.",
  },
  {
    title: "Request status",
    description:
      "Check the current status of submitted payment and withdrawal requests.",
  },
  {
    title: "Plan information",
    description:
      "Plan pages provide current terms, payment methods, fees, and related information.",
  },
];

const PROCESS_STEPS = [
  {
    title: "Create an account",
    description:
      "Register with your email address, choose a password, and confirm your email to access the client portal.",
  },
  {
    title: "Explore available options",
    description:
      "Browse investment plans and property listings, then review the information provided for each option.",
  },
  {
    title: "Submit a payment request",
    description:
      "Choose an available payment method, follow the instructions, and track the request in your account.",
  },
  {
    title: "Review account activity",
    description:
      "Check transaction records and request status, or contact support if you need help.",
  },
];

const HOME_FAQS = [
  {
    q: "What does Bitfury Tech Investment do?",
    a: "Bitfury Tech Investment provides information and account services across digital assets, equities, and commercial property.",
  },
  {
    q: "How do I create an account?",
    a: "Choose Create an Account, enter the requested details, and confirm your email address using the link sent to your inbox.",
  },
  {
    q: "Are investment returns guaranteed?",
    a: "No. Investment outcomes are not guaranteed. Review the terms and risks for each option before proceeding.",
  },
  {
    q: "How do payment requests work?",
    a: "Available methods, fees, and instructions are shown in your account. Submit the requested details, then check your account for status updates.",
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
                About Bitfury Tech Investment
              </p>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-[#102030] text-balance">
                Information about investment options, terms, and account services.
              </h2>
              <p className="text-sm sm:text-base text-[#5A6B7C] leading-relaxed">
                Bitfury Tech Investment provides an online platform for reviewing options across
                digital assets, listed equities, and commercial property. The site brings together
                plan information, property listings, payment details, and account tools.
              </p>
              <p className="text-sm text-[#5A6B7C] leading-relaxed">
                Review the details and risks for each plan. Consider your own circumstances before
                making a decision, and seek independent advice if you need it.
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
                Learn about the company&apos;s investment areas, research approach, and client services.
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
              Investment information across digital assets, equities, and property
            </h2>
            <p className="text-sm leading-relaxed text-[#5A6B7C]">
              Explore the company&apos;s information for each market, then browse the plans and property
              listings available in that category.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {ASSET_CLASS_GUIDES.map((guide) => {
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
                      <p className="text-xs font-mono font-semibold text-[#B92841]">{guide.label}</p>
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
                      <h4 className="text-xs font-heading font-bold uppercase tracking-wide text-[#1B4962]">Plans in this category</h4>
                      {plansLoading ? (
                        <p className="mt-2 text-xs text-[#5A6B7C]">Loading current mandate groups…</p>
                      ) : plansError ? (
                        <p className="mt-2 text-xs text-[#5A6B7C]">Current mandate list is temporarily unavailable.</p>
                      ) : groupPlans.length ? (
                        <ul className="mt-2 space-y-1.5">
                          {groupPlans.slice(0, 3).map((plan) => (
                            <li key={plan.id} className="text-xs text-[#46596B]">{plan.name}</li>
                          ))}
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
                        Browse all plans
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
                  Property listings are not available right now
                </h3>
                <p className="text-sm text-[#5A6B7C] leading-relaxed">
                  Browse the real-estate plans in the catalog while new property listings are being prepared.
                </p>
              </div>
              <Link
                to="/investments-catalog?category=estate"
                className={buttonClasses({ variant: "primary", size: "md" })}
              >
                Browse real-estate plans
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
                      <p className="border-t border-[#DCE4EC] pt-3 text-xs leading-relaxed text-[#5A6B7C]">
                        Open the listing for current details, terms, and supporting documents.
                      </p>
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


      <PaymentMethods />

      {/* 8. Why Choose BitfuryTech? (8 Clear Pillars) */}
      <section className="bg-white border-b border-[#DCE4EC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
          <div className="max-w-2xl space-y-2">
            <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
              Why Choose BitfuryTech
            </p>
            <h2 className="text-3xl font-heading font-bold tracking-tight text-[#102030]">
              Principles for clear portfolio administration
            </h2>
            <p className="text-sm text-[#5A6B7C]">
              The platform brings plan information, account records, and support tools together in one place.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {WHY_CHOOSE_ITEMS.map((item) => (
              <div
                key={item.title}
                className="bg-white border border-[#DCE4EC] rounded-[5px] p-6 space-y-2.5 shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
              >
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
              View the full process guide
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROCESS_STEPS.map((s) => (
              <div
                key={s.title}
                className="bg-white border border-[#DCE4EC] rounded-[5px] p-6 space-y-3 shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
              >
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
                Referral programme
              </h3>
              <p className="text-xs sm:text-sm text-[#5A6B7C] leading-relaxed">
                If referral offers are available, review the eligibility details in your account before sharing a referral link.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Investor testimonials retained; executive team section removed. */}
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
