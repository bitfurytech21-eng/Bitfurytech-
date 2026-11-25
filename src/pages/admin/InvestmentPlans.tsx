import { useCallback, useEffect, useState } from "react";
import { Edit3, Layers, Plus } from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  DashboardSymbol,
  DataTable,
  FormField,
  Modal,
  NotificationBanner,
  SelectInput,
  StatusText,
  TableColumn,
  TextAreaInput,
  TextInput,
} from "../../components/ui";
import { sessionApiRequest } from "../../services/dashboardApi";
import { formatUsd } from "../../trading/tradingPage";

interface AdminPlanRow {
  id: string;
  name: string;
  category: "crypto" | "stock" | "estate";
  categoryLabel: string;
  audience: string;
  description: string;
  minDeposit: number;
  maxDeposit: number;
  dailyRatePct: number;
  durationDays: number;
  paymentFrequency: string;
  settlementRail: string;
  returnTerms: string;
  availabilityStatus?: string;
  published?: boolean;
  image?: string;
  source?: string;
}

const EMPTY_PLAN: Omit<AdminPlanRow, "id"> & { id?: string } = {
  name: "",
  category: "crypto",
  categoryLabel: "Digital Assets",
  audience: "Institutional and verified private investors",
  description: "",
  minDeposit: 500,
  maxDeposit: 25000,
  dailyRatePct: 1.8,
  durationDays: 30,
  paymentFrequency: "Daily cycle accrual with maturity principal settlement",
  settlementRail: "USDT (TRC20) / Bank Wire",
  returnTerms: "",
  availabilityStatus: "Open",
  published: true,
  image: "/images/hero-private-capital.jpg",
};

export default function AdminInvestmentPlans() {
  const [plans, setPlans] = useState<AdminPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Omit<AdminPlanRow, "id"> & { id?: string }>(EMPTY_PLAN);
  const [saving, setSaving] = useState(false);

  const loadPlans = useCallback(async () => {
        setLoading(true);
    setError(null);
    try {
            const res = await sessionApiRequest<{ plans: AdminPlanRow[] }>("/api/admin/plans");
      setPlans(res.plans);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load investment plans.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const openCreate = () => {
    setForm(EMPTY_PLAN);
    setModalOpen(true);
  };

  const openEdit = (p: AdminPlanRow) => {
    setForm({ ...p });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
        setSaving(true);
    setBanner(null);
    try {
            await sessionApiRequest("/api/admin/plans", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setBanner({
        tone: "success",
        text: `Saved investment plan "${form.name}". Existing active investor positions retain their contracted terms.`,
      });
      setModalOpen(false);
      await loadPlans();
    } catch (err) {
      setBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Unable to save investment plan.",
      });
    } finally {
      setSaving(false);
    }
  };

  const columns: TableColumn<AdminPlanRow>[] = [
    {
      key: "name",
      header: "Investment Plan",
      render: (p) => (
        <div className="min-w-[200px]">
          <p className="font-semibold text-slate-900">{p.name}</p>
          <p className="text-[11px] text-slate-500">
            {p.categoryLabel} · {p.id}
          </p>
        </div>
      ),
    },
    {
      key: "limits",
      header: "Min / Max Deposit",
      align: "right",
      render: (p) => (
        <span className="font-mono tabular-nums text-xs text-slate-900">
          {formatUsd(p.minDeposit)} – {formatUsd(p.maxDeposit)}
        </span>
      ),
    },
    {
      key: "terms",
      header: "Rate / Duration",
      align: "right",
      render: (p) => (
        <span className="font-mono text-xs text-slate-700">
          {p.dailyRatePct}%/day · {p.durationDays}d
        </span>
      ),
    },
    {
      key: "status",
      header: "Availability",
      align: "right",
      render: (p) => (
        <div>
          <StatusText status={p.availabilityStatus || "Open"} />
          <p className="text-[11px] text-slate-500">
            {p.published === false ? "Hidden" : "Published"}
          </p>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Edit",
      align: "right",
      render: (p) => (
        <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
          <Edit3 className="w-3.5 h-3.5" />
          <span>Configure</span>
        </Button>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Investment Plans"
      subtitle="Create and maintain structured investment plans, minimum/maximum limits, durations, and availability status."
      actions={
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" />
          <span>New Investment Plan</span>
        </Button>
      }
    >
      <NotificationBanner
        tone="info"
        message="Updating, pausing, or closing an investment plan affects new subscriptions only. Existing active investor positions retain their original contracted terms."
      />

      {banner && (
        <NotificationBanner
          tone={banner.tone}
          message={banner.text}
          onDismiss={() => setBanner(null)}
        />
      )}

      <Card>
        <CardHeader
          title={`Configured Plans (${plans.length})`}
          action={<DashboardSymbol icon={Layers} tone="amber" size="md" />}
        />
        <CardBody>
          <DataTable
            columns={columns}
            rows={plans}
            rowKey={(p) => p.id}
            loading={loading}
            error={error}
            onRetry={() => void loadPlans()}
            emptyTitle="No Plans Found"
            emptyDescription="Create an investment plan to display it across the platform."
          />
        </CardBody>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? `Configure Plan: ${form.name}` : "Create Investment Plan"}
        maxWidthClass="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField id="plan-name" label="Plan Name">
              <TextInput
                id="plan-name"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </FormField>
            <FormField id="plan-cat" label="Asset Sector">
              <SelectInput
                id="plan-cat"
                value={form.category}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    category: e.target.value as "crypto" | "stock" | "estate",
                  }))
                }
              >
                <option value="crypto">Digital Assets (crypto)</option>
                <option value="stock">Global Equities (stock)</option>
                <option value="estate">Real Estate (estate)</option>
              </SelectInput>
            </FormField>
            <FormField id="plan-min" label="Minimum Investment (USD)">
              <TextInput
                id="plan-min"
                type="number"
                numeric
                min={1}
                required
                value={form.minDeposit}
                onChange={(e) => setForm((p) => ({ ...p, minDeposit: Number(e.target.value) }))}
              />
            </FormField>
            <FormField id="plan-max" label="Maximum Investment (USD)">
              <TextInput
                id="plan-max"
                type="number"
                numeric
                min={1}
                required
                value={form.maxDeposit}
                onChange={(e) => setForm((p) => ({ ...p, maxDeposit: Number(e.target.value) }))}
              />
            </FormField>
            <FormField id="plan-rate" label="Expected Daily Rate (%)">
              <TextInput
                id="plan-rate"
                type="number"
                numeric
                step="0.05"
                min={0.1}
                required
                value={form.dailyRatePct}
                onChange={(e) => setForm((p) => ({ ...p, dailyRatePct: Number(e.target.value) }))}
              />
            </FormField>
            <FormField id="plan-dur" label="Duration (Days)">
              <TextInput
                id="plan-dur"
                type="number"
                numeric
                min={1}
                required
                value={form.durationDays}
                onChange={(e) => setForm((p) => ({ ...p, durationDays: Number(e.target.value) }))}
              />
            </FormField>
            <FormField id="plan-status" label="Availability Status">
              <SelectInput
                id="plan-status"
                value={form.availabilityStatus || "Open"}
                onChange={(e) =>
                  setForm((p) => ({ ...p, availabilityStatus: e.target.value }))
                }
              >
                <option value="Open">Open</option>
                <option value="Paused">Paused</option>
                <option value="Closed">Closed</option>
              </SelectInput>
            </FormField>
            <FormField id="plan-freq" label="Payment Frequency">
              <TextInput
                id="plan-freq"
                required
                value={form.paymentFrequency}
                onChange={(e) => setForm((p) => ({ ...p, paymentFrequency: e.target.value }))}
              />
            </FormField>
          </div>

          <FormField id="plan-desc" label="Investment Description">
            <TextAreaInput
              id="plan-desc"
              rows={2}
              required
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </FormField>

          <FormField id="plan-terms" label="Expected Return Terms">
            <TextAreaInput
              id="plan-terms"
              rows={2}
              required
              value={form.returnTerms}
              onChange={(e) => setForm((p) => ({ ...p, returnTerms: e.target.value }))}
            />
          </FormField>

          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.published !== false}
              onChange={(e) => setForm((p) => ({ ...p, published: e.target.checked }))}
              className="rounded border-slate-300"
            />
            <span>Published for new investor allocations</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={saving}>
              Save Plan Configuration
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
