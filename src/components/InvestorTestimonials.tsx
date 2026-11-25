import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const reviews = [
  { name: 'Jenifer Smit', photo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_8251-lYNLlVcetPoC7Keg9SBkDZ4OyvMGYL.jpeg', localPhoto: '/images/testimonials/jenifer.jpeg', scale: 2.4, topic: 'Asset management', quote: 'I have never trusted any investment platform before, but Bitfury Tech Investments changed everything. They manage my assets and funds.' },
  { name: 'Mr. Kelvin', photo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_8249-6lMgLJVH2n11TPwEdXfbrJY4RyF6FR.jpeg', localPhoto: '/images/testimonials/kelvin.jpeg', scale: 1.25, topic: 'Deposits and withdrawals', quote: 'I am happy I found Bitfury Tech Investments. They keep exceeding my expectations, and I have found deposits and withdrawals quick.' },
  { name: 'Richard', photo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_8247-uT4OemEHMu22H8ENr53PZ3fGNktM3t.jpeg', localPhoto: '/images/testimonials/richard.jpeg', scale: 1.25, topic: 'Trading session insights', quote: 'I appreciate the insights shared in each trading session report and look forward to continued investments together.' },
  { name: 'Micheal Abraham', photo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_8253-tE0yfRY2SZwnwq0iKEUxQ1pOSEacBf.jpeg', localPhoto: '/images/testimonials/micheal.jpeg', scale: 1, topic: 'Account updates', quote: 'I received my investment account update this morning, and I am pleased with the work being done. I would like to invest more in future opportunities.' },
  { name: 'Joseph', photo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_8255-YDbYKED2AcxTmzrQKUohEXwpleJv8A.jpeg', localPhoto: '/images/testimonials/joseph.jpeg', scale: 1, topic: 'Attention to detail', quote: 'For me, investing is about trust, ability, affinity and availability. I have found the team attentive to detail and focused on their clients.' },
];

export default function InvestorTestimonials() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const review = reviews[index];

  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      setIndex(value => (value + 1) % reviews.length);
    }, 5000);
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
    if (Math.abs(delta) < 40) return;
    setIndex(value => (delta < 0 ? (value + 1) % reviews.length : (value - 1 + reviews.length) % reviews.length));
  };

  return (
    <section
      aria-labelledby="investor-testimonials-heading"
      className="bg-linear-to-br from-[#1e374b] to-[#30546a] text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="mx-auto max-w-6xl px-6 py-14 sm:px-12 sm:py-20">
        <header>
          <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[.15em]"><span aria-hidden="true" className="h-0.5 w-12 bg-[#ec8094]" />Investor testimonials</p>
          <h2 id="investor-testimonials-heading" className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">In our investors’<br /><span className="text-[#ec8094]">own words</span></h2>
        </header>
        <AnimatePresence mode="wait">
          <motion.figure
            key={review.name}
            aria-live="polite"
            aria-atomic="true"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto mt-12 flex max-w-2xl flex-col items-center text-center sm:mt-16"
          >
            <div aria-hidden="true" className="grid size-28 place-items-center overflow-hidden rounded-full border border-white/25 bg-[#324e62] font-serif text-4xl text-white sm:size-36">
              {review.photo ? (
                <img
                  key={review.photo}
                  src={review.photo}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                  style={{ transform: `scale(${review.scale})` }}
                  onError={event => {
                    if (review.localPhoto && !event.currentTarget.src.endsWith(review.localPhoto)) {
                      event.currentTarget.src = review.localPhoto;
                    }
                  }}
                />
              ) : (
                review.name.split(' ').map(part => part[0]).join('')
              )}
            </div>
            <h3 className="mt-6 text-2xl font-bold tracking-tight text-[#ec8094] sm:text-3xl">{review.topic}</h3>
            <blockquote className="mt-4 text-lg leading-relaxed text-white sm:text-xl">“{review.quote}”</blockquote>
            <figcaption className="mt-5 text-sm font-semibold">{review.name}</figcaption>
          </motion.figure>
        </AnimatePresence>
        <p className="mx-auto mt-10 max-w-2xl border-t border-white/20 pt-5 text-center text-xs leading-relaxed text-slate-200">⭐⭐⭐⭐.</p>
      </div>
    </section>
  );
}
