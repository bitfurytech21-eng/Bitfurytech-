import { useRef, useState } from "react";
import { Film, Play, RotateCcw } from "lucide-react";

interface VideoChapter {
  id: string;
  label: string;
  timeLabel: string;
  startSec: number;
}

const VIDEO_CHAPTERS: VideoChapter[] = [
  { id: "overview", label: "Firm Overview", timeLabel: "0:00", startSec: 0 },
  { id: "crypto", label: "Digital Assets", timeLabel: "0:06", startSec: 6 },
  { id: "equities", label: "Global Equities", timeLabel: "0:12", startSec: 12 },
  { id: "estate", label: "Real Estate", timeLabel: "0:18", startSec: 18 },
  { id: "portal", label: "Portal & Records", timeLabel: "0:24", startSec: 23.5 },
];

export default function CompanyOverviewVideo({
  videoSrc = "/videos/bitfury-company-overview.mp4",
  posterSrc = "/images/corporate-video-poster.jpg",
}: {
  videoSrc?: string;
  posterSrc?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [hasError, setHasError] = useState(false);

  const handlePlay = async () => {
    const el = videoRef.current;
    if (!el) return;
    setHasStarted(true);
    try {
      await el.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const handleJumpToChapter = async (startSec: number) => {
    const el = videoRef.current;
    if (!el) return;
    setHasStarted(true);
    el.currentTime = startSec;
    setCurrentTime(startSec);
    try {
      await el.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const activeChapter = [...VIDEO_CHAPTERS]
    .reverse()
    .find((ch) => currentTime >= ch.startSec) ?? VIDEO_CHAPTERS[0];

  return (
    <div className="space-y-3">
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
          onPlay={() => {
            setHasStarted(true);
            setIsPlaying(true);
          }}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onError={() => setHasError(true)}
        >
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support HTML5 video playback.
        </video>

        {!hasStarted && !hasError && (
          <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-[#0E2534]/90 via-[#0E2534]/35 to-[#0E2534]/30 p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded bg-[#102F43]/90 px-2.5 py-1 text-[11px] font-heading font-bold uppercase tracking-wider text-white border border-white/15">
                <Film className="h-3.5 w-3.5 text-[#E94D65]" aria-hidden="true" />
                Company Video
              </span>
              <span className="rounded bg-[#102F43]/90 px-2.5 py-1 text-[11px] font-mono font-semibold text-slate-100 border border-white/15">
                0:29 HD
              </span>
            </div>

            <div className="flex items-center justify-center">
              <button
                type="button"
                onClick={handlePlay}
                aria-label="Play Bitfury Tech Investment company introduction video"
                className="group flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-[#E94D65] text-white shadow-[0_10px_30px_rgba(233,77,101,0.45)] ring-4 ring-white/25 transition-transform duration-200 hover:scale-105 hover:bg-[#D43B53] focus:outline-none focus-visible:ring-white cursor-pointer"
              >
                <Play className="h-7 w-7 sm:h-8 sm:w-8 translate-x-0.5 fill-current" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-1 text-white">
              <p className="text-[11px] font-heading font-bold uppercase tracking-wider text-[#FFD0D7]">
                Bitfury Tech Investment
              </p>
              <p className="text-sm sm:text-base font-heading font-semibold text-white">
                Multi-Asset Platform, Research Discipline &amp; Custody Overview
              </p>
            </div>
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

      {/* Chapter quick-jump bar */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Video chapters">
        {VIDEO_CHAPTERS.map((chapter) => {
          const active = hasStarted && activeChapter.id === chapter.id;
          return (
            <button
              key={chapter.id}
              type="button"
              onClick={() => void handleJumpToChapter(chapter.startSec)}
              className={`inline-flex items-center gap-1.5 rounded-[5px] border px-2.5 py-1.5 text-[11px] font-medium transition-colors cursor-pointer ${
                active
                  ? "border-[#1B4962] bg-[#1B4962] text-white"
                  : "border-[#DCE4EC] bg-[#F6F8FA] text-[#46596B] hover:border-[#1B4962]/50 hover:text-[#102030]"
              }`}
            >
              <span className="font-mono text-[10px] opacity-80">{chapter.timeLabel}</span>
              <span>{chapter.label}</span>
              {active && isPlaying && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#E94D65]" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
