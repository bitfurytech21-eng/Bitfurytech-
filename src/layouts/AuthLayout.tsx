import { Link, Outlet } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Hexagon, Lock, ShieldCheck } from "lucide-react";

interface AuthLayoutProps {
  eyebrow?: string;
  headline?: string;
  description?: string;
  children?: React.ReactNode;
}

export default function AuthLayout({
  eyebrow = "Client Custody Access",
  headline = "Institutional access to your BitfuryTech portfolio workspace.",
  description = "Access real-time custody balances, verified deposit & withdrawal settlement logs, and multi-asset mandates across digital assets, equities, and real estate.",
  children,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-[#f5f8fa] text-slate-900">
      {/* Left Institutional Brand Column */}
      <aside className="lg:col-span-5 bg-[#05081a] text-white relative overflow-hidden flex flex-col justify-between p-8 sm:p-12 border-b lg:border-b-0 lg:border-r border-white/10">
        <img
          src="/images/hero_institutional_wealth.jpg"
          alt="BitfuryTech institutional wealth office"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#05081a]/90 via-[#05081a]/80 to-[#05081a]/95" />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 font-bold text-lg text-white">
            <Hexagon className="w-6 h-6 text-yellow-400 fill-yellow-400/20 shrink-0" />
            <span>
              Bitfury<span className="text-yellow-400">Tech</span>
            </span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-yellow-400"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </div>

        <div className="relative z-10 my-10 space-y-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-yellow-400">{eyebrow}</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white leading-snug">
            {headline}
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">{description}</p>

          <ul className="space-y-3 pt-2 text-xs text-slate-200">
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <span>Account-isolated security rules enforced at the database layer</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <span>Session ID tokens held strictly in memory with zero local storage persistence</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <span>All new accounts initialize cleanly at $0.00 across every ledger balance</span>
            </li>
          </ul>
        </div>

        <div className="relative z-10 text-xs text-slate-400 border-t border-white/10 pt-5">
          © {new Date().getFullYear()} BitfuryTech · Verified Client Access
        </div>
      </aside>

      {/* Right Authentication Form Column */}
      <main className="lg:col-span-7 flex items-center justify-center p-6 sm:p-12">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
