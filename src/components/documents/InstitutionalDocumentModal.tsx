import { Download, FileCheck2, FileText, Printer, ShieldCheck } from "lucide-react";
import { Button, Modal } from "../ui";
import { formatIsoDate, type CustomerDocumentDTO } from "../../services/dashboardApi";
import {
  renderInstitutionalDocumentHtml,
  renderInstitutionalDocumentPlainText,
} from "../../services/institutionalDocuments";

export function downloadInstitutionalHtml(doc: CustomerDocumentDTO): void {
  const html = renderInstitutionalDocumentHtml(doc);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bitfurytech-${doc.reference || doc.id}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadInstitutionalText(doc: CustomerDocumentDTO): void {
  const text = renderInstitutionalDocumentPlainText(doc);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bitfurytech-${doc.reference || doc.id}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function printInstitutionalDocument(doc: CustomerDocumentDTO): void {
  const html = renderInstitutionalDocumentHtml(doc);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.className = "fixed -left-[9999px] -top-[9999px] w-0 h-0 border-0";
  document.body.appendChild(iframe);
  const frameWin = iframe.contentWindow;
  const frameDoc = iframe.contentDocument || frameWin?.document;
  if (!frameDoc || !frameWin) {
    document.body.removeChild(iframe);
    downloadInstitutionalHtml(doc);
    return;
  }
  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();
  setTimeout(() => {
    try {
      frameWin.focus();
      frameWin.print();
    } finally {
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 1500);
    }
  }, 150);
}

export function InstitutionalDocumentModal({
  documentItem,
  onClose,
}: {
  documentItem: CustomerDocumentDTO | null;
  onClose: () => void;
}) {
  const full = documentItem?.fullDocument;

  return (
    <Modal
      open={Boolean(documentItem)}
      onClose={onClose}
      title={documentItem?.title || "Institutional Document"}
      description={
        documentItem
          ? `${full?.documentCode ? `${full.documentCode} · ` : ""}Reference ${documentItem.reference} · ${formatIsoDate(documentItem.createdAt)}`
          : undefined
      }
      maxWidthClass="max-w-4xl"
      footer={
        documentItem && (
          <div className="flex flex-wrap items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-2 min-w-0 max-w-full text-[11px] text-[#5A6B7C]">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="font-mono truncate max-w-full sm:max-w-[320px]">
                {full?.authenticityHash || `REF-${documentItem.reference}`}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadInstitutionalText(documentItem)}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Transcript (.txt)</span>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => printInstitutionalDocument(documentItem)}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / PDF</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => downloadInstitutionalHtml(documentItem)}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Agreement</span>
              </Button>
            </div>
          </div>
        )
      }
    >
      {documentItem && (
        <div className="max-h-[68vh] overflow-y-auto pr-1 space-y-5">
          {full ? (
            <article className="border border-[#CBD6E2] rounded-[5px] overflow-hidden bg-white shadow-sm">
              {/* Institutional Crest Letterhead */}
              <div className="bg-[#1B4962] text-white px-4 sm:px-6 py-5 border-b-4 border-[#E94D65] flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-300">
                    BitfuryTech Capital Management LLC · Institutional Custody
                  </p>
                  <h3 className="text-lg font-serif font-bold text-white leading-snug break-words">
                    {documentItem.title}
                  </h3>
                  <p className="text-xs text-slate-200">{full.jurisdiction}</p>
                </div>
                <div className="w-full sm:w-auto bg-white/10 border border-white/20 rounded-[4px] px-3 py-2 text-[11px] sm:text-right space-y-0.5 sm:shrink-0">
                  <p>
                    <span className="text-slate-300">Code:</span>{" "}
                    <span className="font-semibold text-white">{full.documentCode}</span>
                  </p>
                  <p>
                    <span className="text-slate-300">Ref:</span>{" "}
                    <span className="font-semibold text-white">{documentItem.reference}</span>
                  </p>
                  <p>
                    <span className="text-slate-300">Effective:</span>{" "}
                    <span className="font-semibold text-white">{full.effectiveDate}</span>
                  </p>
                </div>
              </div>

              <div className="p-4 sm:p-6 space-y-6">
                {/* Classification & Preamble */}
                <div className="space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#E94D65]">
                    {full.classification}
                  </p>
                  <div className="bg-[#F8FAFC] border-l-4 border-[#1B4962] px-4 py-3 text-xs sm:text-[13px] font-serif text-[#1E293B] leading-relaxed">
                    {full.preamble}
                  </div>
                </div>

                {/* Schedule I Economic & Custody Terms */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#1B4962]">
                    Schedule I — Operative Economic &amp; Custody Terms
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 border border-[#DCE4EC] rounded-[4px] overflow-hidden">
                    {full.keyTerms.map((term) => (
                      <div
                        key={term.label}
                        className="px-3.5 py-2.5 border-b border-r border-[#EDF2F7] bg-white"
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5A6B7C]">
                          {term.label}
                        </p>
                        <p className="text-xs font-semibold text-[#102030] tabular-nums mt-0.5 break-words">
                          {term.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Articles */}
                <div className="space-y-5">
                  {full.sections.map((section) => (
                    <section key={section.heading} className="space-y-2">
                      <h4 className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#1B4962] border-b border-[#DCE4EC] pb-1.5">
                        {section.heading}
                      </h4>
                      <div className="space-y-2 text-xs text-[#334155] leading-relaxed">
                        {section.body.map((paragraph, idx) => (
                          <p key={idx}>{paragraph}</p>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>

                {/* Signatories Block */}
                <div className="pt-5 border-t-2 border-[#1B4962] grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {full.signatories.map((sig) => (
                    <div
                      key={sig.role}
                      className="bg-[#F8FAFC] border border-[#DCE4EC] rounded-[4px] p-3.5 space-y-1"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#5A6B7C]">
                        {sig.role}
                      </p>
                      <p className="text-sm font-serif font-bold text-[#102030]">
                        {sig.entity}
                      </p>
                      <p className="text-[11px] text-[#475569] break-all">
                        {sig.nameOrTitle}
                      </p>
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-[3px] text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <FileCheck2 className="w-3 h-3" />
                        <span>{sig.verificationStatus}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ) : (
            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <p className="font-mono text-slate-500">
                Recorded Date: {formatIsoDate(documentItem.createdAt)}
              </p>
              <p>{documentItem.summary}</p>
            </div>
          )}

          {documentItem.fileUrl && (
            <div className="pt-1 flex flex-wrap items-center justify-between gap-2 bg-[#F6F8FA] border border-[#DCE4EC] rounded-[4px] px-4 py-2.5 text-xs">
              <span className="text-[#5A6B7C]">Supporting Corporate Certificate Attached</span>
              <a
                href={documentItem.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#1B4962] hover:text-[#E94D65] hover:underline"
              >
                Open Attached PDF Certificate
              </a>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
