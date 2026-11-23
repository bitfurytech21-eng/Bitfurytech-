import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowUpRight,
  Building2,
  CreditCard,
  FileText,
  FolderOpen,
  Home,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Settings,
  Share2,
  Shield,
  TrendingUp,
  Users,
  WalletCards,
  X,
} from "lucide-react";

export interface AdminNavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchExact?: boolean;
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, matchExact: true },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/properties", label: "Properties", icon: Building2 },
  { to: "/admin/plans", label: "Investment Plans", icon: Layers },
  { to: "/admin/investments", label: "Investments", icon: TrendingUp },
  { to: "/admin/deposits", label: "Deposits", icon: ArrowDownCircle },
  { to: "/admin/financial-approvals", label: "Financial Approvals", icon: WalletCards },
  { to: "/admin/financial-approvals", label: "Financial Approval Center", icon: CreditCard },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpRight },
  { to: "/admin/transactions", label: "Transactions", icon: FileText },
  { to: "/admin/referrals", label: "Referrals", icon: Share2 },
  { to: "/admin/documents", label: "Documents", icon: FolderOpen },
  { to: "/admin/support", label: "Support", icon: LifeBuoy },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

export interface AdminSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSignOut: () => void;
}

function isAdminRouteActive(pathname: string, item: AdminNavItem): boolean {
  if (item.matchExact) {
    return pathname === item.to;
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

function AdminSidebarContent({
  onNavigate,
  onSignOut,
  showCloseButton,
  onCloseMobile,
}: {
  onNavigate?: () => void;
  onSignOut: () => void;
  showCloseButton?: boolean;
  onCloseMobile?: () => void;
}) {
  const { pathname } = useLocation();

  return (
    <div className="flex flex-col justify-between h-full bg-[#1B4962] text-slate-100">
      <div>
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/15">
          <Link
            to="/admin"
            onClick={onNavigate}
            className="inline-flex items-center gap-2 rounded-md bg-white px-2 py-1 whitespace-nowrap shrink-0"
          >
            <img
              src="/images/brand/bitfurylogo.png"
              alt="Bitfury Tech Investment"
              className="h-7 w-auto"
            />
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1B4962]">
              Admin
            </span>
          </Link>
          {showCloseButton && onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close admin menu"
              className="p-2 text-slate-200 hover:text-white hover:bg-white/10 min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="px-5 py-3.5 border-b border-white/15 bg-[#14374B]">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#FFD1D8]">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>Operations Console</span>
          </div>
          <p className="text-[11px] text-slate-300 mt-0.5">
            Server-verified administrative governance
          </p>
        </div>

        <nav aria-label="Administrator navigation" className="p-3 space-y-1">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isAdminRouteActive(pathname, item);
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
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-white/15 space-y-1">
        <Link
          to="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-[5px] text-sm text-slate-100 hover:bg-white/10 hover:text-white whitespace-nowrap"
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span>Customer Portal</span>
        </Link>
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-[5px] text-sm text-slate-100 hover:bg-white/10 hover:text-white whitespace-nowrap"
        >
          <Home className="w-4 h-4 shrink-0" />
          <span>Corporate Website</span>
        </Link>
        <button
          type="button"
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[5px] text-sm font-medium text-[#FFD1D8] hover:bg-white/10 text-left whitespace-nowrap cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

export default function AdminSidebar({
  mobileOpen,
  onCloseMobile,
  onSignOut,
}: AdminSidebarProps) {
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
          <AdminSidebarContent onSignOut={onSignOut} />
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="Administrator navigation"
        >
          <div
            className="fixed inset-0 bg-[#102030]/60"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] h-full overflow-y-auto z-10 shadow-xl">
            <AdminSidebarContent
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
