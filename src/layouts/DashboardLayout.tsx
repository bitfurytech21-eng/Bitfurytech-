import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar, { DASHBOARD_NAV_ITEMS } from "../components/dashboard/Sidebar";
import Topbar, { BreadcrumbSegment } from "../components/dashboard/Topbar";
import { useAuth } from "../hooks/useAuth";
import { NotificationMessage, sessionApiRequest } from "../services/dashboardApi";

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
  const { user, profile, isAdmin, signOutUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(profile?.walletBalance ?? 0);
  const [serverDisplayName, setServerDisplayName] = useState<string>("");
  const [serverPhotoUrl, setServerPhotoUrl] = useState<string | null | undefined>(undefined);

  const loadLayoutSessionData = useCallback(() => {
    if (!user || !user.emailVerified) return;
    void sessionApiRequest<{ notifications: NotificationMessage[] }>("/api/notifications")
      .then((res) => setNotifications(res.notifications || []))
      .catch(() => undefined);
    void sessionApiRequest<{
      account?: { displayName?: string; photoUrl?: string | null };
      metrics?: { availableBalance?: number };
    }>("/api/dashboard/overview")
      .then((res) => {
        if (typeof res.metrics?.availableBalance === "number") {
          setWalletBalance(res.metrics.availableBalance);
        }
        if (res.account?.displayName) {
          setServerDisplayName(res.account.displayName);
        }
        if (res.account && "photoUrl" in res.account) {
          setServerPhotoUrl(res.account.photoUrl ?? null);
        }
      })
      .catch(() => undefined);
  }, [user]);

  useEffect(() => {
    loadLayoutSessionData();
  }, [loadLayoutSessionData]);

  useEffect(() => {
    const onProfileUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ photoUrl?: string | null; displayName?: string }>).detail;
      if (detail && "photoUrl" in detail) {
        setServerPhotoUrl(detail.photoUrl ?? null);
      }
      if (detail?.displayName) {
        setServerDisplayName(detail.displayName);
      }
    };
    window.addEventListener("bitfury:profile-updated", onProfileUpdated);
    return () => window.removeEventListener("bitfury:profile-updated", onProfileUpdated);
  }, []);

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
        walletBalance={profile?.walletBalance ?? walletBalance}
        isAdmin={isAdmin}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onSignOut={() => void handleSignOut()}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <Topbar
          title={resolvedTitle}
          breadcrumbs={resolvedBreadcrumbs}
          userEmail={user?.email || ""}
          displayName={
            profile?.displayName ||
            serverDisplayName ||
            user?.displayName ||
            user?.email?.split("@")[0] ||
            "Investor"
          }
          photoUrl={
            serverPhotoUrl !== undefined
              ? serverPhotoUrl
              : profile?.photoUrl ?? user?.photoUrl ?? null
          }
          userId={user?.uid}
          isAdmin={isAdmin}
          notifications={notifications}
          onMarkNotificationRead={(id) =>
            setNotifications((prev) =>
              prev.map((item) => (item.id === id ? { ...item, read: true } : item))
            )
          }
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
