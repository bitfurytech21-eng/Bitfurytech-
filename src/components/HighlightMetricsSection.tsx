import { motion, useReducedMotion } from "motion/react";
import AnimatedStatValue from "./AnimatedStatValue";

const HIGHLIGHT_METRICS = [
  {
    id: "horizon",
    stat: "9+",
    statLabel: "Years Track Record",
    title: "Time Horizon & Discipline",
    description:
      "Structured investment cycles and holding periods guided by quantitative research since 2017.",
    image: "/assets/aistudio/IMG_8219_53374a3a.jpeg",
    imageAlt: "Time horizon circular progress badge with hourglass icon",
    imgClass: "object-cover object-center scale-[1.03]",
  },
  {
    id: "growth",
    stat: "50+",
    statLabel: "Financial Markets",
    title: "Multi-Market Growth",
    description:
      "Unified participation across digital assets, global equities, and commercial property opportunities.",
    image: "/assets/aistudio/IMG_8218_28e30358.jpeg",
    imageAlt: "Growth circular progress badge with ascending bar chart icon",
    imgClass: "object-cover object-center scale-[1.04]",
  },
  {
    id: "global",
    stat: "3",
    statLabel: "Global Regions",
    title: "Worldwide Client Reach",
    description:
      "Coordinated investor onboarding, settlement verification, and support across North America, Europe, and Asia-Pacific.",
    image: "/assets/aistudio/IMG_8217_87606f6e.jpeg",
    imageAlt: "Global reach circular progress badge with globe and investor group icon",
    imgClass: "object-cover object-[50%_54%] scale-[1.05]",
  },
] as const;

export default function HighlightMetricsSection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section
      aria-labelledby="platform-highlights-heading"
      className="relative isolate overflow-hidden bg-[#F6F8FA] border-b border-[#DCE4EC]"
    >
      <img
        src="/assets/aistudio/IMG_8225_3a0fd053.png"
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="pointer-events-none select-none absolute left-0 top-0 h-80 w-auto opacity-80 brightness-[0.92]"
      />
      <img
        src="/assets/aistudio/IMG_8225_3a0fd053.png"
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        className="pointer-events-none select-none hidden md:block absolute right-0 bottom-0 h-80 w-auto -scale-x-100 opacity-80 brightness-[0.92]"
      />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-10">
        <div className="max-w-3xl mx-auto text-center space-y-2">
          <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
            Platform Scale &amp; Perspective
          </p>
          <h2
            id="platform-highlights-heading"
            className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-[#102030]"
          >
            Built for Long-Term Portfolio Clarity
          </h2>
          <p className="text-sm text-[#5A6B7C] leading-relaxed">
            Quantitative research, diversified market access, and regional client support combined
            in one structured platform.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {HIGHLIGHT_METRICS.map((item, idx) => (
            <motion.article
              key={item.id}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{
                duration: 0.5,
                delay: idx * 0.12,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="bg-white border border-[#DCE4EC] rounded-[5px] p-7 sm:p-8 flex flex-col items-center text-center shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
            >
              <motion.div
                initial={prefersReducedMotion ? false : { scale: 0.88, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                whileHover={prefersReducedMotion ? undefined : { scale: 1.04 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{
                  duration: 0.55,
                  delay: idx * 0.12 + 0.08,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="relative mx-auto h-40 w-40 sm:h-44 sm:w-44 shrink-0"
              >
                {!prefersReducedMotion && (
                  <motion.div
                    aria-hidden="true"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 16,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="pointer-events-none absolute -inset-2 rounded-full border border-dashed border-[#E94D65]/35"
                  />
                )}

                <div className="relative h-full w-full overflow-hidden rounded-full bg-white shadow-[0_6px_22px_rgba(27,73,98,0.08)]">
                  <img
                    src={item.image}
                    alt={item.imageAlt}
                    loading="lazy"
                    decoding="async"
                    className={`h-full w-full ${item.imgClass}`}
                  />

                  {!prefersReducedMotion && (
                    <motion.div
                      aria-hidden="true"
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 9,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      className="pointer-events-none absolute inset-0 rounded-full"
                      style={{
                        background:
                          "conic-gradient(from 0deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,0.42) 38deg, rgba(255,255,255,0) 76deg)",
                        WebkitMaskImage:
                          "radial-gradient(circle, transparent 60%, black 63%, black 98%, transparent 100%)",
                        maskImage:
                          "radial-gradient(circle, transparent 60%, black 63%, black 98%, transparent 100%)",
                      }}
                    />
                  )}
                </div>
              </motion.div>

              <div className="mt-6 space-y-2">
                <p className="text-2xl sm:text-3xl font-heading font-extrabold tabular-nums text-[#1B4962]">
                  <AnimatedStatValue value={item.stat} />{" "}
                  <span className="text-sm font-bold uppercase tracking-wider text-[#B92841] align-middle">
                    {item.statLabel}
                  </span>
                </p>
                <h3 className="text-lg font-heading font-bold text-[#102030]">
                  {item.title}
                </h3>
                <p className="text-sm text-[#5A6B7C] leading-relaxed">
                  {item.description}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
