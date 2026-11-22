import { Link } from "react-router-dom";
import { Mail, ShieldCheck } from "lucide-react";
import PublicLayout from "../../components/PublicLayout";
import ResilientImage from "../../components/ResilientImage";
import { buttonClasses } from "../../components/ui";

const SECTORS = [
  {
    index: "01",
    title: "Digital Assets",
    description:
      "Structured liquidity and custody mandates utilizing BTC, ETH, and USDT (TRC20) settlement channels with segregated wallet tracking.",
  },
  {
    index: "02",
    title: "Global Equities",
    description:
      "Multi-cycle equity index and private treasury mandates focused on liquid large-cap technology and industrial sectors.",
  },
  {
    index: "03",
    title: "Commercial Real Estate",
    description:
      "Asset-backed participation in commercial office and logistics holdings published directly to the BitfuryTech property catalog.",
  },
];

const VALUES = [
  {
    title: "Account Isolation",
    body: "Investor profiles, ledgers, and mandates are bound strictly to verified authentication identities.",
  },
  {
    title: "Settlement Verification",
    body: "All deposits and withdrawals require explicit administrative confirmation before wallet balances change.",
  },
  {
    title: "Zero Fabricated Balances",
    body: "Newly opened client accounts start at $0.00; only settled funds and approved transactions appear in the portal.",
  },
  {
    title: "Risk Transparency",
    body: "Target return benchmarks are presented strictly as indicative mandate parameters and never as guaranteed yields.",
  },
];

export default function About() {
  return (
    <PublicLayout>
      {/* Header Hero Band */}
      <section className="bg-[#1B4962] text-white border-b border-white/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-center space-y-5">
            <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
              About BitfuryTech
            </p>
            <h1
              className="font-heading font-bold tracking-tight text-white text-balance leading-[1.1]"
              style={{ fontSize: "clamp(2rem, 3.6vw, 3.25rem)" }}
            >
              Structured multi-asset portfolio custody and transparent ledger governance.
            </h1>
            <p className="text-base text-slate-200 leading-relaxed">
              BitfuryTech operates an integrated wealth administration portal uniting digital asset
              liquidity, global equity mandates, and commercial real estate participation inside a
              single role-isolated client workspace.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/investments-catalog"
                className={buttonClasses({ variant: "primary", size: "md" })}
              >
                Explore Investment Plans
              </Link>
              <Link
                to="/register"
                className={buttonClasses({ variant: "outlineDark", size: "md" })}
              >
                Create Account
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 min-h-[260px] rounded-[5px] overflow-hidden border border-white/20 bg-[#14374B]">
            <ResilientImage
              src="/images/hero_institutional_wealth.jpg"
              alt="BitfuryTech institutional wealth workspace"
              fallbackLabel="BitfuryTech Corporate Profile"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
          {/* 2. History & Background (Verified Information Only) */}
          <section className="grid md:grid-cols-12 gap-8 items-start border-b border-[#DCE4EC] pb-14">
            <div className="md:col-span-4">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Background
              </p>
              <h2 className="text-2xl font-heading font-bold text-[#102030] mt-2">
                Platform History &amp; Architecture
              </h2>
            </div>
            <div className="md:col-span-8 space-y-4 text-sm sm:text-base text-[#5A6B7C] leading-relaxed">
              <p>
                BitfuryTech was architected to replace fragmented spreadsheets and opaque custody
                reports with a unified digital portal backed by real-time ledger verification. Rather
                than bundling unverified third-party claims, the platform enforces strict identity
                verification and database-level isolation across every investor record.
              </p>
              <p>
                Every capital movement—whether a deposit notice, a mandate allocation, or a
                withdrawal disbursement—is recorded sequentially in Firestore with verifiable
                timestamps and explicit settlement states.
              </p>
            </div>
          </section>

          {/* 3. Mission and Vision */}
          <section className="grid md:grid-cols-2 gap-6 border-b border-[#DCE4EC] pb-14">
            <div className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-7 space-y-3">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Our Mission
              </p>
              <h2 className="text-xl font-heading font-bold text-[#102030]">
                Clear, Auditable Multi-Asset Portfolio Access
              </h2>
              <p className="text-sm text-[#5A6B7C] leading-relaxed">
                Provide investors with direct visibility into mandate entry thresholds, settlement
                rails, and verified wallet balances without synthetic demo figures or hidden balance
                adjustments.
              </p>
            </div>
            <div className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-7 space-y-3">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Our Vision
              </p>
              <h2 className="text-xl font-heading font-bold text-[#102030]">
                Unified Custody Across Digital and Real-World Assets
              </h2>
              <p className="text-sm text-[#5A6B7C] leading-relaxed">
                Bridge digital asset liquidity, global equities, and commercial property participation
                under one disciplined administration and reporting standard.
              </p>
            </div>
          </section>

          {/* 4. Business Model */}
          <section className="grid md:grid-cols-12 gap-8 items-start border-b border-[#DCE4EC] pb-14">
            <div className="md:col-span-4">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Operations
              </p>
              <h2 className="text-2xl font-heading font-bold text-[#102030] mt-2">
                Business Model
              </h2>
            </div>
            <div className="md:col-span-8 space-y-4 text-sm sm:text-base text-[#5A6B7C] leading-relaxed">
              <p>
                BitfuryTech structures fixed-cycle investment mandates across three core asset classes,
                each defined by transparent minimum and maximum deposit bounds, cycle durations, and
                supported funding rails (USDT TRC20, BTC, ETH, and Bank Wire).
              </p>
              <p>
                Clients fund their segregated custody wallet by submitting a deposit notice with
                supporting transfer references. After settlement confirmation by BitfuryTech
                administrators, verified wallet liquidity can be allocated into eligible mandates or
                withdrawn upon payout verification.
              </p>
            </div>
          </section>

          {/* 5. Investment Sectors */}
          <section className="space-y-6 border-b border-[#DCE4EC] pb-14">
            <div className="space-y-2">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Portfolio Scope
              </p>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#102030]">
                Investment Sectors
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {SECTORS.map((sector) => (
                <div
                  key={sector.index}
                  className="bg-white border border-[#DCE4EC] rounded-[5px] p-6 space-y-3 shadow-[0_2px_8px_rgba(27,73,98,0.06)]"
                >
                  <p className="text-xs font-mono font-semibold text-[#B92841]">{sector.index}.</p>
                  <h3 className="text-lg font-heading font-bold text-[#102030]">{sector.title}</h3>
                  <p className="text-sm text-[#5A6B7C] leading-relaxed">{sector.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 6. Corporate Values */}
          <section className="space-y-6 border-b border-[#DCE4EC] pb-14">
            <div className="space-y-2">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#B92841]">
                Standards
              </p>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold text-[#102030]">
                Corporate Values
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-6">
              {VALUES.map((val) => (
                <div
                  key={val.title}
                  className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-6 space-y-2"
                >
                  <h3 className="text-base font-heading font-bold text-[#102030]">{val.title}</h3>
                  <p className="text-sm text-[#5A6B7C] leading-relaxed">{val.body}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 7. Verified Management & Governance Information */}
          <section className="bg-[#F6F8FA] border border-[#DCE4EC] rounded-[5px] p-7 space-y-4">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#E94D65] shrink-0" />
              <h2 className="text-xl font-heading font-bold text-[#102030]">
                Governance &amp; Settlement Administration
              </h2>
            </div>
            <p className="text-sm text-[#5A6B7C] leading-relaxed">
              Platform oversight, deposit confirmation, withdrawal clearance, and commercial property
              catalog publishing are administered directly through the verified{" "}
              <strong className="text-[#102030]">BitfuryTech Settlement &amp; Administration Desk</strong>.
            </p>
            <p className="text-xs text-[#5A6B7C] leading-relaxed">
              Disclosure: In accordance with BitfuryTech reporting accuracy standards, no unverified
              external regulatory registration numbers, third-party licences, individual executive
              biographies, or unsubstantiated historical financial figures are claimed on this page.
            </p>
          </section>

          {/* 8. Contact Information */}
          <section className="bg-[#1B4962] text-white rounded-[5px] p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-[#F4BAC4]">
                Contact Information
              </p>
              <h2 className="text-xl font-heading font-bold text-white">
                Reach the BitfuryTech Desk
              </h2>
              <p className="text-sm text-slate-200 flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#E94D65] shrink-0" />
                <span>bitfurytech21@gmail.com</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3 shrink-0">
              <Link
                to="/contact"
                className={buttonClasses({ variant: "primary", size: "md" })}
              >
                Open Contact Form
              </Link>
              <Link
                to="/login"
                className={buttonClasses({ variant: "outlineDark", size: "md" })}
              >
                Client Login
              </Link>
            </div>
          </section>
        </div>
      </div>
    </PublicLayout>
  );
}
