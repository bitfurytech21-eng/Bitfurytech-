import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ArrowRight, CheckCircle2, Mail, MapPin, Menu, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import LanguageTranslateWidget from "../components/LanguageTranslateWidget";
import { GLOBAL_OFFICES, REGISTERED_OFFICE } from "../data/locations";

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
  const { user, isAdmin } = useAuth();
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
        text: "You’re subscribed. Watch your inbox for updates.",
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
            {user ? (
              <div className="hidden lg:flex items-center gap-2.5 shrink-0">
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="inline-flex items-center justify-center bg-[#1B4962] hover:bg-[#14374B] text-white font-heading font-bold text-xs px-4 py-2.5 rounded-none transition-colors whitespace-nowrap shrink-0"
                  >
                    Admin Panel
                  </Link>
                )}
                <Link
                  to="/dashboard"
                  className="inline-flex items-center justify-center gap-1.5 bg-[#E94D65] hover:bg-[#D43B53] text-white font-heading font-bold text-xs px-5 py-2.5 rounded-none transition-colors whitespace-nowrap shrink-0"
                >
                  <span>Open Dashboard</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
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
              {user ? (
                <>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="col-span-2 text-center bg-[#1B4962] hover:bg-[#14374B] text-white font-heading font-bold text-sm py-3 rounded-none"
                    >
                      Admin Panel
                    </Link>
                  )}
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="col-span-2 text-center bg-[#E94D65] hover:bg-[#D43B53] text-white font-heading font-bold text-sm py-3 rounded-none"
                  >
                    Open Dashboard
                  </Link>
                </>
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
              Bitfury Tech Investment provides information and account services across digital assets,
              equities, and commercial property. Customers can review plans, listings, account activity,
              and support resources online.
            </p>
            <div className="pt-1 text-xs text-slate-300 space-y-1.5">
              <p>171 Crescent Road, Oxford, England, OX4 2NX</p>
              <a href="mailto:info@bitfurytech.cloud" className="flex items-center gap-2 hover:text-white"><Mail className="w-3.5 h-3.5 text-[#E94D65] shrink-0" /><span>Information: info@bitfurytech.cloud</span></a>
              <a href="mailto:support@bitfurytech.cloud" className="flex items-center gap-2 hover:text-white"><Mail className="w-3.5 h-3.5 text-[#E94D65] shrink-0" /><span>Support: support@bitfurytech.cloud</span></a>
              <a href="mailto:Compliance.notice@bitfurytech.cloud" className="flex items-center gap-2 hover:text-white"><Mail className="w-3.5 h-3.5 text-[#E94D65] shrink-0" /><span>Compliance: Compliance.notice@bitfurytech.cloud</span></a>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-3 text-sm">
            <h3 className="font-heading font-bold text-white uppercase tracking-wider text-xs">
              Investment Sectors
            </h3>
            <ul className="space-y-2 text-slate-200">
              <li><Link to="/sectors/crypto" className="hover:text-[#E94D65] transition-colors">Digital assets</Link></li>
              <li><Link to="/sectors/stocks" className="hover:text-[#E94D65] transition-colors">Equities</Link></li>
              <li><Link to="/sectors/real-estate" className="hover:text-[#E94D65] transition-colors">Commercial property</Link></li>
              <li><Link to="/investments-catalog" className="hover:text-[#E94D65] transition-colors">Investment plans</Link></li>
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
                <Link to="/research" className="hover:text-[#E94D65] transition-colors">
                  Research &amp; Governance
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
              Company updates
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed">
              Get occasional updates about investment plans and property listings.
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
                Terms and fees
              </Link>
              <Link to="/privacy" className="hover:text-white underline-offset-4 hover:underline">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Location Background Design */}
        <section
          aria-label="Our Locations"
          className="relative isolate overflow-hidden border-t border-white/10 bg-gradient-to-b from-[#20435B] to-[#18364A]"
        >
          {/* Seamless Background Artwork Layer (Desktop) */}
          <div
            aria-hidden="true"
            className="pointer-events-none select-none hidden lg:block absolute inset-0"
          >
            <div className="relative mx-auto h-full max-w-7xl px-6">
              <img
                src="/assets/aistudio/IMG_8314_d4a66b8e.jpeg"
                alt=""
                width={1284}
                height={631}
                loading="lazy"
                className="h-full w-auto max-w-none object-contain object-left opacity-95"
                style={{
                  WebkitMaskImage:
                    "linear-gradient(to right, transparent 0%, black 5%, black 76%, transparent 98%)",
                  maskImage:
                    "linear-gradient(to right, transparent 0%, black 5%, black 76%, transparent 98%)",
                }}
              />
            </div>
          </div>

          {/* Mobile / Tablet Edge-less Background Design Header */}
          <div aria-hidden="true" className="pointer-events-none select-none lg:hidden">
            <img
              src="/assets/aistudio/IMG_8314_d4a66b8e.jpeg"
              alt=""
              width={1284}
              height={631}
              loading="lazy"
              className="w-full h-auto block"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to bottom, black 82%, transparent 100%)",
                maskImage:
                  "linear-gradient(to bottom, black 82%, transparent 100%)",
              }}
            />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-2 pb-10 lg:py-14 grid grid-cols-1 lg:grid-cols-12 items-center">
            <div className="lg:col-start-7 lg:col-span-6 space-y-5 lg:pl-6">
              <div className="space-y-1.5">
                <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
                  Registered Office
                </p>
                <p className="text-lg font-heading font-bold text-white">
                  Oxford, {REGISTERED_OFFICE.country}
                </p>
                <p className="text-sm text-slate-200 leading-relaxed flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#E94D65] shrink-0 mt-0.5" />
                  <span>{REGISTERED_OFFICE.address}</span>
                </p>
              </div>

              <div className="pt-3 border-t border-white/15 space-y-3">
                <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
                  Global Offices
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs">
                  {GLOBAL_OFFICES.map((office) => (
                    <div key={`${office.country}-${office.address}`} className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-[#E94D65] shrink-0 mt-0.5" />
                      <p className="text-slate-200 leading-snug">
                        <span className="font-heading font-bold text-white">{office.country}.</span>{" "}
                        {office.address}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="bg-[#112E3E] border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-3 text-xs text-slate-300">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
              <p>© {new Date().getFullYear()} Bitfury Tech Investment. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>

      <LanguageTranslateWidget />
    </div>
  );
}
