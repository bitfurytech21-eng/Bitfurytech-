import FinancialAmount from "../../components/FinancialAmount";
import { useCallback, useEffect, useState } from "react";
import { ArrowDownCircle, CheckCircle2, RefreshCw } from "lucide-react";
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
  DepositRailDTO,
  formatIsoDate,
} from "../../services/dashboardApi";
import { formatUsd } from "../../trading/tradingPage";

function makeDepositKey(): string {
  return `dep_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function Deposit() {
  const { backendSession, authReady, profile } = useAuth();
  const [methods, setMethods] = useState<DepositRailDTO[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    profile?.preferredRail || "USDT (TRC20)"
  );
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState<string>(makeDepositKey);

  const [deposits, setDeposits] = useState<DashboardTransactionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedNotice, setSubmittedNotice] = useState<{
    reference: string;
    method: string;
    currency: string;
    amount: number;
    status: string;
    confirmationInfo: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    if (!authReady || !backendSession) return;
    setLoading(true);
    try {
      const [railsRes, txRes] = await Promise.all([
        sessionApiRequest<{ methods: DepositRailDTO[] }>("/api/deposits/methods"),
        sessionApiRequest<{ transactions: DashboardTransactionDTO[] }>("/api/transactions"),
      ]);
      setMethods(railsRes.methods);
      if (railsRes.methods.length > 0 && !railsRes.methods.some((m) => m.id === selectedMethodId)) {
        setSelectedMethodId(railsRes.methods[0].id);
      }
      setDeposits(txRes.transactions.filter((t) => t.type === "Deposit"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load deposit methods.");
    } finally {
      setLoading(false);
    }
  }, [backendSession, authReady, selectedMethodId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeRail = methods.find((m) => m.id === selectedMethodId) || methods[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backendSession || !activeRail) return;
    setError(null);
    setSubmittedNotice(null);

    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed < activeRail.minDeposit) {
      setError(
        `Enter at least $<FinancialAmount value={activeRail.minDeposit} /> for ${activeRail.label}.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await sessionApiRequest<{
        ok: boolean;
        deposit: {
          reference: string;
          method: string;
          currency: string;
          amount: number;
          status: string;
          confirmationInfo: string;
        };
      }>("/api/deposits", {
        method: "POST",
        body: JSON.stringify({
          method: activeRail.id,
          amount: parsed,
          reference: reference.trim(),
          idempotencyKey,
        }),
      });

      setSubmittedNotice(res.deposit);
      setAmount("");
      setReference("");
      setIdempotencyKey(makeDepositKey());
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to record deposit notice.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: TableColumn<DashboardTransactionDTO>[] = [
    {
      key: "date",
      header: "Date",
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
      header: "Payment Method",
      render: (tx) => <span className="text-slate-700">{tx.method}</span>,
    },
    {
      key: "amount",
      header: "Amount (USD)",
      align: "right",
      render: (tx) => (
        <span className="font-mono tabular-nums font-semibold text-slate-900">
          <FinancialAmount value={tx.amount} />
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
      title="Deposit Funds"
      subtitle="Select a supported rail, review transfer instructions, and submit a deposit notice for settlement verification."
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadData()}>
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Status</span>
        </Button>
      }
    >
      <div className="grid lg:grid-cols-12 gap-6 items-start">
        <Card className="lg:col-span-7">
          <CardHeader
            title="Submit Deposit Notice"
            subtitle="Balances update strictly after settlement desk verification — never client-side"
            action={<ArrowDownCircle className="w-4 h-4 text-slate-400" />}
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

              {submittedNotice && (
                <NotificationBanner
                  tone="success"
                  title={`Deposit Notice Logged (${submittedNotice.status})`}
                  message={
                    <div className="space-y-1">
                      <p>
                        Reference:{" "}
                        <span className="font-mono font-semibold">{submittedNotice.reference}</span>{" "}
                        · <FinancialAmount value={submittedNotice.amount} /> ({submittedNotice.currency}) via{" "}
                        {submittedNotice.method}
                      </p>
                      <p>{submittedNotice.confirmationInfo}</p>
                    </div>
                  }
                  onDismiss={() => setSubmittedNotice(null)}
                />
              )}

              <FormField id="dep-method" label="Supported Payment Method">
                <SelectInput
                  id="dep-method"
                  value={selectedMethodId}
                  onChange={(e) => {
                    setSelectedMethodId(e.target.value);
                    setIdempotencyKey(makeDepositKey());
                  }}
                >
                  {methods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label} ({m.currency}) — Min <FinancialAmount value={m.minDeposit} />
                    </option>
                  ))}
                </SelectInput>
              </FormField>

              {activeRail && (
                <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-2 text-xs">
                  <div className="flex flex-wrap justify-between gap-2 border-b border-slate-200 pb-2">
                    <span className="font-semibold text-slate-900">
                      {activeRail.label} Payment Instructions
                    </span>
                    <span className="font-mono text-slate-600">{activeRail.currency}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed">{activeRail.instructions}</p>
                  <div className="grid sm:grid-cols-2 gap-2 pt-1 text-slate-600">
                    <p>
                      <strong className="text-slate-800">Network:</strong> {activeRail.network}
                    </p>
                    <p>
                      <strong className="text-slate-800">Destination:</strong>{" "}
                      {activeRail.custodyDestination}
                    </p>
                  </div>
                  <p className="text-amber-800 flex items-start gap-1.5 pt-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                    <span>{activeRail.confirmationInfo}</span>
                  </p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  id="dep-amount"
                  label="Deposit Amount (USD)"
                  hint={
                    activeRail
                      ? `Minimum $<FinancialAmount value={activeRail.minDeposit} />`
                      : undefined
                  }
                >
                  <TextInput
                    id="dep-amount"
                    type="number"
                    numeric
                    min={activeRail?.minDeposit || 1}
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={activeRail ? String(activeRail.minDeposit) : "1000.00"}
                  />
                </FormField>

                <FormField
                  id="dep-ref"
                  label="Transfer Hash / Wire Reference"
                  hint="Optional if submitting prior to bank dispatch"
                >
                  <TextInput
                    id="dep-ref"
                    type="text"
                    maxLength={64}
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="TXID or Wire Reference"
                  />
                </FormField>
              </div>

              <Button type="submit" loading={submitting} disabled={!activeRail}>
                Submit Pending Deposit Notice
              </Button>
            </form>
          </CardBody>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader title="Custody Balance & Settlement Status" />
          <CardBody className="space-y-4 text-xs">
            <div>
              <p className="text-slate-500">Verified Available Balance</p>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
                <FinancialAmount value={profile?.walletBalance ?? 0} />
              </p>
            </div>
            <div className="pt-3 border-t border-slate-200 space-y-2 text-slate-600 leading-relaxed">
              <p>
                BitfuryTech never credits wallet balances automatically from unverified client
                confirmations.
              </p>
              <p>
                Every deposit notice receives a traceable reference number and enters{" "}
                <strong className="text-amber-700">Pending</strong> review until an administrator
                confirms receipt against our custody ledger.
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Deposit History"
          subtitle="Track submitted funding notices and their Pending, Completed, or Rejected verification status"
        />
        <CardBody>
          <DataTable
            columns={columns}
            rows={deposits}
            rowKey={(tx) => tx.id}
            loading={loading}
            emptyTitle="No Deposits Recorded Yet"
            emptyDescription="Submitted deposit notices appear here with their current settlement verification status."
          />
        </CardBody>
      </Card>
    </DashboardLayout>
  );
}
