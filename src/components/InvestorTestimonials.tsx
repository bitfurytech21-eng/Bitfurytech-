import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const reviews = [
  { name: 'Jenifer Smit', photo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_8251-lYNLlVcetPoC7Keg9SBkDZ4OyvMGYL.jpeg', localPhoto: '/images/testimonials/jenifer.jpeg', scale: 2.4, topic: 'Asset management', quote: 'I have never trusted any investment platform before, but Bitfury Tech Investments changed everything. They manage my assets and funds.' },
  { name: 'Mr. Kelvin', topic: 'Deposits and withdrawals', quote: 'I am happy I found Bitfury Tech Investments. They keep exceeding my expectations, and I have found deposits and withdrawals quick.' },
  { name: 'Richard', topic: 'Trading session insights', quote: 'I appreciate the insights shared in each trading session report and look forward to continued investments together.' },
  { name: 'Micheal Abraham', photo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_8253-tE0yfRY2SZwnwq0iKEUxQ1pOSEacBf.jpeg', localPhoto: '/images/testimonials/micheal.jpeg', scale: 1, topic: 'Account updates', quote: 'I received my investment account update this morning, and I am pleased with the work being done. I would like to invest more in future opportunities.' },
  { name: 'Joseph Bricks', topic: 'Attention to detail', quote: 'For me, investing is about trust, ability, affinity and availability. I have found the team attentive to detail and focused on their clients.' },
];

export default function InvestorTestimonials() {
  const [index, setIndex] = useState(0);
  const review = reviews[index];
  const change = (delta: number) => setIndex(value => (value + delta + reviews.length) % reviews.length);
  const control = 'grid size-11 place-items-center rounded-full border border-white/40 text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white';

  return <section aria-labelledby="investor-testimonials-heading" className="bg-linear-to-br from-[#1e374b] to-[#30546a] text-white">
    <div className="mx-auto max-w-6xl px-6 py-14 sm:px-12 sm:py-20">
      <header>
        <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[.15em]"><span aria-hidden="true" className="h-0.5 w-12 bg-[#ec8094]" />Investor testimonials</p>
        <h2 id="investor-testimonials-heading" className="mt-5 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">In our investors’<br /><span className="text-[#ec8094]">own words</span></h2>
      </header>
      <figure aria-live="polite" aria-atomic="true" className="mx-auto mt-12 flex max-w-2xl flex-col items-center text-center sm:mt-16">
        <div aria-hidden="true" className="grid size-28 place-items-center overflow-hidden rounded-full border border-white/25 bg-[#324e62] font-serif text-4xl text-white sm:size-36">{review.photo ? <img key={review.photo} src={review.photo} alt="" loading="lazy" className="size-full object-cover" style={{ transform: `scale(${review.scale})` }} onError={event => { if (review.localPhoto && !event.currentTarget.src.endsWith(review.localPhoto)) event.currentTarget.src = review.localPhoto; }} /> : review.name.split(' ').map(part => part[0]).join('')}</div>
        <h3 className="mt-6 text-2xl font-bold tracking-tight text-[#ec8094] sm:text-3xl">{review.topic}</h3>
        <blockquote className="mt-4 text-lg leading-relaxed text-white sm:text-xl">“{review.quote}”</blockquote>
        <figcaption className="mt-5 text-sm font-semibold">{review.name}</figcaption>
      </figure>
      <div className="mt-7 flex items-center justify-center gap-5"><button type="button" className={control} onClick={() => change(-1)} aria-label="Show previous testimonial"><ChevronLeft size={19} /></button><span className="text-xs tabular-nums">{index + 1} / {reviews.length}</span><button type="button" className={control} onClick={() => change(1)} aria-label="Show next testimonial"><ChevronRight size={19} /></button></div>
      <p className="mx-auto mt-10 max-w-2xl border-t border-white/20 pt-5 text-center text-xs leading-relaxed text-slate-200">These excerpts are reproduced from the previous public website and have not been independently verified. They are individual opinions, not representative results or guarantees. Investing involves risk and outcomes vary.</p>
    </div>
  </section>;
}
