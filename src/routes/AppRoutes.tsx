import { Link, Navigate, Route, Routes } from "react-router-dom";
import PublicLayout from "../layouts/PublicLayout";
import ProtectedRoute from "./ProtectedRoute";
import Home from "../pages/public/Home";
import About from "../pages/public/About";
import ServicesPage from "../pages/public/ServicesPage";
import InvestmentPlans from "../pages/public/InvestmentPlans";
import InvestmentPlanDetail from "../pages/public/InvestmentPlanDetail";
import AssetClassPage from "../pages/public/AssetClassPage";
import PropertiesPage from "../pages/public/PropertiesPage";
import HowItWorks from "../pages/public/HowItWorks";
import FAQ from "../pages/public/FAQ";
import Contact from "../pages/public/Contact";
import { PrivacyPage, TermsPage } from "../pages/public/LegalPages";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import ForgotPassword from "../pages/auth/ForgotPassword";
import ResetPassword from "../pages/auth/ResetPassword";
import Overview from "../pages/dashboard/Overview";
import { WalletPage } from "../pages/app/WalletFinancePages";
import MyInvestments from "../pages/dashboard/MyInvestments";
import Invest from "../pages/dashboard/Invest";
import Deposit from "../pages/dashboard/Deposit";
import Withdraw from "../pages/dashboard/Withdraw";
import Transactions from "../pages/dashboard/Transactions";
import Referrals from "../pages/dashboard/Referrals";
import Profile from "../pages/dashboard/Profile";
import Settings from "../pages/dashboard/Settings";
import Documents from "../pages/dashboard/Documents";
import TradingDesk from "../pages/dashboard/TradingDesk";
import {
  DashboardPropertiesPage,
  InvestmentOpportunitiesPage,
} from "../pages/dashboard/CustomerSubPages";
import { TransactionDetailsPage } from "../pages/app/TransactionsPage";
import { NotificationsPage } from "../pages/app/AccountPages";
import AdminOverview from "../pages/admin/Overview";
import AdminCustomers from "../pages/admin/Customers";
import AdminManageUsers from "../pages/admin/ManageUsers";
import AdminProperties from "../pages/admin/Properties";
import AdminInvestmentPlans from "../pages/admin/InvestmentPlans";
import AdminWalletsPage from "../pages/admin/AdminWallets";
import AdminDeposits from "../pages/admin/Deposits";
import FinancialApprovalCenter from "../pages/admin/FinancialApprovalCenter";
import AdminWithdrawals from "../pages/admin/Withdrawals";
import AdminInvestments from "../pages/admin/Investments";
import { AdminNotificationsPage } from "../pages/admin/AdminPages";
import EmailTemplatesPage from "../pages/admin/EmailTemplatesPage";
import PaymentWalletsPage from "../pages/admin/PaymentWallets";
import {
  AdminDocumentsPage,
  AdminReferralsPage,
  AdminSettingsPage,
  AdminSupportPage,
  AdminTransactionsPage,
} from "../pages/admin/AdminSubPages";

function NotFoundPage() {
  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-24 text-center space-y-5">
        <p className="text-xs font-mono font-bold uppercase tracking-wider text-[#E94D65]">404</p>
        <h1 className="text-3xl sm:text-4xl font-bold font-heading text-[#102030]">
          Page Not Found
        </h1>
        <p className="text-sm text-[#4A5B6C]">
          The requested BitfuryTech route could not be located. Return to the main corporate site or
          open your client dashboard.
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="bg-[#E94D65] hover:bg-[#D43B53] text-white font-heading font-bold text-xs px-5 py-2.5 rounded-none"
          >
            Corporate Home
          </Link>
          <Link
            to="/dashboard"
            className="bg-[#1B4962] hover:bg-[#14374B] text-white font-heading font-bold text-xs px-5 py-2.5 rounded-none"
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
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/investments-catalog" element={<InvestmentPlans />} />
      <Route path="/investments-catalog/:planId" element={<InvestmentPlanDetail />} />
      <Route path="/sectors/:assetClass" element={<AssetClassPage />} />
      <Route path="/plans" element={<InvestmentPlans />} />
      <Route path="/plans/:planId" element={<InvestmentPlanDetail />} />
      <Route path="/properties" element={<PropertiesPage />} />
      <Route path="/how-it-works" element={<HowItWorks />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />

      {/* 2. Authentication Route Group */}
      <Route element={<ProtectedRoute mode="guestOnly" />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Route>

      {/* 3. Customer Route Group */}
      <Route element={<ProtectedRoute mode="customer" />}>
        <Route path="/app" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Overview />} />
        <Route path="/dashboard/opportunities" element={<InvestmentOpportunitiesPage />} />
        <Route path="/dashboard/properties" element={<DashboardPropertiesPage />} />
        <Route path="/invest" element={<Invest />} />
        <Route path="/trading" element={<TradingDesk />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/deposit" element={<Deposit />} />
        <Route path="/withdrawal" element={<Withdraw />} />
        <Route path="/withdraw" element={<Navigate to="/withdrawal" replace />} />
        <Route path="/investments" element={<MyInvestments />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/transactions/:id" element={<TransactionDetailsPage />} />
        <Route path="/referrals" element={<Referrals />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Route>

      {/* 4. Administrator Route Group */}
      <Route element={<ProtectedRoute mode="admin" />}>
        <Route path="/admin" element={<AdminOverview />} />
        <Route path="/admin/customers" element={<AdminCustomers />} />
        <Route path="/admin/manage-users" element={<AdminManageUsers />} />
        <Route path="/admin/wallets" element={<AdminWalletsPage />} />
        <Route path="/admin/users" element={<Navigate to="/admin/manage-users" replace />} />
        <Route path="/admin/properties" element={<AdminProperties />} />
        <Route path="/admin/plans" element={<AdminInvestmentPlans />} />
        <Route path="/admin/investments" element={<AdminInvestments />} />
        <Route path="/admin/deposits" element={<AdminDeposits />} />
        <Route path="/admin/financial-approvals" element={<FinancialApprovalCenter />} />
        <Route path="/admin/payment-wallets" element={<PaymentWalletsPage />} />
        <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
        <Route path="/admin/transactions" element={<AdminTransactionsPage />} />
        <Route path="/admin/referrals" element={<AdminReferralsPage />} />
        <Route path="/admin/documents" element={<AdminDocumentsPage />} />
        <Route path="/admin/support" element={<AdminSupportPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />
        <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
        <Route path="/admin/email-templates" element={<EmailTemplatesPage />} />
      </Route>

      {/* Catch-all 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
