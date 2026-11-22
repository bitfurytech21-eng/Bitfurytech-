import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  FileText,
  Layers,
  ShieldCheck,
} from "lucide-react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Button,
  buttonClasses,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  FormField,
  NotificationBanner,
  SelectInput,
  SkeletonBlock,
  TextInput,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import { apiRequest, formatIsoDate } from "../../services/dashboardApi";
import { formatUsd, type InvestmentMandate } from "../../trading/tradingPage";

interface CatalogPlan extends InvestmentMandate {
  availabilityStatus: "Open" | "Paused" | "Closed";
  published: boolean;
  unitPrice: number;
}

interface CatalogProperty {
  id: string;
  title: string;
  location: string;
  assetType: string;
  targetYieldPct: number;
  minEntry: number;
  valuation: number;
  occupancyPct: number;
  status: string;
  image: string;
  summary: string;
}

interface PurchaseReceipt {
  reference: string;
  investmentId: string;
  transactionId: string;
  planId: string;
  planName: string;
  category: string;
  units: number;
  unitPrice: number;
  principal: number;
  feeAmount: number;
  totalCost: number;
  currency: string;
  newWalletBalance: number;
  termsSummary: string;
  createdAt: string;
}

function makeIdempotencyKey(): string {
  return `inv_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export default function Invest() {
  const { firebaseUser, idToken, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const initialPlanParam = searchParams.get("plan");
  const initialPropParam = searchParams.get("property");

  const [plans, setPlans] = useState<CatalogPlan[]>([]);
  const [properties, setProperties] = useState<CatalogProperty[]>([]);
  const [feeRatePct, setFeeRatePct] = useState<number>(0.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [targetType, setTargetType] = useState<"plan" | "property">(
    initialPropParam ? "property" : "plan"
  );
  const [targetId, setTargetId] = useState<string>(
    initialPropParam || initialPlanParam || ""
  );
  const [unitsInput, setUnitsInput] = useState<string>("1");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [confirmExplicit, setConfirmExplicit] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(makeIdempotencyKey);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [insufficientFunds, setInsufficientFunds] = useState<{
    availableBalance: number;
    requiredAmount: number;
  } | null>(null);
  const [receipt, setReceipt] = useState<PurchaseReceipt | null>(null);

  const loadCatalog = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    setError(null);
    try {
      const token = idToken || (await firebaseUser.getIdToken());
      const res = await apiRequest<{
        plans: CatalogPlan[];
        properties: CatalogProperty[];
        feeRatePct: number;
      }>("/api/investments/catalog", token);
      setPlans(res.plans);
      setProperties(res.properties);
      setFeeRatePct(res.feeRatePct ?? 0.5);

      if (initialPropParam && res.properties.some((p) => p.id === initialPropParam)) {
        setTargetType("property");
        setTargetId(initialPropParam);
      } else if (initialPlanParam && res.plans.some((p) => p.id === initialPlanParam)) {
        setTargetType("plan");
        setTargetId(initialPlanParam);
      } else if (!targetId && res.plans.length > 0) {
        setTargetType("plan");
        setTargetId(res.plans[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load investment offerings."
      );
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, idToken, initialPlanParam, initialPropParam, targetId]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const selectedPlan = useMemo(
    () => (targetType === "plan" ? plans.find((p) => p.id === targetId) || plans[0] : undefined),
    [plans, targetId, targetType]
  );

  const selectedProperty = useMemo(
    () =>
      targetType === "property"
        ? properties.find((p) => p.id === targetId) || properties[0]
        : undefined,
    [properties, targetId, targetType]
  );

  const availableBalance = profile?.walletBalance ?? 0;
  const units = Math.max(1, Math.floor(Number(unitsInput) || 1));

  const unitPrice =
    targetType === "property"
      ? selectedProperty?.minEntry ?? 0
      : selectedPlan?.minDeposit ?? 0;
  const minRequirement = unitPrice;
  const maxCap =
    targetType === "property" ? Number.MAX_SAFE_INTEGER : selectedPlan?.maxDeposit ?? 0;
  const principal = Number((units * unitPrice).toFixed(2));
  const feeAmount = Number(((principal * feeRatePct) / 100).toFixed(2));
  const totalCost = Number((principal + feeAmount).toFixed(2));
  const hasShortfall = totalCost > availableBalance;
  const exceedsMax = targetType === "plan" && maxCap > 0 && principal > maxCap;

  const isUnavailable =
    targetType === "property"
      ? !selectedProperty || selectedProperty.status !== "Open"
      : !selectedPlan || selectedPlan.availabilityStatus !== "Open";

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    setSubmitError(null);
    setInsufficientFunds(null);

    if (isUnavailable) {
      setSubmitError("Selected offering is not open for new unit purchases.");
      return;
    }
    if (!termsAccepted || !confirmExplicit) {
      setSubmitError(
        "Review the investment terms and check both confirmation boxes prior to submitting."
      );
      return;
    }
    if (hasShortfall) {
      setInsufficientFunds({
        availableBalance,
        requiredAmount: totalCost,
      });
      setSubmitError(
        `Insufficient custody wallet balance (${formatUsd(availableBalance)} available vs ${formatUsd(totalCost)} required).`
      );
      return;
    }
    if (exceedsMax) {
      setSubmitError(
        `Total principal exceeds maximum allocation cap of ${formatUsd(maxCap)} for this mandate.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const token = idToken || (await firebaseUser.getIdToken());
      const resolvedId =
        targetType === "property" ? selectedProperty?.id || "" : selectedPlan?.id || "";

      const res = await apiRequest<{ ok: boolean; receipt: PurchaseReceipt }>(
        "/api/investments/purchase",
        token,
        {
          method: "POST",
          body: JSON.stringify({
            targetType,
            targetId: resolvedId,
            units,
            confirmed: true,
            idempotencyKey,
          }),
        }
      );

      setReceipt(res.receipt);
      setTermsAccepted(false);
      setConfirmExplicit(false);
      setUnitsInput("1");
      setIdempotencyKey(makeIdempotencyKey());
    } catch (err) {
      const typed = err as Error & {
        code?: string;
        availableBalance?: number;
        requiredAmount?: number;
      };
      if (typed.code === "INSUFFICIENT_FUNDS") {
        setInsufficientFunds({
          availableBalance: typed.availableBalance ?? availableBalance,
          requiredAmount: typed.requiredAmount ?? totalCost,
        });
      }
      setSubmitError(typed.message || "Unable to complete investment purchase.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout
      title="Purchase Investment Units"
      subtitle="Select an open investment mandate or commercial property offering, verify unit costs and fees, and confirm allocation."
      actions={
        <>
          <Link to="/investments" className={buttonClasses({ variant: "outline", size: "sm" })}>
            <span>My Investments</span>
          </Link>
          <Link to="/deposit" className={buttonClasses({ variant: "primary", size: "sm" })}>
            <ArrowDownCircle className="w-3.5 h-3.5" />
            <span>Deposit Funds</span>
          </Link>
        </>
      }
    >
      {loading ? (
        <div className="grid lg:grid-cols-12 gap-6">
          <Card padding="lg" className="lg:col-span-7">
            <SkeletonBlock className="h-80 w-full" />
          </Card>
          <Card padding="lg" className="lg:col-span-5">
            <SkeletonBlock className="h-80 w-full" />
          </Card>
        </div>
      ) : error ? (
        <ErrorState title="Unable to Load Offerings" message={error} onRetry={() => void loadCatalog()} />
      ) : (
        <div className="space-y-6">
          {receipt && (
            <Card padding="lg" className="border-emerald-300 bg-emerald-50/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-200 pb-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-emerald-800">
                      Investment Allocation Confirmed
                    </p>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">
                      {receipt.planName} — Reference {receipt.reference}
                    </h2>
                  </div>
                </div>
                <Link
                  to="/investments"
                  className={buttonClasses({ variant: "primary", size: "sm" })}
                >
                  <span>View in My Investments</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
                <div>
                  <dt className="text-slate-500">Units Purchased</dt>
                  <dd className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                    {receipt.units} unit(s)
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Principal Allocated</dt>
                  <dd className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                    {formatUsd(receipt.principal)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Custody Fee ({feeRatePct}%)</dt>
                  <dd className="font-mono tabular-nums font-semibold text-slate-800 mt-0.5">
                    {formatUsd(receipt.feeAmount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Total Debited · Date</dt>
                  <dd className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                    {formatUsd(receipt.totalCost)} · {formatIsoDate(receipt.createdAt)}
                  </dd>
                </div>
              </dl>
            </Card>
          )}

          <div className="grid lg:grid-cols-12 gap-6 items-start">
            <Card className="lg:col-span-7">
              <CardHeader
                title="Order Configuration"
                subtitle="Choose an investment plan or commercial property unit offering"
              />
              <CardBody>
                <form onSubmit={handlePurchase} className="space-y-5">
                  <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-md w-fit">
                    <button
                      type="button"
                      onClick={() => {
                        setTargetType("plan");
                        if (plans[0]) setTargetId(plans[0].id);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-none text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        targetType === "plan"
                          ? "bg-[#1B4962] text-white"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Investment Plans ({plans.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetType("property");
                        if (properties[0]) setTargetId(properties[0].id);
                      }}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-none text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        targetType === "property"
                          ? "bg-[#1B4962] text-white"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Properties ({properties.length})</span>
                    </button>
                  </div>

                  {submitError && (
                    <NotificationBanner
                      tone="error"
                      message={submitError}
                      onDismiss={() => setSubmitError(null)}
                    />
                  )}

                  {(hasShortfall || insufficientFunds) && (
                    <NotificationBanner
                      tone="warning"
                      title="Insufficient Custody Balance"
                      message={
                        <div className="space-y-2">
                          <p>
                            Your available balance ({formatUsd(availableBalance)}) is lower than the
                            total order cost ({formatUsd(totalCost)}). Fund your custody wallet to
                            proceed.
                          </p>
                          <Link
                            to="/deposit"
                            className={buttonClasses({ variant: "primary", size: "sm" })}
                          >
                            <ArrowDownCircle className="w-3.5 h-3.5" />
                            <span>Deposit Funds Now</span>
                          </Link>
                        </div>
                      }
                    />
                  )}

                  {targetType === "plan" ? (
                    <FormField id="invest-plan-select" label="Select Investment Plan">
                      <SelectInput
                        id="invest-plan-select"
                        value={selectedPlan?.id || ""}
                        onChange={(e) => {
                          setTargetId(e.target.value);
                          setIdempotencyKey(makeIdempotencyKey());
                        }}
                      >
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} — {p.categoryLabel} (Min {formatUsd(p.minDeposit)} / unit ·{" "}
                            {p.availabilityStatus})
                          </option>
                        ))}
                      </SelectInput>
                    </FormField>
                  ) : properties.length === 0 ? (
                    <NotificationBanner
                      tone="info"
                      title="No Open Property Offerings"
                      message="No commercial properties are currently listed by administrators. Switch to Investment Plans to allocate into Real Estate mandates."
                    />
                  ) : (
                    <FormField id="invest-prop-select" label="Select Commercial Property">
                      <SelectInput
                        id="invest-prop-select"
                        value={selectedProperty?.id || ""}
                        onChange={(e) => {
                          setTargetId(e.target.value);
                          setIdempotencyKey(makeIdempotencyKey());
                        }}
                      >
                        {properties.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} ({p.location}) — Min {formatUsd(p.minEntry)} / unit ·{" "}
                            {p.status}
                          </option>
                        ))}
                      </SelectInput>
                    </FormField>
                  )}

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField
                      id="invest-units"
                      label="Number of Investment Units"
                      hint={`1 unit = ${formatUsd(unitPrice)} minimum unit entry`}
                    >
                      <TextInput
                        id="invest-units"
                        type="number"
                        numeric
                        min="1"
                        max="1000"
                        step="1"
                        required
                        value={unitsInput}
                        onChange={(e) => setUnitsInput(e.target.value)}
                      />
                    </FormField>

                    <div className="bg-slate-50 border border-slate-200 rounded-md px-3.5 py-2.5 flex flex-col justify-center">
                      <span className="text-xs text-slate-500">Available Wallet Balance</span>
                      <span className="text-base font-bold font-mono tabular-nums text-slate-900 mt-0.5">
                        {formatUsd(availableBalance)}
                      </span>
                    </div>
                  </div>

                  {/* Applicable Terms Before Confirmation */}
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-2 text-xs text-slate-700">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <FileText className="w-4 h-4 text-[#1B4962]" />
                      <span>Investment Terms Summary</span>
                    </div>
                    <p className="leading-relaxed">
                      {targetType === "property"
                        ? selectedProperty?.summary ||
                          "Property allocations are subject to tenancy, appraisal, and custody terms."
                        : selectedPlan?.returnTerms ||
                          "Indicative target returns are variable and not guaranteed."}
                    </p>
                    {selectedPlan && (
                      <p className="text-slate-500">
                        Duration: {selectedPlan.durationDays} days · Schedule:{" "}
                        {selectedPlan.paymentFrequency}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-[#1B4962]"
                      />
                      <span>
                        I have reviewed the minimum requirement ({formatUsd(minRequirement)}),
                        structuring fee ({feeRatePct}%), and non-guaranteed return disclosure terms.
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={confirmExplicit}
                        onChange={(e) => setConfirmExplicit(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-[#1B4962]"
                      />
                      <span>
                        I explicitly authorize BitfuryTech to debit{" "}
                        <strong className="font-mono">{formatUsd(totalCost)}</strong> from my
                        verified custody wallet balance.
                      </span>
                    </label>
                  </div>

                  <Button
                    type="submit"
                    loading={submitting}
                    disabled={isUnavailable || hasShortfall || exceedsMax}
                    fullWidth
                  >
                    Confirm &amp; Purchase {units} Unit{units > 1 ? "s" : ""} ({formatUsd(totalCost)})
                  </Button>
                </form>
              </CardBody>
            </Card>

            <Card className="lg:col-span-5">
              <CardHeader
                title="Cost & Unit Summary"
                subtitle="Server-verified pricing and fee breakdown"
                action={<ShieldCheck className="w-4 h-4 text-slate-400" />}
              />
              <CardBody className="space-y-4 text-xs">
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Selected Offering</dt>
                    <dd className="font-semibold text-slate-900 text-right">
                      {targetType === "property"
                        ? selectedProperty?.title || "—"
                        : selectedPlan?.name || "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Minimum Entry / Unit Price</dt>
                    <dd className="font-mono tabular-nums font-semibold text-slate-900">
                      {formatUsd(unitPrice)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Quantity</dt>
                    <dd className="font-mono tabular-nums font-semibold text-slate-900">
                      {units} unit(s)
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Principal Cost</dt>
                    <dd className="font-mono tabular-nums font-semibold text-slate-900">
                      {formatUsd(principal)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Structuring &amp; Custody Fee ({feeRatePct}%)</dt>
                    <dd className="font-mono tabular-nums text-slate-800">
                      {formatUsd(feeAmount)}
                    </dd>
                  </div>
                  <div className="flex justify-between pt-3 border-t border-slate-200 text-sm">
                    <dt className="font-bold text-slate-900">Total Investment Cost</dt>
                    <dd className="font-mono tabular-nums font-bold text-slate-900">
                      {formatUsd(totalCost)}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Projected Remaining Wallet</dt>
                    <dd
                      className={`font-mono tabular-nums font-semibold ${
                        hasShortfall ? "text-rose-600" : "text-emerald-700"
                      }`}
                    >
                      {hasShortfall
                        ? `Shortfall ${formatUsd(totalCost - availableBalance)}`
                        : formatUsd(availableBalance - totalCost)}
                    </dd>
                  </div>
                </dl>

                <div className="pt-3 border-t border-slate-200 text-slate-500 leading-relaxed">
                  All purchase calculations, balance deductions, and duplicate-submission protections
                  are enforced atomically on the server prior to generating your transaction receipt.
                </div>
              </CardBody>
            </Card>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
