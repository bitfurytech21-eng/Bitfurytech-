import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  ChevronRight,
  FolderOpen,
  LogOut,
  Menu,
  Settings,
  Shield,
  User,
  Wallet,
} from "lucide-react";
import { DropdownItem, DropdownMenu } from "../ui";
import {
  formatTimestamp,
  isSafeProfilePhotoUrl,
  NotificationMessage,
  sessionApiRequest,
} from "../../services/dashboardApi";

export interface BreadcrumbSegment {
  label: string;
  to?: string;
}

export interface TopbarProps {
  title: string;
  breadcrumbs: BreadcrumbSegment[];
  userEmail: string;
  displayName: string;
  photoUrl?: string | null;
  userId?: string;
  isAdmin: boolean;
  notifications: NotificationMessage[];
  onMarkNotificationRead?: (id: string) => void;
  onOpenMobileMenu: () => void;
  onSignOut: () => void;
}

export default function Topbar({
  title,
  breadcrumbs,
  userEmail,
  displayName,
  photoUrl,
  userId,
  isAdmin,
  notifications,
  onMarkNotificationRead,
  onOpenMobileMenu,
  onSignOut,
}: TopbarProps) {
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(
    (n) => userId && (n.userId === userId || n.userId === "all") && !n.read
  ).length;
  const recentNotifications = notifications.slice(0, 4);

  useEffect(() => {
    if (!notifOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNotifOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [notifOpen]);

  const accountMenuItems: DropdownItem[] = [
    {
      id: "wallet",
      label: "Custody Wallet",
      to: "/wallet",
      icon: <Wallet className="w-3.5 h-3.5 text-[#1B4962]" />,
    },
    {
      id: "documents",
      label: "Documents & Statements",
      to: "/documents",
      icon: <FolderOpen className="w-3.5 h-3.5 text-[#1B4962]" />,
    },
    {
      id: "profile",
      label: "Investor Profile",
      to: "/profile",
      icon: <User className="w-3.5 h-3.5 text-[#1B4962]" />,
      dividerBefore: true,
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
            id: "admin-console",
            label: "Admin Console",
            to: "/admin",
            icon: <Shield className="w-3.5 h-3.5 text-[#E94D65]" />,
            dividerBefore: true,
          } as DropdownItem,
        ]
      : []),
    {
      id: "logout",
      label: "Logout",
      onClick: onSignOut,
      danger: true,
      dividerBefore: true,
      icon: <LogOut className="w-3.5 h-3.5" />,
    },
  ];

  const initial = (displayName || userEmail || "B").trim().charAt(0).toUpperCase();
  const safePhoto = isSafeProfilePhotoUrl(photoUrl) ? photoUrl : null;

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#1F3649] border-b border-white/15 px-4 sm:px-8 flex items-center justify-between gap-4 text-white">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden min-w-[44px] min-h-[44px] -ml-2 rounded-[5px] text-slate-100 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-slate-300 truncate">
            {breadcrumbs.map((crumb, idx) => (
              <span key={`${crumb.label}-${idx}`} className="inline-flex items-center gap-1 min-w-0">
                {idx > 0 && <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
                {crumb.to && idx < breadcrumbs.length - 1 ? (
                  <Link to={crumb.to} className="hover:text-white whitespace-nowrap transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-white font-medium truncate">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
          <p className="text-sm sm:text-base font-bold font-heading text-white truncate">{title}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div ref={notifRef} className="relative">
          <button
            type="button"
            onClick={() => setNotifOpen((prev) => !prev)}
            aria-expanded={notifOpen}
            aria-haspopup="dialog"
            aria-label="Account notifications"
            className="inline-flex items-center gap-2 min-h-[40px] px-3 py-2 rounded-[5px] border border-white/20 bg-white/10 hover:bg-white/15 text-white text-xs font-medium whitespace-nowrap transition-colors cursor-pointer"
          >
            <Bell className="w-4.5 h-4.5 text-white shrink-0" strokeWidth={2} />
            <span className="hidden sm:inline">Notifications</span>
            {unreadCount > 0 && (
              <span className="font-mono tabular-nums font-bold text-[#FFD1D8]">
                ({unreadCount})
              </span>
            )}
          </button>

          {notifOpen && (
            <div
              role="dialog"
              aria-label="Recent notifications"
              className="fixed inset-x-3 top-16 sm:inset-x-auto sm:absolute sm:right-0 sm:top-auto sm:mt-1.5 sm:w-96 rounded-[5px] border border-[#DCE4EC] bg-white shadow-[0_10px_28px_rgba(16,32,48,0.14)] z-40 overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[#DCE4EC] flex items-center justify-between bg-[#F6F8FA]">
                <span className="text-xs font-bold font-heading text-[#102030]">Notifications</span>
                <Link
                  to="/notifications"
                  onClick={() => setNotifOpen(false)}
                  className="text-xs font-semibold text-[#1B4962] hover:text-[#E94D65]"
                >
                  View All
                </Link>
              </div>
              {recentNotifications.length === 0 ? (
                <div className="p-5 text-xs text-[#5A6B7C] text-center">
                  No account notifications or broadcasts yet.
                </div>
              ) : (
                <div className="divide-y divide-[#EDF2F7] max-h-80 overflow-y-auto">
                  {recentNotifications.map((item) => {
                    const isUnread = Boolean(
                      userId && (item.userId === userId || item.userId === "all") && !item.read
                    );
                    return (
                      <div key={item.id} className="p-3.5 space-y-1 hover:bg-[#F6F8FA]">
                        <div className="flex items-center justify-between gap-2 text-[11px] text-[#5A6B7C]">
                          <span className="font-semibold text-[#1B4962]">{item.category}</span>
                          <span>{formatTimestamp(item.createdAt)}</span>
                        </div>
                        <p className="text-xs font-semibold text-[#102030]">{item.title}</p>
                        <p className="text-xs text-[#3B4C5E] line-clamp-2">{item.body}</p>
                        {isUnread && (
                          <button
                            type="button"
                            onClick={() =>
                              void sessionApiRequest(`/api/notifications/${encodeURIComponent(item.id)}/read`, {
                                method: "PATCH",
                              })
                                .then(() => onMarkNotificationRead?.(item.id))
                                .catch(() => undefined)
                            }
                            className="text-[11px] font-semibold text-[#B92841] hover:underline pt-0.5 cursor-pointer"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <DropdownMenu
          label="Account menu"
          tone="dark"
          items={accountMenuItems}
          trigger={
            <span className="flex items-center gap-2">
              {safePhoto ? (
                <span className="w-7 h-7 rounded-md overflow-hidden border border-white/25 bg-white/10 shrink-0">
                  <img
                    src={safePhoto}
                    alt={displayName || "Investor"}
                    className="w-full h-full object-cover"
                  />
                </span>
              ) : (
                <span className="w-7 h-7 rounded-md bg-white/15 border border-white/20 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {initial}
                </span>
              )}
              <span className="hidden sm:inline max-w-[140px] truncate text-left font-semibold text-white">
                {displayName || userEmail || "Account"}
              </span>
            </span>
          }
        />
      </div>
    </header>
  );
}
