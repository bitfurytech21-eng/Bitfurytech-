import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Layers, Building2 } from "lucide-react";
import PublicLayout from "../../components/PublicLayout";
import {
  formatUsd,
  INVESTMENT_MANDATES,
  MandateCategory,
} from "../../trading/tradingPage";

const CATEGORY_TABS: Array<{ id: MandateCategory | "all"; label: string }> = [
  { id: "all", label: "All Mandates" },
  { id: "crypto", label: "Digital Assets" },
  { id: "stock", label: "Global Equities" },
  { id: "estate", label: "Real Estate" },
];

export default function HomePage() {
  const [filter, setFilter] = useState<MandateCategory | "all">("all");

  const visibleMandates =
    filter === "all"
      ? INVESTMENT_MANDATES
      : INVESTMENT_MANDATES.filter((m) => m.category === filter);

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="border-b border-white/10 bg-[#05081a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-24 grid lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-yellow-400">
              BitfuryTech Wealth Management
            </p>
            <h1
              className="font-bold tracking-tight text-white text-balance leading-[1.08]"
              style={{ fontSize: "clamp(2.25rem, 4vw, 3.6rem)" }}
            >
              Institutional portfolio custody across digital assets, equities, and real estate.
            </h1>
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              BitfuryTech unifies multi-asset capital allocation, verified settlement workflows, and
              real-time custody reporting inside a secure enterprise portal.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-semibold text-sm px-6 py-3 rounded-md transition-colors whitespace-nowrap"
              >
                <span>Open Client Account</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/investments-catalog"
                className="border border-white/20 hover:bg-white/5 text-white font-medium text-sm px-5 py-3 rounded-md transition-colors whitespace-nowrap"
              >
                Review Mandates
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[280px] lg:min-h-[400px] rounded-xl overflow-hidden border border-white/10 bg-[#0b1129]">
            <img
              src="/images/hero-private-capital.png"
              alt="BitfuryTech institutional financial district headquarters"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#05081a]/85 via-[#05081a]/20 to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-xs text-slate-200">
              <p className="font-semibold text-white">BitfuryTech Custody Architecture</p>
              <p className="text-slate-300 mt-0.5">
                Multi-asset mandates · Real-time settlement ledger
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 border-b border-white/10">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-[#0b1129] border border-white/10 rounded-xl p-6 space-y-3">
            <ShieldCheck className="w-6 h-6 text-yellow-400" />
            <h2 className="text-lg font-bold text-white">Segregated Custody &amp; Auth</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every investor workspace is isolated by verified identity rules, ensuring deposit,
              withdrawal, and allocation records remain strictly account-scoped.
            </p>
          </div>
          <div className="bg-[#0b1129] border border-white/10 rounded-xl p-6 space-y-3">
            <Layers className="w-6 h-6 text-yellow-400" />
            <h2 className="text-lg font-bold text-white">Structured Mandate Tiers</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Allocate capital across Digital Assets, Global Equities, and Real Estate mandates with
              clearly defined entry thresholds and settlement rails.
            </p>
          </div>
          <div className="bg-[#0b1129] border border-white/10 rounded-xl p-6 space-y-3">
            <Building2 className="w-6 h-6 text-yellow-400" />
            <h2 className="text-lg font-bold text-white">Direct Property Oversight</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Inspect commercial real estate holdings published directly to the BitfuryTech catalog
              with occupancy, valuation, and minimum entry transparency.
            </p>
          </div>
        </div>
      </section>

      {/* Structured Investment Mandates */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wider text-yellow-400">
              Mandate Specifications
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Multi-Asset Portfolio Tiers
            </h2>
            <p className="text-sm text-slate-300">
              Select a mandate category to review entry minimums, cycle durations, and supported
              settlement rails.
            </p>
          </div>

          <div className="flex flex-wrap gap-1 p-1 bg-[#0b1129] border border-white/10 rounded-lg self-start">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3.5 py-2 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  filter === tab.id
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
          {visibleMandates.map((m) => (
            <article
              key={m.id}
              className="bg-[#0b1129] border border-white/10 rounded-xl p-6 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="text-xs text-slate-400">
                  <span className="font-semibold text-yellow-400">{m.categoryLabel}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{m.durationDays}-Day Cycle</span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white">{m.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{m.audience}</p>
                </div>

                <dl className="space-y-2 border-y border-white/10 py-4 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Target Daily Rate</dt>
                    <dd className="font-mono tabular-nums font-semibold text-yellow-400">
                      {m.dailyRatePct}%
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Minimum Entry</dt>
                    <dd className="font-mono tabular-nums text-white">
                      {formatUsd(m.minDeposit)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Maximum Allocation</dt>
                    <dd className="font-mono tabular-nums text-white">
                      {formatUsd(m.maxDeposit)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-400">Settlement Rail</dt>
                    <dd className="text-slate-200">{m.settlementRail}</dd>
                  </div>
                </dl>

                <ul className="space-y-1.5 text-xs text-slate-300">
                  {m.highlights.map((h) => (
                    <li key={h}>· {h}</li>
                  ))}
                </ul>
              </div>

              <Link
                to={`/investments?plan=${m.id}`}
                className="block text-center bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-semibold text-xs py-2.5 px-4 rounded-md transition-colors"
              >
                Allocate in Portal
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Local Infrastructure Showcase */}
      <section className="bg-[#090e26] border-t border-white/10 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-8 items-stretch">
          <div className="relative min-h-[280px] rounded-xl overflow-hidden border border-white/10">
            <img
              src="/images/digital-assets.png"
              alt="BitfuryTech quantitative trading desk"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#05081a]/90 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <h3 className="text-lg font-bold text-white">Quantitative &amp; Digital Asset Desk</h3>
              <p className="text-xs text-slate-300 mt-1">
                Disciplined execution across digital liquidity and global equity indices.
              </p>
            </div>
          </div>

          <div className="relative min-h-[280px] rounded-xl overflow-hidden border border-white/10">
            <img
              src="/images/commercial-property.png"
              alt="BitfuryTech commercial property portfolio"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#05081a]/90 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5">
              <h3 className="text-lg font-bold text-white">Commercial Real Estate Offerings</h3>
              <p className="text-xs text-slate-300 mt-1">
                Transparent commercial property syndicates backed by verified valuations.
              </p>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
