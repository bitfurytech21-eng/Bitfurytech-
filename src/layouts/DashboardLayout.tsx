import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar, { DASHBOARD_NAV_ITEMS } from "../components/dashboard/Sidebar";
import Topbar, { BreadcrumbSegment } from "../components/dashboard/Topbar";
import { useAuth } from "../hooks/useAuth";
import {
  NotificationMessage,
  subscribeUserNotifications,
} from "../services/firestoreService";

export interface DashboardLayoutProps {
  title?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbSegment[];
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

function resolvePageMeta(pathname: string): { title: string; breadcrumbs: BreadcrumbSegment[] } {
  if (pathname === "/wallet") {
    return {
      title: "Custody Wallet",
      breadcrumbs: [
        { label: "BitfuryTech", to: "/dashboard" },
        { label: "Dashboard", to: "/dashboard" },
        { label: "Wallet" },
      ],
    };
  }
  if (pathname === "/notifications") {
    return {
      title: "Notifications",
      breadcrumbs: [
        { label: "BitfuryTech", to: "/dashboard" },
        { label: "Dashboard", to: "/dashboard" },
        { label: "Notifications" },
      ],
    };
  }
  if (pathname.startsWith("/transactions/")) {
    return {
      title: "Transaction Details",
      breadcrumbs: [
        { label: "BitfuryTech", to: "/dashboard" },
        { label: "Transactions", to: "/transactions" },
        { label: "Receipt" },
      ],
    };
  }

  const matched = DASHBOARD_NAV_ITEMS.find((item) =>
    item.matchExact
      ? pathname === item.to
      : pathname === item.to || pathname.startsWith(`${item.to}/`)
  );
  const label = matched?.label || "Overview";

  return {
    title: label,
    breadcrumbs: [
      { label: "BitfuryTech", to: "/dashboard" },
      { label: "Dashboard", to: "/dashboard" },
      ...(label === "Overview" ? [] : [{ label }]),
    ],
  };
}

export default function DashboardLayout({
  title,
  subtitle,
  breadcrumbs,
  actions,
  children,
}: DashboardLayoutProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { firebaseUser, profile, isAdmin, signOutUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeUserNotifications(firebaseUser.uid, setNotifications);
  }, [firebaseUser]);

  const meta = resolvePageMeta(pathname);
  const resolvedTitle = title || meta.title;
  const resolvedBreadcrumbs = breadcrumbs || meta.breadcrumbs;

  const handleSignOut = async () => {
    await signOutUser();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-[#102030] flex">
      <Sidebar
        walletBalance={profile?.walletBalance ?? 0}
        isAdmin={isAdmin}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onSignOut={() => void handleSignOut()}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          title={resolvedTitle}
          breadcrumbs={resolvedBreadcrumbs}
          userEmail={firebaseUser?.email || ""}
          displayName={
            profile?.displayName ||
            firebaseUser?.displayName ||
            firebaseUser?.email?.split("@")[0] ||
            "Investor"
          }
          userId={firebaseUser?.uid}
          isAdmin={isAdmin}
          notifications={notifications}
          onOpenMobileMenu={() => setMobileOpen(true)}
          onSignOut={() => void handleSignOut()}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DCE4EC] pb-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-heading tracking-tight text-[#102030]">
                {resolvedTitle}
              </h1>
              {subtitle && <p className="text-sm text-[#4A5B6C] mt-1">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
          </div>

          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
