import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import MetronicShell from "../../components/MetronicShell";
import {
  Card,
  CardBody,
  CardHeader,
  DataTable,
  Spinner,
  StatusText,
  TableColumn,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import {
  DashboardTransactionDTO,
  formatTimestamp,
  sessionApiRequest,
} from "../../services/dashboardApi";
import { formatUsd } from "../../trading/tradingPage";

type TransactionRecord = DashboardTransactionDTO;

export function TransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");

  useEffect(() => {
    if (!user) return;
    let active = true;
    sessionApiRequest<{ transactions: TransactionRecord[] }>("/api/transactions")
      .then((res) => {
        if (!active) return;
        setTransactions(res.transactions ?? []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const filtered =
    filter === "All" ? transactions : transactions.filter((t) => t.type === filter);

  const columns: TableColumn<TransactionRecord>[] = [
    {
      key: "date",
      header: "Date",
      render: (tx) => <span className="text-slate-600">{formatTimestamp(tx.createdAt)}</span>,
    },
    {
      key: "type",
      header: "Type",
      render: (tx) => <span className="font-semibold text-slate-900">{tx.type}</span>,
    },
    {
      key: "method",
      header: "Method",
      render: (tx) => <span className="text-slate-600">{tx.method}</span>,
    },
    {
      key: "reference",
      header: "Reference",
      render: (tx) => <span className="font-mono text-slate-500">{tx.reference}</span>,
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
      key: "status",
      header: "Status",
      align: "right",
      render: (tx) => <StatusText status={tx.status} />,
    },
    {
      key: "details",
      header: "Details",
      align: "right",
      render: (tx) => (
        <Link
          to={`/transactions/${tx.id}`}
          className="text-[#294158] font-semibold hover:underline"
        >
          Inspect
        </Link>
      ),
    },
  ];

  return (
    <MetronicShell
      title="Transactions"
      subtitle="Complete immutable audit ledger of deposits, withdrawals, and mandate allocations."
    >
      <Card>
        <CardHeader
          title="Ledger Entries"
          action={
            <div className="flex flex-wrap gap-1 p-1 bg-slate-100 rounded-md">
              {["All", "Deposit", "Withdrawal", "Investment"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilter(tab)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    filter === tab
                      ? "bg-[#1e2b3c] text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          }
        />
        <CardBody>
          <DataTable
            columns={columns}
            rows={filtered}
            rowKey={(tx) => tx.id}
            loading={loading}
            emptyTitle="No Matching Transactions"
            emptyDescription="All verified ledger events for your account will appear here."
          />
        </CardBody>
      </Card>
    </MetronicShell>
  );
}

export function TransactionDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    let active = true;
    sessionApiRequest<{ transactions: TransactionRecord[] }>("/api/transactions")
      .then((res) => {
        if (!active) return;
        setTransactions(res.transactions ?? []);
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const tx = transactions.find((item) => item.id === id);

  return (
    <MetronicShell
      title="Transaction Receipt"
      subtitle="Detailed ledger verification record."
    >
      <div className="space-y-4">
        <Link
          to="/transactions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#294158] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Transactions</span>
        </Link>

        {!loaded ? (
          <Card padding="md">
            <Spinner label="Loading ledger record..." />
          </Card>
        ) : !tx ? (
          <Card padding="md">
            <p className="text-xs text-slate-600">
              Transaction record not found or belongs to another account.
            </p>
          </Card>
        ) : (
          <Card padding="lg" className="max-w-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs text-slate-500">Reference Code</p>
                <p className="text-base font-bold font-mono text-slate-900">{tx.reference}</p>
              </div>
              <StatusText status={tx.status} />
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <dt className="text-slate-500">Transaction Type</dt>
                <dd className="font-semibold text-slate-900 mt-0.5">{tx.type}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Settlement Amount</dt>
                <dd className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                  {formatUsd(tx.amount)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Method / Rail</dt>
                <dd className="text-slate-800 mt-0.5">{tx.method}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Destination</dt>
                <dd className="text-slate-800 mt-0.5 break-all">{tx.destination}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Recorded Date</dt>
                <dd className="text-slate-800 mt-0.5">{formatTimestamp(tx.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Account Email</dt>
                <dd className="text-slate-800 mt-0.5">{tx.userEmail}</dd>
              </div>
            </dl>
          </Card>
        )}
      </div>
    </MetronicShell>
  );
}
