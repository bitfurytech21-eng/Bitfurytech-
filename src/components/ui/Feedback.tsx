import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Inbox,
  Info,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { Button } from "./Button";

export type BannerTone = "info" | "success" | "warning" | "error";

const BANNER_STYLES: Record<BannerTone, { box: string; icon: React.ReactNode }> = {
  info: {
    box: "bg-white border-[#DCE4EC] text-[#102030]",
    icon: <Info className="w-4 h-4 text-[#1B4962] shrink-0 mt-0.5" />,
  },
  success: {
    box: "bg-emerald-50 border-emerald-200 text-emerald-900",
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />,
  },
  warning: {
    box: "bg-amber-50 border-amber-200 text-amber-900",
    icon: <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />,
  },
  error: {
    box: "bg-[#FDF1F3] border-[#E94D65]/40 text-[#9F1239]",
    icon: <AlertCircle className="w-4 h-4 text-[#E94D65] shrink-0 mt-0.5" />,
  },
};

export function NotificationBanner({
  tone = "info",
  title,
  message,
  onDismiss,
}: {
  tone?: BannerTone;
  title?: string;
  message: React.ReactNode;
  onDismiss?: () => void;
}) {
  const style = BANNER_STYLES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`border rounded-[5px] px-4 py-3.5 flex items-start justify-between gap-4 shadow-[0_2px_8px_rgba(16,32,48,0.04)] ${style.box}`}
    >
      <div className="flex items-start gap-2.5 text-xs leading-relaxed">
        {style.icon}
        <div className="space-y-0.5">
          {title && <p className="font-semibold font-heading text-sm">{title}</p>}
          <div>{message}</div>
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="p-1 text-[#5A6B7C] hover:text-[#102030] cursor-pointer shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function Spinner({
  label,
  size = "md",
}: {
  label?: string;
  size?: "sm" | "md";
}) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-[#3B4C5E]">
      <Loader2
        className={`${size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} animate-spin text-[#1B4962]`}
      />
      {label && <span>{label}</span>}
    </span>
  );
}

export function SkeletonBlock({ className = "h-12 w-full" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`bg-slate-200/75 animate-pulse rounded-[5px] ${className}`}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
  tone = "light",
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  tone?: "light" | "dark";
}) {
  const titleClass = tone === "dark" ? "text-white" : "text-[#102030]";
  const descClass = tone === "dark" ? "text-slate-200" : "text-[#5A6B7C]";
  const iconWrap =
    tone === "dark"
      ? "bg-white/10 border border-white/20 text-[#E94D65]"
      : "bg-[#EDF3F7] border border-[#DCE4EC] text-[#1B4962]";

  return (
    <div className="py-8 px-4 text-center space-y-3">
      <div className={`w-10 h-10 rounded-[5px] mx-auto flex items-center justify-center ${iconWrap}`}>
        <Inbox className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <p className={`text-sm font-bold font-heading ${titleClass}`}>{title}</p>
        <p className={`text-xs max-w-sm mx-auto leading-relaxed ${descClass}`}>{description}</p>
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Unable to Load Records",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="bg-[#FDF1F3] border border-[#E94D65]/40 rounded-[5px] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#E94D65] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-sm font-bold font-heading text-[#102030]">{title}</p>
          <p className="text-xs text-[#9F1239]">{message}</p>
        </div>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </Button>
      )}
    </div>
  );
}

export function StatusText({
  status,
}: {
  status: "Completed" | "Active" | "Open" | "Pending" | "Rejected" | "Fully Subscribed" | string;
}) {
  const color =
    status === "Completed" || status === "Active" || status === "Open"
      ? "text-emerald-700"
      : status === "Rejected"
        ? "text-[#BE123C]"
        : status === "Pending"
          ? "text-amber-700"
          : "text-[#3B4C5E]";

  return <span className={`text-xs font-semibold ${color}`}>{status}</span>;
}
