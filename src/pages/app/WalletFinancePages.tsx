import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownCircle, ArrowUpRight, Wallet } from "lucide-react";
import MetronicShell from "../../components/MetronicShell";
import {
  Button,
  buttonClasses,
  Card,
  CardBody,
  CardHeader,
  DashboardSymbol,
  DataTable,
  FormField,
  NotificationBanner,
  SelectInput,
  StatusText,
  TableColumn,
  TextInput,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import {
  DashboardOverviewDTO,
  DashboardTransactionDTO,
  fetchDashboardOverview,
  formatTimestamp,
  sessionApiRequest,
} from "../../services/dashboardApi";
import { formatUsd } from "../../trading/tradingPage";

const PAYMENT_RAILS = [
  "USDT (TRC20)",
  "Bitcoin (BTC)",
  "Ethereum (ETH)",
  "Bank Wire",
] as const;

type TransactionRecord = DashboardTransactionDTO;

export function WalletPage() {
  const { user, profile } = useAuth();
  const [overview, setOverview] = useState<DashboardOverviewDTO | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadWallet = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [ov, txRes] = await Promise.all([
        fetchDashboardOverview(),
        sessionApiRequest<{ transactions: TransactionRecord[] }>("/api/transactions"),
      ]);
      setOverview(ov);
      setTransactions(txRes.transactions ?? []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const availableBalance = overview?.metrics.availableBalance ?? profile?.walletBalance ?? 0;
  const totalDeposit = overview?.metrics.totalDeposit ?? profile?.totalDeposit ?? 0;
  const preferredRail = overview?.account.preferredRail || profile?.preferredRail || "USDT (TRC20)";
  const pendingAmount = transactions
    .filter((t) => t.status === "Pending")
    .reduce((sum, t) => sum + t.amount, 0);

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
  ];

  return (
    <MetronicShell
      title="Custody Wallet"
      subtitle="Review your verified available balance, cumulative deposits, pending settlements, and complete wallet movement history."
    >
      <div className="grid md:grid-cols-3 gap-4">
        <Card padding="md" className="flex items-center gap-4">
          <DashboardSymbol icon={Wallet} tone="navy" size="lg" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Available Balance</p>
            <p className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
              {formatUsd(availableBalance)}
            </p>
          </div>
        </Card>

        <Card padding="md" className="flex items-center gap-4">
          <DashboardSymbol icon={ArrowDownCircle} tone="green" size="lg" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Cumulative Deposits</p>
            <p className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
              {formatUsd(totalDeposit)}
            </p>
          </div>
        </Card>

        <Card padding="md" className="flex items-center gap-4">
          <DashboardSymbol icon={ArrowUpRight} tone="red" size="lg" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">Pending Verification</p>
            <p className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
              {formatUsd(pendingAmount)}
            </p>
          </div>
        </Card>
      </div>

      <Card padding="lg" className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Preferred Settlement Rail</h2>
          <p className="text-xs text-slate-500 mt-1">
            Configured default rail:{" "}
            <span className="font-semibold text-slate-800">
              {preferredRail}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/deposit" className={buttonClasses({ variant: "primary", size: "md" })}>
            Deposit Funds
          </Link>
          <Link to="/withdrawal" className={buttonClasses({ variant: "outline", size: "md" })}>
            Withdraw Funds
          </Link>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Wallet Movement History"
          subtitle="All deposits, withdrawals, allocations, and settled credits linked to your wallet"
          action={
            <Link to="/transactions" className="text-xs font-semibold text-[#294158] hover:underline">
              Full Ledger
            </Link>
          }
        />
        <CardBody>
          <DataTable
            columns={columns}
            rows={transactions}
            rowKey={(tx) => tx.id}
            loading={loading}
            emptyTitle="No Wallet Movements Recorded"
            emptyDescription="Submit a deposit notice or mandate transfer to populate your wallet ledger."
          />
        </CardBody>
      </Card>
    </MetronicShell>
  );
}

export function DepositPage() {
  const { user, profile } = useAuth();
  const [availableBalance, setAvailableBalance] = useState(profile?.walletBalance ?? 0);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>(profile?.preferredRail || "USDT (TRC20)");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationRef, setConfirmationRef] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchDashboardOverview()
      .then((ov) => setAvailableBalance(ov.metrics.availableBalance))
      .catch(() => undefined);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setConfirmationRef(null);

    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a valid positive USD deposit amount.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await sessionApiRequest<{ ok: boolean; deposit: { reference: string } }>(
        "/api/deposits",
        {
          method: "POST",
          body: JSON.stringify({
            amount: parsed,
            method,
            reference: reference.trim(),
            idempotencyKey: `dep_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          }),
        }
      );
      setConfirmationRef(res.deposit?.reference || "DEP-LOGGED");
      setAmount("");
      setReference("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit deposit notice.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MetronicShell
      title="Deposit Funds"
      subtitle="Submit a settlement deposit notice for administrator verification."
    >
      <div className="grid lg:grid-cols-12 gap-6">
        <Card padding="lg" className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <h2 className="text-sm font-bold text-slate-900">New Deposit Notice</h2>

            {error && (
              <NotificationBanner
                tone="error"
                message={error}
                onDismiss={() => setError(null)}
              />
            )}

            {confirmationRef && (
              <NotificationBanner
                tone="success"
                title="Deposit Notice Submitted (Pending Verification)"
                message={
                  <>
                    Reference <span className="font-mono font-semibold">{confirmationRef}</span>{" "}
                    has been logged to your transaction ledger.
                  </>
                }
                onDismiss={() => setConfirmationRef(null)}
              />
            )}

            <FormField id="deposit-rail" label="Funding Rail">
              <SelectInput
                id="deposit-rail"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {PAYMENT_RAILS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField id="deposit-amount" label="Deposit Amount (USD)">
              <TextInput
                id="deposit-amount"
                type="number"
                numeric
                min="1"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 2500.00"
              />
            </FormField>

            <FormField id="deposit-ref" label="Transfer Hash / Wire Reference (Optional)">
              <TextInput
                id="deposit-ref"
                type="text"
                maxLength={64}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transaction hash or wire confirmation ID"
              />
            </FormField>

            <Button type="submit" loading={submitting}>
              Submit Deposit Notice
            </Button>
          </form>
        </Card>

        <Card padding="lg" className="lg:col-span-5 space-y-4 self-start">
          <h3 className="text-sm font-bold text-slate-900">Settlement Policy</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every submitted deposit notice enters your ledger with a <strong>Pending</strong> status.
            Your wallet balance updates automatically once verified in the BitfuryTech Settlement
            Queue.
          </p>
          <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Current Balance</span>
              <span className="font-mono font-semibold text-slate-900">
                {formatUsd(availableBalance)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Destination Desk</span>
              <span className="text-slate-800 font-medium">BitfuryTech Custody Desk</span>
            </div>
          </div>
        </Card>
      </div>
    </MetronicShell>
  );
}

export function WithdrawalPage() {
  const { user, profile } = useAuth();
  const [available, setAvailable] = useState(profile?.walletBalance ?? 0);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>(profile?.preferredRail || "USDT (TRC20)");
  const [destination, setDestination] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationRef, setConfirmationRef] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchDashboardOverview()
      .then((ov) => setAvailable(ov.metrics.availableBalance))
      .catch(() => undefined);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);
    setConfirmationRef(null);

    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a valid positive USD withdrawal amount.");
      return;
    }
    if (parsed > available) {
      setError("Withdrawal amount cannot exceed your available wallet balance.");
      return;
    }
    if (!destination.trim()) {
      setError("Specify a valid destination wallet address or bank account reference.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await sessionApiRequest<{ ok: boolean; withdrawal: { reference: string } }>(
        "/api/withdrawals",
        {
          method: "POST",
          body: JSON.stringify({
            amount: parsed,
            method,
            destination: destination.trim(),
            confirmed: true,
            idempotencyKey: `wdr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          }),
        }
      );
      setConfirmationRef(res.withdrawal?.reference || "WDR-LOGGED");
      setAmount("");
      setDestination("");
      setAvailable((prev) => Math.max(0, prev - parsed));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit withdrawal request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MetronicShell
      title="Request Withdrawal"
      subtitle="Withdraw available liquidity from your BitfuryTech custody wallet."
    >
      <div className="grid lg:grid-cols-12 gap-6">
        <Card padding="lg" className="lg:col-span-7">
          <form onSubmit={handleSubmit} className="space-y-5">
            <h2 className="text-sm font-bold text-slate-900">Withdrawal Disbursement Request</h2>

            {error && (
              <NotificationBanner
                tone="error"
                message={error}
                onDismiss={() => setError(null)}
              />
            )}

            {confirmationRef && (
              <NotificationBanner
                tone="success"
                title="Withdrawal Queued for Settlement"
                message={
                  <>
                    Reference <span className="font-mono font-semibold">{confirmationRef}</span>{" "}
                    has been reserved from your available wallet balance.
                  </>
                }
                onDismiss={() => setConfirmationRef(null)}
              />
            )}

            <FormField id="wdr-rail" label="Payout Rail">
              <SelectInput id="wdr-rail" value={method} onChange={(e) => setMethod(e.target.value)}>
                {PAYMENT_RAILS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <FormField id="wdr-amount" label="Withdrawal Amount (USD)">
              <TextInput
                id="wdr-amount"
                type="number"
                numeric
                min="1"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 500.00"
              />
            </FormField>

            <FormField id="wdr-dest" label="Destination Address / Wire Beneficiary">
              <TextInput
                id="wdr-dest"
                type="text"
                required
                maxLength={200}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Wallet address or IBAN / routing beneficiary"
              />
            </FormField>

            <Button type="submit" loading={submitting} disabled={available <= 0}>
              Submit Withdrawal
            </Button>
          </form>
        </Card>

        <Card padding="lg" className="lg:col-span-5 space-y-4 self-start">
          <h3 className="text-sm font-bold text-slate-900">Available Liquidity</h3>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
            {formatUsd(available)}
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            Requested withdrawal funds are held in reserve upon submission. If an administrator
            declines a payout request, the full reserved amount returns immediately to your wallet
            balance.
          </p>
        </Card>
      </div>
    </MetronicShell>
  );
}
