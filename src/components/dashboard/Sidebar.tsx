import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity,
  ArrowDownCircle,
  ArrowUpRight,
  Building2,
  Compass,
  FileText,
  FolderOpen,
  Home,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Settings,
  Share2,
  Shield,
  TrendingUp,
  User,
  Wallet,
  X,
} from "lucide-react";
import { formatUsd } from "../../trading/tradingPage";

export interface DashboardNavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  matchExact?: boolean;
}

export const DASHBOARD_NAV_ITEMS: DashboardNavItem[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, matchExact: true },
  { to: "/investments", label: "My Investments", icon: TrendingUp },
  { to: "/dashboard/opportunities", label: "Investment Opportunities", icon: Compass },
  { to: "/invest", label: "Purchase Units", icon: PlusCircle },
  { to: "/dashboard/properties", label: "Properties", icon: Building2 },
  { to: "/trading", label: "Trade View", icon: Activity },
  { to: "/deposit", label: "Deposit", icon: ArrowDownCircle },
  { to: "/withdrawal", label: "Withdraw", icon: ArrowUpRight },
  { to: "/transactions", label: "Transactions", icon: FileText },
  { to: "/referrals", label: "Referral Program", icon: Share2 },
  { to: "/documents", label: "Documents", icon: FolderOpen },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
];

export interface SidebarProps {
  walletBalance: number;
  isAdmin: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSignOut: () => void;
}

function isRouteActive(pathname: string, item: DashboardNavItem): boolean {
  if (item.matchExact) {
    return pathname === item.to;
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function SidebarContent({
  walletBalance,
  isAdmin,
  onNavigate,
  onSignOut,
  showCloseButton,
  onCloseMobile,
}: {
  walletBalance: number;
  isAdmin: boolean;
  onNavigate?: () => void;
  onSignOut: () => void;
  showCloseButton?: boolean;
  onCloseMobile?: () => void;
}) {
  const { pathname } = useLocation();

  return (
    <div className="flex flex-col justify-between h-full bg-[#1B4962] text-slate-100">
      <div>
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/15 bg-[#1F3649]">
          <Link
            to="/dashboard"
            onClick={onNavigate}
            className="inline-flex items-center rounded-md bg-white px-2 py-1 whitespace-nowrap shrink-0"
          >
            <img
              src="/images/brand/bitfurylogo.png"
              alt="Bitfury Tech Investment"
              className="h-7 w-auto"
            />
          </Link>
          {showCloseButton && onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation menu"
              className="p-2 text-slate-200 hover:text-white hover:bg-white/10 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <Link
          to="/wallet"
          onClick={onNavigate}
          className="block px-5 py-4 border-b border-white/15 bg-[#14374B] hover:bg-[#112E3E] transition-colors"
        >
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>Custody Wallet</span>
            <span className="h-7 w-7 rounded-md bg-[#334E83] text-white flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" strokeWidth={2.1} />
            </span>
          </div>
          <p className="text-lg font-semibold font-mono tabular-nums text-white mt-1">
            {formatUsd(walletBalance)}
          </p>
        </Link>

        <nav aria-label="Customer dashboard navigation" className="p-3 space-y-1">
          {DASHBOARD_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(pathname, item);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[5px] text-sm transition-colors whitespace-nowrap ${
                  active
                    ? "bg-[#E94D65] text-white font-semibold"
                    : "text-slate-100 hover:bg-white/10 hover:text-white font-medium"
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-white/15 space-y-1">
        {isAdmin && (
          <Link
            to="/admin"
            onClick={onNavigate}
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-[5px] text-sm font-medium text-[#FFD1D8] hover:bg-white/10 whitespace-nowrap"
          >
            <Shield className="w-4.5 h-4.5 shrink-0" strokeWidth={2} />
            <span>Admin Console</span>
          </Link>
        )}
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-[5px] text-sm text-slate-100 hover:bg-white/10 hover:text-white whitespace-nowrap"
        >
          <Home className="w-4.5 h-4.5 shrink-0" strokeWidth={2} />
          <span>Corporate Website</span>
        </Link>
        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[5px] text-sm font-medium text-[#FFD1D8] hover:bg-white/10 text-left whitespace-nowrap cursor-pointer"
        >
          <LogOut className="w-4.5 h-4.5 shrink-0" strokeWidth={2} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({
  walletBalance,
  isAdmin,
  mobileOpen,
  onCloseMobile,
  onSignOut,
}: SidebarProps) {
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseMobile();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 border-r border-[#14374B] bg-[#1B4962]">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <SidebarContent
            walletBalance={walletBalance}
            isAdmin={isAdmin}
            onSignOut={onSignOut}
          />
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Dashboard navigation"
        >
          <div
            className="fixed inset-0 bg-[#102030]/60"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] h-full overflow-y-auto z-10 shadow-xl">
            <SidebarContent
              walletBalance={walletBalance}
              isAdmin={isAdmin}
              onNavigate={onCloseMobile}
              onSignOut={() => {
                onCloseMobile();
                onSignOut();
              }}
              showCloseButton
              onCloseMobile={onCloseMobile}
            />
          </aside>
        </div>
      )}
    </>
  );
}
