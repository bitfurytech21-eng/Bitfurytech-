import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { buttonClasses, Card, ErrorState, Spinner } from "./ui";

export function FullPageLoader({
  label = "Verifying BitfuryTech session...",
}: {
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="min-h-screen bg-[#f5f8fa] text-slate-900 flex flex-col items-center justify-center p-6"
    >
      <Card padding="md" className="px-7 py-5">
        <Spinner label={label} />
      </Card>
    </div>
  );
}

export function RouteErrorState({
  title = "Workspace Connection Interrupted",
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#f5f8fa] text-slate-900 flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-3">
        <ErrorState title={title} message={message} onRetry={onRetry} />
        <div className="text-center">
          <Link to="/" className={buttonClasses({ variant: "outline", size: "sm" })}>
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}

export function UnauthorizedState() {
  return (
    <div className="min-h-screen bg-[#f5f8fa] text-slate-900 flex items-center justify-center p-6">
      <Card padding="lg" className="max-w-lg w-full space-y-4 border-rose-200">
        <div className="flex items-center gap-2.5 text-rose-700">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <h1 className="text-base font-bold text-slate-900">Administrator Access Required</h1>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Your signed-in account does not hold settlement administrator privileges for this route.
          Return to your customer portal or corporate homepage.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link to="/dashboard" className={buttonClasses({ variant: "primary", size: "md" })}>
            Customer Dashboard
          </Link>
          <Link to="/" className={buttonClasses({ variant: "outline", size: "md" })}>
            Corporate Website
          </Link>
        </div>
      </Card>
    </div>
  );
}
