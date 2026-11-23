import type { HTMLAttributes } from "react";

type FinancialAmountProps = {
  value: number | string | null | undefined;
  size?: "sm" | "md" | "lg";
  className?: string;
} & Omit<HTMLAttributes<HTMLSpanElement>, "children">;

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function FinancialAmount({
  value,
  size = "md",
  className = "",
  ...spanProps
}: FinancialAmountProps) {
  const numericValue = typeof value === "number" ? value : Number(String(value ?? 0).replace(/[$,\s]/g, ""));
  const formatted = usdFormatter.format(Number.isFinite(numericValue) ? numericValue : 0);

  return (
    <span
      {...spanProps}
      className={`financial-amount financial-amount--${size} ${className}`.trim()}
    >
      {formatted}
    </span>
  );
}
