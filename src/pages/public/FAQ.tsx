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
  | "security";

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
  { id: "returns", label: "Returns and payments" },
  { id: "security", label: "Account security" },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "gen-1",
    category: "general",
    question: "What is BitfuryTech?",
    answer:
      "BitfuryTech is a multi-asset wealth administration portal enabling investors to manage custody balances and allocate capital across structured Digital Assets, Global Equities, and Commercial Real Estate mandates.",
  },
  {
    id: "gen-2",
    category: "general",
    question: "Does BitfuryTech display demo or placeholder account balances?",
    answer:
      "No. Every newly created investor account initializes at $0.00. All balances, transactions, and active allocations displayed in the dashboard reflect verified ledger records only.",
  },
  {
    id: "reg-1",
    category: "registration",
    question: "How do I create a BitfuryTech investor account?",
    answer:
      "Visit the Register or Login page and sign up with a username, email, and password (or Google sign-in). Once registered, your isolated investor profile and custody ledger initialize automatically.",
  },
  {
    id: "reg-2",
    category: "registration",
    question: "Can I update my contact details and preferred rail after registering?",
    answer:
      "Yes. After signing in, open the Profile and Settings pages inside your dashboard to update your display name, country, phone number, and default settlement rail.",
  },
  {
    id: "ver-1",
    category: "verification",
    question: "How does account verification work?",
    answer:
      "Account authentication relies on verified Firebase identity tokens. Certain administrative and settlement actions enforce verified identity and profile completeness before execution.",
  },
  {
    id: "ver-2",
    category: "verification",
    question: "Why might a deposit or payout remain in Pending status?",
    answer:
      "All deposit notices and withdrawal requests enter the Settlement Queue as Pending so an authorized BitfuryTech administrator can confirm transfer references before adjusting wallet balances.",
  },
  {
    id: "dep-1",
    category: "deposits",
    question: "Which funding rails are supported for deposits?",
    answer:
      "BitfuryTech supports USDT (TRC20), Bitcoin (BTC), Ethereum (ETH), and Bank Wire. You can configure your preferred default rail in Account Settings or choose any supported rail per deposit notice.",
  },
  {
    id: "dep-2",
    category: "deposits",
    question: "When does a submitted deposit appear in my available wallet balance?",
    answer:
      "Your deposit appears immediately in your Transaction Ledger with Pending status. Once confirmed by the settlement administration desk, its status updates to Completed and your wallet balance increases by the verified amount.",
  },
  {
    id: "wdr-1",
    category: "withdrawals",
    question: "How do I request a withdrawal from my wallet?",
    answer:
      "Navigate to the Withdrawal page inside the client portal, select your payout rail, enter an amount up to your available wallet balance, and provide your destination wallet address or bank routing reference.",
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
    question: "How do I select and confirm an investment plan?",
    answer:
      "Review minimum and maximum entry bounds, cycle duration, and terms on the Investment Plans catalog. Once your wallet balance covers your desired allocation, open the Investments page in your portal, pick the mandate, and confirm.",
  },
  {
    id: "pln-2",
    category: "plans",
    question: "Can I allocate an amount outside a mandate's minimum or maximum limits?",
    answer:
      "No. Allocation validation enforces each mandate's published minimum and maximum USD range as well as sufficient verified wallet liquidity before creating an active mandate.",
  },
  {
    id: "prp-1",
    category: "properties",
    question: "Where do commercial property listings come from?",
    answer:
      "Commercial property offerings shown on the Properties page and Homepage are synced live from Firestore and published exclusively by authorized BitfuryTech administrators.",
  },
  {
    id: "prp-2",
    category: "properties",
    question: "What details are provided for each property offering?",
    answer:
      "Each published offering lists its asset class, location, minimum entry threshold, independent valuation figure, target yield benchmark, occupancy percentage, and current subscription status (Open or Fully Subscribed).",
  },
  {
    id: "ret-1",
    category: "returns",
    question: "Are indicative daily target rates guaranteed?",
    answer:
      "No. All published daily target rates and cycle return benchmarks are indicative mandate specifications and are never guaranteed. Market liquidity, asset performance, and settlement conditions apply.",
  },
  {
    id: "ret-2",
    category: "returns",
    question: "How are payments and cycle settlements recorded?",
    answer:
      "All settled transactions, allocations, and payouts are recorded in your Transactions ledger with unique reference codes, timestamps, and status indicators (Pending, Completed, or Rejected).",
  },
  {
    id: "sec-1",
    category: "security",
    question: "How is my account data protected from unauthorized access?",
    answer:
      "Strict security rules and server-side token validation isolate user profiles, transactions, investments, and private notifications to the owning authenticated UID (and verified administrators). Non-admin users cannot alter balances or escalate roles.",
  },
  {
    id: "sec-2",
    category: "security",
    question: "Are session tokens stored in browser localStorage?",
    answer:
      "No. Session tokens are managed securely in runtime memory during your active session and are verified server-side for protected endpoints.",
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
