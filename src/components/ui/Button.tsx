import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "gold"
  | "secondary"
  | "outline"
  | "outlineDark"
  | "ghost"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-[#1e2b3c] hover:bg-[#294158] text-white border border-transparent",
  gold:
    "bg-yellow-400 hover:bg-yellow-300 text-slate-950 border border-transparent",
  secondary:
    "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200",
  outline:
    "bg-white hover:bg-slate-50 text-slate-700 border border-slate-300",
  outlineDark:
    "bg-transparent hover:bg-white/5 text-white border border-white/20",
  ghost:
    "bg-transparent hover:bg-slate-100 text-slate-700 border border-transparent",
  danger:
    "bg-rose-600 hover:bg-rose-700 text-white border border-transparent",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-xs gap-2",
  lg: "px-5 py-3 text-sm gap-2",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}) {
  return [
    "inline-flex items-center justify-center rounded-md font-semibold transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed",
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  fullWidth = false,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
      {children}
    </button>
  );
}
