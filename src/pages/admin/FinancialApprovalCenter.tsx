import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, RefreshCw, WalletCards } from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  FormField,
  NotificationBanner,
  SelectInput,
  TextAreaInput,
  TextInput,
} from "../../components/ui";
import { sessionApiRequest, formatIsoDate } from "../../services/dashboardApi";
import { formatUsd } from "../../trading/tradingPage";
import { MANUAL_PAYMENT_METHODS } from "../../trading/manualPaymentMethods";

interface CustomerOption {
  uid: string;
  email: string;
  displayName: string;
  username: string;
}

interface ManualPaymentAssignment {
  id: string;
  userId: string;
  userEmail: string;
  customerName: string;
  method: string;
  amount: number;
  destination: string;
  network: string;
  reference: string;
  note: string;
  status: "Assigned";
  createdAt: string | null;
}

export default function FinancialApprovalCenter() {
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [assignments, setAssignments] = useState<ManualPaymentAssignment[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [methodId, setMethodId] = useState<string>(MANUAL_PAYMENT_METHODS[0].id);
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const selectedMethod = useMemo(
    () => MANUAL_PAYMENT_METHODS.find((method) => method.id === methodId) ?? MANUAL_PAYMENT_METHODS[0],
    [methodId]
  );

  const loadCenter = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const [customerResponse, assignmentResponse] = await Promise.all([
          sessionApiRequest<{ customers: CustomerOption[] }>("/api/admin/customers"),
          sessionApiRequest<{ assignments: ManualPaymentAssignment[] }>(
            "/api/admin/manual-payment-assignments"
          ),
        ]);
        setCustomers(customerResponse.customers);
        setAssignments(assignmentResponse.assignments);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load financial assignments.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadCenter();
  }, [loadCenter]);

  const handleMethodChange = (nextMethodId: string) => {
    setMethodId(nextMethodId);
    setDestination("");
    setReference("");
  };

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % MANUAL_PAYMENT_METHODS.length;
    else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + MANUAL_PAYMENT_METHODS.length) % MANUAL_PAYMENT_METHODS.length;
    } else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = MANUAL_PAYMENT_METHODS.length - 1;
    else return;

    event.preventDefault();
    const nextMethod = MANUAL_PAYMENT_METHODS[nextIndex];
    handleMethodChange(nextMethod.id);
    document.getElementById(`financial-method-tab-${nextIndex}`)?.focus();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!customerId) {
      setBanner({ tone: "error", text: "Choose a customer before creating a payment assignment." });
      return;
    }

    setSaving(true);
    setBanner(null);
    try {
      const response = await sessionApiRequest<{ assignment: ManualPaymentAssignment }>(
        "/api/admin/manual-payment-assignments",
        {
          method: "POST",
          body: JSON.stringify({
            userId: customerId,
            method: selectedMethod.id,
            amount: Number(amount),
            destination: destination.trim(),
            network: selectedMethod.network,
            reference: reference.trim(),
            note: note.trim(),
          }),
        }
      );
      setAssignments((current) => [response.assignment, ...current]);
      setCustomerId("");
      setAmount("");
      setDestination("");
      setReference("");
      setNote("");
      setBanner({
        tone: "success",
        text: `Saved ${selectedMethod.label} payment assignment for ${response.assignment.userEmail}.`,
      });
    } catch (err) {
      setBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Unable to save payment assignment.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout
      title="Financial Approval Center"
      subtitle="Assign customer payment instructions and keep transfer references in the admin ledger."
      actions={
        <Button
          variant="outline"
          size="sm"
          loading={refreshing}
          onClick={() => void loadCenter(true)}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      }
    >
      {banner && (
        <NotificationBanner
          tone={banner.tone}
          message={banner.text}
          onDismiss={() => setBanner(null)}
        />
      )}

      <Card>
        <CardHeader
          title="Manual payment assignment"
          action={<span className="text-xs font-medium text-slate-500">{customers.length} customers</span>}
        />
        <CardBody className="space-y-6">
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <WalletCards aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <p>
              Assignments record payment instructions only. They do not approve a deposit or credit a
              customer balance; review incoming transfers in the Deposits queue.
            </p>
          </div>

          <section aria-labelledby="available-methods-title" className="space-y-3">
            <div>
              <h2 id="available-methods-title" className="text-sm font-semibold text-slate-900">
                Available payment methods
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Choose a method to set its network and payment destination.
              </p>
            </div>
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-4"
              role="tablist"
              aria-label="Payment method"
            >
              {MANUAL_PAYMENT_METHODS.map((method, index) => {
                const selected = method.id === methodId;
                return (
                  <button
                    key={method.id}
                    id={`financial-method-tab-${index}`}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls="financial-payment-panel"
                    tabIndex={selected ? 0 : -1}
                    onClick={() => handleMethodChange(method.id)}
                    onKeyDown={(event) => handleTabKeyDown(event, index)}
                    className={`flex min-h-16 flex-col items-start justify-center rounded-lg border px-3 py-2.5 text-left transition-colors sm:px-4 ${
                      selected
                        ? "border-[#1B4962] bg-[#EDF3F7] text-[#102030] ring-1 ring-[#1B4962]"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-sm font-semibold">{method.label}</span>
                    <span className="mt-0.5 text-[11px] text-slate-500">{method.network}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <form
            id="financial-payment-panel"
            role="tabpanel"
            aria-labelledby={`financial-method-tab-${MANUAL_PAYMENT_METHODS.findIndex((method) => method.id === methodId)}`}
            onSubmit={handleSubmit}
            className="space-y-5 border-t border-slate-200 pt-5"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="payment-customer" label="Customer account">
                <SelectInput
                  id="payment-customer"
                  required
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  className="min-h-11 text-base"
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.uid} value={customer.uid}>
                      {customer.displayName} · {customer.email}
                    </option>
                  ))}
                </SelectInput>
              </FormField>
              <FormField id="payment-amount" label="Payment amount (USD)">
                <TextInput
                  id="payment-amount"
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  max="10000000"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  className="min-h-11 text-base"
                />
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="payment-destination"
                label={selectedMethod.id === "Bank Wire" ? "Assigned account / beneficiary" : "Assigned wallet address"}
                hint="Verify the destination carefully before saving or sharing it with a customer."
              >
                <TextInput
                  id="payment-destination"
                  required
                  maxLength={220}
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder={selectedMethod.id === "Bank Wire" ? "Account or beneficiary instructions" : "Enter the wallet address"}
                  className="min-h-11 font-mono text-base"
                  autoComplete="off"
                />
              </FormField>
              <FormField id="payment-network" label="Network">
                <TextInput
                  id="payment-network"
                  value={selectedMethod.network}
                  readOnly
                  aria-readonly="true"
                  className="min-h-11 bg-slate-50 text-base"
                />
              </FormField>
            </div>

            <FormField
              id="payment-reference"
              label="Transaction hash / reference"
              hint="Use the transaction hash for crypto transfers or the bank payment reference for wires."
            >
              <TextInput
                id="payment-reference"
                required
                minLength={3}
                maxLength={120}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Paste a transaction hash or payment reference"
                className="min-h-11 font-mono text-base"
                autoComplete="off"
                spellCheck={false}
              />
            </FormField>

            <FormField id="payment-note" label="Internal note (optional)">
              <TextAreaInput
                id="payment-note"
                rows={3}
                maxLength={500}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add context for the settlement team"
                className="text-base"
              />
            </FormField>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">Saving creates an audit-trailed assignment.</p>
              <Button type="submit" size="lg" loading={saving} disabled={loading || customers.length === 0}>
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                <span>Submit and save</span>
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={`Saved assignments (${assignments.length})`} />
        <CardBody>
          {loading ? (
            <p className="py-6 text-center text-sm text-slate-500">Loading saved assignments…</p>
          ) : error ? (
            <p role="alert" className="rounded-md bg-rose-50 p-4 text-sm text-rose-800">
              {error}
            </p>
          ) : assignments.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              No manual payment assignments have been saved yet.
            </p>
          ) : (
            <ul className="divide-y divide-slate-200">
              {assignments.map((assignment) => (
                <li key={assignment.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-all text-sm font-semibold text-slate-900">
                        {assignment.customerName} · {assignment.userEmail}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {assignment.method} · {assignment.network} · {formatIsoDate(assignment.createdAt)}
                      </p>
                    </div>
                    <span className="inline-flex min-h-7 items-center rounded-full bg-blue-50 px-2.5 text-xs font-semibold text-blue-800">
                      {assignment.status}
                    </span>
                  </div>
                  <div className="grid gap-3 rounded-lg bg-slate-50 p-3 text-xs sm:grid-cols-2">
                    <div className="min-w-0">
                      <p className="text-slate-500">
                        {assignment.method === "Bank Wire" ? "Assigned account / beneficiary" : "Assigned wallet"}
                      </p>
                      <p className="mt-1 break-all font-mono text-slate-900">{assignment.destination}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-slate-500">Transaction hash / reference</p>
                      <p className="mt-1 break-all font-mono text-slate-900">{assignment.reference}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Amount</p>
                      <p className="mt-1 font-mono font-semibold text-slate-900">
                        {formatUsd(assignment.amount)}
                      </p>
                    </div>
                    {assignment.note && (
                      <div className="sm:col-span-2">
                        <p className="text-slate-500">Internal note</p>
                        <p className="mt-1 whitespace-pre-wrap text-slate-900">{assignment.note}</p>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </AdminLayout>
  );
}
