import { CssBaseline, ThemeProvider } from "@mui/material";
import { Navigate, Route, Routes } from "react-router-dom";
import { AdminProtectedLayout } from "./components/auth/AdminProtectedLayout";
import { EmployeeProtectedLayout } from "./components/auth/EmployeeProtectedLayout";
import { AdminLayout } from "./components/layout/AdminLayout";
import { EmployeeLayout } from "./components/layout/EmployeeLayout";
import { AuthProvider } from "./context/AuthContext";
import { AdminAlertsPage } from "./pages/admin/AdminAlertsPage";
import { AdminAnalyticsPage } from "./pages/admin/AdminAnalyticsPage";
import { AdminBillingPage } from "./pages/admin/AdminBillingPage";
import { AdminEmployeesPage } from "./pages/admin/AdminEmployeesPage";
import { AdminExportsPage } from "./pages/admin/AdminExportsPage";
import { AdminFraudPage } from "./pages/admin/AdminFraudPage";
import { AdminPoliciesPage } from "./pages/admin/AdminPoliciesPage";
import { AdminConsolePage } from "./pages/admin/AdminConsolePage";
import { AdminDashboardPage, AdminReceiptsPage } from "./pages/admin/AdminReceiptsPage";
import { AdminTransactionDetailPage } from "./pages/admin/AdminTransactionDetailPage";
import { AdminTransactionsPage } from "./pages/admin/AdminTransactionsPage";
import { EmployeeRegisterPage } from "./pages/auth/EmployeeRegisterPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { SignUpPage } from "./pages/auth/SignUpPage";
import { EmployeeActivityPage } from "./pages/employee/EmployeeActivityPage";
import { EmployeeHomePage } from "./pages/employee/EmployeeHomePage";
import { EmployeePaymentProofPage } from "./pages/employee/EmployeePaymentProofPage";
import { EmployeeProfilePage } from "./pages/employee/EmployeeProfilePage";
import { EmployeeReceiptsPage } from "./pages/employee/EmployeeReceiptsPage";
import { EmployeeSpendPage } from "./pages/employee/EmployeeSpendPage";
import { EmployeeTransactionDetailPage } from "./pages/employee/EmployeeTransactionDetailPage";
import { EmployeeTransactionsPage } from "./pages/employee/EmployeeTransactionsPage";
import { HomePage } from "./pages/HomePage";
import { ApiSmokePage } from "./pages/dev/ApiSmokePage";
import { appTheme } from "./theme";

function App() {
  return (
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/employee/register" element={<EmployeeRegisterPage />} />
          {import.meta.env.DEV ? <Route path="/dev/api-smoke" element={<ApiSmokePage />} /> : null}

          <Route path="/admin" element={<AdminProtectedLayout />}>
            <Route element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="receipts" element={<AdminReceiptsPage />} />
              <Route path="transactions" element={<AdminTransactionsPage />} />
              <Route path="policies" element={<AdminPoliciesPage />} />
              <Route path="fraud" element={<AdminFraudPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="exports" element={<AdminExportsPage />} />
              <Route path="employees" element={<AdminEmployeesPage />} />
              <Route path="roles" element={<Navigate to="/admin/console" replace />} />
              <Route path="alerts" element={<AdminAlertsPage />} />
              <Route path="billing" element={<AdminBillingPage />} />
              <Route path="transaction/:id" element={<AdminTransactionDetailPage />} />
              <Route path="console" element={<AdminConsolePage />} />
            </Route>
          </Route>

          <Route path="/employee" element={<EmployeeProtectedLayout />}>
            <Route element={<EmployeeLayout />}>
              <Route index element={<EmployeeHomePage />} />
              <Route path="receipts" element={<EmployeeReceiptsPage />} />
              <Route path="transactions" element={<EmployeeTransactionsPage />} />
              <Route path="transaction/:id" element={<EmployeeTransactionDetailPage />} />
              <Route path="payment-proof" element={<EmployeePaymentProofPage />} />
              <Route path="spend" element={<EmployeeSpendPage />} />
              <Route path="activity" element={<EmployeeActivityPage />} />
              <Route path="profile" element={<EmployeeProfilePage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
