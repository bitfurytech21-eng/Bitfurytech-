import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import PublicLayout from "../../components/PublicLayout";
import ResilientImage from "../../components/ResilientImage";
import { Button, buttonClasses } from "../../components/ui";
import { useInvestmentPlans } from "../../hooks/useInvestmentPlans";
import { formatUsd, MandateCategory } from "../../trading/tradingPage";

const CATEGORY_FILTERS: Array<{ id: MandateCategory | "all"; label: string }> = [
  { id: "all", label: "All Categories" },
  { id: "crypto", label: "Digital Assets" },
  { id: "stock", label: "Global Equities" },
  { id: "estate", label: "Real Estate" },
];

export default function InvestmentPlans() {
  const { plans, loading, error, reload } = useInvestmentPlans();
  const [category, setCategory] = useState<MandateCategory | "all">("all");

  const filtered = useMemo(() => {
    if (category === "all") return plans;
    return plans.filter((m) => m.category === category);
  }, [category, plans]);

  return (
    <PublicLayout>
      {/* Header Band */}
      <section className="bg-[#1B4962] text-white border-b border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
              Investment Plans
            </p>
            <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight text-white text-balance">
              Structured Investment Mandates
            </h1>
            <p className="text-base text-slate-200 leading-relaxed">
              Review entry minimums, duration cycles, payment frequencies, and indicative benchmark
              terms sourced directly from the BitfuryTech portfolio API.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filter investment plans by asset category"
            className="flex flex-wrap gap-1 p-1 bg-[#14374B] border border-white/15 rounded-[5px] self-start"
          >
            {CATEGORY_FILTERS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={category === tab.id}
                onClick={() => setCategory(tab.id)}
                className={`px-3.5 py-2 rounded-none text-xs font-heading font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  category === tab.id
                    ? "bg-[#E94D65] text-white"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
          {/* Risk & Non-Guaranteed Return Disclosure */}
          <div className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] px-6 py-4 text-xs text-[#5A6B7C] leading-relaxed">
            <strong className="text-[#102030]">Important Return Disclosure:</strong> Daily rates and cycle
            targets displayed below are indicative mandate benchmarks only. Returns are variable and
            are never presented as guaranteed. Capital allocation remains subject to market conditions
            and verified settlement availability.
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div
                  key={n}
                  className="h-96 rounded-[5px] bg-[#F6F8FA] border border-[#DCE4EC] animate-pulse"
                />
              ))}
            </div>
          ) : error ? (
            <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-[5px] p-6 flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-[#9F1239]">{error}</p>
              <Button variant="primary" size="sm" onClick={reload}>
                Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-10 text-center space-y-3">
              <p className="text-base font-heading font-bold text-[#102030]">No Plans in This Category</p>
              <p className="text-sm text-[#5A6B7C]">
                Select another category filter to view available BitfuryTech investment mandates.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((plan) => (
                <article
                  key={plan.id}
                  className="bg-white border border-[#DCE4EC] rounded-[5px] overflow-hidden flex flex-col justify-between shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
                >
                  <div>
                    <div className="h-44 w-full overflow-hidden border-b border-[#DCE4EC]">
                      <ResilientImage
                        src={plan.image}
                        alt={`${plan.name} — ${plan.categoryLabel}`}
                        fallbackLabel={plan.categoryLabel}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="p-6 space-y-4">
                      <p className="text-xs text-[#5A6B7C]">
                        <span className="text-[#B92841] font-semibold">{plan.categoryLabel}</span>
                        <span aria-hidden="true"> · </span>
                        <span>{plan.durationDays} Days</span>
                      </p>

                      <div className="space-y-1.5">
                        <h2 className="text-xl font-heading font-bold text-[#102030]">{plan.name}</h2>
                        <p className="text-sm text-[#5A6B7C] leading-relaxed">{plan.description}</p>
                      </div>

                      <dl className="space-y-2 border-y border-[#DCE4EC] py-4 text-xs">
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#5A6B7C]">Minimum Investment</dt>
                          <dd className="font-mono tabular-nums font-semibold text-[#102030]">
                            {formatUsd(plan.minDeposit)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#5A6B7C]">Maximum Investment</dt>
                          <dd className="font-mono tabular-nums font-semibold text-[#102030]">
                            {formatUsd(plan.maxDeposit)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#5A6B7C]">Investment Duration</dt>
                          <dd className="font-mono tabular-nums text-[#102030]">
                            {plan.durationDays} Days
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#5A6B7C]">Expected Return Terms</dt>
                          <dd className="font-mono tabular-nums font-semibold text-[#B92841] text-right">
                            {plan.dailyRatePct}% / day (Target)
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-[#5A6B7C]">Payment Frequency</dt>
                          <dd className="text-[#102030] text-right">{plan.paymentFrequency}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  <div className="px-6 pb-6 flex items-center gap-3">
                    <Link
                      to={`/investments-catalog/${plan.id}`}
                      className={`flex-1 ${buttonClasses({ variant: "primary", size: "sm" })}`}
                    >
                      <span>See Details</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <Link
                      to={`/investments?plan=${plan.id}`}
                      className={buttonClasses({ variant: "secondary", size: "sm" })}
                    >
                      Allocate
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
