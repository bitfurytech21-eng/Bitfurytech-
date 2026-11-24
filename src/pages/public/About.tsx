import { Link } from "react-router-dom";
import { FileText, Mail, MapPin, ShieldCheck } from "lucide-react";
import { EditorialIcon } from "../../components/EditorialArtwork";
import PublicLayout from "../../components/PublicLayout";
import ResilientImage from "../../components/ResilientImage";
import { buttonClasses } from "../../components/ui";
import { LEADERSHIP_TEAM } from "../../data/leadershipTeam";

const SECTORS = [
  {
    title: "Cryptocurrency & Digital Assets",
    description:
      "Explore company-published information about digital assets, including Bitcoin, Ethereum, and stablecoins. Review how each option works, its payment methods, and risks such as price volatility, liquidity, network fees, and transaction delays.",
  },
  {
    title: "Stocks & Global Equities",
    description:
      "Review equity opportunities and company information. Share prices can be affected by business performance, market conditions, interest rates, and broader economic events.",
  },
  {
    title: "Commercial Real Estate",
    description:
      "Browse commercial property listings and available real-estate plans. Review location, occupancy, valuation, rental assumptions, entry terms, and supporting documents before making a decision.",
  },
];

const SOLUTIONS = [
  {
    index: "01",
    title: "Market Analysis",
    art: "analysis" as const,
    description:
      "Review company-published information about digital assets, listed equities, and commercial property in one place.",
  },
  {
    index: "02",
    title: "Allocation & Advisory Desk",
    art: "advisory" as const,
    description:
      "Compare available plans by asset type, payment method, terms, fees, and risk information before you decide.",
  },
  {
    index: "03",
    title: "Professional Research Team",
    art: "team" as const,
    description:
      "Browse commercial property opportunities with available location, occupancy, valuation, and supporting details.",
  },
  {
    index: "04",
    title: "Structured Portfolio",
    art: "strategy" as const,
    description:
      "Use the client portal to review account activity and submit payment, withdrawal, or property inquiries.",
  },
];

const VALUES = [
  {
    title: "Clear Plan Information",
    body: "Review plan terms, payment methods, fees, and risk information before deciding whether an option suits you.",
  },
  {
    title: "Account Records",
    body: "Balances, requests, and transaction history are presented in the client account for review.",
  },
  {
    title: "Investment Oversight",
    body: "The company describes an Investment Policy Committee and research-led approach to reviewing investment options.",
  },
  {
    title: "Risk Awareness",
    body: "Investment values and income can rise or fall. Review the risks of each asset type and plan before proceeding.",
  },
];

export default function About() {
  return (
    <PublicLayout>
      {/* Header Hero Band */}
      <section className="bg-[#1B4962] text-white border-b border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center space-y-5">
            <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
              About Bitfury Tech Investment
            </p>
            <h1
              className="font-heading font-bold tracking-tight text-white text-balance leading-[1.1]"
              style={{ fontSize: "clamp(2rem, 3.6vw, 3.25rem)" }}
            >
              Investment information and account services across digital assets, equities, and commercial property.
            </h1>
            <p className="text-base text-slate-200 leading-relaxed">
              Bitfury Tech Investment brings together company-published investment information,
              property listings, and account tools. Customers can review opportunities across digital
              assets, listed equities, and commercial property, then manage account activity online.
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
              src="/images/hero-private-capital.jpg"
              alt="BitfuryTech institutional wealth workspace"
              fallbackLabel="BitfuryTech Corporate Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      <div className="bg-white">
        {/* 2. Who We Are & Company Certificate */}
        <div className="border-b border-[#DCE4EC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
            <section className="grid md:grid-cols-12 gap-8 items-start">
              <div className="md:col-span-4 overflow-hidden rounded-md bg-white">
                <img src="/images/team-meeting-fade.webp" alt="Bitfury Tech team members gathered around a meeting table" width="1200" height="1200" loading="lazy" className="aspect-[2/1] w-full object-cover object-top" />
                <div className="relative bg-linear-to-b from-transparent via-white to-white -mt-4 px-3 pb-2 pt-4">
                  <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">Reinventing Investor Access</p>
                  <h2 className="mt-2 text-2xl font-heading font-bold text-[#102030]">Who We Are &amp; What We Do</h2>
                </div>
              </div>
              <div className="md:col-span-8 space-y-4 text-sm sm:text-base text-[#5A6B7C] leading-relaxed">
                <p>
                  Bitfury Tech Investment provides an online platform for reviewing investment options
                  across digital assets, listed equities, and commercial property. The site brings
                  together market information, published plans, property listings, and account services.
                </p>
                <p>
                  Customers can review account balances and transaction records, submit payment or
                  withdrawal requests, and enquire about property listings. Request status is shown in
                  the client portal while the support team reviews submissions.
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
                    Company registration certificate
                  </h2>
                  <p className="max-w-2xl text-xs leading-relaxed text-[#5A6B7C]">
                    This PDF was linked as the company document.
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
          </div>
        </div>

        {/* 3 & 4. Mission, IPC Oversight & Forward-Thinking Solutions (Framed Briefing Background) */}
        <section className="relative isolate overflow-hidden bg-white border-b border-[#DCE4EC]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[520px] overflow-hidden select-none"
          >
            <img
              src="/assets/aistudio/IMG_8246_9a69804d.jpeg"
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-center opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/82 to-white" />
            <img
              src="/assets/aistudio/IMG_8225_3a0fd053.png"
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute left-0 top-0 h-[440px] w-auto opacity-90 brightness-[0.92]"
            />
            <img
              src="/assets/aistudio/IMG_8225_3a0fd053.png"
              alt=""
              loading="lazy"
              decoding="async"
              className="hidden sm:block absolute right-0 top-6 h-[400px] w-auto -scale-x-100 opacity-85 brightness-[0.92]"
            />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-14">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white/95 backdrop-blur-[2px] border border-[#DCE4EC] rounded-[5px] p-7 space-y-3 shadow-[0_2px_8px_rgba(27,73,98,0.06)]">
                <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                  <EditorialIcon name="mission" className="mb-4 size-12" />
                  Our Mission
                </p>
                <h2 className="text-xl font-heading font-bold text-[#102030]">
                  Clear information for informed decisions
                </h2>
                <p className="text-sm text-[#5A6B7C] leading-relaxed">
                  We aim to make investment information easier to review by presenting each option’s
                  purpose, terms, and associated risks clearly.
                </p>
              </div>
              <div className="bg-white/95 backdrop-blur-[2px] border border-[#DCE4EC] rounded-[5px] p-7 space-y-3 shadow-[0_2px_8px_rgba(27,73,98,0.06)]">
                <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                  <EditorialIcon name="oversight" className="mb-4 size-12" />
                  Our Approach &amp; IPC Oversight
                </p>
                <h2 className="text-xl font-heading font-bold text-[#102030]">
                  Investment Policy Committee (IPC)
                </h2>
                <p className="text-sm text-[#5A6B7C] leading-relaxed">
                  The Investment Policy Committee oversees the company’s investment policy with
                  research support. Published plan information explains how each option is structured
                  and identifies its terms and associated risks.
                </p>
              </div>
            </div>

            <div className="space-y-6">
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
                    key={sol.title}
                    className="bg-white border border-[#DCE4EC] rounded-[5px] p-6 space-y-2.5 shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <EditorialIcon name={sol.art} />
                      <span className="text-xs font-mono font-semibold text-[#5A6B7C]">{sol.index}</span>
                    </div>
                    <h3 className="text-base font-heading font-bold text-[#102030]">{sol.title}</h3>
                    <p className="text-xs sm:text-sm text-[#5A6B7C] leading-relaxed">
                      {sol.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 5 & 6. Investment Sectors & Corporate Values */}
        <div className="bg-[#F6F8FA] border-b border-[#DCE4EC]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-14">
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
                    key={sector.title}
                    className="bg-white border border-[#DCE4EC] rounded-[5px] p-6 space-y-3 shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
                  >
                    <h3 className="text-lg font-heading font-bold text-[#102030]">{sector.title}</h3>
                    <p className="text-sm text-[#5A6B7C] leading-relaxed">{sector.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-6">
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
                    className="bg-white border border-[#DCE4EC] rounded-[5px] p-6 space-y-2 shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
                  >
                    <h3 className="text-base font-heading font-bold text-[#102030]">{val.title}</h3>
                    <p className="text-sm text-[#5A6B7C] leading-relaxed">{val.body}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* 6b. Executive Board & Leadership (Framed Team Background) */}
        <section
          className="relative isolate overflow-hidden bg-white border-b border-[#DCE4EC]"
          aria-labelledby="about-board-heading"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[520px] overflow-hidden select-none"
          >
            <img
              src="/assets/aistudio/IMG_8252_54897dbb.jpeg"
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-[50%_18%] scale-[1.03] opacity-70"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/82 to-white" />
            <img
              src="/assets/aistudio/IMG_8225_3a0fd053.png"
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute left-0 top-0 h-[440px] w-auto opacity-90 brightness-[0.92]"
            />
            <img
              src="/assets/aistudio/IMG_8225_3a0fd053.png"
              alt=""
              loading="lazy"
              decoding="async"
              className="hidden sm:block absolute right-0 top-6 h-[400px] w-auto -scale-x-100 opacity-85 brightness-[0.92]"
            />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-8">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Executive Board &amp; Global Team
              </p>
              <h2 id="about-board-heading" className="text-2xl sm:text-3xl font-heading font-bold text-[#102030]">
                Meet the Board Members
              </h2>
              <p className="text-sm text-[#5A6B7C] leading-relaxed">
                Senior leadership alongside our dedicated research, operations, and client relations personnel.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {LEADERSHIP_TEAM.map((member) => (
                <article
                  key={member.name}
                  className="overflow-hidden rounded-xl border border-[#DCE4EC] bg-white shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
                >
                  <div className="aspect-[4/5] w-full overflow-hidden bg-[#EDF3F7]">
                    <img
                      src={member.image}
                      alt={`${member.name}, ${member.role}`}
                      className="h-full w-full object-cover object-top"
                    />
                  </div>
                  <div className="p-5 space-y-1">
                    <h3 className="text-base font-heading font-bold text-[#102030]">{member.name}</h3>
                    <p className="text-xs font-medium text-[#5A6B7C]">{member.role}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* 7 & 8. Office & Contact Information */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
          <section className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-7 space-y-5">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#E94D65] shrink-0" />
              <h2 className="text-xl font-heading font-bold text-[#102030]">
                Office information
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
          </section>

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
                  <a href="mailto:info@bitfurytech.cloud" className="hover:text-white">info@bitfurytech.cloud</a>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-[#E94D65] shrink-0" />
                  <a href="mailto:support@bitfurytech.cloud" className="hover:text-white">support@bitfurytech.cloud</a>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-[#E94D65] shrink-0" />
                  <a href="mailto:Compliance.notice@bitfurytech.cloud" className="hover:text-white">Compliance.notice@bitfurytech.cloud</a>
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
