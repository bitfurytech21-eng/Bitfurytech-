import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
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
  sessionApiRequest,
  DashboardTransactionDTO,
  formatIsoDate,
  WithdrawalConfigDTO,
} from "../../services/dashboardApi";
import { formatUsd } from "../../trading/tradingPage";

function makeWithdrawKey(): string {
  return `wdr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function Withdraw() {
  const { backendSession, authReady, profile } = useAuth();
  const [config, setConfig] = useState<WithdrawalConfigDTO>({
    minWithdrawal: 50,
    maxSingleWithdrawal: 250000,
    feeRatePct: 1.0,
    minFeeUsd: 2.0,
    currency: "USD",
    supportedRails: ["USDT (TRC20)", "Bitcoin (BTC)", "Ethereum (ETH)", "Bank Wire"],
  });
  const [method, setMethod] = useState<string>(profile?.preferredRail || "USDT (TRC20)");
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [accountDetails, setAccountDetails] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(makeWithdrawKey);

  const [withdrawals, setWithdrawals] = useState<DashboardTransactionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{
    reference: string;
    amount: number;
    fee: number;
    netPayout: number;
    method: string;
    destination: string;
    status: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    if (!authReady || !backendSession) return;
    setLoading(true);
    try {
      const [cfg, txRes] = await Promise.all([
        sessionApiRequest<WithdrawalConfigDTO>("/api/withdrawals/config"),
        sessionApiRequest<{ transactions: DashboardTransactionDTO[] }>("/api/transactions"),
      ]);
      setConfig(cfg);
      setWithdrawals(txRes.transactions.filter((t) => t.type === "Withdrawal"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load withdrawal configuration.");
    } finally {
      setLoading(false);
    }
  }, [backendSession, authReady]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const available = profile?.walletBalance ?? 0;
  const parsedAmount = Number(amount) || 0;
  const estimatedFee =
    parsedAmount > 0
      ? Number(
          Math.max(config.minFeeUsd, (parsedAmount * config.feeRatePct) / 100).toFixed(2)
        )
      : 0;
  const netPayout =
    parsedAmount > 0 ? Number(Math.max(0, parsedAmount - estimatedFee).toFixed(2)) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backendSession) return;
    setError(null);
    setReceipt(null);

    if (!Number.isFinite(parsedAmount) || parsedAmount < config.minWithdrawal) {
      setError(`Minimum withdrawal amount is ${formatUsd(config.minWithdrawal)}.`);
      return;
    }
    if (parsedAmount > available) {
      setError("Withdrawal amount exceeds your available wallet balance.");
      return;
    }
    if (!destination.trim() || destination.trim().length < 4) {
      setError("Enter a valid payout wallet address or bank beneficiary.");
      return;
    }
    if (!confirmed) {
      setError("Check the explicit confirmation box before submitting your withdrawal.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiRequest<{
        ok: boolean;
        withdrawal: {
          reference: string;
          amount: number;
          fee: number;
          netPayout: number;
          method: string;
          destination: string;
          status: string;
        };
      }>("/api/withdrawals", {
        method: "POST",
        body: JSON.stringify({
          method,
          amount: parsedAmount,
          destination: destination.trim(),
          accountDetails: accountDetails.trim(),
          confirmed: true,
          idempotencyKey,
        }),
      });

      setReceipt(res.withdrawal);
      setAmount("");
      setDestination("");
      setAccountDetails("");
      setConfirmed(false);
      setIdempotencyKey(makeWithdrawKey());
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit withdrawal request.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: TableColumn<DashboardTransactionDTO>[] = [
    {
      key: "date",
      header: "Request Date",
      render: (tx) => (
        <span className="font-mono text-slate-600">{formatIsoDate(tx.createdAt)}</span>
      ),
    },
    {
      key: "reference",
      header: "Reference",
      render: (tx) => <span className="font-mono text-slate-800">{tx.reference}</span>,
    },
    {
      key: "method",
      header: "Rail",
      render: (tx) => <span className="text-slate-700">{tx.method}</span>,
    },
    {
      key: "destination",
      header: "Destination",
      render: (tx) => (
        <span className="text-slate-600 truncate max-w-[200px] inline-block">
          {tx.destination}
        </span>
      ),
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
    <DashboardLayout
      title="Withdraw Funds"
      subtitle="Request a payout from your available custody balance with upfront fee calculation and full settlement tracking."
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadData()}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </Button>
      }
    >
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <Card className="lg:col-span-7">
          <CardHeader
            title="Withdrawal Disbursement Request"
            subtitle={`Minimum withdrawal ${formatUsd(config.minWithdrawal)} · Fee ${config.feeRatePct}% (min ${formatUsd(config.minFeeUsd)})`}
            action={<ArrowUpRight className="w-4 h-4 text-slate-400" />}
          />
          <CardBody>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <NotificationBanner
                  tone="error"
                  message={error}
                  onDismiss={() => setError(null)}
                />
              )}

              {receipt && (
                <NotificationBanner
                  tone="success"
                  title={`Withdrawal Queued (${receipt.status})`}
                  message={`Reference ${receipt.reference}: Requested ${formatUsd(receipt.amount)} (fee ${formatUsd(receipt.fee)}, net payout ${formatUsd(receipt.netPayout)}) to ${receipt.destination}.`}
                  onDismiss={() => setReceipt(null)}
                />
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField id="wdr-method" label="Payout Rail">
                  <SelectInput
                    id="wdr-method"
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                  >
                    {config.supportedRails.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </SelectInput>
                </FormField>

                <FormField
                  id="wdr-amt"
                  label="Withdrawal Amount (USD)"
                  hint={`Min ${formatUsd(config.minWithdrawal)} · Max ${formatUsd(available)}`}
                >
                  <TextInput
                    id="wdr-amt"
                    type="number"
                    numeric
                    min={config.minWithdrawal}
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 500.00"
                  />
                </FormField>
              </div>

              <FormField id="wdr-destination" label="Payment Destination">
                <TextInput
                  id="wdr-destination"
                  type="text"
                  required
                  maxLength={140}
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="Wallet address (TRC20/BTC/ETH) or IBAN / Account Number"
                />
              </FormField>

              <FormField
                id="wdr-details"
                label="Beneficiary / Account Details (Optional)"
                hint="Include bank name, SWIFT code, or network memo if applicable"
              >
                <TextInput
                  id="wdr-details"
                  type="text"
                  maxLength={100}
                  value={accountDetails}
                  onChange={(e) => setAccountDetails(e.target.value)}
                  placeholder="Beneficiary name, bank SWIFT, or tag"
                />
              </FormField>

              <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#1B4962]"
                />
                <span>
                  I confirm the payout destination above belongs to me and authorize reserving{" "}
                  <strong className="font-mono">{formatUsd(parsedAmount)}</strong> (estimated net
                  disbursement <strong className="font-mono">{formatUsd(netPayout)}</strong> after{" "}
                  <strong className="font-mono">{formatUsd(estimatedFee)}</strong> fee).
                </span>
              </label>

              <Button
                type="submit"
                loading={submitting}
                disabled={available < config.minWithdrawal}
              >
                Confirm &amp; Submit Withdrawal
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader title="Liquidity & Fee Schedule" />
          <CardBody className="space-y-4 text-xs">
            <div>
              <p className="text-slate-500">Available Wallet Balance</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                {formatUsd(available)}
              </p>
            </div>
            <dl className="space-y-2.5 pt-3 border-t border-slate-200">
              <div className="flex justify-between">
                <dt className="text-slate-500">Minimum Withdrawal</dt>
                <dd className="font-mono tabular-nums font-semibold text-slate-900">
                  {formatUsd(config.minWithdrawal)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Applicable Fee</dt>
                <dd className="font-mono tabular-nums text-slate-800">
                  {formatUsd(estimatedFee)} ({config.feeRatePct}%)
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Estimated Net Payout</dt>
                <dd className="font-mono tabular-nums font-bold text-emerald-700">
                  {formatUsd(netPayout)}
                </dd>
              </div>
            </dl>
            <p className="text-slate-500 leading-relaxed pt-2 border-t border-slate-100">
              Funds are held in reserve while Pending review. If an administrator declines a
              withdrawal request, the full reserved amount returns to your available balance.
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Withdrawal History"
          subtitle="Pending, Completed, and Rejected payout requests; declined requests automatically restore reserved funds"
        />
        <CardBody>
          <DataTable
            columns={columns}
            rows={withdrawals}
            rowKey={(tx) => tx.id}
            loading={loading}
            emptyTitle="No Withdrawal Requests"
            emptyDescription="Submitted withdrawal requests appear here with real-time settlement status."
          />
        </CardBody>
      </Card>
    </DashboardLayout>
  );
}
