const iconUrls = {
  team: "/assets/editorial/team.png",
  strategy: "/assets/editorial/strategy.png",
  mission: "/assets/editorial/mission.png",
  oversight: "/assets/editorial/oversight.png",
  analysis: "/assets/editorial/analysis.png",
  advisory: "/assets/editorial/advisory.png",
  horizon: "/assets/editorial/horizon.png",
  growth: "/assets/editorial/growth.png",
} as const;

export type ArtworkName = keyof typeof iconUrls;

export function EditorialIcon({ name, className = "size-12" }: { name: ArtworkName; className?: string }) {
  return (
    <span aria-hidden="true" className={`relative flex shrink-0 items-center justify-center overflow-hidden ${className}`}>
      <img
        src={iconUrls[name]}
        alt=""
        width={240}
        height={240}
        decoding="async"
        className="h-full w-full object-contain"
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

