import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { Hexagon, Menu, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const NAV_LINKS = [
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/investments-catalog", label: "Investments" },
  { to: "/properties", label: "Properties" },
  { to: "/contact", label: "Contact" },
];

export default function PublicLayout({ children }: { children?: React.ReactNode }) {
  const { pathname } = useLocation();
  const { firebaseUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#05081a] text-white flex flex-col">
      {/* Three-Zone Top Bar Contract */}
      <header className="sticky top-0 z-40 bg-[#05081a]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 font-bold tracking-tight text-lg whitespace-nowrap shrink-0"
          >
            <Hexagon className="w-6 h-6 text-yellow-400 fill-yellow-400/15 shrink-0" />
            <span>
              Bitfury<span className="text-yellow-400">Tech</span>
            </span>
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300"
          >
            {NAV_LINKS.map((item) => {
              const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`whitespace-nowrap shrink-0 transition-colors hover:text-white ${
                    active ? "text-yellow-400" : ""
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={firebaseUser ? "/dashboard" : "/login"}
              className="hidden md:inline-flex items-center justify-center bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-semibold text-xs px-4 py-2 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              {firebaseUser ? "Open Dashboard" : "Client Sign In"}
            </Link>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileOpen}
              className="md:hidden p-2 rounded-md text-slate-200 hover:text-white hover:bg-white/10"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-[#0a102b] border-t border-white/10 px-4 py-4 space-y-2">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className="block py-2 text-sm font-medium text-slate-200 hover:text-yellow-400"
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-white/10 flex gap-3">
              <Link
                to={firebaseUser ? "/dashboard" : "/login"}
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center bg-yellow-400 text-slate-950 font-semibold text-sm py-2.5 rounded-md"
              >
                {firebaseUser ? "Dashboard" : "Sign In"}
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="flex-1 text-center border border-white/20 text-white font-semibold text-sm py-2.5 rounded-md"
              >
                Register
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children ?? <Outlet />}</main>

      <footer className="bg-[#030512] border-t border-white/10 text-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="space-y-3">
            <Link to="/" className="inline-flex items-center gap-2 font-bold text-lg text-white">
              <Hexagon className="w-5 h-5 text-yellow-400 fill-yellow-400/15 shrink-0" />
              <span>
                Bitfury<span className="text-yellow-400">Tech</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              Structured digital asset custody, global equities, and commercial property portfolio
              administration.
            </p>
          </div>

          <div className="space-y-2.5 text-sm">
            <h3 className="font-semibold text-white">Mandates</h3>
            <ul className="space-y-1.5 text-slate-400">
              <li><Link to="/investments-catalog" className="hover:text-yellow-400">Investment Tiers</Link></li>
              <li><Link to="/properties" className="hover:text-yellow-400">Real Estate Holdings</Link></li>
              <li><Link to="/services" className="hover:text-yellow-400">Custody Services</Link></li>
            </ul>
          </div>

          <div className="space-y-2.5 text-sm">
            <h3 className="font-semibold text-white">Corporate</h3>
            <ul className="space-y-1.5 text-slate-400">
              <li><Link to="/about" className="hover:text-yellow-400">About BitfuryTech</Link></li>
              <li><Link to="/faq" className="hover:text-yellow-400">Investor FAQ</Link></li>
              <li><Link to="/contact" className="hover:text-yellow-400">Contact Desk</Link></li>
            </ul>
          </div>

          <div className="space-y-2.5 text-sm">
            <h3 className="font-semibold text-white">Governance &amp; Access</h3>
            <ul className="space-y-1.5 text-slate-400">
              <li><Link to="/terms" className="hover:text-yellow-400">Terms &amp; Risk Disclosure</Link></li>
              <li><Link to="/privacy" className="hover:text-yellow-400">Privacy Policy</Link></li>
              <li><Link to="/login" className="text-yellow-400 hover:underline">Investor Portal</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 py-5 px-4 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} BitfuryTech. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
