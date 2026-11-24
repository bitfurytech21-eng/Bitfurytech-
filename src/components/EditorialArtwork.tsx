const sources = {
  strategy: ['/assets/aistudio/IMG_8228_9767fe80.jpeg', 297],
  advisory: ['/assets/aistudio/IMG_8227_e4587f2d.jpeg', 300],
  horizon: ['/assets/aistudio/IMG_8219_53374a3a.jpeg', 1284],
  growth: ['/assets/aistudio/IMG_8218_28e30358.jpeg', 1284],
} as const;

// Square viewports isolate each drawing from the whitespace in the supplied sheets.
const frames = {
  team: ['strategy', 60, 271, 234],
  strategy: ['strategy', 60, 807, 234],
  mission: ['strategy', 60, 1258, 234],
  oversight: ['advisory', 39, 46, 234],
  analysis: ['advisory', 39, 521, 234],
  advisory: ['advisory', 39, 1121, 234],
  horizon: ['horizon', 481, 460, 322],
  growth: ['growth', 481, 433, 322],
} as const;

export type ArtworkName = keyof typeof frames;

export function EditorialIcon({ name, className = 'size-12' }: { name: ArtworkName; className?: string }) {
  const [source, x, y, size] = frames[name];
  const [url, width] = sources[source];
  return (
    <span aria-hidden="true" className={`relative block shrink-0 overflow-hidden mix-blend-multiply ${className}`}>
      <img
        src={url}
        alt=""
        loading="lazy"
        decoding="async"
        className="absolute h-auto max-w-none"
        style={{ width: `${(width / size) * 100}%`, left: `${(-x / size) * 100}%`, top: `${(-y / size) * 100}%` }}
      />
    </span>
  );
}

export function OfficeMap() {
  return (
    <img
      src="/assets/aistudio/location-map.jpeg"
      alt="Our locations: illustrated world map"
      width={1284}
      height={646}
      loading="lazy"
      decoding="async"
      className="mb-3 h-auto w-full rounded-[5px]"
    />
  );
}

