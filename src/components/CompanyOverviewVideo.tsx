import { useRef, useState } from "react";
import { Play, RotateCcw } from "lucide-react";

export default function CompanyOverviewVideo({
  videoSrc = "/videos/bitfury-company-overview.mp4",
  posterSrc = "/images/corporate-video-poster.jpg",
}: {
  videoSrc?: string;
  posterSrc?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handlePlay = async () => {
    const el = videoRef.current;
    if (!el) return;
    setHasStarted(true);
    try {
      await el.play();
    } catch {
      // Browser autoplay or playback interaction guard handled by native controls
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#DCE4EC] bg-[#102030] shadow-[0_6px_24px_rgba(16,32,48,0.12)]">
      <video
        ref={videoRef}
        className="aspect-[16/9] w-full bg-[#0E2534] object-cover"
        src={videoSrc}
        poster={posterSrc}
        controls={hasStarted}
        playsInline
        preload="metadata"
        aria-label="Bitfury Tech Investment company overview video"
        onPlay={() => setHasStarted(true)}
        onError={() => setHasError(true)}
      >
        <source src={videoSrc} type="video/mp4" />
        Your browser does not support HTML5 video playback.
      </video>

      {!hasStarted && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0E2534]/20">
          <button
            type="button"
            onClick={handlePlay}
            aria-label="Play Bitfury Tech Investment company introduction video"
            className="group flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-[#E94D65] text-white shadow-[0_10px_30px_rgba(233,77,101,0.45)] ring-4 ring-white/25 transition-transform duration-200 hover:scale-105 hover:bg-[#D43B53] focus:outline-none focus-visible:ring-white cursor-pointer"
          >
            <Play className="h-7 w-7 sm:h-8 sm:w-8 translate-x-0.5 fill-current" aria-hidden="true" />
          </button>
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#102030]/95 p-6 text-center text-white">
          <p className="text-sm font-heading font-semibold">
            Unable to load video stream in this browser.
          </p>
          <button
            type="button"
            onClick={() => {
              setHasError(false);
              videoRef.current?.load();
            }}
            className="inline-flex items-center gap-2 rounded bg-[#E94D65] px-4 py-2 text-xs font-heading font-bold text-white hover:bg-[#D43B53] cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Retry Playback</span>
          </button>
        </div>
      )}
    </div>
  );
}
