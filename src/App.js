// src/App.js - WITH ERROR BOUNDARIES
import { Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from 'react-error-boundary';
import { useAuth } from "./auth/AuthContext";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

import Login from "./auth/Login";
import RequireAuth from "./auth/RequireAuth";
import RoleBasedRoute from "./auth/RoleBasedRoute";
import GrantedRoute from "./auth/GrantedRoute";
import { ROLES, REPORT_KEYS } from "./auth/roles";
import Unauthorized from "./components/Unauthorized";

import DashboardLayout from "./components/layout/DashboardLayout";
import CSRSidebar from "./components/layout/CSRSidebar";
import CSRThemeProvider from "./components/csr/CSRThemeProvider";
import DashboardHome from "./components/dashboard/DashboardHome";
import REPManagementPage from "./components/rep/REPManagementPage";
import { TrialManagementPage, TrialWizard, ProjectDashboard } from "./components/trials";
// TrialCitiesPage removed — city management merged into trial creation/edit flows
import { VendorManagementPage } from "./components/vendors";
import { PaymentManagementPage } from "./components/payments";
import { WorkOrderManagementPage } from "./components/workorders";
import { BankManagementPage } from "./components/bank";
import { ProfilePage } from "./components/profile";
import AdminPage from "./components/admin/AdminPage";
import SocialMediaReport from "./components/reports/SocialMediaReport";
import ReportsHub from "./components/reports/ReportsHub";
import PaymentAuditReport from "./components/reports/PaymentAuditReport";
import VendorAuditReport from "./components/reports/VendorAuditReport";
import TrialSpendReport from "./components/reports/TrialSpendReport";
import TrialsReport from "./components/reports/TrialsReport";
import CourierManagementPage from "./components/courier/CourierManagementPage";
import { CSRLogin, CSRDashboard, CSRProjectManagementPage, CSRProjectDetailPage, CSRActivitiesPage, CSRReportsPage, CSRUtilisationPage, CSRActivityTypesPage, CSRClientsPage, CSRBrandingPage } from "./components/csr";
import ClientPortalPage from "./components/client/ClientPortalPage";
import ClientLogin from "./components/client/ClientLogin";
import PermissionsManagementPage from "./components/permissions/PermissionsManagementPage";
import RequestAccessPage from "./components/permissions/RequestAccessPage";

// Import error handling components
import ErrorFallback from "./components/error/ErrorFallback";
import { logError } from "./utils/errorLogger";

function App() {
  const { loading, isAuthenticated, user } = useAuth();

  // Error handler function
  const handleError = (error, errorInfo) => {
    // Log error to console/service
    logError(error, errorInfo);
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'var(--yellow-50)',
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <CircularProgress size={52} sx={{ color: '#FBBF24', mb: 2 }} />
          <Typography variant="body1" sx={{ color: '#B45309', fontWeight: 600 }}>
            Loading...
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={handleError}
      onReset={() => {
        // Reset the app state and navigate to dashboard
        window.location.href = '/dashboard';
      }}
    >
      <Routes>
        {/* ENTRY ROUTE */}
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to={user?.role === ROLES.CSR_CLIENT ? "/client" : "/dashboard"} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* PUBLIC */}
        <Route path="/login" element={<Login />} />
        {/* Three front doors, one auth engine. /csr/login MUST be declared here
            — before the /csr outlet below — or the dynamic /csr/:id route
            captures "login" as a project id. It must also stay OUTSIDE
            RequireAuth, or nobody can reach it to log in. */}
        <Route path="/csr/login" element={<CSRThemeProvider><CSRLogin /></CSRThemeProvider>} />
        <Route path="/client/:slug/login" element={<ClientLogin />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* PROTECTED */}
        <Route element={<RequireAuth />}>
          {/* Dashboard layout routes (with sidebar) */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/trials/create" element={
              <GrantedRoute module="trials" edit>
                <TrialWizard />
              </GrantedRoute>
            } />
            <Route path="/trials" element={
              <GrantedRoute module="trials">
                <TrialManagementPage />
              </GrantedRoute>
            } />
            <Route path="/trials/:id" element={
              <GrantedRoute module="trials">
                <ProjectDashboard />
              </GrantedRoute>
            } />
            <Route path="/rep-management" element={
              <GrantedRoute module="reps">
                <REPManagementPage />
              </GrantedRoute>
            } />
            <Route path="/vendors" element={
              <GrantedRoute module="vendors">
                <VendorManagementPage />
              </GrantedRoute>
            } />
            <Route path="/payments" element={
              <GrantedRoute module="payments">
                <PaymentManagementPage />
              </GrantedRoute>
            } />
            <Route path="/work-orders" element={
              <GrantedRoute module="workorders">
                <WorkOrderManagementPage />
              </GrantedRoute>
            } />
            <Route path="/bank-tds" element={
              <GrantedRoute module="payments">
                <BankManagementPage />
              </GrantedRoute>
            } />
            <Route path="/reports" element={
              <GrantedRoute anyOf={REPORT_KEYS}>
                <ReportsHub />
              </GrantedRoute>
            } />
            <Route path="/reports/payment-audit" element={
              <GrantedRoute module="report_payment_audit">
                <PaymentAuditReport />
              </GrantedRoute>
            } />
            <Route path="/reports/vendor-audit" element={
              <GrantedRoute module="report_vendor_audit">
                <VendorAuditReport />
              </GrantedRoute>
            } />
            <Route path="/reports/trial-spend" element={
              <GrantedRoute module="report_trial_spend">
                <TrialSpendReport />
              </GrantedRoute>
            } />
            <Route path="/reports/social-media" element={
              <GrantedRoute module="report_social_media">
                <SocialMediaReport />
              </GrantedRoute>
            } />
            <Route path="/reports/trials" element={
              <GrantedRoute module="report_trials">
                <TrialsReport />
              </GrantedRoute>
            } />
            <Route path="/courier" element={
              <GrantedRoute module="courier">
                <CourierManagementPage />
              </GrantedRoute>
            } />
            <Route path="/user-management" element={
              <RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN]}>
                <PermissionsManagementPage />
              </RoleBasedRoute>
            } />
            {/* Old bookmark — Access Control merged into User Management */}
            <Route path="/access-control" element={<Navigate to="/user-management" replace />} />
            <Route path="/request-access" element={<RequestAccessPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={
              <RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                <AdminPage />
              </RoleBasedRoute>
            } />
          </Route>

          {/* CSR app — its own shell. CSR_COMPLETE_REFERENCE.md §8 specifies
              /csr/* under CSRSidebar; it was routed inside TTA's outlet until
              2026-08-15, which is why CSR read as two sidebar items instead of
              an app. Paths are unchanged, so bookmarks and e2e specs still hold.
              Static /csr/... routes MUST stay before /csr/:id. */}
          <Route element={<CSRThemeProvider><DashboardLayout sidebar={CSRSidebar} /></CSRThemeProvider>}>
          <Route path="/csr" element={
            <GrantedRoute module="csr">
              <CSRDashboard />
            </GrantedRoute>
          } />
          <Route path="/csr/projects" element={
            <GrantedRoute module="csr">
              <CSRProjectManagementPage />
            </GrantedRoute>
          } />
          {/* Activities and Reports are cross-project destinations, not just
              tabs inside one project. Both agreed documents name them as
              sidebar items: "CSR APP — Dashboard, Projects, Activities,
              Reports, Util. Cert". They were built only as project tabs, so a
              CSR operator could not answer "what is waiting on me" without
              opening every project in turn.

              Static /csr/... routes MUST stay above /csr/:id or the dynamic
              route swallows them. */}
          <Route path="/csr/activities" element={
            <GrantedRoute module="csr">
              <CSRActivitiesPage />
            </GrantedRoute>
          } />
          <Route path="/csr/reports" element={
            <GrantedRoute module="csr">
              <CSRReportsPage />
            </GrantedRoute>
          } />
          {/* Read access follows the same rule as the project tab: the csr
              grant unlocks READING the utilisation total, while tagging and
              issuing still demand csr_certificate. MODULE_DEPENDENCIES mirrors
              this server-side, so the route does not widen anything. */}
          <Route path="/csr/utilisation" element={
            <GrantedRoute module="csr">
              <CSRUtilisationPage />
            </GrantedRoute>
          } />
          {/* D1: the activity-type catalog is admin-managed (TTA Admin), not a
              CSR-owned page. Admins reach it from Admin Settings. */}
          <Route path="/csr/activity-types" element={
            <RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
              <CSRActivityTypesPage />
            </RoleBasedRoute>
          } />
          {/* Funder onboarding — admin-only, not csr-grant gated. Static path
              must precede the dynamic /csr/:id route. */}
          <Route path="/csr/clients" element={
            <RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
              <CSRClientsPage />
            </RoleBasedRoute>
          } />
          <Route path="/csr/branding" element={
            <RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
              <CSRBrandingPage />
            </RoleBasedRoute>
          } />
          <Route path="/csr/:id" element={
            <GrantedRoute module="csr">
              <CSRProjectDetailPage />
            </GrantedRoute>
          } />
          </Route>

          {/* External CSR funder portal — own shell, no TTA sidebar */}
          <Route path="/client" element={
            <RoleBasedRoute allowedRoles={[ROLES.CSR_CLIENT]}>
              <ClientPortalPage />
            </RoleBasedRoute>
          } />
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
