import { Link } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout";

export default function AboutPage() {
  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 space-y-12">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-yellow-400">
            About BitfuryTech
          </p>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
            Institutional standards for modern multi-asset wealth management.
          </h1>
          <p className="text-base text-slate-300 leading-relaxed max-w-3xl">
            BitfuryTech provides a unified investment portal combining digital asset liquidity,
            global equity mandates, and commercial property participation with transparent ledger
            settlement and role-isolated governance.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <section className="bg-[#0b1129] border border-white/10 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-white">Custody &amp; Verification</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Client accounts authenticate via verified identity providers, and every deposit or
              withdrawal request undergoes explicit settlement review before ledger balances are
              adjusted.
            </p>
          </section>
          <section className="bg-[#0b1129] border border-white/10 rounded-xl p-6 space-y-3">
            <h2 className="text-lg font-bold text-white">Zero-Ambiguity Reporting</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Your dashboard reflects only verified wallet balances, submitted deposits, withdrawal
              requests, and active allocations recorded in your BitfuryTech account ledger.
            </p>
          </section>
        </div>

        <div className="bg-[#0b1129] border border-white/10 rounded-xl p-7 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white">Explore BitfuryTech Mandates</h2>
            <p className="text-sm text-slate-400 mt-1">
              Review minimum entry parameters and settlement rails across all portfolio categories.
            </p>
          </div>
          <Link
            to="/investments-catalog"
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-semibold text-sm px-5 py-2.5 rounded-md"
          >
            View Mandate Catalog
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}
