import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  FileSearch,
  Layers,
  LineChart,
  Lock,
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
      "Register with a unique username, email, and password (or Google sign-in) on the Registration page. Your segregated BitfuryTech investor profile initializes with a $0.00 verified balance and isolated ledger.",
    outcome: "Investor UID & isolated Firestore profile provisioned",
  },
  {
    step: "02",
    phase: "Onboarding",
    title: "Complete Account Verification Where Required",
    icon: ShieldCheck,
    description:
      "Ensure your email identity is verified and complete your investor profile details (display name, country, phone, and preferred settlement rail) inside Account Profile & Settings.",
    outcome: "Verified email claim & profile preferences saved",
  },
  {
    step: "03",
    phase: "Funding",
    title: "Fund the Account",
    icon: Wallet,
    description:
      "Open the Deposit Desk inside your portal, choose your rail (USDT TRC20, BTC, ETH, or Bank Wire), enter the deposit amount and transfer reference, and submit. An administrator verifies the settlement before crediting your wallet.",
    outcome: "Pending deposit verified -> Wallet balance credited",
  },
  {
    step: "04",
    phase: "Discovery",
    title: "Browse Available Investment Opportunities",
    icon: Layers,
    description:
      "Explore structured mandates across Digital Assets, Global Equities, and Commercial Real Estate in the Investment Plans catalog, or review live commercial offerings on the Properties page.",
    outcome: "Filter eligible tiers by asset class and entry bounds",
  },
  {
    step: "05",
    phase: "Selection",
    title: "Select an Investment",
    icon: FileSearch,
    description:
      "Open a mandate's dedicated detail page or select the mandate directly inside your portal's Investments workspace to align your allocation amount with your verified wallet liquidity.",
    outcome: "Mandate ID & capital amount selected",
  },
  {
    step: "06",
    phase: "Review",
    title: "Review the Terms",
    icon: ClipboardCheck,
    description:
      "Inspect the minimum and maximum investment limits, cycle duration (30, 60, or 90 days), settlement rail, payment frequency, and non-guaranteed indicative return disclosures before committing capital.",
    outcome: "Full mandate parameters & risk terms reviewed",
  },
  {
    step: "07",
    phase: "Execution",
    title: "Confirm the Investment",
    icon: Lock,
    description:
      "Submit your allocation. An atomic server transaction validates your available wallet balance against the mandate range, debits the principal, opens an Active investment record, and logs a completed transaction entry.",
    outcome: "Atomic wallet debit + Active allocation logged",
  },
  {
    step: "08",
    phase: "Monitoring",
    title: "Track Investment Progress",
    icon: LineChart,
    description:
      "Monitor active mandates, cycle durations, transaction statuses, and security notifications in real time from your Dashboard, Investments view, and Transaction Ledger.",
    outcome: "Live ledger & portfolio status visibility",
  },
  {
    step: "09",
    phase: "Settlement",
    title: "Receive Payments According to Applicable Terms",
    icon: Coins,
    description:
      "Settled returns and completed cycle proceeds are reflected in your account records according to each mandate's applicable terms and settlement review. Available wallet liquidity may be withdrawn via the Withdrawal Desk.",
    outcome: "Settled ledger credits & verified withdrawal payout",
  },
];

const LIFECYCLE_STAGES = [
  {
    stage: "Stage 1 · Identity",
    label: "Account & Profile",
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
    detail: "Wallet balance validated & locked into Active mandate",
  },
  {
    stage: "Stage 4 · Settlement",
    label: "Ledger & Payouts",
    detail: "Cycle tracking + verified withdrawal disbursement",
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
            Follow the complete nine-step investor lifecycle from account creation and identity
            verification through custody funding, mandate confirmation, and verified settlement.
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
