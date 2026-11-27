import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import PublicLayout from "../../components/PublicLayout";
import CompanyLogoSlideshow from "../../components/CompanyLogoSlideshow";
import ResilientImage from "../../components/ResilientImage";
import { buttonClasses } from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import { useInvestmentPlans } from "../../hooks/useInvestmentPlans";
import { AnimatePresence, motion } from "motion/react";
import InvestorTestimonials from "../../components/InvestorTestimonials";
import BoardLeadershipSection from "../../components/BoardLeadershipSection";
import HighlightMetricsSection from "../../components/HighlightMetricsSection";
import HomeLiveTradeSection from "../../components/HomeLiveTradeSection";
import PaymentMethods from "../../components/PaymentMethods";
import CompanyOverviewVideo from "../../components/CompanyOverviewVideo";
import { PropertyOffering } from "../../services/dashboardApi";
import { ASSET_CLASS_GUIDES } from "./assetClassData";

const HERO_SLIDES = [
  {
    id: "institutional-custody",
    kicker: "Bitfury Tech Investment",
    headline: "Explore investment options with clear terms and reporting.",
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
  const [heroPaused, setHeroPaused] = useState(false);
  const heroTouchStartX = useRef<number | null>(null);

  const [properties, setProperties] = useState<PropertyOffering[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Rotate hero slides cleanly without arrow or bar controls
  useEffect(() => {
    if (heroPaused) return;
    const timer = window.setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => window.clearInterval(timer);
  }, [heroPaused]);

  const handleHeroTouchStart = (e: React.TouchEvent) => {
    heroTouchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleHeroTouchEnd = (e: React.TouchEvent) => {
    if (heroTouchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? heroTouchStartX.current;
    const delta = endX - heroTouchStartX.current;
    heroTouchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    setSlideIdx((prev) =>
      delta < 0
        ? (prev + 1) % HERO_SLIDES.length
        : (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length
    );
  };

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

  const activeSlide = HERO_SLIDES[slideIdx];

  return (
    <PublicLayout>
      {/* 1. Homepage Introduction & Rotating Hero Banner */}
      <section
        aria-label="Featured investment overview"
        className="public-hero relative isolate overflow-hidden text-white min-h-[620px] sm:min-h-[720px]"
        style={{ backgroundImage: `linear-gradient(90deg, rgba(16,47,67,0.94) 0%, rgba(27,73,98,0.84) 56%, rgba(17,46,62,0.72) 100%), url("${activeSlide.image}")` }}
        onMouseEnter={() => setHeroPaused(true)}
        onMouseLeave={() => setHeroPaused(false)}
        onTouchStart={handleHeroTouchStart}
        onTouchEnd={handleHeroTouchEnd}
      >
        <div className="relative mx-auto grid max-w-7xl items-stretch gap-10 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center space-y-6 min-w-0 lg:col-span-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-6"
              >
                <p className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-heading font-bold uppercase tracking-[0.16em] text-[#ffd0d7]">
                  {activeSlide.kicker}
                </p>
                <h1
                  className="max-w-3xl font-heading font-bold tracking-[-0.035em] text-white text-balance leading-[1.04]"
                  style={{ fontSize: "clamp(1.875rem, 5vw, 4.35rem)" }}
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
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="relative min-h-[280px] min-w-0 overflow-hidden rounded-2xl border border-white/15 bg-[#14374B] shadow-[0_28px_80px_rgba(4,18,29,0.35)] lg:col-span-5 lg:min-h-[460px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide.id}
                initial={{ opacity: 0.2, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0.2 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="h-full w-full"
              >
                <ResilientImage
                  src={activeSlide.image}
                  alt={activeSlide.imageAlt}
                  fallbackLabel="BitfuryTech Custody Architecture"
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </AnimatePresence>
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

      {/* 1b. Live Market Ticker & Integrated Trade View Chart */}
      <HomeLiveTradeSection />

      {/* 2. Platform Scale & Animated Metric Rings */}
      <HighlightMetricsSection />

      {/* 3. Company Introduction & Overview Video */}
      <section className="relative isolate overflow-hidden bg-white border-b border-[#DCE4EC]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden select-none"
        >
          <img
            src="/assets/aistudio/IMG_8223_ec3d07bb.jpeg"
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-top opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/45 via-white/85 to-white" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid items-center gap-8 rounded-2xl border border-[#DCE4EC] bg-white p-5 shadow-[0_2px_8px_rgba(27,73,98,0.06)] sm:p-8 lg:grid-cols-12">
            <div className="space-y-4 min-w-0 lg:col-span-5">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Company Introduction
              </p>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-[#102030]">
                A closer look at Bitfury Tech Investment
              </h2>
              <p className="text-sm leading-relaxed text-[#5A6B7C]">
                Watch our company introduction video to learn about Bitfury Tech Investment&apos;s
                investment areas, research discipline, and client portal services across digital
                assets, global equities, and commercial property.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/research"
                  className={buttonClasses({ variant: "primary", size: "md" })}
                >
                  <span>Research &amp; Principles</span>
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/about"
                  className={buttonClasses({ variant: "outline", size: "md" })}
                >
                  About Our Company
                </Link>
              </div>
            </div>
            <div className="min-w-0 lg:col-span-7">
              <CompanyOverviewVideo />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Featured Opportunities Grouped by Asset Class */}
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

      {/* 8. How the Investment Process Works */}
      <section className="bg-white border-b border-[#DCE4EC]">
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
            <div className="flex flex-wrap items-center gap-5">
              <Link
                to="/research"
                className="text-xs font-heading font-bold text-[#1B4962] hover:text-[#B92841] hover:underline whitespace-nowrap"
              >
                Explore research &amp; security
              </Link>
              <Link
                to="/how-it-works"
                className="text-xs font-heading font-bold text-[#1B4962] hover:text-[#B92841] hover:underline whitespace-nowrap"
              >
                View the full process guide
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROCESS_STEPS.map((s) => (
              <div
                key={s.title}
                className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 space-y-3"
              >
                <h3 className="text-base font-heading font-bold text-[#102030]">{s.title}</h3>
                <p className="text-sm text-[#5A6B7C] leading-relaxed">{s.description}</p>
              </div>
            ))}
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

      <CompanyLogoSlideshow />
    </PublicLayout>
  );
}
