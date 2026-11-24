import { useState } from "react";
import { ChevronLeft, ChevronRight, MessageSquareQuote } from "lucide-react";

const REVIEWS = [
  {
    name: "Jenifer Smart",
    quote:
      "I have never trusted any investment platform before, but Bitfury Tech Investments changed everything. They manage my assets and funds.",
  },
  {
    name: "Mr. Kelvin",
    quote:
      "I am happy I found Bitfury Tech Investments. They keep exceeding my expectations, and I have found deposits and withdrawals quick.",
  },
  {
    name: "Richard",
    quote:
      "I appreciate the insights shared in each trading session report and look forward to continued investments together.",
  },
  {
    name: "Michal Abraham",
    quote:
      "I received my investment account update this morning, and I am pleased with the work being done. I would like to invest more in future opportunities.",
  },
  {
    name: "Joseph Bricks",
    quote:
      "For me, investing is about trust, ability, affinity and availability. I have found the team attentive to detail and focused on their clients.",
  },
];

export default function InvestorTestimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeReview = REVIEWS[activeIndex];
  const initials = activeReview.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  const showPrevious = () => {
    setActiveIndex((index) => (index - 1 + REVIEWS.length) % REVIEWS.length);
  };
  const showNext = () => {
    setActiveIndex((index) => (index + 1) % REVIEWS.length);
  };

  return (
    <section
      aria-labelledby="investor-testimonials-heading"
      className="relative overflow-hidden bg-[#F6F8FA] text-[#102030]"
    >
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-heading font-bold uppercase tracking-[0.18em] text-[#B92841] sm:text-sm">
            Investor feedback
          </p>
          <h2
            id="investor-testimonials-heading"
            className="mt-3 font-heading text-3xl font-bold leading-tight text-[#102030] sm:text-5xl"
          >
            What our investors say
          </h2>
        </div>

        <div className="mx-auto mt-8 max-w-5xl sm:mt-12">
          <article
            aria-live="polite"
            aria-atomic="true"
            className="rounded-2xl border border-[#DCE4EC] bg-white px-5 py-7 text-[#323238] shadow-[0_18px_48px_rgba(27,73,98,0.08)] sm:px-10 sm:py-11 lg:px-16 lg:py-14"
          >
            <div className="flex min-h-8 items-center gap-2 text-[#E94D65]">
              <MessageSquareQuote aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em]">
                Investor feedback
              </span>
            </div>
            <blockquote className="mt-6 min-h-28 text-lg leading-relaxed sm:mt-8 sm:min-h-32 sm:text-2xl lg:text-3xl">
              “{activeReview.quote}”
            </blockquote>
            <div className="mt-8 flex items-center gap-4 border-t border-[#DCE4EC] pt-6 sm:mt-10 sm:pt-8">
              <div
                aria-hidden="true"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[#DCE4EC] bg-[#F6F8FA] font-heading text-lg font-bold text-[#1B4962] sm:h-16 sm:w-16"
              >
                {initials}
              </div>
              <cite className="block truncate font-heading text-xl font-bold not-italic text-[#102030] sm:text-2xl">
                {activeReview.name}
              </cite>
            </div>
          </article>

          <div className="mt-6 flex items-center justify-center gap-4 sm:mt-8 sm:gap-6">
            <button
              type="button"
              onClick={showPrevious}
              aria-label="Show previous testimonial"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#CBD6E2] bg-white text-[#1B4962] transition-colors hover:border-[#1B4962] hover:bg-[#EDF3F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E94D65] sm:h-14 sm:w-14"
            >
              <ChevronLeft aria-hidden="true" className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2" role="group" aria-label="Choose an investor review">
              {REVIEWS.map((review, index) => (
                <button
                  key={review.name}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Show review from ${review.name}`}
                  aria-pressed={index === activeIndex}
                  className={`h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E94D65] focus-visible:ring-offset-2 ${
                    index === activeIndex ? "w-8 bg-[#E94D65]" : "w-2.5 bg-[#CBD6E2] hover:bg-[#8A99A8]"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={showNext}
              aria-label="Show next testimonial"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#CBD6E2] bg-white text-[#1B4962] transition-colors hover:border-[#1B4962] hover:bg-[#EDF3F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E94D65] sm:h-14 sm:w-14"
            >
              <ChevronRight aria-hidden="true" className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
