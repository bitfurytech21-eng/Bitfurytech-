import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MetronicShell from "../../components/MetronicShell";
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
  createInvestmentAllocation,
  formatTimestamp,
  InvestmentAllocation,
  subscribeUserInvestments,
} from "../../services/firestoreService";
import {
  formatUsd,
  getMandateById,
  INVESTMENT_MANDATES,
  validateAllocation,
} from "../../trading/tradingPage";

export default function InvestmentsPage() {
  const { firebaseUser, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const requestedPlan = searchParams.get("plan") || INVESTMENT_MANDATES[0].id;

  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    getMandateById(requestedPlan)?.id || INVESTMENT_MANDATES[0].id
  );
  const [amount, setAmount] = useState("");
  const [investments, setInvestments] = useState<InvestmentAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const found = getMandateById(requestedPlan);
    if (found) setSelectedPlanId(found.id);
  }, [requestedPlan]);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeUserInvestments(firebaseUser.uid, (items) => {
      setInvestments(items);
      setLoading(false);
    });
  }, [firebaseUser]);

  const activeMandate = getMandateById(selectedPlanId) || INVESTMENT_MANDATES[0];
  const available = profile?.walletBalance ?? 0;

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setError(null);
    setSuccessMsg(null);

    const parsed = Number(amount);
    const check = validateAllocation(selectedPlanId, parsed, available);
    if (!check.valid) {
      setError(check.error || "Invalid mandate allocation.");
      return;
    }

    setSubmitting(true);
    try {
      await createInvestmentAllocation(
        firebaseUser.uid,
        firebaseUser.email || "",
        selectedPlanId,
        parsed
      );
      setSuccessMsg(
        `Allocated ${formatUsd(parsed)} to ${activeMandate.name}. Your ledger and active mandates are updated.`
      );
      setAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to allocate mandate.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: TableColumn<InvestmentAllocation>[] = [
    {
      key: "mandate",
      header: "Mandate",
      render: (inv) => <span className="font-semibold text-slate-900">{inv.planName}</span>,
    },
    {
      key: "rate",
      header: "Rate",
      render: (inv) => <span className="font-mono text-slate-700">{inv.dailyRatePct}%</span>,
    },
    {
      key: "term",
      header: "Term",
      render: (inv) => <span className="text-slate-600">{inv.durationDays}d</span>,
    },
    {
      key: "opened",
      header: "Opened",
      render: (inv) => <span className="text-slate-600">{formatTimestamp(inv.createdAt)}</span>,
    },
    {
      key: "capital",
      header: "Capital",
      align: "right",
      render: (inv) => (
        <span className="font-mono tabular-nums font-semibold text-slate-900">
          {formatUsd(inv.amount)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (inv) => <StatusText status={inv.status} />,
    },
  ];

  return (
    <MetronicShell
      title="Investments"
      subtitle="Allocate available custody liquidity into structured BitfuryTech mandates."
    >
      <div className="grid lg:grid-cols-12 gap-6">
        <Card padding="lg" className="lg:col-span-5 self-start">
          <form onSubmit={handleAllocate} className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">Deploy Capital</h2>
              <span className="text-xs font-mono font-semibold text-slate-700">
                Wallet: {formatUsd(available)}
              </span>
            </div>

            {error && (
              <NotificationBanner
                tone="error"
                message={error}
                onDismiss={() => setError(null)}
              />
            )}

            {successMsg && (
              <NotificationBanner
                tone="success"
                message={successMsg}
                onDismiss={() => setSuccessMsg(null)}
              />
            )}

            <FormField id="inv-plan" label="Investment Mandate">
              <SelectInput
                id="inv-plan"
                value={selectedPlanId}
                onChange={(e) => setSelectedPlanId(e.target.value)}
              >
                {INVESTMENT_MANDATES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.categoryLabel} — {m.name} ({formatUsd(m.minDeposit)}+)
                  </option>
                ))}
              </SelectInput>
            </FormField>

            <div className="rounded-md bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Target Daily Rate</span>
                <span className="font-mono font-semibold text-slate-900">
                  {activeMandate.dailyRatePct}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cycle Duration</span>
                <span className="font-semibold text-slate-900">
                  {activeMandate.durationDays} Days
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Entry Range</span>
                <span className="font-mono text-slate-900">
                  {formatUsd(activeMandate.minDeposit)} – {formatUsd(activeMandate.maxDeposit)}
                </span>
              </div>
            </div>

            <FormField id="inv-amount" label="Allocation Amount (USD)">
              <TextInput
                id="inv-amount"
                type="number"
                numeric
                min={activeMandate.minDeposit}
                max={activeMandate.maxDeposit}
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min ${activeMandate.minDeposit}`}
              />
            </FormField>

            <div className="flex items-center gap-3">
              <Button type="submit" loading={submitting}>
                Confirm Allocation
              </Button>
              {available < activeMandate.minDeposit && (
                <Link to="/deposit" className="text-xs font-semibold text-[#294158] hover:underline">
                  Fund Wallet First
                </Link>
              )}
            </div>
          </form>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader title="My Portfolio Allocations" />
          <CardBody>
            <DataTable
              columns={columns}
              rows={investments}
              rowKey={(inv) => inv.id}
              loading={loading}
              emptyTitle="No Allocations Recorded"
              emptyDescription="Allocated capital across Digital Assets, Global Equities, and Real Estate appears here immediately."
            />
          </CardBody>
        </Card>
      </div>
    </MetronicShell>
  );
}
