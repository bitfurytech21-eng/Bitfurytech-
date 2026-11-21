import { Link, Navigate, Route, Routes } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import ProtectedRoute from "./ProtectedRoute";
import HomePage from "../pages/public/HomePage";
import AboutPage from "../pages/public/AboutPage";
import ServicesPage from "../pages/public/ServicesPage";
import CatalogPage from "../pages/public/CatalogPage";
import PropertiesPage from "../pages/public/PropertiesPage";
import ContactPage from "../pages/public/ContactPage";
import { FaqPage, PrivacyPage, TermsPage } from "../pages/public/LegalPages";
import { LoginPage, RegisterPage } from "../pages/auth/AuthPages";
import DashboardPage from "../pages/app/DashboardPage";
import {
  DepositPage,
  WalletPage,
  WithdrawalPage,
} from "../pages/app/WalletFinancePages";
import InvestmentsPage from "../pages/app/InvestmentsPage";
import {
  TransactionDetailsPage,
  TransactionsPage,
} from "../pages/app/TransactionsPage";
import {
  NotificationsPage,
  ProfilePage,
  SettingsPage,
} from "../pages/app/AccountPages";
import {
  AdminNotificationsPage,
  AdminOverviewPage,
  AdminPropertiesPage,
  AdminSettlementQueuePage,
  AdminUsersPage,
} from "../pages/admin/AdminPages";

function NotFoundPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center space-y-5">
        <p className="text-xs font-mono uppercase tracking-wider text-yellow-400">404</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-white">Page Not Found</h1>
        <p className="text-sm text-slate-400">
          The requested BitfuryTech route could not be located. Return to the main corporate site or
          open your client dashboard.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <Link
            to="/"
            className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-semibold text-xs px-5 py-2.5 rounded-md"
          >
            Corporate Home
          </Link>
          <Link
            to="/dashboard"
            className="border border-white/20 hover:bg-white/5 text-white font-semibold text-xs px-5 py-2.5 rounded-md"
          >
            Client Portal
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* 1. Public Route Group */}
      <Route path="/" element={<HomePage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/investments-catalog" element={<CatalogPage />} />
      <Route path="/properties" element={<PropertiesPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />

      {/* 2. Authentication Route Group */}
      <Route element={<ProtectedRoute mode="guestOnly" />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* 3. Customer Route Group */}
      <Route element={<ProtectedRoute mode="customer" />}>
        <Route path="/app" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/deposit" element={<DepositPage />} />
        <Route path="/withdrawal" element={<WithdrawalPage />} />
        <Route path="/investments" element={<InvestmentsPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/transactions/:id" element={<TransactionDetailsPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* 4. Administrator Route Group */}
      <Route element={<ProtectedRoute mode="admin" />}>
        <Route path="/admin" element={<AdminOverviewPage />} />
        <Route path="/admin/deposits" element={<AdminSettlementQueuePage />} />
        <Route path="/admin/properties" element={<AdminPropertiesPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
      </Route>

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
