import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const COMPANIES = [
  { name: "Strabella", detail: "Finance & Banking", image: "/images/partners/strabella.png" },
  { name: "Femo Int.", detail: "Hotel & Resort", image: "/images/partners/femo-international.png" },
  { name: "Findsimple", detail: "", image: "/images/partners/findsimple.png" },
  { name: "Intelliro", detail: "", image: "/images/partners/intelliro.png" },
];

export default function CompanyLogoSlideshow() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const activeCompany = COMPANIES[activeIndex];

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % COMPANIES.length);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [paused]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 35) return;
    setActiveIndex((prev) =>
      delta < 0
        ? (prev + 1) % COMPANIES.length
        : (prev - 1 + COMPANIES.length) % COMPANIES.length
    );
  };

  return (
    <section
      aria-labelledby="company-logos-heading"
      className="border-y border-[#DCE4EC] bg-[#F6F8FA]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-2 text-center">
          <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
            Company directory
          </p>
          <h2
            id="company-logos-heading"
            className="text-2xl font-heading font-bold tracking-tight text-[#102030] sm:text-3xl"
          >
            Companies and services
          </h2>
        </div>

        <div
          className="mx-auto mt-8 max-w-xl"
          role="region"
          aria-roledescription="carousel"
          aria-label="Company logos"
        >
          <div
            id="company-logo-slide"
            className="flex min-h-36 min-w-0 flex-col items-center justify-center rounded-xl border border-[#DCE4EC] bg-white px-6 py-5 shadow-[0_2px_8px_rgba(27,73,98,0.06)] sm:min-h-40 overflow-hidden"
            role="group"
            aria-roledescription="slide"
            aria-label={`Company logo: ${activeCompany.name}`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCompany.name}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-center justify-center gap-3 text-center"
              >
                <img
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
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          Showing {activeCompany.name}.
        </p>
      </div>
    </section>
  );
}
