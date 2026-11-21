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
  const labelClass = tone === "dark" ? "text-slate-300" : "text-slate-700";
  const hintClass = tone === "dark" ? "text-slate-400" : "text-slate-500";

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className={`block text-xs font-semibold ${labelClass}`}>
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-rose-600 font-medium">
          {error}
        </p>
      ) : (
        hint && <p className={`text-xs ${hintClass}`}>{hint}</p>
      )}
    </div>
  );
}

const INPUT_LIGHT =
  "w-full rounded-md border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#294158] focus:border-[#294158] disabled:bg-slate-50 disabled:text-slate-500";
const INPUT_DARK =
  "w-full rounded-md border border-white/15 bg-[#05081a] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400";

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
