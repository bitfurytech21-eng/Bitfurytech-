import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText, RefreshCw } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  ErrorState,
  Modal,
  TableColumn,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import {
  CustomerDocumentDTO,
  formatIsoDate,
  sessionApiRequest,
} from "../../services/dashboardApi";

const DOC_TABS: Array<{ id: string; label: string }> = [
  { id: "All", label: "All Documents" },
  { id: "Agreement", label: "Investment Agreements" },
  { id: "Receipt", label: "Transaction Receipts" },
  { id: "DepositConfirmation", label: "Deposit Confirmations" },
  { id: "WithdrawalRecord", label: "Withdrawal Records" },
  { id: "AccountDocument", label: "Account Documents" },
];

export default function Documents() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<CustomerDocumentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [activeDoc, setActiveDoc] = useState<CustomerDocumentDTO | null>(null);

  const loadDocs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await sessionApiRequest<{ documents: CustomerDocumentDTO[] }>(
        "/api/documents"
      );
      setDocuments(res.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load customer documents.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  const filtered = useMemo(() => {
    if (categoryFilter === "All") return documents;
    return documents.filter((d) => d.docType === categoryFilter);
  }, [categoryFilter, documents]);

  const downloadDocumentCopy = (docItem: CustomerDocumentDTO) => {
    const content = [
      "BITFURYTECH CLIENT RECORD DOCUMENT",
      "==================================",
      `Title:       ${docItem.title}`,
      `Category:    ${docItem.docType}`,
      `Reference:   ${docItem.reference}`,
      `Date:        ${formatIsoDate(docItem.createdAt)}`,
      `Owner UID:   ${docItem.userId}`,
      "----------------------------------",
      docItem.summary,
      "==================================",
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bitfurytech-${docItem.reference}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const columns: TableColumn<CustomerDocumentDTO>[] = [
    {
      key: "title",
      header: "Document",
      render: (doc) => (
        <span className="font-semibold text-slate-900">{doc.title}</span>
      ),
    },
    {
      key: "docType",
      header: "Category",
      render: (doc) => <span className="text-slate-600">{doc.docType}</span>,
    },
    {
      key: "reference",
      header: "Reference",
      render: (doc) => <span className="font-mono text-slate-700">{doc.reference}</span>,
    },
    {
      key: "date",
      header: "Date",
      render: (doc) => (
        <span className="font-mono text-slate-500">{formatIsoDate(doc.createdAt)}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (doc) => (
        <div className="inline-flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setActiveDoc(doc)}>
            <Eye className="w-3.5 h-3.5" />
            <span>Inspect</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadDocumentCopy(doc)}
            aria-label={`Download ${doc.reference}`}
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Documents"
      subtitle="Inspect and download your investment agreements, transaction receipts, deposit confirmations, withdrawal records, and account disclosures."
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadDocs()}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Records</span>
        </Button>
      }
    >
      {error ? (
        <ErrorState
          title="Documents Unavailable"
          message={error}
          onRetry={() => void loadDocs()}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-4 py-3">
            {DOC_TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setCategoryFilter(t.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  categoryFilter === t.id
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <Card>
            <CardHeader
              title="Authenticated Client Vault"
              subtitle="Protected strictly to your verified user identity"
              action={<FileText className="w-4 h-4 text-slate-400" />}
            />
            <CardBody>
              <DataTable
                columns={columns}
                rows={filtered}
                rowKey={(d) => d.id}
                loading={loading}
                emptyTitle="No Documents in This Category"
                emptyDescription="Agreements, receipts, and confirmations are automatically generated as you deposit, invest, or withdraw."
              />
            </CardBody>
          </Card>
        </div>
      )}

      <Modal
        open={Boolean(activeDoc)}
        onClose={() => setActiveDoc(null)}
        title={activeDoc?.title || "Document"}
        description={activeDoc ? `${activeDoc.docType} · Reference ${activeDoc.reference}` : undefined}
        maxWidthClass="max-w-lg"
        footer={
          activeDoc && (
            <>
              <Button variant="outline" size="sm" onClick={() => setActiveDoc(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => downloadDocumentCopy(activeDoc)}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Copy</span>
              </Button>
            </>
          )
        }
      >
        {activeDoc && (
          <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
            <p className="font-mono text-slate-500">
              Recorded Date: {formatIsoDate(activeDoc.createdAt)}
            </p>
            <p>{activeDoc.summary}</p>
            {activeDoc.fileUrl && (
              <a
                href={activeDoc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block font-semibold text-[#1B4962] hover:text-[#B92841] hover:underline"
              >
                Open Attached File
              </a>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
