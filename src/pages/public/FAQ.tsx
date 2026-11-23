import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Search } from "lucide-react";
import PublicLayout from "../../components/PublicLayout";
import { Button, buttonClasses } from "../../components/ui";

type FaqCategoryId =
  | "all"
  | "general"
  | "registration"
  | "verification"
  | "deposits"
  | "withdrawals"
  | "plans"
  | "properties"
  | "returns"
  | "referrals"
  | "security"
  | "support";

interface FaqCategory {
  id: Exclude<FaqCategoryId, "all">;
  label: string;
}

interface FaqItem {
  id: string;
  category: Exclude<FaqCategoryId, "all">;
  question: string;
  answer: string;
}

const FAQ_CATEGORIES: FaqCategory[] = [
  { id: "general", label: "General questions" },
  { id: "registration", label: "Registration" },
  { id: "verification", label: "Account verification" },
  { id: "deposits", label: "Deposits" },
  { id: "withdrawals", label: "Withdrawals" },
  { id: "plans", label: "Investment plans" },
  { id: "properties", label: "Property investments" },
  { id: "returns", label: "Returns & risk" },
  { id: "referrals", label: "Referral programme" },
  { id: "security", label: "Account security" },
  { id: "support", label: "Customer support" },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "gen-1",
    category: "general",
    question: "What is Bitfury Tech Investment and algorithmic trading?",
    answer:
      "Founded in 2017, Bitfury Tech Investment combines mathematical and statistical algorithmic trading strategies with multi-asset portfolio administration across Cryptocurrency, Stocks, and Commercial Real Estate. Algorithmic execution follows predefined quantitative rules and monitors global markets 24/7.",
  },
  {
    id: "gen-2",
    category: "general",
    question: "Who makes strategic investment policy decisions at the firm?",
    answer:
      "Strategic investment policy decisions are overseen by our Investment Policy Committee (IPC), whose members bring over 10 years of combined investing experience alongside a research department of network engineers, macroeconomists, research scientists, and quantitative analysts.",
  },
  {
    id: "gen-3",
    category: "general",
    question: "Does BitfuryTech display demo or placeholder account balances?",
    answer:
      "No. Every newly created investor account initializes strictly at $0.00. All balances, transactions, and active allocations displayed in the dashboard reflect verified ledger records only.",
  },
  {
    id: "reg-1",
    category: "registration",
    question: "How do I create a BitfuryTech investor account?",
    answer:
      "Open the Register page and complete onboarding with a unique username, email address, password, and the numeric verification challenge (or sign in with Google). Confirm your email address via the verification link to activate your isolated $0.00 custody profile.",
  },
  {
    id: "reg-2",
    category: "registration",
    question: "Can I have several concurrent deposits or mandates active at once?",
    answer:
      "Yes. You can hold multiple active allocations simultaneously across Crypto, Stock, and Real Estate tiers. Each allocation is tracked and settled independently according to its own mandate principal, start date, and 30-day cycle maturity.",
  },
  {
    id: "ver-1",
    category: "verification",
    question: "How does identity and email verification work?",
    answer:
      "Account authentication verifies your email identity through Better Auth session credentials alongside profile completeness checks in your investor record. Deposit notices, withdrawals, and optional Enhanced Payout Verification flags undergo settlement administrator verification before execution.",
  },
  {
    id: "ver-2",
    category: "verification",
    question: "Why might a deposit or payout remain in Pending status?",
    answer:
      "All deposit notices and withdrawal requests enter the Settlement Queue as Pending so an authorized BitfuryTech administrator can confirm transfer references and block confirmations before adjusting wallet balances.",
  },
  {
    id: "dep-1",
    category: "deposits",
    question: "How do I fund my account and why are cryptocurrencies emphasized?",
    answer:
      "Bitfury Tech Investment embraces digital-first global settlement via USDT (TRC20) ($100 minimum), Bitcoin (BTC) ($250 minimum), Ethereum (ETH) ($250 minimum), alongside Bank Wire ($1,000 minimum, 1–3 business days). Open Deposit inside your dashboard, select your preferred rail, and submit your transfer reference for review.",
  },
  {
    id: "dep-2",
    category: "deposits",
    question: "What are the deposit minimums and when does funding credit my wallet?",
    answer:
      "While Cryptocurrency mandate tiers begin at $200.00 ($1,000.00 for Stocks and $3,000.00 for Real Estate), custody wallet deposit notices start at $100 USD for USDT (TRC20). Every deposit appears immediately in Pending status and credits your available balance once verified by our settlement desk.",
  },
  {
    id: "wdr-1",
    category: "withdrawals",
    question: "How do I withdraw funds and how fast are withdrawals handled?",
    answer:
      "Open the Withdrawal page in your dashboard, choose your payout rail, enter an amount between $50.00 USD and $250,000.00 USD (up to your available wallet balance), provide your destination address or bank beneficiary details, review the upfront 1.0% fee (minimum $2.00 USD), and confirm. Requests are reviewed promptly by the settlement queue before outbound release.",
  },
  {
    id: "wdr-2",
    category: "withdrawals",
    question: "What happens to reserved funds if a withdrawal request is declined?",
    answer:
      "Withdrawal amounts are held in reserve when submitted so funds cannot be double-spent. If an administrator marks a pending withdrawal as Rejected, the full reserved amount is restored atomically to your available wallet balance.",
  },
  {
    id: "pln-1",
    category: "plans",
    question: "What investment plans are available across Crypto, Stocks, and Real Estate?",
    answer:
      "Bitfury Tech Investment offers 15 mandate tiers across 30-day cycles: 6 Cryptocurrency plans (Crypto Beginner $200 through Crypto Master Pro $1,000,000), 4 Stock plans (Stock Beginner $1,000 through Stock Premium $1,000,000), and 5 Real Estate plans (Real Estate Beginner $3,000 through Real Estate Master Pro $25,000,000). Clients may also switch categories without switching fees.",
  },
  {
    id: "pln-2",
    category: "plans",
    question: "When are cycle profits distributed and how do I track my investments?",
    answer:
      "Trading session accruals are recorded on the active cycle schedule inside your investor portal. Track active mandates, elapsed days, maturity dates, portfolio diversification, and downloadable receipts in real time from Overview, My Investments, and Transactions.",
  },
  {
    id: "prp-1",
    category: "properties",
    question: "Where do commercial property listings come from?",
    answer:
      "Commercial property offerings shown on the Properties page and Homepage are synced live from our PostgreSQL catalog and published exclusively by authorized BitfuryTech administrators.",
  },
  {
    id: "prp-2",
    category: "properties",
    question: "What details should I review before investing in real estate?",
    answer:
      "Always inspect each offering's asset class, location, minimum entry threshold, independent valuation figure, target yield benchmark, occupancy percentage, and current subscription status (Open or Fully Subscribed) alongside supporting disclosures.",
  },
  {
    id: "ret-1",
    category: "returns",
    question: "What is the risk for my investment, and are returns guaranteed?",
    answer:
      "Every financial market—including algorithmic trading, digital assets, equities, and real estate—carries inherent risk. Our experienced risk management and IPC controls work to mitigate downside exposure, but returns are never guaranteed and capital values can go down as well as up.",
  },
  {
    id: "ret-2",
    category: "returns",
    question: "How are payments and cycle settlements recorded?",
    answer:
      "All settled transactions, allocations, and payouts are recorded in your Transactions ledger with unique reference codes, timestamps, and status indicators (Pending, Completed, or Rejected).",
  },
  {
    id: "ref-1",
    category: "referrals",
    question: "How does the 5%–10% referral programme work?",
    answer:
      "Inside the Referrals page of your dashboard, you receive a unique code (BF-XXXXXXXX) and partner registration link. Referrals under $100,000 qualify for a 5% partner bonus and referrals above $100,000 qualify for 10% (alongside plan-category tiers of 5% Crypto, 6% Stock, and 7% Real Estate). Rewards credit strictly upon administrator verification of settled qualifying deposits.",
  },
  {
    id: "sec-1",
    category: "security",
    question: "How is my account data protected from unauthorized access?",
    answer:
      "All communication runs over HTTPS/SSL protocols, while strict server-side access controls and session validation isolate user profiles, transactions, investments, and notifications to the owning authenticated user ID. You can also update your password or enable the Enhanced Payout Verification Flag in Settings.",
  },
  {
    id: "sec-2",
    category: "security",
    question: "Are session tokens stored in browser localStorage?",
    answer:
      "No. Session tokens are managed securely in runtime memory during your active session and are verified server-side for protected endpoints.",
  },
  {
    id: "sup-1",
    category: "support",
    question: "How do I contact customer support or visit your offices?",
    answer:
      "Submit an inquiry on the Contact page, launch the Live Support Chat widget, or email support@bitfurytechinvestment.com or admin@bitfurytechinvestment.com. Our office is at 171 Crescent Road, Oxford, England, OX4 2NX.",
  },
];

export default function FAQ() {
  const [activeCategory, setActiveCategory] = useState<FaqCategoryId>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    "gen-1": true,
  });

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      const catMatch = activeCategory === "all" || item.category === activeCategory;
      if (!catMatch) return false;
      if (!q) return true;
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
      );
    });
  }, [activeCategory, searchQuery]);

  const visibleCategories = useMemo(() => {
    if (activeCategory === "all") {
      return FAQ_CATEGORIES.filter((cat) =>
        filteredItems.some((item) => item.category === cat.id)
      );
    }
    return FAQ_CATEGORIES.filter((cat) => cat.id === activeCategory);
  }, [activeCategory, filteredItems]);

  const toggleItem = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <PublicLayout>
      <section className="bg-[#1B4962] text-white border-b border-white/15">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-3">
          <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
            Investor Knowledge Base
          </p>
          <h1
            className="font-heading font-bold tracking-tight text-white text-balance"
            style={{ fontSize: "clamp(2rem, 3.8vw, 3.25rem)" }}
          >
            Frequently Asked Questions
          </h1>
          <p className="text-base text-slate-200 max-w-2xl leading-relaxed">
            Explore answers across onboarding, account verification, funding rails, investment
            mandates, property offerings, and ledger security.
          </p>
        </div>
      </section>

      <div className="bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-10">
          {/* Search & Category Filter Controls */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 text-[#5A6B7C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter questions by keyword (e.g. deposit, withdrawal, mandate, security)..."
                aria-label="Search frequently asked questions"
                className="w-full rounded-[5px] border border-[#CBD6E2] bg-white pl-10 pr-4 py-2.5 text-sm text-[#102030] placeholder:text-[#7A8B9C] focus:ring-2 focus:ring-[#1B4962] focus:border-[#1B4962] focus:outline-none"
              />
            </div>

            <div
              role="tablist"
              aria-label="FAQ Categories"
              className="flex flex-wrap gap-1.5 p-1.5 bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px]"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeCategory === "all"}
                onClick={() => setActiveCategory("all")}
                className={`px-3 py-1.5 rounded-none text-xs font-heading font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeCategory === "all"
                    ? "bg-[#E94D65] text-white"
                    : "text-[#1B4962] hover:bg-white"
                }`}
              >
                All Categories
              </button>
              {FAQ_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={activeCategory === cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-none text-xs font-heading font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    activeCategory === cat.id
                      ? "bg-[#E94D65] text-white"
                      : "text-[#1B4962] hover:bg-white"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Expandable Accordion Sections by Category */}
          {visibleCategories.length === 0 ? (
            <div className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-10 text-center space-y-3">
              <p className="text-base font-heading font-bold text-[#102030]">
                No Matching Questions Found
              </p>
              <p className="text-sm text-[#5A6B7C]">
                Clear your search filter or contact the BitfuryTech desk directly for assistance.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCategory("all");
                }}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="space-y-10">
              {visibleCategories.map((cat) => {
                const items = filteredItems.filter((item) => item.category === cat.id);
                return (
                  <section key={cat.id} aria-labelledby={`faq-cat-${cat.id}`} className="space-y-3">
                    <h2
                      id={`faq-cat-${cat.id}`}
                      className="text-lg font-heading font-bold text-[#102030] border-b border-[#DCE4EC] pb-2"
                    >
                      {cat.label}
                    </h2>

                    <div className="space-y-2.5">
                      {items.map((item) => {
                        const isOpen = Boolean(openIds[item.id]);
                        return (
                          <div
                            key={item.id}
                            className="bg-white border border-[#DCE4EC] rounded-[5px] overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => toggleItem(item.id)}
                              aria-expanded={isOpen}
                              className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-[#F6F8FA] cursor-pointer transition-colors"
                            >
                              <span className="text-sm sm:text-base font-heading font-bold text-[#102030]">
                                {item.question}
                              </span>
                              <ChevronDown
                                className={`w-5 h-5 text-[#E94D65] shrink-0 transition-transform ${
                                  isOpen ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                            {isOpen && (
                              <div className="px-6 pb-5 pt-3 border-t border-[#DCE4EC] text-sm text-[#5A6B7C] leading-relaxed">
                                {item.answer}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {/* Contact Escalation */}
          <div className="bg-[#1B4962] text-white rounded-[5px] p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-heading font-bold text-white">
                Need Account-Specific Assistance?
              </h2>
              <p className="text-sm text-slate-200 mt-1">
                Submit a direct inquiry to the BitfuryTech client relations desk.
              </p>
            </div>
            <Link
              to="/contact"
              className={buttonClasses({ variant: "primary", size: "md" })}
            >
              Contact BitfuryTech
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
