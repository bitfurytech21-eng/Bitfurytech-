import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Eye, FileText, RefreshCw } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DashboardSymbol,
  DataTable,
  ErrorState,
  TableColumn,
} from "../../components/ui";
import {
  downloadInstitutionalHtml,
  InstitutionalDocumentModal,
} from "../../components/documents/InstitutionalDocumentModal";
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

  const columns: TableColumn<CustomerDocumentDTO>[] = [
    {
      key: "title",
      header: "Document",
      render: (doc) => (
        <div className="min-w-[220px]">
          <p className="font-semibold text-[#102030]">{doc.title}</p>
          <p className="text-[11px] text-[#5A6B7C] line-clamp-1">{doc.summary}</p>
        </div>
      ),
    },
    {
      key: "docType",
      header: "Category",
      render: (doc) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[#EDF3F7] text-[#1B4962] text-[11px] font-semibold">
          {doc.fullDocument?.documentCode || doc.docType}
        </span>
      ),
    },
    {
      key: "reference",
      header: "Reference",
      render: (doc) => <span className="font-mono text-[#3B4C5E]">{doc.reference}</span>,
    },
    {
      key: "date",
      header: "Date",
      render: (doc) => (
        <span className="text-[#5A6B7C] tabular-nums">{formatIsoDate(doc.createdAt)}</span>
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
            <span>Open Agreement</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadInstitutionalHtml(doc)}
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
      subtitle="Inspect, print, and download your institutional investment agreements, master custody disclosures, deposit confirmations, withdrawal instruments, and ledger receipts."
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
                    ? "bg-[#1B4962] text-white"
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
              subtitle="Full institutional agreements and custody instruments protected strictly to your verified user identity"
              action={<DashboardSymbol icon={FileText} tone="navy" size="md" />}
            />
            <CardBody>
              <DataTable
                columns={columns}
                rows={filtered}
                rowKey={(d) => d.id}
                loading={loading}
                emptyTitle="No Documents in This Category"
                emptyDescription="Full institutional agreements, receipts, and confirmations are automatically generated as you deposit, invest, or withdraw."
              />
            </CardBody>
          </Card>
        </div>
      )}

      <InstitutionalDocumentModal
        documentItem={activeDoc}
        onClose={() => setActiveDoc(null)}
      />
    </DashboardLayout>
  );
}

