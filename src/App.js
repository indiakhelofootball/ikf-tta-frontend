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
import { ROLES } from "./auth/roles";
import Unauthorized from "./components/Unauthorized";

import DashboardLayout from "./components/layout/DashboardLayout";
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
import CourierManagementPage from "./components/courier/CourierManagementPage";

// Import error handling components
import ErrorFallback from "./components/error/ErrorFallback";
import { logError } from "./utils/errorLogger";

function App() {
  const { loading, isAuthenticated } = useAuth();

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
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* PUBLIC */}
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* PROTECTED */}
        <Route element={<RequireAuth />}>
          {/* Dashboard layout routes (with sidebar) */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardHome />} />
            <Route path="/trials/create" element={
              <RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                <TrialWizard />
              </RoleBasedRoute>
            } />
            <Route path="/trials" element={
              <RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                <TrialManagementPage />
              </RoleBasedRoute>
            } />
            <Route path="/trials/:id" element={
              <RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                <ProjectDashboard />
              </RoleBasedRoute>
            } />
            <Route path="/rep-management" element={
              <RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                <REPManagementPage />
              </RoleBasedRoute>
            } />
            <Route path="/vendors" element={
              <RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                <VendorManagementPage />
              </RoleBasedRoute>
            } />
            <Route path="/payments" element={
              <RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                <PaymentManagementPage />
              </RoleBasedRoute>
            } />
            <Route path="/work-orders" element={
              <RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                <WorkOrderManagementPage />
              </RoleBasedRoute>
            } />
            <Route path="/bank-tds" element={
              <RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                <BankManagementPage />
              </RoleBasedRoute>
            } />
            <Route path="/reports/social-media" element={
              <RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                <SocialMediaReport />
              </RoleBasedRoute>
            } />
            <Route path="/courier" element={
              <RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                <CourierManagementPage />
              </RoleBasedRoute>
            } />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/admin" element={
              <RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                <AdminPage />
              </RoleBasedRoute>
            } />
          </Route>
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
