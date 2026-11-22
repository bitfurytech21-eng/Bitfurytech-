import { useState } from "react";
import { ChevronDown } from "lucide-react";
import PublicLayout from "../../components/PublicLayout";

const FAQS = [
  {
    q: "How do I open and fund a BitfuryTech investor account?",
    a: "Sign up using your username, email, and password (or Google sign-in) on the register page to initialize your verified investor account. Once signed in, submit a deposit notice from the Deposit section in your dashboard.",
  },
  {
    q: "How are deposits and withdrawals verified?",
    a: "Every deposit and withdrawal enters your ledger with Pending status until verified and settled by a BitfuryTech settlement administrator.",
  },
  {
    q: "Why does a newly created account show a $0.00 balance?",
    a: "BitfuryTech displays strictly verified real account balances and ledger records with zero placeholder or demonstration figures.",
  },
  {
    q: "How do I allocate capital into an investment mandate?",
    a: "Once your custody deposit is approved into your wallet balance, navigate to Investments inside the dashboard to select a mandate tier and allocate funds.",
  },
];

export function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <PublicLayout>
      <section className="bg-[#1B4962] text-white border-b border-white/15">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-2">
          <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
            Investor FAQ
          </p>
          <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight text-white">
            Frequently Asked Questions
          </h1>
        </div>
      </section>

      <div className="bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-3">
          {FAQS.map((item, idx) => {
            const open = openIndex === idx;
            return (
              <div
                key={item.q}
                className="bg-white border border-[#DCE4EC] rounded-[5px] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(open ? null : idx)}
                  aria-expanded={open}
                  className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left hover:bg-[#F6F8FA] cursor-pointer"
                >
                  <span className="text-base font-heading font-bold text-[#102030]">{item.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-[#E94D65] shrink-0 transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {open && (
                  <div className="px-6 pb-5 pt-4 border-t border-[#DCE4EC] text-sm text-[#5A6B7C] leading-relaxed">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PublicLayout>
  );
}

export function TermsPage() {
  return (
    <PublicLayout>
      <section className="bg-[#1B4962] text-white border-b border-white/15">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-2">
          <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
            Governance
          </p>
          <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight text-white">
            Terms &amp; Risk Disclosure
          </h1>
        </div>
      </section>

      <div className="bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6 text-sm text-[#5A6B7C] leading-relaxed">
          <section className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 space-y-2">
            <h2 className="text-lg font-heading font-bold text-[#102030]">
              1. Account Ownership &amp; Custody
            </h2>
            <p>
              Each BitfuryTech client account is strictly bound to its authenticated identity.
              Balances, mandates, and ledger entries reflect verified transactions settled on the
              platform.
            </p>
          </section>
          <section className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 space-y-2">
            <h2 className="text-lg font-heading font-bold text-[#102030]">
              2. Settlement &amp; Market Risk
            </h2>
            <p>
              Digital assets, public equities, and commercial property holdings involve capital risk
              and settlement verification intervals. Past mandate parameters do not guarantee future
              market returns.
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}

export function PrivacyPage() {
  return (
    <PublicLayout>
      <section className="bg-[#1B4962] text-white border-b border-white/15">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-2">
          <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
            Data Protection
          </p>
          <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight text-white">
            Privacy Policy
          </h1>
        </div>
      </section>

      <div className="bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6 text-sm text-[#5A6B7C] leading-relaxed">
          <section className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 space-y-2">
            <h2 className="text-lg font-heading font-bold text-[#102030]">
              1. Strict Account Isolation
            </h2>
            <p>
              Investor profile data, email addresses, and financial records are isolated by security
              rules so only the verified account owner and authorized settlement administrators can
              view account records.
            </p>
          </section>
          <section className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 space-y-2">
            <h2 className="text-lg font-heading font-bold text-[#102030]">2. Session Tokens</h2>
            <p>
              Authentication tokens are retained strictly in runtime memory during your active
              session and are never persisted to browser local storage.
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
