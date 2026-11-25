import React from "react";

export interface CardProps {
  tone?: "light" | "dark";
  padding?: "none" | "sm" | "md" | "lg";
  className?: string;
  children: React.ReactNode;
}

const PADDING_MAP = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6 sm:p-7",
};

export function Card({
  tone = "light",
  padding = "none",
  className = "",
  children,
}: CardProps) {
  const toneStyles =
    tone === "dark"
      ? "bg-[#1B4962] border border-white/15 text-white rounded-[5px] shadow-[0_2px_8px_rgba(16,32,48,0.12)]"
      : "bg-white border border-[#DCE4EC] text-[#102030] rounded-[5px] shadow-[0_2px_8px_rgba(16,32,48,0.05)]";

  return (
    <section className={`min-w-0 w-full ${toneStyles} ${PADDING_MAP[padding]} ${className}`.trim()}>
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  tone = "light",
  className = "",
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  tone?: "light" | "dark";
  className?: string;
}) {
  const borderClass = tone === "dark" ? "border-white/15" : "border-[#DCE4EC]";
  const titleClass = tone === "dark" ? "text-white" : "text-[#102030]";
  const subClass = tone === "dark" ? "text-slate-200" : "text-[#5A6B7C]";

  return (
    <div
      className={`px-4 sm:px-5 py-4 border-b ${borderClass} flex flex-wrap items-center justify-between gap-3 min-w-0 ${className}`.trim()}
    >
      <div className="min-w-0">
        <h2 className={`text-sm font-bold font-heading ${titleClass}`}>{title}</h2>
        {subtitle && <p className={`text-xs mt-0.5 ${subClass}`}>{subtitle}</p>}
      </div>
      {action && <div className="shrink-0 max-w-full">{action}</div>}
    </div>
  );
}

export function CardBody({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`min-w-0 p-4 sm:p-5 ${className}`.trim()}>{children}</div>;
}
