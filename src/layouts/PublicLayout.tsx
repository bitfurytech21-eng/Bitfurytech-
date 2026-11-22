import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ArrowRight, CheckCircle2, Clock, Mail, Menu, ShieldCheck, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import LiveSupportWidget from "../components/LiveSupportWidget";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/services", label: "Services" },
  { to: "/investments-catalog", label: "Investment Plans" },
  { to: "/properties", label: "Properties" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/contact", label: "Contact" },
];

export default function PublicLayout({ children }: { children?: React.ReactNode }) {
  const { pathname } = useLocation();
  const { firebaseUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterBusy, setNewsletterBusy] = useState(false);
  const [newsletterFeedback, setNewsletterFeedback] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterFeedback(null);
    const trimmed = newsletterEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setNewsletterFeedback({ ok: false, text: "Enter a valid email address." });
      return;
    }

    setNewsletterBusy(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        subscriptionId?: string;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Unable to complete subscription right now.");
      }
      setNewsletterFeedback({
        ok: true,
        text: `Subscribed (${data.subscriptionId}). Briefings confirmed.`,
      });
      setNewsletterEmail("");
    } catch (err) {
      setNewsletterFeedback({
        ok: false,
        text: err instanceof Error ? err.message : "Subscription request failed.",
      });
    } finally {
      setNewsletterBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#102030] flex flex-col">
      {/* Top Contact & Information Bar */}
      <div className="bg-[#1B4962] text-white border-b border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 min-h-10 py-2 flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5 text-xs">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-slate-100">
            <a
              href="mailto:support@bitfurytechinvestment.com"
              className="inline-flex items-center gap-1.5 hover:text-[#E94D65] transition-colors whitespace-nowrap"
            >
              <Mail className="w-3.5 h-3.5 text-[#E94D65] shrink-0" />
              <span>support@bitfurytechinvestment.com</span>
            </a>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-slate-200 whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 text-[#E94D65] shrink-0" />
              <span>50+ Global Markets · Quantitative &amp; Multi-Asset Custody</span>
            </span>
          </div>

          <div className="flex items-center gap-4 text-slate-100">
            <Link to="/faq" className="hover:text-white underline-offset-4 hover:underline whitespace-nowrap">
              Investor FAQ
            </Link>
            <span className="text-white/30" aria-hidden="true">|</span>
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E94D65] shrink-0" />
              <span>Segregated Custody Ledger</span>
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/98 backdrop-blur border-b border-[#DCE4EC] shadow-[0_1px_6px_rgba(16,32,48,0.04)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between gap-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 font-heading font-extrabold tracking-tight text-xl text-[#1B4962] whitespace-nowrap shrink-0"
          >
            <img
              src="/images/brand/bitfurylogo.png"
              alt="Bitfury Tech Investment"
              className="h-8 w-auto shrink-0"
            />
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#3B4C5E]"
          >
            {NAV_LINKS.map((item) => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : pathname === item.to || pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                    active
                      ? "border-[#E94D65] text-[#1B4962] font-bold"
                      : "border-transparent hover:text-[#1B4962] hover:border-[#1B4962]/30"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            {firebaseUser ? (
              <Link
                to="/dashboard"
                className="hidden lg:inline-flex items-center justify-center gap-1.5 bg-[#E94D65] hover:bg-[#D43B53] text-white font-heading font-bold text-xs px-5 py-2.5 rounded-none transition-colors whitespace-nowrap shrink-0"
              >
                <span>Open Dashboard</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ) : (
              <div className="hidden lg:flex items-center gap-2.5 shrink-0">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center bg-[#1B4962] hover:bg-[#14374B] text-white font-heading font-bold text-xs px-5 py-2.5 rounded-none transition-colors whitespace-nowrap shrink-0"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center bg-[#E94D65] hover:bg-[#D43B53] text-white font-heading font-bold text-xs px-5 py-2.5 rounded-none transition-colors whitespace-nowrap shrink-0"
                >
                  Register
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileOpen}
              className="lg:hidden min-w-[44px] min-h-[44px] p-2 text-[#1B4962] hover:bg-[#EDF3F7] flex items-center justify-center cursor-pointer"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Mobile Navigation Menu */}
        {mobileOpen && (
          <div className="lg:hidden bg-white border-t border-[#DCE4EC] px-4 py-5 space-y-2 shadow-lg">
            {NAV_LINKS.map((item) => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : pathname === item.to || pathname.startsWith(`${item.to}/`);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-2.5 rounded-[5px] text-sm font-medium transition-colors ${
                    active
                      ? "bg-[#EDF3F7] text-[#1B4962] font-bold"
                      : "text-[#3B4C5E] hover:bg-[#F6F8FA] hover:text-[#1B4962]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-3 border-t border-[#DCE4EC] grid grid-cols-2 gap-3">
              {firebaseUser ? (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="col-span-2 text-center bg-[#E94D65] hover:bg-[#D43B53] text-white font-heading font-bold text-sm py-3 rounded-none"
                >
                  Open Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="text-center bg-[#1B4962] hover:bg-[#14374B] text-white font-heading font-bold text-sm py-3 rounded-none"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="text-center bg-[#E94D65] hover:bg-[#D43B53] text-white font-heading font-bold text-sm py-3 rounded-none"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 bg-white">{children ?? <Outlet />}</main>

      {/* Multi-Column Corporate Footer */}
      <footer className="bg-[#1B4962] text-slate-200 border-t border-[#14374B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-md bg-white px-2 py-1 font-heading font-extrabold text-xl text-white"
            >
              <img
                src="/images/brand/bitfurylogo.png"
                alt="Bitfury Tech Investment"
                className="h-8 w-auto shrink-0"
              />
            </Link>
            <p className="text-sm text-slate-200 leading-relaxed max-w-sm">
              Bitfury Tech Investment is an algorithmic and multi-asset trading firm founded in 2017,
              providing mathematical and statistical allocations across over 50 financial markets
              through one unified custody account.
            </p>
            <div className="pt-1 text-xs text-slate-300 space-y-1.5">
              <p>171 Crescent Road, Oxford, England, OX4 2NX</p>
              <a
                href="mailto:admin@bitfurytechinvestment.com"
                className="flex items-center gap-2 hover:text-white"
              >
                <Mail className="w-3.5 h-3.5 text-[#E94D65] shrink-0" />
                <span>admin@bitfurytechinvestment.com</span>
              </a>
              <a
                href="mailto:support@bitfurytechinvestment.com"
                className="flex items-center gap-2 hover:text-white"
              >
                <Mail className="w-3.5 h-3.5 text-[#E94D65] shrink-0" />
                <span>support@bitfurytechinvestment.com</span>
              </a>
              <a
                href="mailto:bitfurytech21@gmail.com"
                className="flex items-center gap-2 hover:text-white"
              >
                <Mail className="w-3.5 h-3.5 text-[#E94D65] shrink-0" />
                <span>bitfurytech21@gmail.com</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-3 text-sm">
            <h3 className="font-heading font-bold text-white uppercase tracking-wider text-xs">
              Investment Sectors
            </h3>
            <ul className="space-y-2 text-slate-200">
              <li>
                <Link to="/investments-catalog" className="hover:text-[#E94D65] transition-colors">
                  Investment Plans
                </Link>
              </li>
              <li>
                <Link to="/properties" className="hover:text-[#E94D65] transition-colors">
                  Real Estate Holdings
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-[#E94D65] transition-colors">
                  Custody Services
                </Link>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2 space-y-3 text-sm">
            <h3 className="font-heading font-bold text-white uppercase tracking-wider text-xs">
              Corporate &amp; Guide
            </h3>
            <ul className="space-y-2 text-slate-200">
              <li>
                <Link to="/" className="hover:text-[#E94D65] transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-[#E94D65] transition-colors">
                  About BitfuryTech
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-[#E94D65] transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-[#E94D65] transition-colors">
                  Investor FAQ
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-[#E94D65] transition-colors">
                  Contact Desk
                </Link>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-4 space-y-3">
            <h3 className="font-heading font-bold text-white uppercase tracking-wider text-xs">
              Institutional Briefings &amp; Newsletter
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed">
              Receive verified mandate release notices and commercial property updates directly to
              your inbox.
            </p>
            <form onSubmit={handleNewsletterSubmit} noValidate className="flex flex-col sm:flex-row gap-2">
              <label htmlFor="footer-newsletter-email" className="sr-only">
                Email address for newsletter
              </label>
              <input
                id="footer-newsletter-email"
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="investor@domain.com"
                required
                className="flex-1 min-w-0 bg-white text-[#102030] placeholder:text-[#7A8B9C] px-3.5 py-2.5 text-xs rounded-[5px] border border-white/20 focus:outline-none focus:ring-2 focus:ring-[#E94D65]"
              />
              <button
                type="submit"
                disabled={newsletterBusy}
                className="bg-[#E94D65] hover:bg-[#D43B53] disabled:opacity-60 text-white font-heading font-bold text-xs px-5 py-2.5 rounded-none whitespace-nowrap shrink-0 cursor-pointer"
              >
                {newsletterBusy ? "Saving..." : "Subscribe"}
              </button>
            </form>
            {newsletterFeedback && (
              <p
                role="status"
                className={`text-xs flex items-center gap-1.5 ${
                  newsletterFeedback.ok ? "text-emerald-300" : "text-[#FFD1D8]"
                }`}
              >
                {newsletterFeedback.ok && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                <span>{newsletterFeedback.text}</span>
              </p>
            )}
            <div className="pt-2 flex flex-wrap gap-4 text-xs text-slate-300">
              <Link to="/terms" className="hover:text-white underline-offset-4 hover:underline">
                Terms &amp; Risk Disclosure
              </Link>
              <Link to="/privacy" className="hover:text-white underline-offset-4 hover:underline">
                Privacy Policy
              </Link>
              <Link to="/login" className="text-[#FFD1D8] hover:text-white font-semibold">
                Client Portal
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-[#112E3E] border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-3 text-xs text-slate-300">
            <p className="leading-relaxed text-slate-300/90">
              Important Notice: Website content is for general informational purposes only and is
              not an offer, solicitation, or personalized investment advice. Investing in stocks,
              options, futures, digital assets, property, and foreign markets involves substantial
              risk, including loss of capital. Values and income may fall as well as rise; past
              performance and testimonials are not reliable indicators of future results. Verify any
              claimed regulatory authorization directly with the relevant regulator before relying on it.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
              <p>© {new Date().getFullYear()} Bitfury Tech Investment. All rights reserved.</p>
              <p className="text-center sm:text-right">
                Indicative mandate rates are non-guaranteed benchmarks subject to market risk.
              </p>
            </div>
          </div>
        </div>
      </footer>

      <LiveSupportWidget />
    </div>
  );
}
