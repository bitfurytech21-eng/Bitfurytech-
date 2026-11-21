import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowUpRight,
  Coins,
  Gift,
  Share2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import MetronicShell from "../../components/MetronicShell";
import {
  buttonClasses,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  NotificationBanner,
  StatusText,
} from "../../components/ui";
import { useAuth } from "../../hooks/useAuth";
import {
  formatTimestamp,
  InvestmentAllocation,
  subscribeUserInvestments,
  subscribeUserTransactions,
  TransactionRecord,
} from "../../services/firestoreService";
import { formatUsd } from "../../trading/tradingPage";

export default function DashboardPage() {
  const { firebaseUser, profile } = useAuth();
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [investments, setInvestments] = useState<InvestmentAllocation[]>([]);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  useEffect(() => {
    if (!firebaseUser) return;
    const unsubInv = subscribeUserInvestments(firebaseUser.uid, setInvestments);
    const unsubTx = subscribeUserTransactions(firebaseUser.uid, setTransactions);
    return () => {
      unsubInv();
      unsubTx();
    };
  }, [firebaseUser]);

  const kpiCards = [
    {
      label: "Account balance",
      value: formatUsd(profile?.walletBalance ?? 0),
      icon: Wallet,
      iconBg: "bg-[#233b56]",
    },
    {
      label: "Total Profit",
      value: formatUsd(profile?.totalProfit ?? 0),
      icon: Coins,
      iconBg: "bg-emerald-500",
    },
    {
      label: "Bonus",
      value: formatUsd(profile?.bonus ?? 0),
      icon: Gift,
      iconBg: "bg-indigo-500",
    },
    {
      label: "Referral Bonus",
      value: formatUsd(profile?.referralBonus ?? 0),
      icon: Share2,
      iconBg: "bg-[#233b56]",
    },
    {
      label: "Total Deposit",
      value: formatUsd(profile?.totalDeposit ?? 0),
      icon: ArrowDownCircle,
      iconBg: "bg-amber-400",
    },
  ];

  const activeMandates = investments.filter((inv) => inv.status === "Active");
  const recentTransactions = transactions.slice(0, 5);

  return (
    <MetronicShell
      title="Dashboard"
      subtitle="Verified account summary, custody balances, and portfolio ledger activity."
    >
      {welcomeOpen && (
        <NotificationBanner
          tone="info"
          title="Welcome to BitfuryTech"
          message={`Signed in as ${firebaseUser?.email}. Every metric below reflects live Firestore records.`}
          onDismiss={() => setWelcomeOpen(false)}
        />
      )}

      {/* 5 Metric Cards matching the Metronic layout */}
      <section aria-label="Account financial metrics" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} padding="md" className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-md ${card.iconBg} text-white flex items-center justify-center shrink-0`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 truncate">{card.label}</p>
                <p className="text-xl font-semibold font-mono tabular-nums text-slate-900 mt-1">
                  {card.value}
                </p>
              </div>
            </Card>
          );
        })}
      </section>

      {/* Quick Actions Strip */}
      <Card padding="md" className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Portfolio Operations</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Initiate verified deposits, allocate mandates, or inspect full settlement records.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/deposit" className={buttonClasses({ variant: "primary", size: "md" })}>
            <ArrowDownCircle className="w-3.5 h-3.5 text-yellow-400" />
            <span>Submit Deposit</span>
          </Link>
          <Link to="/investments" className={buttonClasses({ variant: "gold", size: "md" })}>
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Allocate Capital</span>
          </Link>
          <Link to="/withdrawal" className={buttonClasses({ variant: "outline", size: "md" })}>
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Request Withdrawal</span>
          </Link>
        </div>
      </Card>

      {/* Two-Column Overview */}
      <div className="grid lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-6">
          <CardHeader
            title="Active Investment Mandates"
            action={
              <Link to="/investments" className="text-xs font-semibold text-[#294158] hover:underline">
                Manage Mandates
              </Link>
            }
          />
          <CardBody>
            {activeMandates.length === 0 ? (
              <EmptyState
                title="No Active Mandates"
                description="Your account has no active allocations yet. Fund your custody wallet and select an investment tier to deploy capital."
                action={
                  <Link to="/investments" className={buttonClasses({ variant: "primary", size: "sm" })}>
                    Browse Mandates
                  </Link>
                }
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {activeMandates.map((inv) => (
                  <div key={inv.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{inv.planName}</p>
                      <p className="text-xs text-slate-500">
                        {inv.dailyRatePct}% daily · {inv.durationDays} days · Started{" "}
                        {formatTimestamp(inv.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold font-mono tabular-nums text-slate-900">
                        {formatUsd(inv.amount)}
                      </p>
                      <StatusText status={inv.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-6">
          <CardHeader
            title="Recent Transactions"
            action={
              <Link to="/transactions" className="text-xs font-semibold text-[#294158] hover:underline">
                View Full Ledger
              </Link>
            }
          />
          <CardBody>
            {recentTransactions.length === 0 ? (
              <EmptyState
                title="No Ledger Activity Yet"
                description="Deposits, withdrawals, and mandate allocations appear here once submitted."
                action={
                  <Link to="/deposit" className={buttonClasses({ variant: "outline", size: "sm" })}>
                    Open Deposit Desk
                  </Link>
                }
              />
            ) : (
              <div className="divide-y divide-slate-100">
                {recentTransactions.map((tx) => (
                  <Link
                    key={tx.id}
                    to={`/transactions/${tx.id}`}
                    className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50 -mx-2 px-2 rounded"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {tx.type} · {tx.method}
                      </p>
                      <p className="text-xs text-slate-500">
                        Ref: {tx.reference} · {formatTimestamp(tx.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold font-mono tabular-nums text-slate-900">
                        {formatUsd(tx.amount)}
                      </p>
                      <StatusText status={tx.status} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </MetronicShell>
  );
}
