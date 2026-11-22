import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import PublicLayout from "../../components/PublicLayout";
import ResilientImage from "../../components/ResilientImage";
import { Button, buttonClasses } from "../../components/ui";
import { useInvestmentPlans } from "../../hooks/useInvestmentPlans";
import { formatUsd, MandateCategory } from "../../trading/tradingPage";
import { getAssetClassGuide } from "./assetClassData";

const CATEGORY_FILTERS: Array<{ id: MandateCategory | "all"; label: string }> = [
  { id: "all", label: "All Categories" },
  { id: "crypto", label: "Cryptocurrency" },
  { id: "stock", label: "Stocks" },
  { id: "estate", label: "Real Estate" },
];

const CATEGORY_GUIDES: Array<{
  id: MandateCategory;
  title: string;
  image: string;
  summary: string;
  riskNote: string;
}> = [
  {
    id: "crypto",
    title: "Cryptocurrency & Digital Assets",
    image: "/images/asset_algo_trading.jpg",
    summary:
      "Digital assets utilize cryptographic ledgers and decentralized blockchain networks to settle value globally. Cryptocurrency markets trade 24/7 and respond rapidly to liquidity shifts, regulatory headlines, and market sentiment.",
    riskNote: "Risk focus: Elevated price volatility and rapid market swings.",
  },
  {
    id: "stock",
    title: "Stocks & Company Shares",
    image: "/images/hero_digital_liquidity.jpg",
    summary:
      "Stocks represent ownership stakes in publicly listed corporations. Share prices are influenced by company earnings, industry competitiveness, interest-rate policy, and broader economic developments researched before allocation.",
    riskNote: "Risk focus: Equity market fluctuations and corporate performance risk.",
  },
  {
    id: "estate",
    title: "Commercial Real Estate",
    image: "/images/asset_real_estate.jpg",
    summary:
      "Property mandates and syndicated holdings focus on physical commercial spaces where returns consider tenancy stability, potential rental income, and property valuation changes—requiring careful due diligence on each listing.",
    riskNote: "Risk focus: Occupancy changes, appraisal shifts, and longer holding horizons.",
  },
];

export default function InvestmentPlans() {
  const { plans, loading, error, reload } = useInvestmentPlans();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialParam = searchParams.get("category");
  const initialCategory: MandateCategory | "all" =
    initialParam === "crypto" || initialParam === "stock" || initialParam === "estate"
      ? initialParam
      : "all";
  const [category, setCategory] = useState<MandateCategory | "all">(initialCategory);

  useEffect(() => {
    const param = searchParams.get("category");
    if (param === "crypto" || param === "stock" || param === "estate") {
      setCategory(param);
    } else if (!param) {
      setCategory("all");
    }
  }, [searchParams]);

  const handleCategoryChange = (next: MandateCategory | "all") => {
    setCategory(next);
    if (next === "all") {
      searchParams.delete("category");
      setSearchParams(searchParams, { replace: true });
    } else {
      setSearchParams({ category: next }, { replace: true });
    }
  };

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
              Investment Opportunities
            </p>
            <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight text-white text-balance">
              Structured Investment Mandates
            </h1>
            <p className="text-base text-slate-200 leading-relaxed">
              Explore Cryptocurrency, Stocks, and Real Estate mandate tiers. Compare entry limits,
              duration horizons, settlement rails, and indicative benchmark parameters before
              allocating capital.
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
                onClick={() => handleCategoryChange(tab.id)}
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
          {/* Category Educational Overview */}
          <section aria-label="Asset category explanations" className="grid md:grid-cols-3 gap-6">
            {CATEGORY_GUIDES.map((guide) => {
              const selected = category === guide.id;
              return (
                <div
                  key={guide.id}
                  className={`border rounded-[5px] overflow-hidden flex flex-col justify-between transition-colors ${
                    selected
                      ? "bg-[#EDF3F7] border-[#1B4962]"
                      : "bg-[#F6F8FA] border-[#DCE4EC]"
                  }`}
                >
                  <div>
                    <div className="h-36 w-full overflow-hidden border-b border-[#DCE4EC]">
                      <ResilientImage
                        src={guide.image}
                        alt={guide.title}
                        fallbackLabel={guide.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-5 space-y-2">
                      <h2 className="text-base font-heading font-bold text-[#102030]">
                        {guide.title}
                      </h2>
                      <p className="text-xs text-[#5A6B7C] leading-relaxed">{guide.summary}</p>
                      <p className="text-[11px] font-medium text-[#1B4962] pt-1">{guide.riskNote}</p>
                    </div>
                  </div>
                  <div className="px-5 pb-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => handleCategoryChange(selected ? "all" : guide.id)}
                    className="min-h-11 text-xs font-heading font-bold text-[#B92841] hover:underline cursor-pointer"
                  >
                    {selected ? "Show All Categories" : `Filter ${guide.title.split(" ")[0]}`}
                  </button>
                  <Link
                    to={`/sectors/${getAssetClassGuide(guide.id)?.slug}`}
                    className="min-h-11 inline-flex items-center text-xs font-heading font-bold text-[#1B4962] hover:underline"
                  >
                    Sector guide <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
                </div>
              );
            })}
          </section>

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
                          <dt className="text-[#5A6B7C]">Daily Profit Target</dt>
                          <dd className="font-mono tabular-nums font-semibold text-[#B92841] text-right">
                            {plan.dailyRatePct}% / day (Target)
                          </dd>
                        </div>
                        {typeof plan.monthlyRatePct === "number" && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-[#5A6B7C]">Monthly Benchmark</dt>
                            <dd className="font-mono tabular-nums font-semibold text-[#102030] text-right">
                              {plan.monthlyRatePct}% / month
                            </dd>
                          </div>
                        )}
                        {typeof plan.referralBonusPct === "number" && (
                          <div className="flex justify-between gap-2">
                            <dt className="text-[#5A6B7C]">Referral Bonus</dt>
                            <dd className="font-mono tabular-nums font-semibold text-[#1B4962] text-right">
                              {plan.referralBonusPct}% on qualified referral
                            </dd>
                          </div>
                        )}
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
