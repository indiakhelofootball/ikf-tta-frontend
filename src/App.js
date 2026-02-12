// src/App.js - WITH ERROR BOUNDARIES
import { Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from 'react-error-boundary';
import { useAuth } from "./auth/AuthContext";

import Login from "./auth/Login";
import RequireAuth from "./auth/RequireAuth";
import RoleBasedRoute from "./auth/RoleBasedRoute";
import { ROLES } from "./auth/roles";
import Unauthorized from "./components/Unauthorized";

import DashboardLayout from "./components/layout/DashboardLayout";
import DashboardHome from "./components/dashboard/DashboardHome";
import REPManagementPage from "./components/rep/REPManagementPage";
import { TrialManagementPage, TrialWizard } from "./components/trials";
import { ProfilePage } from "./components/profile";

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
      <div className="min-h-screen flex items-center justify-center bg-yellow-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-yellow-800 font-semibold">Loading...</p>
        </div>
      </div>
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
            <Route path="/rep-management" element={
              <RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
                <REPManagementPage />
              </RoleBasedRoute>
            } />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
