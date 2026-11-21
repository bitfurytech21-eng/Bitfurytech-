import { Link } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout";

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
      "Verified deposit confirmation, multi-rail payout processing, and real-time account alerts inside your Metronic investor workspace.",
  },
];

export default function ServicesPage() {
  return (
    <PublicLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 space-y-12">
        <div className="max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-yellow-400">
            BitfuryTech Capabilities
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            Institutional Portfolio Services
          </h1>
          <p className="text-base text-slate-300">
            Four focused wealth management pillars operating under a single unified client portal.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {SERVICES.map((srv) => (
            <div
              key={srv.index}
              className="bg-[#0b1129] border border-white/10 rounded-xl p-7 space-y-3"
            >
              <p className="text-xs font-mono text-yellow-400">{srv.index}.</p>
              <h2 className="text-xl font-bold text-white">{srv.title}</h2>
              <p className="text-sm text-slate-300 leading-relaxed">{srv.description}</p>
            </div>
          ))}
        </div>

        <div className="pt-2">
          <Link
            to="/register"
            className="inline-block bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-semibold text-sm px-6 py-3 rounded-md"
          >
            Open Client Account
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
