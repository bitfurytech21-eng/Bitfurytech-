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
    box: "bg-white border-slate-200 text-slate-800",
    icon: <Info className="w-4 h-4 text-[#294158] shrink-0 mt-0.5" />,
  },
  success: {
    box: "bg-emerald-50 border-emerald-200 text-emerald-800",
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
  },
  warning: {
    box: "bg-amber-50 border-amber-200 text-amber-800",
    icon: <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
  },
  error: {
    box: "bg-rose-50 border-rose-200 text-rose-800",
    icon: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />,
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
      className={`border rounded-md px-4 py-3.5 flex items-start justify-between gap-4 shadow-xs ${style.box}`}
    >
      <div className="flex items-start gap-2.5 text-xs leading-relaxed">
        {style.icon}
        <div className="space-y-0.5">
          {title && <p className="font-semibold text-sm">{title}</p>}
          <div>{message}</div>
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer shrink-0"
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
    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
      <Loader2
        className={`${size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} animate-spin text-[#1e2b3c]`}
      />
      {label && <span>{label}</span>}
    </span>
  );
}

export function SkeletonBlock({ className = "h-12 w-full" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`bg-slate-200/70 animate-pulse rounded-md ${className}`}
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
  const titleClass = tone === "dark" ? "text-white" : "text-slate-900";
  const descClass = tone === "dark" ? "text-slate-400" : "text-slate-500";
  const iconWrap =
    tone === "dark"
      ? "bg-white/5 border border-white/10 text-yellow-400"
      : "bg-slate-100 border border-slate-200 text-slate-500";

  return (
    <div className="py-8 px-4 text-center space-y-3">
      <div className={`w-10 h-10 rounded-md mx-auto flex items-center justify-center ${iconWrap}`}>
        <Inbox className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <p className={`text-sm font-semibold ${titleClass}`}>{title}</p>
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
      className="bg-rose-50 border border-rose-200 rounded-md p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-sm font-bold text-slate-900">{title}</p>
          <p className="text-xs text-rose-700">{message}</p>
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
      ? "text-emerald-600"
      : status === "Rejected"
        ? "text-rose-600"
        : status === "Pending"
          ? "text-amber-600"
          : "text-slate-600";

  return <span className={`text-xs font-semibold ${color}`}>{status}</span>;
}
