import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import AdminSidebar, { ADMIN_NAV_ITEMS } from "../components/admin/AdminSidebar";
import Topbar, { BreadcrumbSegment } from "../components/dashboard/Topbar";
import { buttonClasses, Card } from "../components/ui";
import { useAuth } from "../hooks/useAuth";
import { NotificationMessage, sessionApiRequest } from "../services/dashboardApi";

export interface AdminLayoutProps {
  title?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbSegment[];
  actions?: React.ReactNode;
  children: React.ReactNode;
}

function resolveAdminMeta(pathname: string): {
  title: string;
  breadcrumbs: BreadcrumbSegment[];
} {
  const matched = ADMIN_NAV_ITEMS.find((item) =>
    item.matchExact
      ? pathname === item.to
      : pathname === item.to || pathname.startsWith(`${item.to}/`)
  );
  const label = matched?.label || "Overview";
  return {
    title: label === "Overview" ? "Administrator Overview" : label,
    breadcrumbs: [
      { label: "BitfuryTech", to: "/admin" },
      { label: "Admin Console", to: "/admin" },
      ...(label === "Overview" ? [] : [{ label }]),
    ],
  };
}

export default function AdminLayout({
  title,
  subtitle,
  breadcrumbs,
  actions,
  children,
}: AdminLayoutProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAdmin, signOutUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  const loadNotifications = useCallback(() => {
    if (!user) return;
    void sessionApiRequest<{ notifications: NotificationMessage[] }>("/api/notifications")
      .then((res) => setNotifications(res.notifications || []))
      .catch(() => undefined);
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleSignOut = async () => {
    await signOutUser();
    navigate("/login", { replace: true });
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center p-6">
        <Card padding="lg" className="max-w-lg w-full space-y-4 border-[#E94D65]/40">
          <div className="flex items-center gap-2.5 text-[#E94D65]">
            <Shield className="w-5 h-5" />
            <h1 className="text-base font-bold font-heading text-[#102030]">
              Administrator Authorization Required
            </h1>
          </div>
          <p className="text-sm text-[#3B4C5E] leading-relaxed">
            This operational workspace is restricted to server-verified BitfuryTech administrators.
          </p>
          <Link to="/dashboard" className={buttonClasses({ variant: "primary", size: "md" })}>
            Return to Investor Portal
          </Link>
        </Card>
      </div>
    );
  }

  const meta = resolveAdminMeta(pathname);
  const resolvedTitle = title || meta.title;
  const resolvedBreadcrumbs = breadcrumbs || meta.breadcrumbs;

  return (
    <div className="min-h-screen bg-[#F6F8FA] text-[#102030] flex">
      <AdminSidebar
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
            user?.displayName ||
            user?.email?.split("@")[0] ||
            "Administrator"
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
            {actions && (
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>
            )}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}
