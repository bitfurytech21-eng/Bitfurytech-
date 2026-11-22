import { useState } from "react";
import { Building2 } from "lucide-react";

interface ResilientImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

export default function ResilientImage({
  src,
  alt,
  className = "w-full h-full object-cover",
  fallbackLabel = "BitfuryTech Asset",
}: ResilientImageProps) {
  const [failed, setFailed] = useState(!src);

  if (failed || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`bg-[#EDF3F7] border border-[#DCE4EC] flex flex-col items-center justify-center gap-2 p-6 text-center ${className}`}
      >
        <Building2 className="w-8 h-8 text-[#1B4962]" />
        <span className="text-xs font-medium text-[#3B4C5E]">{fallbackLabel}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
