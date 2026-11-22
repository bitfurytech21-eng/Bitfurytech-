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
      className="relative overflow-hidden bg-[#1B2353] text-white"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle,rgba(111,145,184,0.28)_1px,transparent_2px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_0%,transparent_75%)]"
      />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="flex items-center justify-center gap-4">
            <span aria-hidden="true" className="h-2 w-16 bg-[#58A363] sm:w-24" />
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white sm:text-sm">
              Testimonials
            </p>
          </div>
          <h2
            id="investor-testimonials-heading"
            className="mt-6 font-serif text-3xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl"
          >
            What Our Investors <span className="text-[#58A363]">Say</span>
          </h2>
          <p className="mx-auto mt-4 max-w-3xl text-xs leading-relaxed text-blue-100 sm:text-sm">
            These excerpts are reproduced from the previous public website and have not been
            independently verified. They are individual opinions, not representative results or
            guarantees. Investing involves risk and outcomes vary.
          </p>
        </div>

        <div className="mx-auto mt-9 max-w-5xl sm:mt-12">
          <article
            aria-live="polite"
            aria-atomic="true"
            className="rounded-3xl bg-white px-5 py-7 text-[#323238] shadow-[0_24px_64px_rgba(0,0,0,0.18)] sm:px-10 sm:py-11 lg:px-16 lg:py-14"
          >
            <div className="flex min-h-8 items-center gap-2 text-[#58A363]">
              <MessageSquareQuote aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span className="text-[11px] font-bold uppercase tracking-[0.15em]">
                Archived feedback · {activeIndex + 1} of {REVIEWS.length}
              </span>
            </div>
            <blockquote className="mt-6 min-h-28 text-lg leading-relaxed sm:mt-8 sm:min-h-32 sm:text-2xl lg:text-3xl">
              “{activeReview.quote}”
            </blockquote>
            <div className="mt-8 flex items-center gap-4 border-t border-[#E7E4EB] pt-6 sm:mt-10 sm:pt-8">
              <div
                aria-hidden="true"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[#D8D1E3] bg-[#F8F6FA] font-serif text-lg font-bold text-[#513A76] sm:h-16 sm:w-16"
              >
                {initials}
              </div>
              <div className="min-w-0">
                <cite className="block truncate font-serif text-xl font-bold not-italic text-[#17171B] sm:text-2xl">
                  {activeReview.name}
                </cite>
                <span className="mt-1 block text-xs text-[#6A6870]">Source-site excerpt</span>
              </div>
            </div>
          </article>

          <div className="mt-6 flex items-center justify-center gap-4 sm:mt-8 sm:gap-6">
            <button
              type="button"
              onClick={showPrevious}
              aria-label="Show previous testimonial"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/80 text-white transition-colors hover:bg-white hover:text-[#1B2353] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58A363] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B2353] sm:h-14 sm:w-14"
            >
              <ChevronLeft aria-hidden="true" className="h-6 w-6" />
            </button>
            <span className="min-w-14 text-center text-xs font-semibold tabular-nums text-blue-100">
              {activeIndex + 1} / {REVIEWS.length}
            </span>
            <button
              type="button"
              onClick={showNext}
              aria-label="Show next testimonial"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/80 text-white transition-colors hover:bg-white hover:text-[#1B2353] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#58A363] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B2353] sm:h-14 sm:w-14"
            >
              <ChevronRight aria-hidden="true" className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
