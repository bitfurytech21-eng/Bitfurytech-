import React from "react";

interface FieldWrapperProps {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  tone?: "light" | "dark";
  children: React.ReactNode;
}

export function FormField({
  id,
  label,
  hint,
  error,
  tone = "light",
  children,
}: FieldWrapperProps) {
  const labelClass = tone === "dark" ? "text-white" : "text-[#102030]";
  const hintClass = tone === "dark" ? "text-slate-200" : "text-[#5A6B7C]";

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={`block text-xs font-semibold ${labelClass}`}>
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-[#BE123C] font-medium">
          {error}
        </p>
      ) : (
        hint && <p className={`text-xs ${hintClass}`}>{hint}</p>
      )}
    </div>
  );
}

const INPUT_LIGHT =
  "w-full rounded-[5px] border border-[#CBD6E2] bg-white px-3.5 py-2.5 text-sm text-[#102030] placeholder:text-[#7A8B9C] focus:outline-none focus:ring-2 focus:ring-[#1B4962] focus:border-[#1B4962] disabled:bg-[#F6F8FA] disabled:text-[#5A6B7C]";
const INPUT_DARK =
  "w-full rounded-[5px] border border-white/20 bg-[#14374B] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E94D65] focus:border-[#E94D65]";

export function TextInput({
  tone = "light",
  numeric = false,
  className = "",
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & {
  tone?: "light" | "dark";
  numeric?: boolean;
}) {
  return (
    <input
      className={`${tone === "dark" ? INPUT_DARK : INPUT_LIGHT} ${
        numeric ? "font-mono tabular-nums" : ""
      } ${className}`.trim()}
      {...rest}
    />
  );
}

export function SelectInput({
  tone = "light",
  className = "",
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  tone?: "light" | "dark";
}) {
  return (
    <select
      className={`${tone === "dark" ? INPUT_DARK : INPUT_LIGHT} ${className}`.trim()}
      {...rest}
    >
      {children}
    </select>
  );
}

export function TextAreaInput({
  tone = "light",
  className = "",
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  tone?: "light" | "dark";
}) {
  return (
    <textarea
      className={`${tone === "dark" ? INPUT_DARK : INPUT_LIGHT} ${className}`.trim()}
      {...rest}
    />
  );
}
