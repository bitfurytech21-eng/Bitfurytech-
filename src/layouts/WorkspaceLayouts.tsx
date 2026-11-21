import PortalShell, { PortalShellProps } from "./PortalShell";

export function CustomerLayout({
  title,
  subtitle,
  children,
}: Omit<PortalShellProps, "section">) {
  return (
    <PortalShell title={title} subtitle={subtitle} section="investor">
      {children}
    </PortalShell>
  );
}

export function AdminLayout({
  title,
  subtitle,
  children,
}: Omit<PortalShellProps, "section">) {
  return (
    <PortalShell title={title} subtitle={subtitle} section="admin">
      {children}
    </PortalShell>
  );
}
