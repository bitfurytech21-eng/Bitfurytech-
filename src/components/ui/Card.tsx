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
      ? "bg-[#0b1129] border border-white/10 text-white rounded-xl"
      : "bg-white border border-slate-200 text-slate-900 rounded-md shadow-xs";

  return (
    <section className={`${toneStyles} ${PADDING_MAP[padding]} ${className}`.trim()}>
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
  const borderClass = tone === "dark" ? "border-white/10" : "border-slate-200";
  const titleClass = tone === "dark" ? "text-white" : "text-slate-900";
  const subClass = tone === "dark" ? "text-slate-400" : "text-slate-500";

  return (
    <div
      className={`px-5 py-4 border-b ${borderClass} flex flex-wrap items-center justify-between gap-3 ${className}`.trim()}
    >
      <div className="min-w-0">
        <h2 className={`text-sm font-bold ${titleClass}`}>{title}</h2>
        {subtitle && <p className={`text-xs mt-0.5 ${subClass}`}>{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
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
  return <div className={`p-5 ${className}`.trim()}>{children}</div>;
}
