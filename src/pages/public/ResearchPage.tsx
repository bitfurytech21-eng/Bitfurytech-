import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck } from "lucide-react";
import PublicLayout from "../../components/PublicLayout";
import { EditorialIcon } from "../../components/EditorialArtwork";
import { buttonClasses } from "../../components/ui";

const PORTFOLIO_PRINCIPLES = [
  {
    art: "oversight" as const,
    title: "Investment Policy & Research",
    description:
      "The Investment Policy Committee oversees investment policy with support from research and market analysis.",
  },
  {
    art: "analysis" as const,
    title: "Options Across Asset Types",
    description:
      "Compare opportunities in digital assets, equities, and commercial property using the terms published for each plan.",
  },
  {
    art: "advisory" as const,
    title: "Account Records & Support",
    description:
      "Use the client portal to review account activity and contact support about payments, withdrawals, or property inquiries.",
  },
];

const CORPORATE_PILLARS = [
  {
    art: "team" as const,
    title: "Dedicated Research Team",
    description:
      "Financial analysts, fund managers, and research scientists overseeing market intelligence and ongoing client reporting.",
  },
  {
    art: "strategy" as const,
    title: "Disciplined Strategy",
    description:
      "Mathematical and statistical evaluation applied across cryptocurrency, global equities, and commercial real estate.",
  },
  {
    art: "mission" as const,
    title: "Clear Investor Mission",
    description:
      "Structured mandate terms, clear fee disclosures, and transparent milestone visibility through every market cycle.",
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

export default function ResearchPage() {
  return (
    <PublicLayout>
      <section className="public-hero text-white border-b border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-3">
          <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
            Research &amp; Platform Governance
          </p>
          <h1
            className="font-heading font-bold tracking-tight text-white text-balance"
            style={{ fontSize: "clamp(2rem, 3.8vw, 3.25rem)" }}
          >
            Market research, portfolio principles, and client controls
          </h1>
          <p className="text-base text-slate-200 max-w-3xl leading-relaxed">
            Explore how Bitfury Tech Investment combines quantitative analysis, structured risk
            evaluation, and transparent client portal administration across digital assets,
            equities, and commercial property.
          </p>
        </div>
      </section>

      <div className="bg-white">
        {/* Structured Portfolio Principles & Corporate Pillars */}
        <section className="relative isolate overflow-hidden bg-white border-b border-[#DCE4EC]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[440px] overflow-hidden select-none"
          >
            <img
              src="/assets/aistudio/IMG_8223_ec3d07bb.jpeg"
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-top opacity-65"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-white/85 to-white" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
            <div className="grid lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-5 min-w-0 space-y-4">
                <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                  Portfolio Philosophy
                </p>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-[#102030]">
                  Structured governance across every asset class
                </h2>
                <p className="text-sm text-[#5A6B7C] leading-relaxed">
                  Review the terms and risks published for each plan. Consider your financial goals
                  and circumstances carefully, and seek independent guidance whenever appropriate.
                </p>
                <div className="pt-2 flex flex-wrap gap-3">
                  <Link
                    to="/investments-catalog"
                    className={buttonClasses({ variant: "primary", size: "md" })}
                  >
                    <span>Browse Investment Plans</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/about"
                    className={buttonClasses({ variant: "outline", size: "md" })}
                  >
                    About BitfuryTech
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-7 min-w-0 bg-white border border-[#DCE4EC] rounded-[5px] p-5 sm:p-7 space-y-4 shadow-[0_2px_8px_rgba(27,73,98,0.06)]">
                <div className="flex items-center gap-2.5 text-[#1B4962]">
                  <ShieldCheck className="w-5 h-5 text-[#E94D65] shrink-0" />
                  <h3 className="text-base font-heading font-bold text-[#102030]">
                    Structured Portfolio Principles
                  </h3>
                </div>
                <div className="space-y-4 border-t border-[#DCE4EC] pt-4">
                  {PORTFOLIO_PRINCIPLES.map((item) => (
                    <div key={item.title} className="flex items-start gap-3.5">
                      <div className="shrink-0 rounded-lg bg-[#F6F8FA] p-1.5 border border-[#DCE4EC]">
                        <EditorialIcon name={item.art} className="size-10" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-heading font-bold text-[#102030]">{item.title}</p>
                        <p className="text-xs text-[#5A6B7C] leading-relaxed">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {CORPORATE_PILLARS.map((pillar) => (
                <article
                  key={pillar.title}
                  className="bg-white border border-[#DCE4EC] rounded-[5px] p-6 sm:p-7 flex flex-col items-start gap-4 shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
                >
                  <EditorialIcon name={pillar.art} className="size-16" />
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-heading font-bold text-[#102030]">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-[#5A6B7C] leading-relaxed">{pillar.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Market Analysis & Research */}
        <section className="bg-[#F6F8FA] border-b border-[#DCE4EC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
            <div className="max-w-3xl space-y-2">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Market Analysis &amp; Research
              </p>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#102030]">
                Why Market Research Guides Portfolio Decisions
              </h2>
              <p className="text-sm text-[#5A6B7C] leading-relaxed">
                Whether you are new to investing or managing an established portfolio, consistent
                research helps replace impulse with clarity across changing economic conditions.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {RESEARCH_PILLARS.map((pillar) => (
                <div
                  key={pillar.title}
                  className="bg-white border border-[#DCE4EC] rounded-[5px] p-5 space-y-2 shadow-[0_2px_8px_rgba(27,73,98,0.04)]"
                >
                  <h3 className="text-sm font-heading font-bold text-[#102030]">{pillar.title}</h3>
                  <p className="text-xs text-[#5A6B7C] leading-relaxed">{pillar.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Platform Administration Principles */}
        <section className="bg-white border-b border-[#DCE4EC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Why Choose BitfuryTech
              </p>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-[#102030]">
                Principles for clear portfolio administration
              </h2>
              <p className="text-sm text-[#5A6B7C]">
                The platform brings plan information, account records, and support tools together in one place.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {WHY_CHOOSE_ITEMS.map((item) => (
                <div
                  key={item.title}
                  className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 space-y-2.5"
                >
                  <h3 className="text-base font-heading font-bold text-[#102030]">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-[#5A6B7C] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Security, Funding & Partner Overview */}
        <section className="bg-[#F6F8FA]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
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
                  If referral offers are available, review the eligibility details in your account
                  before sharing a referral link.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
