import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { Link, Navigate, useParams } from "react-router-dom";
import PublicLayout from "../../components/PublicLayout";
import { buttonClasses } from "../../components/ui";
import { getAssetClassGuide } from "./assetClassData";

export default function AssetClassPage() {
  const { assetClass } = useParams();
  const guide = getAssetClassGuide(assetClass);

  if (!guide) return <Navigate to="/" replace />;

  const steps = guide.process;

  return (
    <PublicLayout>
      <div>
        <section className="bg-[#1B4962] text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-2 lg:items-center lg:px-8">
            <div className="space-y-5">
              <Link to="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-slate-200 hover:text-white">
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                All sectors
              </Link>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#F4BAC4]">{guide.label}</p>
              <h1 className="text-3xl font-heading font-bold tracking-tight text-balance sm:text-5xl">{guide.title}</h1>
              <p className="max-w-2xl text-base leading-relaxed text-slate-200">{guide.summary}</p>
              <Link to={`/investments-catalog?category=${guide.id}`} className={buttonClasses({ variant: "primary", size: "md" })}>
                Explore related mandates <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/15 bg-[#14374B]">
              <img src={guide.image} alt="" className="aspect-[16/10] w-full object-cover" />
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-12 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B92841]">How the sector works</p>
              <h2 className="text-2xl font-heading font-bold text-[#102030] sm:text-3xl">From research to ongoing review</h2>
              <p className="text-sm leading-relaxed text-[#5A6B7C]">{guide.approach}</p>
            </div>
            <div className="rounded-xl border border-[#DCE4EC] bg-[#F6F8FA] p-5 sm:p-6">
              <h3 className="mb-5 text-sm font-heading font-bold text-[#102030]">A simple view of the investment process</h3>
              <ol className="grid gap-3 sm:grid-cols-2">
                {steps.map((step, index) => (
                  <li key={step} className="flex min-h-20 items-start gap-3 rounded-lg border border-[#DCE4EC] bg-white p-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1B4962] text-xs font-bold text-white" aria-hidden="true">{index + 1}</span>
                    <span className="text-sm leading-relaxed text-[#34495A]">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section>
            <div className="rounded-xl border border-[#DCE4EC] bg-white p-5 sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#B92841]">Potential return sources</p>
              <h2 className="mt-2 text-xl font-heading font-bold text-[#102030]">How value may be created</h2>
              <ul className="mt-5 space-y-4">
                {guide.valueDrivers.map((driver) => (
                  <li key={driver} className="flex items-start gap-3 text-sm leading-relaxed text-[#46596B]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#1B4962]" aria-hidden="true" />
                    <span>{driver}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 border-t border-[#DCE4EC] pt-4 text-xs leading-relaxed text-[#5A6B7C]">These are general return mechanisms, not a promise that any will occur or that investors will profit.</p>
            </div>
          </section>

          <div className="flex flex-col gap-3 border-t border-[#DCE4EC] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-xs leading-relaxed text-[#667789]">This overview is educational, not personalized investment advice or a forecast. Confirm any strategy, fees, custody arrangements, and withdrawal terms in the current official documents before making a decision.</p>
            <Link to="/investments-catalog" className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-bold text-[#1B4962] hover:text-[#B92841]">
              Browse all opportunities <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
