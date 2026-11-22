import { Link } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout";
import { buttonClasses } from "../../components/ui";

const ADVISORY_SERVICES = [
  {
    index: "01",
    title: "Investment Strategy & Planning",
    description:
      "We devise and structure algorithmic and fundamental investment strategies tailored to entire portfolios or dedicated asset classes across 30-day cycle horizons.",
  },
  {
    index: "02",
    title: "Portfolio & Resource Optimization",
    description:
      "By balancing and optimizing competing exposures across Cryptocurrency, Global Equities, and Real Estate, we structure resilient portfolios without single-market overconcentration.",
  },
  {
    index: "03",
    title: "Sales & Trade Execution",
    description:
      "Execution combines mathematical modeling with automated trading session workflows across over 50 accessible global financial markets from one unified account.",
  },
  {
    index: "04",
    title: "Investment Growth & Mandate Switching",
    description:
      "Give your portfolio room to adapt as financial circumstances change—switch between Crypto, Stock, and Real Estate mandates without additional switching fees.",
  },
  {
    index: "05",
    title: "Institutional-Grade Custody",
    description:
      "Store and manage digital and multi-asset custody allocations safely inside an isolated client ledger until you choose to reallocate or request a withdrawal.",
  },
  {
    index: "06",
    title: "Asset Management & IPC Research",
    description:
      "Supported by our Investment Policy Committee (IPC), macroeconomists, research scientists, and quantitative analysts delivering intelligent digital and real-world asset exposure.",
  },
];

const RESEARCH_TOPICS = [
  {
    title: "Studying Market Movements",
    body: "Observe price momentum, market liquidity, and volatility shifts across digital assets and company shares before selecting entry points.",
  },
  {
    title: "Understanding Asset Performance",
    body: "Examine how income-oriented real estate mandates differ from cyclical equity exposures or higher-volatility cryptocurrency tiers.",
  },
  {
    title: "Monitoring Economic Developments",
    body: "Follow interest-rate shifts, inflation readings, and commercial sector demand that shape property appraisals and corporate earnings.",
  },
  {
    title: "Assessing Potential Risks",
    body: "Weigh potential drawdowns, lock-up horizons, and settlement timing carefully—remembering that investment values can rise or fall and returns are not guaranteed.",
  },
];

export default function ServicesPage() {
  return (
    <PublicLayout>
      <section className="bg-[#1B4962] text-white border-b border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-3">
          <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
            Bitfury Tech Investment Capabilities
          </p>
          <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight text-white">
            Integrated Digital &amp; Traditional Asset Services
          </h1>
          <p className="text-base text-slate-200 max-w-3xl leading-relaxed">
            We inspire confidence across a combined economy for digital and traditional assets—delivering
            vertically integrated services spanning strategy, trade execution, custody, and portfolio
            monitoring across more than 50 financial markets.
          </p>
        </div>
      </section>

      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-14">
          <div className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 text-sm text-[#5A6B7C] leading-relaxed">
            <strong className="text-[#102030]">Advisory &amp; Fiduciary Scope:</strong> Bitfury Tech
            Investment provides structured mandates, quantitative market research, custody tools,
            and account support overseen by our Investment Policy Committee (IPC). Clients confirm
            allocations independently based on their personal objectives and risk tolerance.
          </div>

          <section className="space-y-6">
            <div className="space-y-2 max-w-2xl">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Our Best Features
              </p>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#102030]">
                Core Investment &amp; Custody Capabilities
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ADVISORY_SERVICES.map((srv) => (
                <div
                  key={srv.index}
                  className="bg-white border border-[#DCE4EC] rounded-[5px] p-7 space-y-3 shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
                >
                  <p className="text-xs font-mono font-semibold text-[#B92841]">{srv.index}.</p>
                  <h3 className="text-lg font-heading font-bold text-[#102030]">{srv.title}</h3>
                  <p className="text-sm text-[#5A6B7C] leading-relaxed">{srv.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-7 sm:p-8 space-y-6">
            <div className="max-w-3xl space-y-2">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Structured Investment Portfolios &amp; Research
              </p>
              <h2 className="text-2xl font-heading font-bold text-[#102030]">
                Integrating Market Research into Portfolio Planning
              </h2>
              <p className="text-sm text-[#5A6B7C] leading-relaxed">
                Thoughtful asset allocation combines diversification, clear objectives, and
                disciplined monitoring across changing market cycles. Investment values can rise or
                fall, and indicative mandate targets are never guaranteed.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {RESEARCH_TOPICS.map((topic) => (
                <div key={topic.title} className="bg-white border border-[#DCE4EC] rounded-[5px] p-5 space-y-2">
                  <h3 className="text-sm font-heading font-bold text-[#102030]">{topic.title}</h3>
                  <p className="text-xs text-[#5A6B7C] leading-relaxed">{topic.body}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/investments-catalog"
              className={buttonClasses({ variant: "primary", size: "lg" })}
            >
              Explore Opportunities
            </Link>
            <Link
              to="/register"
              className={buttonClasses({ variant: "secondary", size: "lg" })}
            >
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
