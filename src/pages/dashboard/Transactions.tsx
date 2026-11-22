import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Eye, RefreshCw, Search } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  ErrorState,
  Modal,
  SelectInput,
  StatusText,
  TableColumn,
  TextInput,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import {
  apiRequest,
  DashboardTransactionDTO,
  formatIsoDate,
} from "../../services/dashboardApi";
import { formatUsd } from "../../trading/tradingPage";

export default function Transactions() {
  const { firebaseUser, idToken } = useAuth();
  const [transactions, setTransactions] = useState<DashboardTransactionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedTx, setSelectedTx] = useState<DashboardTransactionDTO | null>(null);

  const loadTransactions = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      const token = idToken || (await firebaseUser.getIdToken());
      const res = await apiRequest<{ transactions: DashboardTransactionDTO[] }>(
        "/api/transactions",
        token
      );
      setTransactions(res.transactions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load transactions.");
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, idToken]);

  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (typeFilter !== "All" && tx.type !== typeFilter) return false;
      if (statusFilter !== "All" && tx.status !== statusFilter) return false;
      const isoDate = formatIsoDate(tx.createdAt);
      if (dateFrom && isoDate !== "Pending" && isoDate < dateFrom) return false;
      if (dateTo && isoDate !== "Pending" && isoDate > dateTo) return false;
      if (!q) return true;
      return (
        tx.reference.toLowerCase().includes(q) ||
        tx.method.toLowerCase().includes(q) ||
        (tx.description || "").toLowerCase().includes(q) ||
        tx.destination.toLowerCase().includes(q)
      );
    });
  }, [dateFrom, dateTo, searchQuery, statusFilter, transactions, typeFilter]);

  const downloadReceipt = (tx: DashboardTransactionDTO) => {
    const receiptText = [
      "BITFURYTECH CLIENT LEDGER RECEIPT",
      "=================================",
      `Reference:    ${tx.reference}`,
      `Date:         ${formatIsoDate(tx.createdAt)}`,
      `Account:      ${tx.userEmail}`,
      `Type:         ${tx.type}`,
      `Description:  ${tx.description || tx.method}`,
      `Rail/Method:  ${tx.method}`,
      `Destination:  ${tx.destination}`,
      `Amount:       ${formatUsd(tx.amount)} ${tx.currency || "USD"}`,
      `Status:       ${tx.status}`,
      "=================================",
      `Exported:     ${new Date().toISOString()}`,
    ].join("\n");

    const blob = new Blob([receiptText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bitfurytech-receipt-${tx.reference}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const columns: TableColumn<DashboardTransactionDTO>[] = [
    {
      key: "reference",
      header: "Reference",
      render: (tx) => <span className="font-mono text-slate-800">{tx.reference}</span>,
    },
    {
      key: "date",
      header: "Date",
      render: (tx) => (
        <span className="font-mono text-slate-600">{formatIsoDate(tx.createdAt)}</span>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (tx) => (
        <span className="text-slate-700 max-w-[260px] inline-block truncate">
          {tx.description || tx.method}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (tx) => <span className="font-semibold text-slate-900">{tx.type}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (tx) => (
        <span className="font-mono tabular-nums font-semibold text-slate-900">
          {formatUsd(tx.amount)}
        </span>
      ),
    },
    {
      key: "currency",
      header: "Currency",
      render: (tx) => (
        <span className="font-mono text-slate-500">{tx.currency || "USD"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (tx) => <StatusText status={tx.status} />,
    },
    {
      key: "actions",
      header: "Receipt",
      align: "right",
      render: (tx) => (
        <div className="inline-flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setSelectedTx(tx)}>
            <Eye className="w-3.5 h-3.5" />
            <span>View</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadReceipt(tx)}
            aria-label={`Download receipt ${tx.reference}`}
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout
      title="Transactions"
      subtitle="Search, filter, and download receipts for every Deposit, Withdrawal, Investment, Profit, and Referral ledger record."
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadTransactions()}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Ledger</span>
        </Button>
      }
    >
      {error ? (
        <ErrorState
          title="Unable to Load Transactions"
          message={error}
          onRetry={() => void loadTransactions()}
        />
      ) : (
        <Card>
          <CardHeader
            title="Account Transaction Ledger"
            subtitle={`${filtered.length} matching record(s) · Inspect details or download individual receipts`}
          />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative lg:col-span-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <TextInput
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reference, rail, or description..."
                  className="pl-8"
                  aria-label="Search transactions"
                />
              </div>
              <SelectInput
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                aria-label="Filter by transaction type"
              >
                <option value="All">All Types</option>
                <option value="Deposit">Deposit</option>
                <option value="Withdrawal">Withdrawal</option>
                <option value="Investment">Investment</option>
                <option value="Profit">Profit</option>
                <option value="Referral">Referral</option>
              </SelectInput>
              <SelectInput
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
              >
                <option value="All">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
                <option value="Rejected">Rejected</option>
              </SelectInput>
              <div className="flex items-center gap-2">
                <TextInput
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  aria-label="From date"
                />
                <TextInput
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  aria-label="To date"
                />
              </div>
            </div>

            <DataTable
              columns={columns}
              rows={filtered}
              rowKey={(tx) => tx.id}
              loading={loading}
              emptyTitle="No Matching Transactions"
              emptyDescription="Try clearing your search or date filters to view all account transactions."
            />
          </CardBody>
        </Card>
      )}

      <Modal
        open={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        title={selectedTx ? `Transaction Receipt — ${selectedTx.reference}` : "Receipt"}
        description="Immutable account ledger entry"
        maxWidthClass="max-w-lg"
        footer={
          selectedTx && (
            <>
              <Button variant="outline" size="sm" onClick={() => setSelectedTx(null)}>
                Close
              </Button>
              <Button variant="primary" size="sm" onClick={() => downloadReceipt(selectedTx)}>
                <Download className="w-3.5 h-3.5" />
                <span>Download Receipt</span>
              </Button>
            </>
          )
        }
      >
        {selectedTx && (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <dt className="text-slate-500">Reference</dt>
              <dd className="font-mono font-semibold text-slate-900 mt-0.5">
                {selectedTx.reference}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="mt-0.5">
                <StatusText status={selectedTx.status} />
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Transaction Type</dt>
              <dd className="font-semibold text-slate-900 mt-0.5">{selectedTx.type}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Amount</dt>
              <dd className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                {formatUsd(selectedTx.amount)} {selectedTx.currency || "USD"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Description</dt>
              <dd className="text-slate-800 mt-0.5">
                {selectedTx.description || selectedTx.method}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Method / Rail</dt>
              <dd className="text-slate-800 mt-0.5">{selectedTx.method}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Date</dt>
              <dd className="font-mono text-slate-800 mt-0.5">
                {formatIsoDate(selectedTx.createdAt)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Destination</dt>
              <dd className="text-slate-800 break-all mt-0.5">{selectedTx.destination}</dd>
            </div>
          </dl>
        )}
      </Modal>
    </DashboardLayout>
  );
}
