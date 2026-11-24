import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Save, WalletCards } from "lucide-react";
import AdminLayout from "../../layouts/AdminLayout";
import { Button, Card, CardBody, CardHeader, FormField, NotificationBanner, TextInput } from "../../components/ui";
import { sessionApiRequest } from "../../services/dashboardApi";

interface PaymentWallet {
  id: string;
  label: string;
  currency: string;
  network: string;
  walletAddress: string;
  minDeposit: number;
  instructions: string;
  confirmationInfo: string;
  enabled: boolean;
}

const EMPTY_WALLETS: PaymentWallet[] = [
  { id: "USDT (TRC20)", label: "USDT (TRC20)", currency: "USDT / USD", network: "TRON (TRC20)", walletAddress: "", minDeposit: 100, instructions: "Send USDT only on the TRON (TRC20) network.", confirmationInfo: "Your deposit remains pending until the settlement team verifies the transfer.", enabled: false },
  { id: "Bitcoin (BTC)", label: "Bitcoin (BTC)", currency: "BTC / USD Equivalent", network: "Bitcoin Mainnet", walletAddress: "", minDeposit: 250, instructions: "Send BTC only through Bitcoin Mainnet.", confirmationInfo: "Your deposit remains pending until the settlement team verifies the transfer.", enabled: false },
  { id: "Ethereum (ETH)", label: "Ethereum (ETH)", currency: "ETH / USD Equivalent", network: "Ethereum Mainnet (ERC20)", walletAddress: "", minDeposit: 250, instructions: "Send ETH only through Ethereum Mainnet (ERC20).", confirmationInfo: "Your deposit remains pending until the settlement team verifies the transfer.", enabled: false },
  { id: "Bank Wire", label: "Bank Wire", currency: "USD", network: "SWIFT / Fedwire", walletAddress: "", minDeposit: 1000, instructions: "Use the account details below and include your BitfuryTech reference.", confirmationInfo: "Bank transfers are enabled after incoming funds are reconciled.", enabled: false },
];

export default function PaymentWalletsPage() {
  const [wallets, setWallets] = useState<PaymentWallet[]>(EMPTY_WALLETS);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await sessionApiRequest<{ wallets: PaymentWallet[] }>("/api/admin/payment-wallets");
      const saved = new Map((result.wallets || []).map((wallet) => [wallet.id, wallet]));
      setWallets(EMPTY_WALLETS.map((wallet) => ({ ...wallet, ...saved.get(wallet.id) })));
    } catch (error) {
      setBanner({ tone: "error", text: error instanceof Error ? error.message : "Unable to load payment wallets." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const updateWallet = (id: string, patch: Partial<PaymentWallet>) => {
    setWallets((current) => current.map((wallet) => wallet.id === id ? { ...wallet, ...patch } : wallet));
  };

  const save = async (wallet: PaymentWallet) => {
    setSavingId(wallet.id);
    setBanner(null);
    try {
      await sessionApiRequest("/api/admin/payment-wallets/" + encodeURIComponent(wallet.id), {
        method: "PUT",
        body: JSON.stringify(wallet),
      });
      setBanner({ tone: "success", text: wallet.label + " payment settings saved." });
      await load();
    } catch (error) {
      setBanner({ tone: "error", text: error instanceof Error ? error.message : "Unable to save payment wallet." });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminLayout
      title="Payment Wallets"
      subtitle="Manage the official receiving wallet addresses and bank details displayed to customers throughout the platform."
      actions={<Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="w-3.5 h-3.5" /><span>Refresh</span></Button>}
    >
      {banner && <NotificationBanner tone={banner.tone} message={banner.text} onDismiss={() => setBanner(null)} />}
      <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900">
        Only enter receiving addresses and bank details controlled by the business. Confirm each blockchain network before enabling a wallet. Customer balances are never credited automatically from a submitted transaction hash.
      </div>
      {loading ? <p className="py-8 text-sm text-slate-500">Loading payment wallet settings…</p> : (
        <div className="grid gap-5 xl:grid-cols-2">
          {wallets.map((wallet) => (
            <Card key={wallet.id}>
              <CardHeader title={wallet.label} subtitle={wallet.currency} action={<WalletCards className="h-4 w-4 text-slate-400" />} />
              <CardBody>
                <div className="space-y-4">
                  <FormField id={"network-" + wallet.id.replace(/[^a-zA-Z0-9_-]/g, "-")} label="Network / Payment Rail">
                    <TextInput id={"network-" + wallet.id.replace(/[^a-zA-Z0-9_-]/g, "-")} value={wallet.network} onChange={(e) => updateWallet(wallet.id, { network: e.target.value })} />
                  </FormField>
                  <FormField id={"address-" + wallet.id.replace(/[^a-zA-Z0-9_-]/g, "-")} label="Receiving Wallet Address / Bank Details" hint="This is shown to customers as the official payment destination.">
                    <textarea id={"address-" + wallet.id.replace(/[^a-zA-Z0-9_-]/g, "-")} rows={3} value={wallet.walletAddress} onChange={(e) => updateWallet(wallet.id, { walletAddress: e.target.value })} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1B4962]" placeholder="Enter the verified receiving address or bank account details" />
                  </FormField>
                  <FormField id={"minimum-" + wallet.id.replace(/[^a-zA-Z0-9_-]/g, "-")} label="Minimum Deposit (USD)">
                    <TextInput id={"minimum-" + wallet.id.replace(/[^a-zA-Z0-9_-]/g, "-")} type="number" numeric min="1" step="0.01" value={String(wallet.minDeposit)} onChange={(e) => updateWallet(wallet.id, { minDeposit: Number(e.target.value) })} />
                  </FormField>
                  <FormField id={"instructions-" + wallet.id.replace(/[^a-zA-Z0-9_-]/g, "-")} label="Payment Instructions">
                    <textarea id={"instructions-" + wallet.id.replace(/[^a-zA-Z0-9_-]/g, "-")} rows={2} value={wallet.instructions} onChange={(e) => updateWallet(wallet.id, { instructions: e.target.value })} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1B4962]" />
                  </FormField>
                  <FormField id={"confirmation-" + wallet.id.replace(/[^a-zA-Z0-9_-]/g, "-")} label="Customer Confirmation Message">
                    <textarea id={"confirmation-" + wallet.id.replace(/[^a-zA-Z0-9_-]/g, "-")} rows={2} value={wallet.confirmationInfo} onChange={(e) => updateWallet(wallet.id, { confirmationInfo: e.target.value })} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1B4962]" />
                  </FormField>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <input type="checkbox" checked={wallet.enabled} onChange={(e) => updateWallet(wallet.id, { enabled: e.target.checked })} />
                    Enable this payment method for customers
                  </label>
                  <div className="flex justify-end">
                    <Button onClick={() => void save(wallet)} loading={savingId === wallet.id} disabled={savingId !== null || (wallet.enabled && wallet.walletAddress.trim().length < 6)}>
                      <Save className="h-4 w-4" /><span>Save {wallet.label}</span>
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
