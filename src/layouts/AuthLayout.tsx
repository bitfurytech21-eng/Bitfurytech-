import { Link, Outlet } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Lock, ShieldCheck } from "lucide-react";

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
    <div className="min-h-screen w-full max-w-full overflow-x-clip grid lg:grid-cols-12 bg-[#F6F8FA] text-[#102030]">
      {/* Left Institutional Brand Column */}
      <aside className="min-w-0 lg:col-span-5 bg-[#1B4962] text-white relative overflow-hidden flex flex-col justify-between p-6 sm:p-12 border-b lg:border-b-0 lg:border-r border-[#14374B]">
        <img
          src="/images/hero-private-capital.jpg"
          alt="BitfuryTech institutional wealth office"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1B4962]/84 via-[#1B4962]/74 to-[#112E3E]/90" />

        <div className="relative z-10 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center rounded-md bg-white px-2 py-1">
            <img
              src="/images/brand/bitfurylogo.png"
              alt="Bitfury Tech Investment"
              className="h-8 w-auto"
            />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-200 hover:text-white"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </div>

        <div className="relative z-10 my-10 space-y-6">
          <p className="text-xs font-bold uppercase tracking-wider text-[#FFD1D8]">{eyebrow}</p>
          <h1 className="text-2xl sm:text-3xl font-bold font-heading tracking-tight text-white leading-snug">
            {headline}
          </h1>
          <p className="text-sm text-slate-200 leading-relaxed">{description}</p>

          <ul className="space-y-3 pt-4 text-xs text-slate-100 border-t border-white/15">
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#E94D65] shrink-0 mt-0.5" />
              <span>Account-isolated security rules enforced at the database layer</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-[#E94D65] shrink-0 mt-0.5" />
              <span>Session ID tokens held strictly in memory with zero local storage persistence</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-[#E94D65] shrink-0 mt-0.5" />
              <span>All new accounts initialize cleanly at $0.00 across every ledger balance</span>
            </li>
          </ul>
        </div>

        <div className="relative z-10 text-xs text-slate-300 border-t border-white/15 pt-5">
          © {new Date().getFullYear()} BitfuryTech · Verified Client Access
        </div>
      </aside>

      {/* Right Authentication Form Column */}
      <main className="min-w-0 lg:col-span-7 flex items-center justify-center p-4 sm:p-12">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}
