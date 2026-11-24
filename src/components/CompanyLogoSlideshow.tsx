import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const COMPANIES = [
  { name: "Strabella", detail: "Finance & Banking", image: "/images/partners/strabella.png" },
  { name: "Femo Int.", detail: "Hotel & Resort", image: "/images/partners/femo-international.png" },
  { name: "Findsimple", detail: "", image: "/images/partners/findsimple.png" },
  { name: "Intelliro", detail: "", image: "/images/partners/intelliro.png" },
];

export default function CompanyLogoSlideshow() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeCompany = COMPANIES[activeIndex];

  const showCompany = (index: number) => {
    setActiveIndex((index + COMPANIES.length) % COMPANIES.length);
  };

  return (
    <section
      aria-labelledby="company-logos-heading"
      className="border-y border-[#DCE4EC] bg-[#F6F8FA]"
    >
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-2 text-center">
          <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
            Our partners
          </p>
          <h2
            id="company-logos-heading"
            className="text-2xl font-heading font-bold tracking-tight text-[#102030] sm:text-3xl"
          >
            Companies that support our work
          </h2>
        </div>

        <div
          className="mx-auto mt-8 flex max-w-xl items-center justify-center gap-3 sm:gap-6"
          role="group"
          aria-roledescription="carousel"
          aria-label="Company logos"
        >
          <button
            type="button"
            onClick={() => showCompany(activeIndex - 1)}
            aria-label="Previous company logo"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#CBD6E2] bg-white text-[#1B4962] transition-colors hover:border-[#1B4962] hover:bg-[#EDF3F7]"
          >
            <ChevronLeft aria-hidden="true" className="h-5 w-5" />
          </button>

          <div
            id="company-logo-slide"
            className="flex min-h-36 min-w-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-[#DCE4EC] bg-white px-5 py-5 shadow-[0_2px_8px_rgba(27,73,98,0.06)] sm:min-h-40"
            role="group"
            aria-roledescription="slide"
            aria-label={`${activeIndex + 1} of ${COMPANIES.length}: ${activeCompany.name}`}
          >
            <img
              key={activeCompany.image}
              src={activeCompany.image}
              alt={`${activeCompany.name} logo`}
              className="h-12 max-w-full object-contain sm:h-14"
            />
            <p className="text-sm font-heading font-semibold text-[#102030]">
              {activeCompany.name}
              {activeCompany.detail && (
                <span className="font-normal text-[#5A6B7C]"> · {activeCompany.detail}</span>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => showCompany(activeIndex + 1)}
            aria-label="Next company logo"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#CBD6E2] bg-white text-[#1B4962] transition-colors hover:border-[#1B4962] hover:bg-[#EDF3F7]"
          >
            <ChevronRight aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div
          className="mt-4 flex justify-center gap-2"
          role="group"
          aria-label="Choose a company logo"
        >
          {COMPANIES.map((company, index) => (
            <button
              key={company.name}
              type="button"
              onClick={() => showCompany(index)}
              aria-label={`Show ${company.name}`}
              aria-pressed={index === activeIndex}
              className={`h-2.5 w-2.5 rounded-full transition-colors ${
                index === activeIndex ? "bg-[#B92841]" : "bg-[#CBD6E2] hover:bg-[#8A99A8]"
              }`}
            />
          ))}
        </div>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          Showing {activeCompany.name}, slide {activeIndex + 1} of {COMPANIES.length}.
        </p>
      </div>
    </section>
  );
}
