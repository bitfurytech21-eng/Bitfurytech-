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
    question: "What does Bitfury Tech Investment do?",
    answer:
      "Bitfury Tech Investment provides information and account services across digital assets, equities, and commercial property. Customers can review plans, property listings, account activity, and support resources online.",
  },
  {
    id: "gen-2",
    category: "general",
    question: "What is the Investment Policy Committee?",
    answer:
      "The company describes an Investment Policy Committee that oversees investment policy with research support. Plan pages contain the current information and terms for each option.",
  },
  {
    id: "gen-3",
    category: "general",
    question: "What can I review in my account?",
    answer:
      "The client portal shows the account activity, balances, transaction records, and request status associated with your profile.",
  },
  {
    id: "reg-1",
    category: "registration",
    question: "How do I create an account?",
    answer:
      "Choose Create account, enter the requested details, and confirm your email address using the link sent to your inbox.",
  },
  {
    id: "reg-2",
    category: "registration",
    question: "Where can I see the plans available to me?",
    answer:
      "Browse the investment catalog to see current options by asset type. Each plan page provides the latest terms and information.",
  },
  {
    id: "ver-1",
    category: "verification",
    question: "How do I verify my email address?",
    answer:
      "Follow the verification link sent to your email address. Payment and withdrawal requests may also require a review before they are completed.",
  },
  {
    id: "ver-2",
    category: "verification",
    question: "Why is a payment request still pending?",
    answer:
      "Requests can remain pending while the submitted details are reviewed. Check your account for the latest status or contact support if you need help.",
  },
  {
    id: "dep-1",
    category: "deposits",
    question: "How do I make a deposit?",
    answer:
      "Open the deposit area in your account, choose an available payment method, and follow the instructions shown. Submit the requested transfer details to track the request.",
  },
  {
    id: "dep-2",
    category: "deposits",
    question: "Where can I find deposit minimums and processing details?",
    answer:
      "Current payment methods, limits, and instructions are shown in your account before you submit a request.",
  },
  {
    id: "wdr-1",
    category: "withdrawals",
    question: "How do I request a withdrawal?",
    answer:
      "Open the withdrawal area in your account and follow the instructions shown. Review any applicable fees and limits before confirming, then check your account for status updates.",
  },
  {
    id: "wdr-2",
    category: "withdrawals",
    question: "What happens if a withdrawal request is declined?",
    answer:
      "Your account will show the request status and any balance adjustment. Contact support if you have questions about a specific request.",
  },
  {
    id: "pln-1",
    category: "plans",
    question: "What investment plans are available?",
    answer:
      "The catalog lists current plans across digital assets, equities, and commercial property. Review each listing for its current terms and fees.",
  },
  {
    id: "pln-2",
    category: "plans",
    question: "Where can I review my investment activity?",
    answer:
      "Use the client portal to review account activity, current request status, and available transaction records.",
  },
  {
    id: "prp-1",
    category: "properties",
    question: "Where can I find commercial property listings?",
    answer:
      "Available listings appear on the Properties page. Each listing includes the information and documents currently provided by the company.",
  },
  {
    id: "prp-2",
    category: "properties",
    question: "What should I review in a property listing?",
    answer:
      "Review the location, occupancy information, valuation, rental assumptions, entry terms, and supporting documents available for each listing.",
  },
  {
    id: "ret-1",
    category: "returns",
    question: "Are investment returns guaranteed?",
    answer:
      "No. Investment outcomes are not guaranteed. Values and income can fall as well as rise, and you could lose some or all of the amount invested.",
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
    question: "How does the referral programme work?",
    answer:
      "If referral offers are available, eligibility and current terms are shown in your account. Review those details before sharing a referral link.",
  },
  {
    id: "sec-1",
    category: "security",
    question: "How can I help keep my account secure?",
    answer:
      "Use a unique password, keep your sign-in details private, and contact support if you notice activity you do not recognize.",
  },
  {
    id: "sec-2",
    category: "security",
    question: "What should I do if I cannot access my account?",
    answer:
      "Use the password recovery option on the sign-in page. If you still need help, contact the support team.",
  },
  {
    id: "sup-1",
    category: "support",
    question: "How do I contact support?",
    answer:
      "Submit the contact form, use the live support chat, or email support@bitfurytechinvestment.com.",
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
            Help centre
          </p>
          <h1
            className="font-heading font-bold tracking-tight text-white text-balance"
            style={{ fontSize: "clamp(2rem, 3.8vw, 3.25rem)" }}
          >
            Frequently Asked Questions
          </h1>
          <p className="text-base text-slate-200 max-w-2xl leading-relaxed">
            Find answers about account access, payments, investment plans, property listings, and customer support.
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
                placeholder="Search questions about accounts, payments, plans, or property…"
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
                Try a different search or contact the support team for help.
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
                Send the support team a message about your account or an available service.
              </p>
            </div>
            <Link
              to="/contact"
              className={buttonClasses({ variant: "primary", size: "md" })}
            >
              Contact support
            </Link>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
