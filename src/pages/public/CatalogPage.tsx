import { useState } from "react";
import { Link } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout";
import {
  formatUsd,
  INVESTMENT_MANDATES,
  MandateCategory,
} from "../../trading/tradingPage";

export default function CatalogPage() {
  const [category, setCategory] = useState<MandateCategory | "all">("all");
  const filtered =
    category === "all"
      ? INVESTMENT_MANDATES
      : INVESTMENT_MANDATES.filter((m) => m.category === category);

  return (
    <PublicLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-yellow-400">
              Investment Mandates
            </p>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white">
              Structured Portfolio Catalog
            </h1>
            <p className="text-base text-slate-300">
              Compare allocation ranges, cycle durations, and settlement channels before activating
              a mandate inside your dashboard.
            </p>
          </div>

          <div className="flex flex-wrap gap-1 p-1 bg-[#0b1129] border border-white/10 rounded-lg self-start">
            {(
              [
                { id: "all", label: "All" },
                { id: "crypto", label: "Digital Assets" },
                { id: "stock", label: "Global Equities" },
                { id: "estate", label: "Real Estate" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategory(tab.id)}
                className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-colors ${
                  category === tab.id
                    ? "bg-yellow-400 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((m) => (
            <article
              key={m.id}
              className="bg-[#0b1129] border border-white/10 rounded-xl p-6 flex flex-col justify-between space-y-5"
            >
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  <span className="text-yellow-400 font-semibold">{m.categoryLabel}</span> ·{" "}
                  {m.durationDays} days
                </p>
                <h2 className="text-xl font-bold text-white">{m.name}</h2>
                <p className="text-xs text-slate-400">{m.audience}</p>
                <dl className="space-y-2 border-y border-white/10 py-3.5 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Daily Target Rate</dt>
                    <dd className="font-mono tabular-nums font-semibold text-yellow-400">
                      {m.dailyRatePct}%
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Min – Max Entry</dt>
                    <dd className="font-mono tabular-nums text-white">
                      {formatUsd(m.minDeposit)} – {formatUsd(m.maxDeposit)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Rail</dt>
                    <dd className="text-slate-200">{m.settlementRail}</dd>
                  </div>
                </dl>
              </div>
              <Link
                to={`/investments?plan=${m.id}`}
                className="block text-center bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-semibold text-xs py-2.5 rounded-md"
              >
                Allocate Funds
              </Link>
            </article>
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}
