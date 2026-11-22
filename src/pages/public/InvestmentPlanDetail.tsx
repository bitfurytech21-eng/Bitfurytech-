import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ShieldAlert } from "lucide-react";
import PublicLayout from "../../components/PublicLayout";
import ResilientImage from "../../components/ResilientImage";
import { buttonClasses } from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import { useInvestmentPlanDetail } from "../../hooks/useInvestmentPlans";
import { formatUsd } from "../../trading/tradingPage";

export default function InvestmentPlanDetail() {
  const { planId } = useParams<{ planId: string }>();
  const { firebaseUser } = useAuth();
  const { plan, loading, error } = useInvestmentPlanDetail(planId);
  const [previewAmount, setPreviewAmount] = useState<string>("");

  const numericPreview = Number(previewAmount);
  const effectiveAmount =
    plan && Number.isFinite(numericPreview) && numericPreview > 0
      ? numericPreview
      : plan?.minDeposit ?? 0;

  const dailyBenchmark = plan ? (effectiveAmount * plan.dailyRatePct) / 100 : 0;
  const cycleBenchmark = plan ? dailyBenchmark * plan.durationDays : 0;

  return (
    <PublicLayout>
      <div className="bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-10">
          <div>
            <Link
              to="/investments-catalog"
              className="inline-flex items-center gap-2 text-xs font-heading font-bold text-[#1B4962] hover:text-[#B92841] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Investment Plans</span>
            </Link>
          </div>

          {loading ? (
            <div className="h-96 rounded-[5px] bg-[#F6F8FA] border border-[#DCE4EC] animate-pulse" />
          ) : error || !plan ? (
            <div className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-8 space-y-4">
              <h1 className="text-2xl font-heading font-bold text-[#102030]">
                Investment Plan Unavailable
              </h1>
              <p className="text-sm text-[#5A6B7C]">
                {error || "The selected mandate specification could not be loaded."}
              </p>
              <Link
                to="/investments-catalog"
                className={buttonClasses({ variant: "primary", size: "md" })}
              >
                Return to Plans Catalog
              </Link>
            </div>
          ) : (
            <div className="space-y-10">
              {/* Hero Plan Overview */}
              <section className="grid lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-7 flex flex-col justify-center space-y-4">
                  <p className="text-xs text-[#5A6B7C]">
                    <span className="text-[#B92841] font-semibold">{plan.categoryLabel}</span>
                    <span aria-hidden="true"> · </span>
                    <span>{plan.durationDays}-Day Cycle</span>
                  </p>
                  <h1 className="text-3xl sm:text-4xl font-heading font-bold tracking-tight text-[#102030] text-balance">
                    {plan.name}
                  </h1>
                  <p className="text-sm font-medium text-[#1B4962]">{plan.audience}</p>
                  <p className="text-base text-[#5A6B7C] leading-relaxed">{plan.description}</p>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Link
                      to={`/investments?plan=${plan.id}`}
                      className={buttonClasses({ variant: "primary", size: "lg" })}
                    >
                      <span>
                        {firebaseUser ? "Allocate in Client Portal" : "Proceed to Allocation"}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    {!firebaseUser && (
                      <Link
                        to="/register"
                        className={buttonClasses({ variant: "secondary", size: "lg" })}
                      >
                        Create Account
                      </Link>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-5 min-h-[240px] rounded-[5px] overflow-hidden border border-[#DCE4EC] bg-[#F6F8FA]">
                  <ResilientImage
                    src={plan.image}
                    alt={`${plan.name} — ${plan.categoryLabel}`}
                    fallbackLabel={plan.categoryLabel}
                    className="w-full h-full object-cover"
                  />
                </div>
              </section>

              {/* Full Specification Grid */}
              <section className="grid lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-white border border-[#DCE4EC] rounded-[5px] p-6 sm:p-7 space-y-5 shadow-[0_2px_8px_rgba(27,73,98,0.06)]">
                  <h2 className="text-lg font-heading font-bold text-[#102030]">
                    Mandate Specifications
                  </h2>
                  <dl className="divide-y divide-[#DCE4EC] text-sm">
                    <div className="py-3 flex justify-between gap-4">
                      <dt className="text-[#5A6B7C]">Plan Name</dt>
                      <dd className="font-semibold text-[#102030] text-right">{plan.name}</dd>
                    </div>
                    <div className="py-3 flex justify-between gap-4">
                      <dt className="text-[#5A6B7C]">Investment Category</dt>
                      <dd className="text-[#B92841] font-semibold text-right">
                        {plan.categoryLabel}
                      </dd>
                    </div>
                    <div className="py-3 flex justify-between gap-4">
                      <dt className="text-[#5A6B7C]">Minimum Investment</dt>
                      <dd className="font-mono tabular-nums font-semibold text-[#102030]">
                        {formatUsd(plan.minDeposit)}
                      </dd>
                    </div>
                    <div className="py-3 flex justify-between gap-4">
                      <dt className="text-[#5A6B7C]">Maximum Investment</dt>
                      <dd className="font-mono tabular-nums font-semibold text-[#102030]">
                        {formatUsd(plan.maxDeposit)}
                      </dd>
                    </div>
                    <div className="py-3 flex justify-between gap-4">
                      <dt className="text-[#5A6B7C]">Investment Duration</dt>
                      <dd className="font-mono tabular-nums text-[#102030]">
                        {plan.durationDays} Days
                      </dd>
                    </div>
                    <div className="py-3 flex justify-between gap-4">
                      <dt className="text-[#5A6B7C]">Indicative Return Target</dt>
                      <dd className="font-mono tabular-nums font-semibold text-[#B92841]">
                        {plan.dailyRatePct}% daily (Non-Guaranteed)
                      </dd>
                    </div>
                    <div className="py-3 flex justify-between gap-4">
                      <dt className="text-[#5A6B7C]">Payment Frequency</dt>
                      <dd className="text-[#102030] text-right">{plan.paymentFrequency}</dd>
                    </div>
                    <div className="py-3 flex justify-between gap-4">
                      <dt className="text-[#5A6B7C]">Supported Settlement Rails</dt>
                      <dd className="text-[#102030] text-right">{plan.settlementRail}</dd>
                    </div>
                  </dl>

                  <div className="pt-2 space-y-2">
                    <h3 className="text-sm font-heading font-bold text-[#102030]">
                      Structural Highlights
                    </h3>
                    <ul className="space-y-1.5 text-sm text-[#5A6B7C]">
                      {plan.highlights.map((h) => (
                        <li key={h}>· {h}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Illustrative Benchmark Preview & Non-Guaranteed Terms */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 space-y-4">
                    <h2 className="text-base font-heading font-bold text-[#102030]">
                      Illustrative Benchmark Estimator
                    </h2>
                    <p className="text-xs text-[#5A6B7C] leading-relaxed">
                      Preview hypothetical cycle figures based on the published indicative daily rate.
                      This estimator does not represent a guaranteed payout.
                    </p>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="plan-preview-amount"
                        className="block text-xs font-semibold text-[#102030]"
                      >
                        Hypothetical Allocation (USD)
                      </label>
                      <input
                        id="plan-preview-amount"
                        type="number"
                        min={plan.minDeposit}
                        max={plan.maxDeposit}
                        value={previewAmount}
                        onChange={(e) => setPreviewAmount(e.target.value)}
                        placeholder={String(plan.minDeposit)}
                        className="w-full rounded-[5px] border border-[#CBD6E2] bg-white px-3.5 py-2.5 text-sm font-mono tabular-nums text-[#102030] focus:ring-2 focus:ring-[#1B4962] focus:border-[#1B4962] focus:outline-none"
                      />
                    </div>
                    <dl className="space-y-2 border-t border-[#DCE4EC] pt-3 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-[#5A6B7C]">Reference Principal</dt>
                        <dd className="font-mono tabular-nums font-semibold text-[#102030]">
                          {formatUsd(effectiveAmount)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#5A6B7C]">Indicative Daily Benchmark</dt>
                        <dd className="font-mono tabular-nums font-semibold text-[#B92841]">
                          {formatUsd(dailyBenchmark)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-[#5A6B7C]">
                          Indicative {plan.durationDays}-Day Benchmark
                        </dt>
                        <dd className="font-mono tabular-nums font-bold text-[#102030]">
                          {formatUsd(cycleBenchmark)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="bg-white border border-[#DCE4EC] rounded-[5px] p-6 space-y-3">
                    <div className="flex items-center gap-2 text-[#B92841]">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <h3 className="text-sm font-heading font-bold text-[#102030]">
                        Return Terms &amp; Risk Notice
                      </h3>
                    </div>
                    <p className="text-xs text-[#5A6B7C] leading-relaxed">{plan.returnTerms}</p>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}
