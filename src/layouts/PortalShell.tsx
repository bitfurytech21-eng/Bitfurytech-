import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowDownCircle,
  Bell,
  Building2,
  Hexagon,
  Home,
  LogOut,
  Menu,
  Settings,
  Shield,
  User,
  X,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { formatUsd } from "../trading/tradingPage";
import { DropdownItem, DropdownMenu } from "../components/ui";
import DashboardLayout from "./DashboardLayout";

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
  if (section === "investor") {
    return (
      <DashboardLayout title={title} subtitle={subtitle}>
        {children}
      </DashboardLayout>
    );
  }

  return <AdminPortalShell title={title} subtitle={subtitle}>{children}</AdminPortalShell>;
}

function AdminPortalShell({
  title,
  subtitle,
  children,
}: Omit<PortalShellProps, "section">) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { firebaseUser, profile, isAdmin, signOutUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = ADMIN_NAV;
  const resolvedTitle =
    title ||
    navItems.find(
      (item) =>
        pathname === item.to ||
        (item.to !== "/admin" && pathname.startsWith(`${item.to}/`))
    )?.label ||
    "Admin Console";

  const handleSignOut = async () => {
    await signOutUser();
    navigate("/login");
  };

  const accountMenuItems: DropdownItem[] = [
    {
      id: "profile",
      label: "Profile Details",
      to: "/profile",
      icon: <User className="w-3.5 h-3.5 text-[#1B4962]" />,
    },
    {
      id: "settings",
      label: "Security Settings",
      to: "/settings",
      icon: <Settings className="w-3.5 h-3.5 text-[#1B4962]" />,
    },
    ...(isAdmin
      ? [
          {
            id: "switch-mode",
            label: "Investor Portal",
            to: "/dashboard",
            icon: <Shield className="w-3.5 h-3.5 text-[#E94D65]" />,
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
    <div className="min-h-screen bg-[#F6F8FA] text-[#102030] flex">
      <aside className="hidden lg:flex w-64 shrink-0 bg-[#1B4962] text-slate-100 flex-col justify-between border-r border-[#14374B]">
        <div>
          <div className="h-16 px-6 flex items-center border-b border-white/15">
            <Link to="/dashboard" className="inline-flex items-center gap-2.5 font-heading font-extrabold text-lg text-white">
              <Hexagon className="w-6 h-6 text-[#E94D65] fill-[#E94D65]/20 shrink-0" />
              <span>
                Bitfury<span className="text-[#E94D65]">Tech</span>
              </span>
            </Link>
          </div>

          <div className="px-6 py-4 border-b border-white/15 bg-[#14374B]">
            <p className="text-xs text-slate-300">Available Wallet</p>
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
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[5px] text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? "bg-[#E94D65] text-white font-semibold"
                      : "text-slate-100 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-white/15 space-y-1">
          {isAdmin && (
            <Link
              to="/dashboard"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-[5px] text-sm font-medium text-[#FFD1D8] hover:bg-white/10"
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span>Investor Portal</span>
            </Link>
          )}
          <Link
            to="/"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-[5px] text-sm text-slate-100 hover:bg-white/10 hover:text-white"
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>Corporate Website</span>
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-[5px] text-sm text-[#FFD1D8] hover:bg-white/10 text-left cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#102030]/60"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[82vw] bg-[#1B4962] text-white flex flex-col justify-between z-10 overflow-y-auto">
            <div>
              <div className="h-16 px-5 flex items-center justify-between border-b border-white/15">
                <span className="font-heading font-extrabold text-base">
                  Bitfury<span className="text-[#E94D65]">Tech</span>
                </span>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close navigation drawer"
                  className="p-1.5 text-slate-200 hover:text-white"
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
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-[5px] text-sm font-medium ${
                        active ? "bg-[#E94D65] text-white" : "text-slate-100 hover:bg-white/10"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="p-3 border-t border-white/15 space-y-1">
              {isAdmin && (
                <Link
                  to="/dashboard"
                  onClick={() => setSidebarOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2 rounded-[5px] text-sm text-[#FFD1D8]"
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>Investor Portal</span>
                </Link>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3.5 py-2 rounded-[5px] text-sm text-[#FFD1D8] text-left"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-[#DCE4EC] px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 -ml-2 text-[#1B4962] hover:bg-[#EDF3F7]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="text-xs text-[#5A6B7C] truncate">
                BitfuryTech <span aria-hidden="true">/</span> Admin{" "}
                <span aria-hidden="true">/</span> {resolvedTitle}
              </div>
              <h1 className="text-base sm:text-lg font-bold font-heading text-[#102030] truncate">
                {resolvedTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/notifications"
              aria-label="View notifications"
              className="p-2 rounded-[5px] border border-[#DCE4EC] text-[#1B4962] hover:bg-[#F6F8FA]"
            >
              <Bell className="w-4 h-4" />
            </Link>

            <DropdownMenu
              label="Account navigation menu"
              items={accountMenuItems}
              trigger={
                <span className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-none bg-[#1B4962] text-white flex items-center justify-center font-bold text-xs">
                    {(profile?.displayName || firebaseUser?.email || "B")[0].toUpperCase()}
                  </span>
                  <span className="hidden sm:inline max-w-[140px] truncate text-left font-semibold text-[#102030]">
                    {profile?.displayName || firebaseUser?.displayName || "Account"}
                  </span>
                </span>
              }
            />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {subtitle && <p className="text-sm text-[#4A5B6C]">{subtitle}</p>}
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
