const sources = {
  strategy: ['https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_8228-YLS0u0g6Wb57wTyYOT9KX1ScJ5Bsfk.jpeg', 'strategy-icons', 297],
  advisory: ['https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_8227-xymXQEPyew6WXbR03nNIavMdtjQ1aN.jpeg', 'advisory-icons', 300],
  horizon: ['https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_8219-3sp9vgKV2IkbYpJq1i3CdC3tGAiXdI.jpeg', 'time-horizon', 1284],
  growth: ['https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_8218-2wmjj7BDEWHKgyT6QFQtqRMv8hjdnZ.jpeg', 'growth', 1284],
} as const;

// Square viewports isolate each drawing from the whitespace in the supplied sheets.
const frames = {
  team: ['strategy', 60, 271, 234],
  strategy: ['strategy', 60, 807, 234],
  mission: ['strategy', 60, 1273, 234],
  oversight: ['advisory', 39, 46, 234],
  analysis: ['advisory', 39, 521, 234],
  advisory: ['advisory', 39, 1121, 234],
  horizon: ['horizon', 481, 460, 322],
  growth: ['growth', 481, 433, 322],
} as const;

export type ArtworkName = keyof typeof frames;

export function EditorialIcon({ name, className = 'size-12' }: { name: ArtworkName; className?: string }) {
  const [source, x, y, size] = frames[name];
  const [url, file, width] = sources[source];
  return <span aria-hidden="true" className={`relative block shrink-0 overflow-hidden mix-blend-multiply ${className}`}>
    <img src={url} alt="" loading="lazy" decoding="async" className="absolute h-auto max-w-none" style={{ width: `${width / size * 100}%`, left: `${-x / size * 100}%`, top: `${-y / size * 100}%` }} onError={e => { const local = `/assets/aistudio/${file}.jpeg`; if (!e.currentTarget.src.endsWith(local)) e.currentTarget.src = local; }} />
  </span>;
}

export function OfficeMap() {
  return <img src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IMG_8222-Gmb0Pg3naXryZpEa1gvwuiImtl0SXT.jpeg" alt="Our locations: illustrated world map" width={1284} height={646} loading="lazy" decoding="async" className="mb-3 h-auto w-full rounded-[5px]" onError={e => { const local = '/assets/aistudio/location-map.jpeg'; if (!e.currentTarget.src.endsWith(local)) e.currentTarget.src = local; }} />;
}
