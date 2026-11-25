import { useCallback, useEffect, useState } from "react";
import { Edit3, Plus, Trash2, Wallet } from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
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

interface AdminCryptoWallet {
  id: string;
  cryptocurrency: string;
  blockchainNetwork: string;
  walletAddress: string;
  walletLabel: string;
  status: "Active" | "Inactive" | "Maintenance";
  minDeposit: number;
  maxDeposit: number;
  instructions: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

const EMPTY_WALLET: Omit<AdminCryptoWallet, "id"> & { id?: string } = {
  cryptocurrency: "USDT",
  blockchainNetwork: "TRON (TRC-20)",
  walletAddress: "",
  walletLabel: "Primary USDT Settlement Wallet",
  status: "Active",
  minDeposit: 100,
  maxDeposit: 10000000,
  instructions: "Transmit USDT strictly on the TRON (TRC20) network to the specified custody address.",
};

export default function AdminWalletsPage() {
  const [wallets, setWallets] = useState<AdminCryptoWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Omit<AdminCryptoWallet, "id"> & { id?: string }>(EMPTY_WALLET);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminCryptoWallet | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadWallets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await sessionApiRequest<{ wallets: AdminCryptoWallet[] }>("/api/admin/crypto-wallets");
      setWallets(res.wallets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load crypto wallets.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWallets();
  }, [loadWallets]);

  const openCreate = () => {
    setForm(EMPTY_WALLET);
    setModalOpen(true);
  };

  const openEdit = (w: AdminCryptoWallet) => {
    setForm({ ...w });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    try {
      await sessionApiRequest("/api/admin/crypto-wallets", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setBanner({
        tone: "success",
        text: `Successfully saved crypto wallet for ${form.cryptocurrency} (${form.blockchainNetwork}).`,
      });
      setModalOpen(false);
      await loadWallets();
    } catch (err) {
      setBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Unable to save crypto wallet.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setBanner(null);
    try {
      await sessionApiRequest(`/api/admin/crypto-wallets/${deleteTarget.id}`, {
        method: "DELETE",
      });
      setBanner({
        tone: "success",
        text: `Deleted crypto wallet "${deleteTarget.walletLabel}".`,
      });
      setDeleteTarget(null);
      await loadWallets();
    } catch (err) {
      setBanner({
        tone: "error",
        text: err instanceof Error ? err.message : "Unable to delete crypto wallet.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const columns: TableColumn<AdminCryptoWallet>[] = [
    {
      key: "crypto",
      header: "Cryptocurrency & Network",
      render: (w) => (
        <div className="min-w-[180px]">
          <p className="font-semibold text-slate-900">{w.cryptocurrency}</p>
          <p className="text-[11px] text-slate-500 font-mono">{w.blockchainNetwork}</p>
        </div>
      ),
    },
    {
      key: "label",
      header: "Wallet Label & Address",
      render: (w) => (
        <div className="max-w-xs">
          <p className="font-medium text-slate-800 text-xs">{w.walletLabel}</p>
          <p className="text-[11px] font-mono text-slate-500 truncate">{w.walletAddress}</p>
        </div>
      ),
    },
    {
      key: "limits",
      header: "Deposit Limits",
      align: "right",
      render: (w) => (
        <span className="font-mono tabular-nums text-xs text-slate-900">
          {formatUsd(w.minDeposit)} – {formatUsd(w.maxDeposit)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (w) => <StatusText status={w.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (w) => (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => openEdit(w)}>
            <Edit3 className="w-3.5 h-3.5" />
            <span>Configure</span>
          </Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(w)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminLayout
      title="Crypto Wallet Management"
      subtitle="Administrators can create and maintain payment wallets for Bitcoin, Ethereum, USDT, USDC, and supported digital assets."
      actions={
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5" />
          <span>Add Payment Wallet</span>
        </Button>
      }
    >
      <NotificationBanner
        tone="info"
        message="Client deposit rails automatically synchronize with active administrator-configured crypto wallets in real time."
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
          title={`Configured Payment Wallets (${wallets.length})`}
          action={<Wallet className="w-4 h-4 text-slate-400" />}
        />
        <CardBody>
          <DataTable
            columns={columns}
            rows={wallets}
            rowKey={(w) => w.id}
            loading={loading}
            error={error}
            onRetry={() => void loadWallets()}
            emptyTitle="No Payment Wallets Found"
            emptyDescription="Create a deposit wallet to make it available for client funding notices."
          />
        </CardBody>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={form.id ? `Configure Wallet: ${form.walletLabel}` : "Add Payment Wallet"}
        maxWidthClass="max-w-xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField id="crypto-name" label="Cryptocurrency">
              <TextInput
                id="crypto-name"
                required
                placeholder="e.g. USDT, Bitcoin, Ethereum"
                value={form.cryptocurrency}
                onChange={(e) => setForm((p) => ({ ...p, cryptocurrency: e.target.value }))}
              />
            </FormField>
            <FormField id="crypto-network" label="Blockchain / Network">
              <TextInput
                id="crypto-network"
                required
                placeholder="e.g. TRON (TRC-20), Bitcoin Mainnet"
                value={form.blockchainNetwork}
                onChange={(e) => setForm((p) => ({ ...p, blockchainNetwork: e.target.value }))}
              />
            </FormField>
          </div>

          <FormField id="wallet-label" label="Wallet Label">
            <TextInput
              id="wallet-label"
              required
              placeholder="e.g. Primary TRC20 Gateway"
              value={form.walletLabel}
              onChange={(e) => setForm((p) => ({ ...p, walletLabel: e.target.value }))}
            />
          </FormField>

          <FormField id="wallet-address" label="Wallet Address / Destination">
            <TextInput
              id="wallet-address"
              required
              placeholder="e.g. TXv79qL2k83j..."
              value={form.walletAddress}
              onChange={(e) => setForm((p) => ({ ...p, walletAddress: e.target.value }))}
            />
          </FormField>

          <div className="grid sm:grid-cols-3 gap-4">
            <FormField id="wallet-status" label="Status">
              <SelectInput
                id="wallet-status"
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    status: e.target.value as "Active" | "Inactive" | "Maintenance",
                  }))
                }
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Maintenance">Maintenance</option>
              </SelectInput>
            </FormField>
            <FormField id="wallet-min" label="Min Deposit (USD)">
              <TextInput
                id="wallet-min"
                type="number"
                numeric
                min={1}
                required
                value={form.minDeposit}
                onChange={(e) => setForm((p) => ({ ...p, minDeposit: Number(e.target.value) }))}
              />
            </FormField>
            <FormField id="wallet-max" label="Max Deposit (USD)">
              <TextInput
                id="wallet-max"
                type="number"
                numeric
                min={1}
                required
                value={form.maxDeposit}
                onChange={(e) => setForm((p) => ({ ...p, maxDeposit: Number(e.target.value) }))}
              />
            </FormField>
          </div>

          <FormField id="wallet-instructions" label="Transfer Instructions">
            <TextAreaInput
              id="wallet-instructions"
              rows={3}
              required
              placeholder="Instructions shown to clients when submitting a deposit..."
              value={form.instructions}
              onChange={(e) => setForm((p) => ({ ...p, instructions: e.target.value }))}
            />
          </FormField>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={saving}>
              Save Wallet Configuration
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Wallet Deletion"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete payment wallet <span className="font-semibold text-slate-900">{deleteTarget?.walletLabel}</span> ({deleteTarget?.cryptocurrency})? Clients will no longer be able to submit deposits to this address.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={deleting} onClick={() => void handleDelete()}>
              Delete Wallet
            </Button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
