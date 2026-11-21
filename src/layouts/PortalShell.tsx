import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowDownCircle,
  ArrowUpRight,
  Bell,
  Building2,
  FileText,
  Hexagon,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Shield,
  TrendingUp,
  User,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { formatUsd } from "../trading/tradingPage";
import { DropdownItem, DropdownMenu } from "../components/ui";

const INVESTOR_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/deposit", label: "Deposit", icon: ArrowDownCircle },
  { to: "/withdrawal", label: "Withdraw", icon: ArrowUpRight },
  { to: "/investments", label: "Investments", icon: TrendingUp },
  { to: "/transactions", label: "Transactions", icon: FileText },
  { to: "/properties", label: "Properties", icon: Building2 },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "Settings", icon: Settings },
];

const ADMIN_NAV = [
  { to: "/admin", label: "Admin Overview", icon: Shield },
  { to: "/admin/deposits", label: "Settlement Queue", icon: ArrowDownCircle },
  { to: "/admin/properties", label: "Manage Properties", icon: Building2 },
  { to: "/admin/users", label: "Investor Accounts", icon: User },
  { to: "/admin/notifications", label: "Broadcasts", icon: Bell },
];

export interface PortalShellProps {
  title?: string;
  subtitle?: string;
  section?: "investor" | "admin";
  children?: React.ReactNode;
}

export default function PortalShell({
  title,
  subtitle,
  section = "investor",
  children,
}: PortalShellProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { firebaseUser, profile, isAdmin, signOutUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = section === "admin" ? ADMIN_NAV : INVESTOR_NAV;
  const resolvedTitle =
    title ||
    navItems.find(
      (item) =>
        pathname === item.to ||
        (item.to !== "/dashboard" && item.to !== "/admin" && pathname.startsWith(`${item.to}/`))
    )?.label ||
    (section === "admin" ? "Admin Console" : "Investor Portal");

  const handleSignOut = async () => {
    await signOutUser();
    navigate("/login");
  };

  const accountMenuItems: DropdownItem[] = [
    {
      id: "profile",
      label: "Profile Details",
      to: "/profile",
      icon: <User className="w-3.5 h-3.5 text-slate-500" />,
    },
    {
      id: "settings",
      label: "Security Settings",
      to: "/settings",
      icon: <Settings className="w-3.5 h-3.5 text-slate-500" />,
    },
    ...(isAdmin
      ? [
          {
            id: "switch-mode",
            label: section === "admin" ? "Investor Portal" : "Admin Console",
            to: section === "admin" ? "/dashboard" : "/admin",
            icon: <Shield className="w-3.5 h-3.5 text-[#294158]" />,
            dividerBefore: true,
          } as DropdownItem,
        ]
      : []),
    {
      id: "signout",
      label: "Sign Out",
      onClick: handleSignOut,
      danger: true,
      dividerBefore: true,
      icon: <LogOut className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f8fa] text-slate-900 flex">
      {/* Desktop Metronic Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-[#1e2b3c] text-slate-200 flex-col justify-between border-r border-slate-800">
        <div>
          <div className="h-16 px-6 flex items-center border-b border-white/10">
            <Link to="/dashboard" className="inline-flex items-center gap-2.5 font-bold text-lg text-white">
              <Hexagon className="w-6 h-6 text-yellow-400 fill-yellow-400/20 shrink-0" />
              <span>
                Bitfury<span className="text-yellow-400">Tech</span>
              </span>
            </Link>
          </div>

          <div className="px-6 py-4 border-b border-white/10 bg-[#182331]">
            <p className="text-xs text-slate-400">Available Wallet</p>
            <p className="text-lg font-semibold font-mono tabular-nums text-white mt-0.5">
              {formatUsd(profile?.walletBalance ?? 0)}
            </p>
          </div>

          <nav aria-label="Workspace navigation" className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.to ||
                (item.to !== "/dashboard" && item.to !== "/admin" && pathname.startsWith(`${item.to}/`));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? "bg-[#294158] text-yellow-400 font-semibold"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-white/10 space-y-1">
          {isAdmin && (
            <Link
              to={section === "admin" ? "/dashboard" : "/admin"}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium text-yellow-300 hover:bg-white/5"
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span>{section === "admin" ? "Investor Portal" : "Admin Console"}</span>
            </Link>
          )}
          <Link
            to="/"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm text-slate-300 hover:bg-white/5 hover:text-white"
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>Corporate Website</span>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm text-rose-300 hover:bg-white/5 text-left cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile / Tablet Slide-Over Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[82vw] bg-[#1e2b3c] text-white flex flex-col justify-between z-10 overflow-y-auto">
            <div>
              <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
                <span className="font-bold text-base">
                  Bitfury<span className="text-yellow-400">Tech</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close navigation drawer"
                  className="p-1.5 rounded-md text-slate-300 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="p-3 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-md text-sm font-medium ${
                        active ? "bg-[#294158] text-yellow-400" : "text-slate-200 hover:bg-white/5"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="p-3 border-t border-white/10 space-y-1">
              {isAdmin && (
                <Link
                  to={section === "admin" ? "/dashboard" : "/admin"}
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2 rounded-md text-sm text-yellow-300"
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>{section === "admin" ? "Investor Portal" : "Admin Console"}</span>
                </Link>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-md text-sm text-rose-300 text-left"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 rounded-md text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="text-xs text-slate-500 truncate">
                BitfuryTech <span aria-hidden="true">/</span>{" "}
                {section === "admin" ? "Admin" : "Portal"} <span aria-hidden="true">/</span>{" "}
                {resolvedTitle}
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {resolvedTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/notifications"
              aria-label="View notifications"
              className="p-2 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <Bell className="w-4 h-4" />
            </Link>

            <DropdownMenu
              label="Account navigation menu"
              items={accountMenuItems}
              trigger={
                <span className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-[#1e2b3c] text-yellow-400 flex items-center justify-center font-bold text-xs">
                    {(profile?.displayName || firebaseUser?.email || "B")[0].toUpperCase()}
                  </span>
                  <span className="hidden sm:inline max-w-[140px] truncate text-left font-semibold text-slate-800">
                    {profile?.displayName || firebaseUser?.displayName || "Account"}
                  </span>
                </span>
              }
            />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
