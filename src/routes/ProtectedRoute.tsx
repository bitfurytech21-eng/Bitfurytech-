import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  FullPageLoader,
  RouteErrorState,
  UnauthorizedState,
} from "../components/RouteStates";

interface ProtectedRouteProps {
  mode?: "customer" | "admin" | "guestOnly";
  children?: React.ReactNode;
}

export default function ProtectedRoute({
  mode = "customer",
  children,
}: ProtectedRouteProps) {
  const { firebaseUser, authReady, isAdmin, authError, retryAuthSync } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return (
      <FullPageLoader
        label={
          mode === "admin"
            ? "Verifying administrator privileges..."
            : "Verifying BitfuryTech session..."
        }
      />
    );
  }

  if (mode === "guestOnly") {
    if (firebaseUser) {
      const target =
        (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ||
        "/dashboard";
      return <Navigate to={target} replace />;
    }
    return <>{children ?? <Outlet />}</>;
  }

  if (authError && !firebaseUser) {
    return <RouteErrorState message={authError} onRetry={retryAuthSync} />;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (mode === "admin" && !isAdmin) {
    return <UnauthorizedState />;
  }

  return <>{children ?? <Outlet />}</>;
}
