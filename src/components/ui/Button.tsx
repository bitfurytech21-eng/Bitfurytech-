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
    "bg-[#E94D65] hover:bg-[#D43B53] text-white border border-transparent",
  gold:
    "bg-[#E94D65] hover:bg-[#D43B53] text-white border border-transparent",
  secondary:
    "bg-[#1B4962] hover:bg-[#14374B] text-white border border-transparent",
  outline:
    "bg-white hover:bg-[#EDF3F7] text-[#1B4962] border border-[#1B4962]/30",
  outlineDark:
    "bg-transparent hover:bg-white/10 text-white border border-white/35",
  ghost:
    "bg-transparent hover:bg-[#EDF3F7] text-[#1B4962] border border-transparent",
  danger:
    "bg-[#BE123C] hover:bg-[#9F1239] text-white border border-transparent",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-3.5 py-2 text-xs gap-1.5",
  md: "px-4 py-2.5 text-xs gap-2",
  lg: "px-6 py-3 text-sm gap-2",
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
    "inline-flex items-center justify-center rounded-none font-heading font-bold tracking-wide transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-55 disabled:cursor-not-allowed",
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
