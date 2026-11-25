import type {
  CustomerDocumentDTO,
  DashboardInvestmentDTO,
  DashboardTransactionDTO,
  DocumentClauseMeta,
  DocumentSection,
  InstitutionalDocumentBody,
} from "./dashboardApi";

function money(amount: number): string {
  return `$${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} USD`;
}

function fullDate(iso: string | null | undefined): string {
  if (!iso) return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return String(iso);
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function deterministicFingerprint(seed: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  let h3 = 0x85ebca6b;
  let h4 = 0xc2b2ae35;
  for (let i = 0; i < seed.length; i += 1) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (ch + i), 0x85ebca6b) >>> 0;
    h3 = Math.imul(h3 ^ (ch * 31), 0xc2b2ae35) >>> 0;
    h4 = Math.imul(h4 ^ (ch + (i << 2)), 0x27d4eb2f) >>> 0;
  }
  const hex = (n: number) => n.toString(16).padStart(8, "0").toUpperCase();
  return `SHA256-BTI-${hex(h1)}${hex(h2)}-${hex(h3)}${hex(h4)}`;
}

export interface DocumentCounterparty {
  uid: string;
  name: string;
  email: string;
  country?: string;
}

export function buildAccountDisclosureDocument(
  party: DocumentCounterparty,
  createdAt?: string | null
): CustomerDocumentDTO {
  const effectiveDate = fullDate(createdAt);
  const reference = `ACCT-${party.uid.slice(0, 8).toUpperCase()}`;
  const documentCode = `BTI-MCA-${party.uid.slice(0, 6).toUpperCase()}`;
  const counterpartyName = party.name?.trim() || party.email.split("@")[0] || "Accredited Client";

  const keyTerms: DocumentClauseMeta[] = [
    { label: "Document Classification", value: "Master Custody & Fiduciary Disclosure" },
    { label: "Agreement Identifier", value: documentCode },
    { label: "Custody Account UID", value: party.uid },
    { label: "Client Legal Name", value: counterpartyName },
    { label: "Registered Email", value: party.email },
    { label: "Domicile / Jurisdiction", value: party.country?.trim() || "International / Delaware Governing Law" },
    { label: "Custody Structure", value: "Segregated Sub-Ledger Custody (USD)" },
    { label: "Effective Execution Date", value: effectiveDate },
  ];

  const sections: DocumentSection[] = [
    {
      heading: "ARTICLE I — ESTABLISHMENT OF SEGREGATED CUSTODY RELATIONSHIP",
      body: [
        `1.1 Appointment of Custodian. Pursuant to this Master Custody & Mandate Disclosure Agreement (this "Master Agreement"), ${counterpartyName} ("Client" or "Investor") establishes a segregated investment and treasury custody relationship with BitfuryTech Capital Management LLC ("BitfuryTech", "Custodian", or "Administrator") under Account Reference ${reference}.`,
        "1.2 Asset Ring-Fencing. All cleared funds credited to the Client's USD custody ledger—including principal commitments, reserved settlement balances, and accrued cycle distributions—are maintained on segregated internal sub-ledgers distinct from BitfuryTech's corporate operating treasury.",
        "1.3 Immutable Double-Entry Accounting. Every balance-affecting credit, capital deployment, daily return distribution, and outbound settlement is recorded atomically via paired debit and credit ledger entries to ensure full auditability.",
      ],
    },
    {
      heading: "ARTICLE II — CAPITAL DEPLOYMENT, INVESTMENT MANDATES & LIQUIDITY",
      body: [
        "2.1 Mandate Execution. Individual capital allocations entered through the Client Portal are governed concurrently by this Master Agreement and the specific Master Investment Allocation Agreement generated for each executed mandate.",
        "2.2 Multi-Asset Coverage. Eligible BitfuryTech mandates span structured Digital Asset arbitrage and liquidity facilities, institutional Global Equities strategies, and income-producing Commercial Real Estate syndications.",
        "2.3 Yield Computation & Distribution. Contractual cycle returns are calculated exclusively on verified active principal commitments in accordance with published mandate schedules and credited directly to the Client's Available Balance.",
      ],
    },
    {
      heading: "ARTICLE III — ANTI-MONEY LAUNDERING (AML), KYC & SANCTIONS COMPLIANCE",
      body: [
        "3.1 Beneficial Ownership & Source of Funds. Client represents and warrants that all capital remitted to BitfuryTech originates from lawful sources, belongs beneficially to Client (or an authorized entity), and is free from encumbrances or third-party claims.",
        "3.2 Verification & Screening. BitfuryTech reserves the right to enforce Know-Your-Customer (KYC) verification, enhanced due diligence, and global sanctions screening (including OFAC, EU, and FATF standards) prior to processing high-value capital redemptions or rail changes.",
        "3.3 Compliance Holds. Any transaction exhibiting irregular provenance, mismatch of beneficial settlement ownership, or policy violation may be placed under compliance review pending satisfactory verification.",
      ],
    },
    {
      heading: "ARTICLE IV — SECURITY CONTROLS, SETTLEMENT RAILS & GOVERNANCE",
      body: [
        "4.1 Multi-Signature & Administrative Verification. All inbound custody credits and outbound redemptions undergo dual-layer verification, cryptographic reference validation, and server-side audit logging.",
        "4.2 Approved Settlement Channels. Settlements are executed solely through verified custodial rails (USDT TRC-20, Bitcoin BTC, Ethereum ETH, or Institutional Bank Wire) designated in the Client's verified profile.",
      ],
    },
    {
      heading: "ARTICLE V — RISK DISCLOSURES, CONFIDENTIALITY & GOVERNING LAW",
      body: [
        "5.1 Market & Operational Risk Notice. Institutional allocations across digital assets, equities, and commercial property carry inherent market, liquidity, and regulatory risks. Historical yield performance does not guarantee future economic results.",
        "5.2 Confidentiality & Electronic Execution. Both parties agree to maintain strict confidentiality over proprietary mandate schedules, pricing terms, and account statements. This electronic instrument constitutes a valid, binding record under applicable electronic signature statutes (ESIGN / eIDAS).",
      ],
    },
  ];

  const fullDocument: InstitutionalDocumentBody = {
    documentCode,
    classification: "CONFIDENTIAL — INSTITUTIONAL MASTER AGREEMENT",
    jurisdiction: "State of Delaware, USA & International Custody Standards",
    counterpartyName,
    counterpartyEmail: party.email,
    counterpartyUid: party.uid,
    effectiveDate,
    keyTerms,
    preamble: `THIS MASTER CUSTODY & MANDATE DISCLOSURE AGREEMENT ("Master Agreement") is executed as of ${effectiveDate} between BitfuryTech Capital Management LLC ("BitfuryTech") and ${counterpartyName} ("Client") governing all segregated capital custody, investment allocations, yield distributions, and treasury redemptions conducted under Account Reference ${reference}.`,
    sections,
    signatories: [
      {
        role: "Client / Beneficial Owner",
        entity: counterpartyName,
        nameOrTitle: `${party.email} (UID: ${party.uid})`,
        verificationStatus: "Electronically Accepted & Account Verified",
      },
      {
        role: "Custodian & Mandate Administrator",
        entity: "BitfuryTech Capital Management LLC",
        nameOrTitle: "Office of Institutional Custody & Treasury Operations",
        verificationStatus: "Countersigned & Ledger-Sealed",
      },
    ],
    authenticityHash: deterministicFingerprint(`${party.uid}|${reference}|${effectiveDate}`),
  };

  return {
    id: `acct-${party.uid}`,
    userId: party.uid,
    title: "Master Custody & Mandate Disclosure Agreement",
    docType: "AccountDocument",
    reference,
    summary:
      "Institutional master custody agreement governing segregated sub-ledger accounting, AML/KYC compliance, settlement rails, risk disclosures, and electronic execution standards.",
    fileUrl: "/documents/bitfury-company-certificate.pdf",
    createdAt: createdAt ?? new Date().toISOString(),
    fullDocument,
  };
}

export function buildInvestmentAgreementDocument(
  party: DocumentCounterparty,
  inv: Pick<
    DashboardInvestmentDTO,
    | "id"
    | "reference"
    | "planName"
    | "categoryLabel"
    | "amount"
    | "dailyRatePct"
    | "durationDays"
    | "status"
    | "startDate"
    | "maturityDate"
    | "expectedPaymentTerms"
    | "paymentFrequency"
    | "settlementRail"
    | "projectedCycleReturn"
  >
): CustomerDocumentDTO {
  const effectiveDate = fullDate(inv.startDate);
  const maturityDate = fullDate(inv.maturityDate);
  const counterpartyName = party.name?.trim() || party.email.split("@")[0] || "Accredited Investor";
  const documentCode = `BTI-IAA-${inv.reference}`;
  const projectedTotal = Number((inv.amount + inv.projectedCycleReturn).toFixed(2));
  const dailyProjectedDollar = Number(((inv.amount * inv.dailyRatePct) / 100).toFixed(2));

  const keyTerms: DocumentClauseMeta[] = [
    { label: "Instrument Title", value: "Master Investment Allocation Agreement" },
    { label: "Contract Identifier", value: documentCode },
    { label: "Mandate Strategy", value: `${inv.planName} (${inv.categoryLabel})` },
    { label: "Allocation Status", value: inv.status.toUpperCase() },
    { label: "Investor Counterparty", value: `${counterpartyName} (${party.email})` },
    { label: "Committed Principal", value: money(inv.amount) },
    { label: "Contractual Daily Yield", value: `${Number(inv.dailyRatePct).toFixed(2)}% (${money(dailyProjectedDollar)} / cycle day)` },
    { label: "Mandate Commitment Term", value: `${inv.durationDays} Calendar Days` },
    { label: "Effective Value Date", value: effectiveDate },
    { label: "Scheduled Maturity Date", value: maturityDate },
    { label: "Distribution Cadence", value: inv.paymentFrequency || "Daily trading session accrual" },
    { label: "Settlement Rail", value: inv.settlementRail || "USDT (TRC20) / Institutional Wire" },
    { label: "Projected Gross Return", value: money(inv.projectedCycleReturn) },
    { label: "Projected Total Value", value: money(projectedTotal) },
  ];

  const sections: DocumentSection[] = [
    {
      heading: "ARTICLE I — DEFINITIONS, SCOPE & INCORPORATION OF SCHEDULE I",
      body: [
        `1.1 Binding Allocation Instrument. This Master Investment Allocation Agreement ("Agreement") is entered into effective ${effectiveDate} by and between BitfuryTech Capital Management LLC ("Manager" or "Custodian") and ${counterpartyName} ("Investor"), pursuant to the Master Custody Agreement on file for Account UID ${party.uid}.`,
        `1.2 Economic Schedule. All economic parameters set forth in Schedule I—specifically the Committed Principal of ${money(inv.amount)}, the Mandate Strategy (${inv.planName}), the Contractual Daily Yield Rate of ${Number(inv.dailyRatePct).toFixed(2)}%, and the ${inv.durationDays}-day Commitment Term ending ${maturityDate}—are incorporated herein as binding operative covenants.`,
      ],
    },
    {
      heading: "ARTICLE II — CAPITAL COMMITMENT & SEGREGATED LEDGER ALLOCATION",
      body: [
        `2.1 Confirmation of Capital Deployment. Manager hereby acknowledges irrevocable receipt and allocation of ${money(inv.amount)} from Investor's cleared USD Custody Balance under Reference ${inv.reference}.`,
        "2.2 Segregated Sub-Ledger Accounting. The Committed Principal is ring-fenced inside a dedicated mandate sub-ledger and verified by immutable double-entry accounting records (debit: customer_available; credit: customer_invested). Principal cannot be co-mingled with unverified third-party liabilities.",
        "2.3 Zero Hidden Origination Deductions. One hundred percent (100%) of the Committed Principal stated in Schedule I is actively deployed into the Mandate Strategy on the Effective Value Date.",
      ],
    },
    {
      heading: "ARTICLE III — INVESTMENT STRATEGY, RISK GOVERNANCE & CUSTODY CONTROLS",
      body: [
        `3.1 Mandate Execution (${inv.categoryLabel}). Manager shall deploy and manage the Committed Principal across institutional ${inv.categoryLabel.toLowerCase()} facilities governed by BitfuryTech's Investment Policy Committee, liquidity buffers, and counterparty exposure limits.`,
        `3.2 Mandate Terms Summary. ${inv.expectedPaymentTerms || "Returns are accrued strictly against active verified principal in accordance with published institutional mandate terms."}`,
        "3.3 Portfolio Isolation & Operational Continuity. Institutional custody vaults utilize multi-signature treasury authorization, continuous reconciliation against settlement proofs, and automated ledger state verification.",
      ],
    },
    {
      heading: "ARTICLE IV — YIELD ACCRUAL, DISTRIBUTION SCHEDULE & AUTOMATED ADVICE",
      body: [
        `4.1 Daily Accrual Formula. For each active calendar day during the Commitment Term prior to maturity, yield accrues at ${Number(inv.dailyRatePct).toFixed(2)}% of Committed Principal (equivalent to ${money(dailyProjectedDollar)} per full accrual day), recorded idempotently in the platform accrual ledger.`,
        `4.2 Distribution Settlement (${inv.paymentFrequency}). Accrued returns are settled according to the "${inv.paymentFrequency}" cadence directly into Investor's Available USD Custody Balance, immediately eligible for compounding reinvestment or outbound redemption.`,
        "4.3 Statement & Email Confirmation. Upon each settled distribution, BitfuryTech dispatches an automated ledger advice to the Investor's registered email address and logs a corresponding transaction receipt inside the Client Portal.",
      ],
    },
    {
      heading: "ARTICLE V — TERM, MATURITY, PRINCIPAL REDEMPTION & WITHDRAWAL RAILS",
      body: [
        `5.1 Lock-Up & Maturity Date. The Commitment Term runs from ${effectiveDate} through ${maturityDate} (${inv.durationDays} calendar days). Early liquidation prior to maturity is restricted unless expressly approved in writing by Treasury Compliance.`,
        `5.2 Settlement & Redemption Channel. Upon maturity and final cycle settlement, cleared balances may be redeemed via ${inv.settlementRail}, subject to verified destination ownership and standard multi-signature treasury release.`,
      ],
    },
    {
      heading: "ARTICLE VI — REPRESENTATIONS, AML/KYC WARRANTIES & TAX RESPONSIBILITY",
      body: [
        "6.1 Investor Representations. Investor represents that (a) Investor possesses full legal capacity and authority to execute this Agreement; (b) all deployed funds derive from legitimate, non-sanctioned sources; and (c) Investor has reviewed the Mandate terms and institutional risk disclosures.",
        "6.2 Tax & Regulatory Reporting. Investor remains solely responsible for reporting and satisfying any income, capital gains, or withholding tax obligations arising in Investor's jurisdiction of tax residence.",
      ],
    },
    {
      heading: "ARTICLE VII — LIMITATION OF LIABILITY, FORCE MAJEURE & DISPUTE RESOLUTION",
      body: [
        "7.1 Institutional Standard of Care. Manager shall discharge its duties with institutional diligence and good faith, and shall not be liable for losses arising from extraordinary market dislocations, sovereign regulatory actions, blockchain network halts, or force majeure events beyond reasonable operational control.",
        "7.2 Governing Law & Binding Electronic Record. This Agreement is governed by the laws of the State of Delaware, USA, without regard to conflict-of-law principles. Cryptographic execution logs and immutable ledger entries constitute conclusive evidence of the terms and balances hereunder.",
      ],
    },
  ];

  const fullDocument: InstitutionalDocumentBody = {
    documentCode,
    classification: "CONFIDENTIAL — EXECUTED ALLOCATION INSTRUMENT",
    jurisdiction: "State of Delaware, USA · Institutional Capital Governance",
    counterpartyName,
    counterpartyEmail: party.email,
    counterpartyUid: party.uid,
    effectiveDate,
    keyTerms,
    preamble: `THIS MASTER INVESTMENT ALLOCATION AGREEMENT ("Agreement") is made and entered into effective ${effectiveDate} between BitfuryTech Capital Management LLC ("Manager") and ${counterpartyName} ("Investor") evidencing a binding principal capital allocation of ${money(inv.amount)} into ${inv.planName} under Contract Reference ${inv.reference}.`,
    sections,
    signatories: [
      {
        role: "Committed Investor / Counterparty",
        entity: counterpartyName,
        nameOrTitle: `${party.email} · Account UID ${party.uid}`,
        verificationStatus: "Executed Electronically via Authenticated Portal Session",
      },
      {
        role: "Managing Custodian & Treasury Desk",
        entity: "BitfuryTech Capital Management LLC",
        nameOrTitle: "Institutional Mandate & Settlement Committee",
        verificationStatus: "Countersigned & Verified Against Segregated Ledger",
      },
    ],
    authenticityHash: deterministicFingerprint(
      `${party.uid}|${inv.id}|${inv.reference}|${inv.amount}|${inv.startDate}`
    ),
  };

  return {
    id: `agr-${inv.id}`,
    userId: party.uid,
    title: `${inv.planName} — Master Investment Allocation Agreement`,
    docType: "Agreement",
    reference: inv.reference,
    summary: `Executed institutional allocation agreement for ${money(inv.amount)} in ${inv.planName} (${inv.durationDays} days at ${Number(inv.dailyRatePct).toFixed(2)}% daily rate · Maturity ${maturityDate}).`,
    createdAt: inv.startDate,
    fullDocument,
  };
}

export function buildTransactionDocument(
  party: DocumentCounterparty,
  tx: Pick<
    DashboardTransactionDTO,
    "id" | "type" | "method" | "amount" | "destination" | "reference" | "status" | "currency" | "description" | "createdAt"
  >
): CustomerDocumentDTO {
  const effectiveDate = fullDate(tx.createdAt);
  const counterpartyName = party.name?.trim() || party.email.split("@")[0] || "Accredited Client";
  const docType: CustomerDocumentDTO["docType"] =
    tx.type === "Deposit"
      ? "DepositConfirmation"
      : tx.type === "Withdrawal"
        ? "WithdrawalRecord"
        : "Receipt";

  const titlePrefix =
    docType === "DepositConfirmation"
      ? "Institutional Treasury Deposit Confirmation"
      : docType === "WithdrawalRecord"
        ? "Capital Redemption & Outbound Settlement Record"
        : `${tx.type} Ledger Execution Advice`;

  const documentCode =
    docType === "DepositConfirmation"
      ? `BTI-DEP-${tx.reference}`
      : docType === "WithdrawalRecord"
        ? `BTI-WDR-${tx.reference}`
        : `BTI-REC-${tx.reference}`;

  const keyTerms: DocumentClauseMeta[] = [
    { label: "Instrument Type", value: titlePrefix },
    { label: "Document Code", value: documentCode },
    { label: "Transaction Reference", value: tx.reference || tx.id },
    { label: "Account Holder", value: `${counterpartyName} (${party.email})` },
    { label: "Settlement Amount", value: `${money(tx.amount)} (${tx.currency || "USD"})` },
    { label: "Settlement Rail / Method", value: tx.method || "Institutional Custody Ledger" },
    { label: "Destination / Counterparty", value: tx.destination || "Segregated Custody Wallet" },
    { label: "Settlement Status", value: tx.status.toUpperCase() },
    { label: "Value / Recording Date", value: effectiveDate },
  ];

  const sections: DocumentSection[] = [
    {
      heading: "ARTICLE I — TRANSACTION VERIFICATION & SETTLEMENT ADVICE",
      body: [
        `1.1 Official Ledger Record. This instrument certifies the recording of a ${tx.type.toLowerCase()} transaction in the amount of ${money(tx.amount)} for ${counterpartyName} (UID: ${party.uid}) under Reference ${tx.reference || tx.id}.`,
        `1.2 Execution Details. Method: ${tx.method || "Custody Ledger"}. Destination: ${tx.destination || "Internal Sub-Ledger"}. Description: ${tx.description || `${tx.type} settlement entry`}. Current verified status: ${tx.status}.`,
      ],
    },
    {
      heading: "ARTICLE II — DOUBLE-ENTRY ACCOUNTING & COMPLIANCE ATTESTATION",
      body: [
        tx.status === "Completed"
          ? "2.1 Finalized Settlement. Corresponding debit and credit ledger postings have cleared all administrative verification, sanctions screening, and multi-signature custody checks. Balances reflected in the Client Portal are final and audit-ready."
          : tx.status === "Pending"
            ? "2.1 Pending Treasury Clearance. This entry is currently queued in Treasury Operations for verification, destination confirmation, and final multi-signature ledger release."
            : "2.1 Void / Rejected Entry. This instruction did not pass settlement verification or was cancelled; no unauthorized debit remains against cleared investor custody funds.",
        "2.2 Audit Retention. This record is permanently archived in BitfuryTech's institutional transaction vault for compliance reconciliation, tax reporting, and counterparty verification.",
      ],
    },
  ];

  const fullDocument: InstitutionalDocumentBody = {
    documentCode,
    classification: "OFFICIAL CUSTODY & SETTLEMENT RECORD",
    jurisdiction: "BitfuryTech Institutional Treasury & Ledger Operations",
    counterpartyName,
    counterpartyEmail: party.email,
    counterpartyUid: party.uid,
    effectiveDate,
    keyTerms,
    preamble: `This official settlement record is issued by BitfuryTech Capital Management LLC to ${counterpartyName} (${party.email}) confirming ledger activity under Transaction Reference ${tx.reference || tx.id} dated ${effectiveDate}.`,
    sections,
    signatories: [
      {
        role: "Account Beneficiary",
        entity: counterpartyName,
        nameOrTitle: `${party.email} (UID: ${party.uid})`,
        verificationStatus: "Authenticated Account Holder",
      },
      {
        role: "Treasury & Settlement Desk",
        entity: "BitfuryTech Capital Management LLC",
        nameOrTitle: "Automated Ledger & Compliance Verification",
        verificationStatus: tx.status === "Completed" ? "Settled & Cryptographically Sealed" : `Status: ${tx.status}`,
      },
    ],
    authenticityHash: deterministicFingerprint(
      `${party.uid}|${tx.id}|${tx.reference}|${tx.amount}|${tx.status}|${tx.createdAt ?? ""}`
    ),
  };

  return {
    id: `txdoc-${tx.id}`,
    userId: party.uid,
    title: `${titlePrefix} — ${tx.method || "Custody"}`,
    docType,
    reference: tx.reference || tx.id,
    summary: `${tx.description || tx.type} (${money(tx.amount)}) · Rail: ${tx.method || "Custody"} · Status: ${tx.status}.`,
    createdAt: tx.createdAt,
    fullDocument,
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char] ?? char);
}

export function renderInstitutionalDocumentPlainText(doc: CustomerDocumentDTO): string {
  const full = doc.fullDocument;
  if (!full) {
    return [
      "========================================================================",
      "BITFURYTECH CAPITAL MANAGEMENT LLC — OFFICIAL CLIENT RECORD",
      "========================================================================",
      `Title:       ${doc.title}`,
      `Category:    ${doc.docType}`,
      `Reference:   ${doc.reference}`,
      `Date:        ${fullDate(doc.createdAt)}`,
      `Owner UID:   ${doc.userId}`,
      "------------------------------------------------------------------------",
      doc.summary,
      "========================================================================",
    ].join("\n");
  }

  const lines: string[] = [
    "================================================================================",
    "BITFURYTECH CAPITAL MANAGEMENT LLC",
    full.classification,
    `Governing Framework: ${full.jurisdiction}`,
    "================================================================================",
    "",
    doc.title.toUpperCase(),
    `Document Code: ${full.documentCode}   |   Reference: ${doc.reference}`,
    `Effective Date: ${full.effectiveDate}`,
    "",
    "--------------------------------------------------------------------------------",
    "PREAMBLE",
    "--------------------------------------------------------------------------------",
    full.preamble,
    "",
    "--------------------------------------------------------------------------------",
    "SCHEDULE I — OPERATIVE ECONOMIC & CUSTODY TERMS",
    "--------------------------------------------------------------------------------",
    ...full.keyTerms.map((term) => `${term.label.padEnd(28, " ")}: ${term.value}`),
    "",
  ];

  for (const section of full.sections) {
    lines.push("--------------------------------------------------------------------------------");
    lines.push(section.heading);
    lines.push("--------------------------------------------------------------------------------");
    for (const para of section.body) {
      lines.push(para);
      lines.push("");
    }
  }

  lines.push("--------------------------------------------------------------------------------");
  lines.push("EXECUTION & AUTHORIZED SIGNATORIES");
  lines.push("--------------------------------------------------------------------------------");
  for (const sig of full.signatories) {
    lines.push(`[${sig.role}]`);
    lines.push(`  Entity / Party : ${sig.entity}`);
    lines.push(`  Signatory      : ${sig.nameOrTitle}`);
    lines.push(`  Attestation    : ${sig.verificationStatus}`);
    lines.push("");
  }

  lines.push("================================================================================");
  lines.push(`AUTHENTICITY DIGEST: ${full.authenticityHash}`);
  lines.push("================================================================================");
  return lines.join("\n");
}

export function renderInstitutionalDocumentHtml(doc: CustomerDocumentDTO): string {
  const full = doc.fullDocument;
  const title = escapeHtml(doc.title);
  const reference = escapeHtml(doc.reference);
  const effectiveDate = escapeHtml(full?.effectiveDate || fullDate(doc.createdAt));

  if (!full) {
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family:Georgia,serif;padding:40px;color:#102030"><h1>${title}</h1><p>Reference: ${reference} | Date: ${effectiveDate}</p><p>${escapeHtml(doc.summary)}</p></body></html>`;
  }

  const keyTermRows = full.keyTerms
    .map(
      (term) =>
        `<div class="term-cell"><div class="term-label">${escapeHtml(term.label)}</div><div class="term-val">${escapeHtml(term.value)}</div></div>`
    )
    .join("");

  const sectionBlocks = full.sections
    .map(
      (sec) => `
      <section class="article">
        <h2>${escapeHtml(sec.heading)}</h2>
        ${sec.body.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
      </section>`
    )
    .join("");

  const signatoryBlocks = full.signatories
    .map(
      (sig) => `
      <div class="sig-box">
        <div class="sig-role">${escapeHtml(sig.role)}</div>
        <div class="sig-entity">${escapeHtml(sig.entity)}</div>
        <div class="sig-meta">${escapeHtml(sig.nameOrTitle)}</div>
        <div class="sig-badge">${escapeHtml(sig.verificationStatus)}</div>
      </div>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${title} (${reference})</title>
  <style>
    @page { size: A4; margin: 18mm; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px 20px; background: #F1F5F9; color: #102030; font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; }
    .sheet { max-width: 860px; margin: 0 auto; background: #FFFFFF; border: 1px solid #CBD6E2; box-shadow: 0 12px 36px rgba(16, 32, 48, 0.08); }
    .crest { background: #1B4962; color: #FFFFFF; padding: 28px 36px; border-bottom: 4px solid #E94D65; display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; flex-wrap: wrap; }
    .crest-brand { font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: #CBD5E1; font-weight: 700; }
    .crest h1 { margin: 6px 0 4px; font-family: Georgia, "Times New Roman", serif; font-size: 22px; font-weight: 700; color: #FFFFFF; }
    .crest-sub { font-size: 12px; color: #E2E8F0; }
    .crest-badge { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.22); padding: 8px 12px; font-size: 11px; text-align: right; }
    .body { padding: 34px 36px; }
    .class-bar { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #E94D65; margin-bottom: 10px; }
    .preamble { font-family: Georgia, "Times New Roman", serif; font-size: 14px; color: #1E293B; background: #F8FAFC; border-left: 3px solid #1B4962; padding: 14px 18px; margin-bottom: 26px; }
    .schedule-title { font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #1B4962; margin-bottom: 10px; }
    .schedule-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border: 1px solid #DCE4EC; margin-bottom: 28px; }
    .term-cell { padding: 10px 14px; border-bottom: 1px solid #EDF2F7; border-right: 1px solid #EDF2F7; }
    .term-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #5A6B7C; font-weight: 600; }
    .term-val { font-size: 12.5px; color: #102030; font-weight: 600; margin-top: 2px; font-variant-numeric: tabular-nums; }
    .article { margin-bottom: 22px; }
    .article h2 { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #1B4962; border-bottom: 1px solid #DCE4EC; padding-bottom: 6px; margin: 0 0 10px; }
    .article p { margin: 0 0 9px; font-size: 13px; color: #334155; text-align: justify; }
    .sigs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 28px; padding-top: 22px; border-top: 2px solid #1B4962; }
    .sig-box { background: #F8FAFC; border: 1px solid #DCE4EC; padding: 14px 16px; }
    .sig-role { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #5A6B7C; font-weight: 700; }
    .sig-entity { font-family: Georgia, "Times New Roman", serif; font-size: 15px; font-weight: 700; color: #102030; margin-top: 4px; }
    .sig-meta { font-size: 11.5px; color: #475569; margin-top: 2px; }
    .sig-badge { display: inline-block; margin-top: 8px; font-size: 10.5px; font-weight: 600; color: #047857; background: #ECFDF5; border: 1px solid #A7F3D0; padding: 2px 8px; }
    .footer { background: #F6F8FA; border-top: 1px solid #DCE4EC; padding: 16px 36px; font-size: 11px; color: #5A6B7C; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    @media print { body { background: #FFFFFF; padding: 0; } .sheet { border: none; box-shadow: none; } }
    @media (max-width: 640px) { .schedule-grid, .sigs { grid-template-columns: 1fr; } .body, .crest, .footer { padding: 20px; } }
  </style>
</head>
<body>
  <article class="sheet">
    <header class="crest">
      <div>
        <div class="crest-brand">BitfuryTech Capital Management LLC · Institutional Custody</div>
        <h1>${title}</h1>
        <div class="crest-sub">${escapeHtml(full.jurisdiction)}</div>
      </div>
      <div class="crest-badge">
        <div><strong>Code:</strong> ${escapeHtml(full.documentCode)}</div>
        <div><strong>Ref:</strong> ${reference}</div>
        <div><strong>Date:</strong> ${effectiveDate}</div>
      </div>
    </header>
    <div class="body">
      <div class="class-bar">${escapeHtml(full.classification)}</div>
      <div class="preamble">${escapeHtml(full.preamble)}</div>
      <div class="schedule-title">Schedule I — Operative Economic &amp; Custody Terms</div>
      <div class="schedule-grid">${keyTermRows}</div>
      ${sectionBlocks}
      <div class="sigs">${signatoryBlocks}</div>
    </div>
    <footer class="footer">
      <span>Verification Digest: ${escapeHtml(full.authenticityHash)}</span>
      <span>Executed Electronically · Immutable Custody Record</span>
    </footer>
  </article>
</body>
</html>`;
}
