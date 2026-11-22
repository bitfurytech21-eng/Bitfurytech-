import { Link } from "react-router-dom";
import { FileText, Mail, MapPin, ShieldCheck, Users } from "lucide-react";
import PublicLayout from "../../components/PublicLayout";
import ResilientImage from "../../components/ResilientImage";
import { buttonClasses } from "../../components/ui";

const SECTORS = [
  {
    index: "01",
    title: "Cryptocurrency & Digital Assets",
    description:
      "Algorithmic and mathematical trading strategies across six structured Cryptocurrency mandates utilizing BTC, ETH, and USDT (TRC20) settlement channels, paired with risk awareness around blockchain volatility and liquidity.",
  },
  {
    index: "02",
    title: "Stocks & Global Equities",
    description:
      "Four quantitative equity mandates providing access across over 50 global financial markets through one unified account, evaluated against corporate earnings and macroeconomic developments.",
  },
  {
    index: "03",
    title: "Commercial Real Estate",
    description:
      "Three real estate mandate tiers alongside live administrator-published commercial property offerings with transparent valuation figures, tenancy context, and rental yield disclosures.",
  },
];

const SOLUTIONS = [
  {
    index: "01",
    title: "Market Analysis",
    description:
      "We study the attractiveness and underlying dynamics across digital assets, equities, and real estate sectors within global financial markets.",
  },
  {
    index: "02",
    title: "Allocation & Advisory Desk",
    description:
      "Our specialists focus on more than simple trade execution—helping align structured mandates, liquidity horizons, and risk parameters with client objectives.",
  },
  {
    index: "03",
    title: "Professional Research Team",
    description:
      "Experienced financial analysts, network engineers, macroeconomists, research scientists, and quantitative analysts collaborate on systematic execution.",
  },
  {
    index: "04",
    title: "Structured Portfolio",
    description:
      "Multi-asset allocations built to balance performance potential and controlled risk brackets across changing market regimes.",
  },
];

const VALUES = [
  {
    title: "Transparency & Plain Reporting",
    body: "Entry bounds, 30-day cycle horizons, monthly benchmarks, referral tiers, and non-guaranteed return disclosures are presented upfront prior to every allocation.",
  },
  {
    title: "Account Isolation & Ledger Integrity",
    body: "Investor profiles, balances, and transaction histories are isolated per verified identity, initializing cleanly at $0.00 with zero synthetic data.",
  },
  {
    title: "Academic & Quantitative Discipline",
    body: "Guided by our Investment Policy Committee (IPC), our investment process relies on financial science, mathematics, and statistical discipline rather than speculative tips.",
  },
  {
    title: "Responsible Risk Awareness",
    body: "We communicate clearly that asset prices fluctuate, values can rise or fall, and no investment mandate offers guaranteed outcomes.",
  },
];

const LEADERSHIP_TEAM = [
  {
    name: "Robb Baldwin",
    role: "President and CEO",
    image: "/images/leadership/robb-baldwin.webp",
    focus: "Executive leadership, multi-market platform strategy, and institutional governance.",
  },
  {
    name: "Rob Dilbone",
    role: "Managing Director",
    image: "/images/leadership/rob-dilbone.webp",
    focus: "Portfolio structuring, market expansion, and global custody coordination.",
  },
  {
    name: "Cris Frankel",
    role: "VP of Business Development",
    image: "/images/leadership/cris-frankel.webp",
    focus: "Institutional client partnerships, multi-asset outreach, and partner onboarding.",
  },
  {
    name: "Scott Victoria",
    role: "Chief Operating Officer",
    image: "/images/leadership/scott-victoria.webp",
    focus: "Operational risk management, settlement verification, and 24/7 execution oversight.",
  },
];

const PLATFORM_MILESTONES = [
  { label: "Total Members", value: "1,865+" },
  { label: "Total Returns Distributed", value: "$604,585" },
  { label: "Total Transactions", value: "4,180+" },
  { label: "Total Deposited", value: "$695,535" },
];

export default function About() {
  return (
    <PublicLayout>
      {/* Header Hero Band */}
      <section className="bg-[#1B4962] text-white border-b border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center space-y-5">
            <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
              About Bitfury Tech Investment · Est. 2017
            </p>
            <h1
              className="font-heading font-bold tracking-tight text-white text-balance leading-[1.1]"
              style={{ fontSize: "clamp(2rem, 3.6vw, 3.25rem)" }}
            >
              An algorithmic and multi-asset investment firm built on mathematical research and disciplined custody.
            </h1>
            <p className="text-base text-slate-200 leading-relaxed">
              Founded in 2017 by skilled financial analysts, fund managers, and research scientists,
              Bitfury Tech Investment combines mathematical and statistical methods with direct access
              to over 50 financial markets across Cryptocurrency, Stocks, and Commercial Real Estate.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/investments-catalog"
                className={buttonClasses({ variant: "primary", size: "md" })}
              >
                Explore Opportunities
              </Link>
              <Link
                to="/register"
                className={buttonClasses({ variant: "outlineDark", size: "md" })}
              >
                Create an Account
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 min-h-[260px] rounded-[5px] overflow-hidden border border-white/20 bg-[#14374B]">
            <ResilientImage
              src="/images/hero-private-capital.png"
              alt="BitfuryTech institutional wealth workspace"
              fallbackLabel="BitfuryTech Corporate Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
          {/* 2. Who We Are & What We Do */}
          <section className="grid md:grid-cols-12 gap-8 items-start border-b border-[#DCE4EC] pb-14">
            <div className="md:col-span-4">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Reinventing Investor Access
              </p>
              <h2 className="text-2xl font-heading font-bold text-[#102030] mt-2">
                Who We Are &amp; What We Do
              </h2>
            </div>
            <div className="md:col-span-8 space-y-4 text-sm sm:text-base text-[#5A6B7C] leading-relaxed">
              <p>
                Bitfury Tech Investment is an algorithmic trading and wealth management firm
                dedicated to expanding access to wealth-creation opportunities traditionally reserved
                for institutional desks. Our spectrum spans portfolio administration, liquidity
                provision, corporate finance guidance, and structured multi-asset mandates across 13
                tiered plans.
              </p>
              <p>
                Every account operates inside an isolated custody ledger initialized at $0.00.
                Deposits, mandate allocations, property inquiries, and withdrawals are tracked
                sequentially with traceable reference codes so clients maintain complete clarity
                over account activity.
              </p>
            </div>
          </section>

          <section
            aria-labelledby="company-document-heading"
            className="flex flex-col gap-5 rounded-xl border border-[#DCE4EC] bg-[#F6F8FA] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-[#1B4962] shadow-sm">
                <FileText aria-hidden="true" className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                  Company document
                </p>
                <h2 id="company-document-heading" className="text-lg font-heading font-bold text-[#102030]">
                  Company information document
                </h2>
                <p className="max-w-2xl text-xs leading-relaxed text-[#5A6B7C]">
                  This PDF was linked as the company number document on the previous website. Its
                  contents have not been independently verified.
                </p>
              </div>
            </div>
            <a
              href="/documents/bitfury-company-certificate.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-[#1B4962] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#14374B]"
            >
              View certificate (PDF)
            </a>
          </section>

          {/* Published Company Numbers */}
          <section className="bg-[#1B4962] text-white rounded-[5px] p-7 sm:p-8 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/15 pb-5">
              <div>
                <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
                  Published Platform Milestones
                </p>
                <h2 className="text-2xl font-heading font-bold text-white mt-1">
                  Company Track Record &amp; Scale
                </h2>
              </div>
              <p className="text-xs text-slate-300 max-w-md">
                Cumulative operational figures reported across Bitfury Tech Investment platform
                operations. Individual client accounts begin strictly at $0.00 until funded.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {PLATFORM_MILESTONES.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-[#14374B] border border-white/15 rounded-[5px] p-5 space-y-1.5"
                >
                  <p className="text-xs text-slate-200">{stat.label}</p>
                  <p className="text-2xl sm:text-3xl font-mono tabular-nums font-bold text-white">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Mission, Vision & Forward-Thinking Solutions */}
          <section className="grid md:grid-cols-2 gap-6 border-b border-[#DCE4EC] pb-14">
            <div className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-7 space-y-3">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Our Mission
              </p>
              <h2 className="text-xl font-heading font-bold text-[#102030]">
                Financial Security &amp; Mobility Through Disciplined Technology
              </h2>
              <p className="text-sm text-[#5A6B7C] leading-relaxed">
                Our mission is to create and promote research-led investment allocations that
                broaden access to financial security and mobility—combining quantitative discipline
                with plain, verifiable portfolio reporting.
              </p>
            </div>
            <div className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-7 space-y-3">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Our Approach &amp; IPC Oversight
              </p>
              <h2 className="text-xl font-heading font-bold text-[#102030]">
                Investment Policy Committee (IPC)
              </h2>
              <p className="text-sm text-[#5A6B7C] leading-relaxed">
                Our Investment Policy Committee—bringing over 10 years of combined investing
                experience alongside network engineers, macroeconomists, research scientists, and
                quantitative analysts—guides strategic allocation models rooted in financial
                science rather than speculative stock tips.
              </p>
            </div>
          </section>

          {/* Forward-Thinking Solutions */}
          <section className="space-y-6 border-b border-[#DCE4EC] pb-14">
            <div className="space-y-2">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Capabilities
              </p>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#102030]">
                Forward-Thinking Investment Solutions
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {SOLUTIONS.map((sol) => (
                <div
                  key={sol.index}
                  className="bg-white border border-[#DCE4EC] rounded-[5px] p-6 space-y-2.5 shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
                >
                  <p className="text-xs font-mono font-semibold text-[#B92841]">{sol.index}.</p>
                  <h3 className="text-base font-heading font-bold text-[#102030]">{sol.title}</h3>
                  <p className="text-xs sm:text-sm text-[#5A6B7C] leading-relaxed">
                    {sol.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Executive Leadership Team */}
          <section className="space-y-6 border-b border-[#DCE4EC] pb-14">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                  Executive Leadership
                </p>
                <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#102030]">
                  Our Experts &amp; Governance Team
                </h2>
              </div>
              <p className="text-xs text-[#5A6B7C] max-w-md">
                Bitfury Tech Investment is led by seasoned financial operators committed to
                structured risk brackets and client custody standards.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {LEADERSHIP_TEAM.map((exec) => (
                <div
                  key={exec.name}
                  className="overflow-hidden rounded-xl border border-[#DCE4EC] bg-white shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
                >
                  <img
                    src={exec.image}
                    alt={`${exec.name}, ${exec.role}`}
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover object-top"
                  />
                  <div className="space-y-2 p-5">
                    <div className="flex items-center gap-2 text-[#1B4962]">
                      <Users className="w-4 h-4 text-[#E94D65] shrink-0" />
                      <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                        {exec.role}
                      </p>
                    </div>
                    <h3 className="text-lg font-heading font-bold text-[#102030]">{exec.name}</h3>
                    <p className="text-xs sm:text-sm text-[#5A6B7C] leading-relaxed">{exec.focus}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 5. Investment Sectors */}
          <section className="space-y-6 border-b border-[#DCE4EC] pb-14">
            <div className="space-y-2">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Portfolio Scope
              </p>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#102030]">
                Core Asset Categories
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {SECTORS.map((sector) => (
                <div
                  key={sector.index}
                  className="bg-white border border-[#DCE4EC] rounded-[5px] p-6 space-y-3 shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
                >
                  <p className="text-xs font-mono font-semibold text-[#B92841]">{sector.index}.</p>
                  <h3 className="text-lg font-heading font-bold text-[#102030]">{sector.title}</h3>
                  <p className="text-sm text-[#5A6B7C] leading-relaxed">{sector.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 6. Corporate Values */}
          <section className="space-y-6 border-b border-[#DCE4EC] pb-14">
            <div className="space-y-2">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Standards
              </p>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#102030]">
                What We Stand For
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {VALUES.map((val) => (
                <div
                  key={val.title}
                  className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 space-y-2"
                >
                  <h3 className="text-base font-heading font-bold text-[#102030]">{val.title}</h3>
                  <p className="text-sm text-[#5A6B7C] leading-relaxed">{val.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 7. Global Offices & Settlement Governance */}
          <section className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-7 space-y-5">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#E94D65] shrink-0" />
              <h2 className="text-xl font-heading font-bold text-[#102030]">
                Global Offices &amp; Governance
              </h2>
            </div>
            <div className="grid md:grid-cols-2 gap-5 text-sm text-[#5A6B7C]">
              <div className="bg-white border border-[#DCE4EC] rounded-[5px] p-4 space-y-1">
                <p className="text-xs font-heading font-bold text-[#102030] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#E94D65]" />
                  <span>Office</span>
                </p>
                <p className="text-xs">171 Crescent Road, Oxford, England, OX4 2NX</p>
              </div>
            </div>
            <p className="text-xs text-[#5A6B7C] leading-relaxed">
              Risk Notice: Investing in financial markets, digital assets, equities, and real estate
              involves capital risk. Past performance or indicative daily targets do not guarantee
              future outcomes, and asset values can rise or fall. Platform tools support client
              analysis and administration rather than replacing independent financial judgment.
            </p>
          </section>

          {/* 8. Contact Information */}
          <section className="bg-[#1B4962] text-white rounded-[5px] p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
                Contact Information
              </p>
              <h2 className="text-xl font-heading font-bold text-white">
                Reach the Bitfury Tech Investment Desk
              </h2>
              <div className="text-xs sm:text-sm text-slate-200 flex flex-wrap gap-x-5 gap-y-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-[#E94D65] shrink-0" />
                  <span>support@bitfurytechinvestment.com</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-[#E94D65] shrink-0" />
                  <span>admin@bitfurytechinvestment.com</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-[#E94D65] shrink-0" />
                  <span>bitfurytech21@gmail.com</span>
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link
                to="/contact"
                className={buttonClasses({ variant: "primary", size: "md" })}
              >
                Open Contact Form
              </Link>
              <Link
                to="/login"
                className={buttonClasses({ variant: "outlineDark", size: "md" })}
              >
                Client Login
              </Link>
            </div>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
