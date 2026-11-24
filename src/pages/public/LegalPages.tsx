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
            Legal Agreement
          </p>
          <h1 className="text-3xl sm:text-5xl font-heading font-bold tracking-tight text-white">
            Terms &amp; Conditions
          </h1>
          <p className="text-sm text-slate-200">
            General business terms governing access to the Bitfury Tech Investment web application.
          </p>
        </div>
      </section>

      <div className="bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6 text-sm text-[#5A6B7C] leading-relaxed">
          <section className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 space-y-2">
            <h2 className="text-lg font-heading font-bold text-[#102030]">
              1. Scope of Application
            </h2>
            <p>
              These General Terms and Conditions apply to the entire business relationship between
              the client and Bitfury Tech Investment in its capacity as operator of the Bitfury Tech
              Investment web application and online investment portal. Each authenticated client
              account initializes strictly at $0.00 and maintains an isolated custody ledger.
            </p>
          </section>

          <section className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 space-y-2">
            <h2 className="text-lg font-heading font-bold text-[#102030]">
              2. Amendments to General Terms
            </h2>
            <p>
              Any proposed amendments to these terms are notified at least one month prior to their
              effective date via the web platform and the registered customer email address in a
              printable, readable format. Clients may register written objections within two weeks
              after notification; otherwise, continued use after the notice window constitutes
              acceptance.
            </p>
          </section>

          <section className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 space-y-2">
            <h2 className="text-lg font-heading font-bold text-[#102030]">
              3. Cryptocurrencies &amp; Digital Asset Definitions
            </h2>
            <p>
              Cryptocurrencies are electronic forms of value generated via decentralized peer-to-peer
              networks and secured by cryptographic digital signatures. Cryptocurrencies are not
              legal tender backed as official currency by any government agency. Digital asset
              mandates, stock allocations, and real estate tiers carry capital risk and settlement
              verification intervals.
            </p>
          </section>

          <section className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 space-y-2">
            <h2 className="text-lg font-heading font-bold text-[#102030]">
              4. Technical Access &amp; Electronic Communications
            </h2>
            <p>
              Access to the web application is provided exclusively over an internet-connected
              computer or mobile web browser. All transaction confirmations, deposit notices, and
              account alerts are delivered electronically via your in-portal inbox and registered
              email address.
            </p>
          </section>

          <section className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 space-y-2">
            <h2 className="text-lg font-heading font-bold text-[#102030]">
              5. Registration &amp; Customer Duties of Cooperation
            </h2>
            <p>
              Natural persons with full legal capacity may register an account using a personally
              controlled email inbox and complete onboarding data verification. Clients must keep
              login credentials confidential, never leave signed-in sessions unattended, enable
              available security safeguards (including two-factor or payout verification controls),
              and notify Bitfury Tech Investment immediately if unauthorized access is suspected.
            </p>
          </section>

          <section className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 space-y-2">
            <h2 className="text-lg font-heading font-bold text-[#102030]">
              6. Fees, Settlement &amp; Market Risk Disclosure
            </h2>
            <p>
              An investor may receive back less than the amount invested, and past performance is
              not necessarily a guide to future performance. Mandate values and returns can go down
              as well as up and are never guaranteed. Applicable unit structuring fees (0.5%) and
              withdrawal settlement fees (1.0%, minimum $2.00 USD) are disclosed transparently
              before confirmation. Questions or formal complaints may be sent to{" "}
              <span className="font-mono text-[#102030]">info@bitfurytech.cloud</span>,{" "}
              <span className="font-mono text-[#102030]">support@bitfurytech.cloud</span>, or{" "}
              <span className="font-mono text-[#102030]">Compliance.notice@bitfurytech.cloud</span>.
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
          <p className="text-sm text-slate-200">
            How Bitfury Tech Investment collects, isolates, and safeguards client information.
          </p>
        </div>
      </section>

      <div className="bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6 text-sm text-[#5A6B7C] leading-relaxed">
          <section className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 space-y-2">
            <h2 className="text-lg font-heading font-bold text-[#102030]">
              1. Scope &amp; Controller Data Collection
            </h2>
            <p>
              Bitfury Tech Investment collects only the account details you provide manually
              (username, name, email address, jurisdiction, phone contact, and settlement details)
              together with essential technical request metadata (operating system, browser agent,
              page retrieval timestamp, and anonymized IP server logs) needed to deliver secure
              access and prevent unauthorized abuse.
            </p>
          </section>

          <section className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 space-y-2">
            <h2 className="text-lg font-heading font-bold text-[#102030]">
              2. Strict Account Isolation &amp; Runtime Session Tokens
            </h2>
            <p>
              Investor profile data, email addresses, and financial records are strictly isolated by
              account-scoped server access controls and HTTP-only session validation so only the
              verified owner and authorized administrators can inspect records. Authentication sessions
              are never persisted to browser local storage.
            </p>
          </section>

          <section className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 space-y-2">
            <h2 className="text-lg font-heading font-bold text-[#102030]">
              3. Server Logs, Cookies &amp; Newsletter Consent
            </h2>
            <p>
              Functional session preferences optimize routing, security, and platform usability.
              Newsletter registrations record the subscriber&apos;s email address and confirmation
              timestamp, and every briefing permits revocation or unsubscription at any time.
              Technical log IP addresses are deleted or anonymized once operational security checks
              conclude.
            </p>
          </section>

          <section className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 space-y-2">
            <h2 className="text-lg font-heading font-bold text-[#102030]">
              4. Support Inquiries &amp; Confidentiality
            </h2>
            <p>
              Inquiries submitted via our Contact page, Live Support Chat,{" "}
              <span className="font-mono text-[#102030]">info@bitfurytech.cloud</span>,{" "}
              <span className="font-mono text-[#102030]">support@bitfurytech.cloud</span>, or{" "}
              <span className="font-mono text-[#102030]">Compliance.notice@bitfurytech.cloud</span> are
              used strictly to verify and resolve client requests. Never transmit account passwords
              or private recovery links inside support messages.
            </p>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
