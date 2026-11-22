import { Link } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout";
import { buttonClasses } from "../../components/ui";

const SERVICES = [
  {
    index: "01",
    title: "Digital Asset Custody & Liquidity",
    description:
      "Structured BTC, ETH, and USDT portfolio tiers built around segregated reserves and transparent daily ledger tracking.",
  },
  {
    index: "02",
    title: "Global Equity Index Mandates",
    description:
      "Disciplined participation across large-cap technology, industrial, and blue-chip equity baskets with structured cycle durations.",
  },
  {
    index: "03",
    title: "Commercial Real Estate Syndicates",
    description:
      "Direct fractional access to commercial properties listed in the BitfuryTech catalog with transparent valuation and occupancy metrics.",
  },
  {
    index: "04",
    title: "Dedicated Settlement Administration",
    description:
      "Verified deposit confirmation, multi-rail payout processing, and real-time account alerts inside your BitfuryTech investor workspace.",
  },
];

export default function ServicesPage() {
  return (
    <PublicLayout>
      <section className="bg-[#1B4962] text-white border-b border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-3">
          <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
            BitfuryTech Capabilities
          </p>
          <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight text-white">
            Institutional Portfolio Services
          </h1>
          <p className="text-base text-slate-200 max-w-3xl">
            Four focused wealth management pillars operating under a single unified client portal.
          </p>
        </div>
      </section>

      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
          <div className="grid md:grid-cols-2 gap-6">
            {SERVICES.map((srv) => (
              <div
                key={srv.index}
                className="bg-white border border-[#DCE4EC] rounded-[5px] p-7 space-y-3 shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
              >
                <p className="text-xs font-mono font-semibold text-[#B92841]">{srv.index}.</p>
                <h2 className="text-xl font-heading font-bold text-[#102030]">{srv.title}</h2>
                <p className="text-sm text-[#5A6B7C] leading-relaxed">{srv.description}</p>
              </div>
            ))}
          </div>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/register"
              className={buttonClasses({ variant: "primary", size: "lg" })}
            >
              Open Client Account
            </Link>
            <Link
              to="/investments-catalog"
              className={buttonClasses({ variant: "secondary", size: "lg" })}
            >
              Browse Investment Plans
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
