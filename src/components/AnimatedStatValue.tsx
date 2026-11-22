import { useEffect, useRef, useState } from "react";

type Props = { value: string };

export default function AnimatedStatValue({ value }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const raw = value.replace(/[^0-9]/g, "");
    const target = Number(raw);
    if (!Number.isFinite(target) || target <= 0) return;
    const prefix = value.startsWith("$") ? "$" : "";
    const suffix = value.endsWith("+") ? "+" : "";
    const formatter = new Intl.NumberFormat("en-US");
    let frame = 0;
    let observer: IntersectionObserver | undefined;
    let started = false;

    const animate = () => {
      if (started) return;
      started = true;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setDisplay(value);
        return;
      }
      const start = performance.now();
      const duration = 1250;
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        const current = Math.round(target * eased);
        setDisplay(`${prefix}${formatter.format(current)}${suffix}`);
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    if ("IntersectionObserver" in window && ref.current) {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          animate();
          observer?.disconnect();
        }
      }, { threshold: 0.35 });
      observer.observe(ref.current);
    } else {
      animate();
    }

    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return <span ref={ref}>{display}</span>;
}
