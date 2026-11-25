import type { ComponentType } from "react";

export type DashboardSymbolTone = "green" | "red" | "amber" | "navy";
export type DashboardSymbolSize = "sm" | "md" | "lg";

const TONE_CLASSES: Record<DashboardSymbolTone, string> = {
  green: "bg-[#57C84D] text-white shadow-[0_2px_6px_rgba(87,200,77,0.22)]",
  red: "bg-[#E25B63] text-white shadow-[0_2px_6px_rgba(226,91,99,0.22)]",
  amber: "bg-[#F2AC4E] text-white shadow-[0_2px_6px_rgba(242,172,78,0.24)]",
  navy: "bg-[#334E83] text-white shadow-[0_2px_6px_rgba(51,78,131,0.22)]",
};

const SIZE_CLASSES: Record<DashboardSymbolSize, { box: string; icon: string }> = {
  sm: { box: "h-9 w-9 rounded-lg", icon: "h-4.5 w-4.5" },
  md: { box: "h-10 w-10 rounded-lg", icon: "h-5 w-5" },
  lg: { box: "h-12 w-12 sm:h-14 sm:w-14 rounded-lg", icon: "h-6 w-6 sm:h-7 sm:w-7" },
};

export interface DashboardSymbolProps {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  tone?: DashboardSymbolTone;
  size?: DashboardSymbolSize;
  className?: string;
}

export function DashboardSymbol({
  icon: Icon,
  tone = "navy",
  size = "lg",
  className = "",
}: DashboardSymbolProps) {
  const sizeSpec = SIZE_CLASSES[size];
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center ${sizeSpec.box} ${TONE_CLASSES[tone]} ${className}`.trim()}
    >
      <Icon className={sizeSpec.icon} strokeWidth={2.2} />
    </div>
  );
}
