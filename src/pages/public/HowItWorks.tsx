import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowDownCircle,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Layers,
  LayoutDashboard,
  LineChart,
  Lock,
  Share2,
  ShieldCheck,
  UserPlus,
  Wallet,
} from "lucide-react";
import PublicLayout from "../../components/PublicLayout";
import { buttonClasses } from "../../components/ui";

const JOURNEY_STEPS = [
  {
    step: "01",
    phase: "Onboarding",
    title: "Create an Account",
    icon: UserPlus,
    description:
      "Register with a unique username, email, and password (with numeric verification challenge) or Google sign-in. Your segregated BitfuryTech investor profile initializes with a $0.00 verified balance and isolated ledger.",
    outcome: "Investor UID & isolated profile provisioned at $0.00",
  },
  {
    step: "02",
    phase: "Verification",
    title: "Complete Identity & Email Verification",
    icon: ShieldCheck,
    description:
      "Verify your email identity and complete your investor profile details—including full name, country or jurisdiction, phone number, and preferred settlement rail—inside Profile & Settings.",
    outcome: "Verified email claim & investor contact details saved",
  },
  {
    step: "03",
    phase: "Portal Access",
    title: "Access the Investor Dashboard",
    icon: LayoutDashboard,
    description:
      "Sign in to open your protected BitfuryTech dashboard, where you can review available custody balances, active holdings, pending settlements, notifications, and downloadable statements.",
    outcome: "Authenticated workspace & live ledger visibility",
  },
  {
    step: "04",
    phase: "Discovery",
    title: "Review Available Investment Opportunities",
    icon: Layers,
    description:
      "Compare structured mandates across Cryptocurrency, Stocks, and Real Estate in the Investment Plans catalog, or examine administrator-published commercial properties on the Properties page.",
    outcome: "Categories, asset types, and entry ranges compared",
  },
  {
    step: "05",
    phase: "Selection & Terms",
    title: "Select an Investment & Review Terms",
    icon: ClipboardCheck,
    description:
      "Open a mandate's detail page or the portal allocation desk to inspect minimum and maximum limits, cycle duration, settlement rail, structuring fees, and non-guaranteed return disclosures before confirming.",
    outcome: "Full mandate terms & risk disclosures reviewed",
  },
  {
    step: "06",
    phase: "Funding",
    title: "Submit a Deposit Notice",
    icon: Wallet,
    description:
      "Open the Deposit Desk, choose USDT (TRC20), Bitcoin (BTC), Ethereum (ETH), or Bank Wire, enter your deposit amount and transfer reference, and submit. An administrator verifies settlement before crediting your wallet.",
    outcome: "Pending deposit verified -> Wallet balance credited",
  },
  {
    step: "07",
    phase: "Monitoring",
    title: "Monitor Active Investment Activity",
    icon: LineChart,
    description:
      "Once you confirm an allocation from your verified wallet balance, track cycle progress, start and maturity dates, portfolio diversification, and any settled ledger credits inside My Investments and Overview.",
    outcome: "Continuous cycle progress & portfolio monitoring",
  },
  {
    step: "08",
    phase: "Disbursement",
    title: "Submit a Withdrawal Request",
    icon: ArrowUpRight,
    description:
      "Request payouts from your available wallet liquidity via the Withdrawal Desk. Applicable fees (1.0%, minimum $2.00 USD) are shown upfront, funds are reserved while Pending, and rejected requests restore immediately.",
    outcome: "Reserved payout verified -> Settled to destination",
  },
  {
    step: "09",
    phase: "Reporting",
    title: "Review Statements & Transaction Records",
    icon: FileText,
    description:
      "Inspect your searchable Transaction Ledger, download individual transaction receipts, and access account agreements, confirmations, and portfolio exports in the Documents section.",
    outcome: "Complete audit trail & downloadable account records",
  },
];

const LIFECYCLE_STAGES = [
  {
    stage: "Stage 1 · Identity",
    label: "Account & Verification",
    detail: "Verified authentication + $0.00 baseline account",
  },
  {
    stage: "Stage 2 · Custody",
    label: "Pending Deposit Review",
    detail: "Transfer reference checked by settlement desk",
  },
  {
    stage: "Stage 3 · Allocation",
    label: "Atomic Mandate Entry",
    detail: "Wallet balance validated & logged as Active holding",
  },
  {
    stage: "Stage 4 · Settlement",
    label: "Statements & Payouts",
    detail: "Cycle tracking + verified withdrawal disbursement",
  },
];

const SECURITY_CONTROLS = [
  {
    title: "Authenticated Access & Verification",
    description:
      "Sign in with email or username and password—or Google authentication—paired with email verification status checks and a numeric registration verification challenge.",
  },
  {
    title: "Password & Payout Controls",
    description:
      "Update your account password or trigger Firebase password recovery anytime from Settings, and toggle the optional Enhanced Payout Verification Flag for manual sign-off before outbound transfers.",
  },
  {
    title: "UID Isolation & Runtime Session Tokens",
    description:
      "Strict Firestore security rules and server-side token validation isolate profiles, balances, investments, and receipts to your authenticated UID. Session tokens stay in runtime memory and are never stored in browser localStorage.",
  },
  {
    title: "Immutable Ledger & Desk Support",
    description:
      "Every deposit, allocation, and withdrawal receives an immutable reference code and status notification. If you suspect unauthorized activity, contact support@bitfurytechinvestment.com or bitfurytech21@gmail.com immediately.",
  },
];

const DEPOSIT_RAILS = [
  {
    rail: "USDT (TRC20)",
    minimum: "$100 USD",
    timing: "Credited after on-chain confirmation & settlement review",
  },
  {
    rail: "Bitcoin (BTC)",
    minimum: "$250 USD",
    timing: "Requires minimum 3 mainnet confirmations + administrator verification",
  },
  {
    rail: "Ethereum (ETH)",
    minimum: "$250 USD",
    timing: "Requires 12 block confirmations + administrator verification",
  },
  {
    rail: "Bank Wire",
    minimum: "$1,000 USD",
    timing: "Typically clears 1–3 business days after incoming bank reconciliation",
  },
];

export default function HowItWorks() {
  return (
    <PublicLayout>
      {/* Header Band */}
      <section className="bg-[#1B4962] text-white border-b border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-4">
          <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
            Investment Lifecycle
          </p>
          <h1
            className="font-heading font-bold tracking-tight text-white text-balance leading-[1.1] max-w-3xl"
            style={{ fontSize: "clamp(2rem, 3.8vw, 3.25rem)" }}
          >
            How Investing with BitfuryTech Works
          </h1>
          <p className="text-base text-slate-200 max-w-3xl leading-relaxed">
            Follow the complete nine-step investor lifecycle from account creation and verification
            through dashboard access, opportunity review, custody funding, active monitoring, and
            verified withdrawals.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/register"
              className={buttonClasses({ variant: "primary", size: "md" })}
            >
              <span>Create Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/investments-catalog"
              className={buttonClasses({ variant: "outlineDark", size: "md" })}
            >
              Browse Investment Plans
            </Link>
          </div>
        </div>
      </section>

      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-14">
          {/* Lifecycle Architecture Diagram */}
          <section
            aria-label="Investment lifecycle architecture diagram"
            className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 sm:p-8 space-y-8"
          >
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#DCE4EC] pb-5">
              <div>
                <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                  Process Architecture
                </p>
                <h2 className="text-xl font-heading font-bold text-[#102030] mt-1">
                  End-to-End Custody &amp; Settlement Flow
                </h2>
              </div>
              <p className="text-xs text-[#5A6B7C]">
                Every state transition is recorded with timestamp validation.
              </p>
            </div>

            {/* Horizontal 4-Stage Pipeline */}
            <div className="grid md:grid-cols-4 gap-4 items-stretch">
              {LIFECYCLE_STAGES.map((node, idx) => (
                <div key={node.stage} className="relative flex flex-col md:flex-row items-stretch gap-3">
                  <div className="flex-1 bg-white border border-[#DCE4EC] rounded-[5px] p-5 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <p className="text-xs font-mono font-semibold text-[#B92841]">{node.stage}</p>
                      <h3 className="text-sm font-heading font-bold text-[#102030]">{node.label}</h3>
                    </div>
                    <p className="text-xs text-[#5A6B7C] leading-relaxed">{node.detail}</p>
                  </div>
                  {idx < LIFECYCLE_STAGES.length - 1 && (
                    <div className="flex items-center justify-center text-[#1B4962] shrink-0 py-1 md:py-0">
                      <ArrowRight className="w-4 h-4 hidden md:block" />
                      <ArrowDown className="w-4 h-4 md:hidden" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Ledger State Transitions */}
            <div className="border-t border-[#DCE4EC] pt-6 grid lg:grid-cols-2 gap-6">
              <div className="bg-white border border-[#DCE4EC] rounded-[5px] p-5 space-y-4">
                <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                  Funding &amp; Payout State Flow
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-3 py-1.5 rounded-[5px] bg-[#F6F8FA] border border-[#DCE4EC] text-[#102030] font-medium">
                    1. Notice Submitted
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#5A6B7C] shrink-0" />
                  <span className="px-3 py-1.5 rounded-[5px] bg-amber-50 border border-amber-200 text-amber-800 font-medium">
                    2. Pending Review
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#5A6B7C] shrink-0" />
                  <span className="px-3 py-1.5 rounded-[5px] bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium">
                    3. Completed / Settled
                  </span>
                </div>
                <p className="text-xs text-[#5A6B7C] leading-relaxed">
                  Deposits credit wallet liquidity only upon administrator confirmation. Withdrawals
                  reserve requested funds immediately and restore them automatically if declined.
                </p>
              </div>

              <div className="bg-white border border-[#DCE4EC] rounded-[5px] p-5 space-y-4">
                <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                  Capital Allocation Guardrails
                </p>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="px-3 py-1.5 rounded-[5px] bg-[#F6F8FA] border border-[#DCE4EC] text-[#102030] font-medium">
                    Verified Wallet Balance
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#5A6B7C] shrink-0" />
                  <span className="px-3 py-1.5 rounded-[5px] bg-[#F6F8FA] border border-[#DCE4EC] text-[#102030] font-medium">
                    Min / Max Check
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#5A6B7C] shrink-0" />
                  <span className="px-3 py-1.5 rounded-[5px] bg-[#EDF3F7] border border-[#1B4962]/30 text-[#1B4962] font-semibold">
                    Active Mandate Record
                  </span>
                </div>
                <p className="text-xs text-[#5A6B7C] leading-relaxed">
                  Allocations execute inside an atomic server transaction so wallet debits,
                  investment records, and ledger receipts remain strictly synchronized.
                </p>
              </div>
            </div>
          </section>

          {/* Complete 9-Step Customer Investment Journey */}
          <section className="space-y-8">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Step-by-Step Guide
              </p>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#102030]">
                The 9-Step Investor Journey
              </h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {JOURNEY_STEPS.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.step}
                    className="bg-white border border-[#DCE4EC] rounded-[5px] p-6 flex flex-col justify-between space-y-5 shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-semibold text-[#B92841]">
                          Step {item.step} · {item.phase}
                        </span>
                        <Icon className="w-4 h-4 text-[#1B4962] shrink-0" />
                      </div>
                      <h3 className="text-lg font-heading font-bold text-[#102030]">{item.title}</h3>
                      <p className="text-sm text-[#5A6B7C] leading-relaxed">{item.description}</p>
                    </div>

                    <div className="pt-3 border-t border-[#DCE4EC] flex items-center gap-2 text-xs text-[#5A6B7C]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#15803D] shrink-0" />
                      <span>{item.outcome}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Account Security & Customer Protection */}
          <section className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#DCE4EC] pb-5">
              <div className="space-y-1">
                <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                  Security &amp; Protection
                </p>
                <h2 className="text-2xl font-heading font-bold text-[#102030]">
                  Account Security and Customer Protection
                </h2>
              </div>
              <Lock className="w-5 h-5 text-[#1B4962] shrink-0" />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {SECURITY_CONTROLS.map((ctrl) => (
                <div
                  key={ctrl.title}
                  className="bg-white border border-[#DCE4EC] rounded-[5px] p-5 space-y-2"
                >
                  <h3 className="text-sm font-heading font-bold text-[#102030]">{ctrl.title}</h3>
                  <p className="text-xs sm:text-sm text-[#5A6B7C] leading-relaxed">
                    {ctrl.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Deposits and Withdrawals Policy */}
          <section className="space-y-6">
            <div className="max-w-2xl space-y-2">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Funding &amp; Settlement
              </p>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#102030]">
                Deposits and Withdrawals
              </h2>
              <p className="text-sm text-[#5A6B7C] leading-relaxed">
                All deposits and withdrawals follow strict server-side validation and administrative
                reconciliation so account balances strictly reflect verified settlement activity.
              </p>
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white border border-[#DCE4EC] rounded-[5px] p-6 space-y-4 shadow-[0_2px_8px_rgba(27,73,98,0.06)]">
                <div className="flex items-center gap-2">
                  <ArrowDownCircle className="w-5 h-5 text-[#1B4962]" />
                  <h3 className="text-lg font-heading font-bold text-[#102030]">
                    Supported Deposit Rails &amp; Minimums
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-[#5A6B7C] leading-relaxed">
                  Each submitted deposit notice enters your ledger in <strong>Pending</strong>{" "}
                  status with a unique reference code until an administrator confirms receipt.
                </p>
                <dl className="divide-y divide-[#DCE4EC] text-xs sm:text-sm">
                  {DEPOSIT_RAILS.map((r) => (
                    <div key={r.rail} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <dt className="font-semibold text-[#102030]">{r.rail}</dt>
                        <dd className="text-xs text-[#5A6B7C]">{r.timing}</dd>
                      </div>
                      <dd className="font-mono font-semibold text-[#1B4962] shrink-0">
                        Min {r.minimum}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="lg:col-span-5 bg-white border border-[#DCE4EC] rounded-[5px] p-6 space-y-4 shadow-[0_2px_8px_rgba(27,73,98,0.06)]">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-[#E94D65]" />
                  <h3 className="text-lg font-heading font-bold text-[#102030]">
                    Withdrawal Rules &amp; Fee Disclosure
                  </h3>
                </div>
                <dl className="divide-y divide-[#DCE4EC] text-xs sm:text-sm">
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-[#5A6B7C]">Minimum Withdrawal</dt>
                    <dd className="font-mono font-semibold text-[#102030]">$50.00 USD</dd>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-[#5A6B7C]">Maximum Single Request</dt>
                    <dd className="font-mono font-semibold text-[#102030]">$250,000.00 USD</dd>
                  </div>
                  <div className="py-2.5 flex justify-between gap-4">
                    <dt className="text-[#5A6B7C]">Applicable Fee</dt>
                    <dd className="font-mono font-semibold text-[#B92841]">1.0% (min $2.00 USD)</dd>
                  </div>
                </dl>
                <p className="text-xs text-[#5A6B7C] leading-relaxed">
                  Exact fee and net disbursement figures appear upfront prior to confirmation.
                  Requested funds are reserved immediately while Pending; if a request is declined,
                  the full reserved amount returns atomically to your available wallet balance.
                </p>
              </div>
            </div>
          </section>

          {/* Referral Programme */}
          <section className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 sm:p-8 space-y-4">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-[#E94D65]" />
              <h2 className="text-xl font-heading font-bold text-[#102030]">
                Partner Referral Programme (5% – 10% Tiered Rewards)
              </h2>
            </div>
            <p className="text-sm text-[#5A6B7C] leading-relaxed max-w-4xl">
              Every registered BitfuryTech client receives a unique referral identifier (such as{" "}
              <span className="font-mono font-semibold text-[#102030]">BF-XXXXXXXX</span>) and a
              one-click registration link inside the dashboard Referrals workspace. Under our partner
              schedule, referrals below $100,000 qualify for a <strong>5% partner bonus</strong>,
              while referred volumes exceeding $100,000 qualify for a <strong>10% tier bonus</strong>{" "}
              (alongside mandate category tiers of 5% on Crypto, 6% on Stocks, and 7% on Real
              Estate). All referral credits require administrator verification of settled deposits
              and appear transparently in your Referral Transaction History.
            </p>
          </section>

          {/* Bottom Action Banner */}
          <section className="bg-[#1B4962] text-white rounded-[5px] p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <h2 className="text-xl font-heading font-bold text-white">
                Ready to Begin Onboarding?
              </h2>
              <p className="text-sm text-slate-200">
                Create your BitfuryTech account or inspect available mandate specifications first.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link
                to="/register"
                className={buttonClasses({ variant: "primary", size: "md" })}
              >
                Create Account
              </Link>
              <Link
                to="/faq"
                className={buttonClasses({ variant: "outlineDark", size: "md" })}
              >
                Read Investor FAQ
              </Link>
            </div>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
