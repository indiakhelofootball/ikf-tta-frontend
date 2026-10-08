// G3 — the external funder app, isolated.
//
// This tree imports ONLY the client portal, auth, and theme — never App.js or
// any internal TTA/CSR page. When the bundler builds from `client-index.js`,
// nothing internal is reachable, so none of the staff app's JavaScript is
// shipped to an external funder. That is the whole point of the separate build:
// route-gating hides data, this hides the code.
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { ROLES } from './auth/roles';
import ClientLogin from './components/client/ClientLogin';
import ClientPortalPage from './components/client/ClientPortalPage';
import ClientSignedOut from './components/client/ClientSignedOut';

function RequireClient({ children }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return null;

  if (!isAuthenticated || user?.role !== ROLES.CSR_CLIENT) {
    // The branded door when this browser remembers it, else the neutral page.
    // loginDoor.js sends a slug-less funder to '/client', which is this
    // component, so the fallback is genuinely the last stop; redirecting to the
    // branded door is a different path, so there is no loop.
    return <ClientSignedOut />;
  }
  return children;
}

export default function ClientApp() {
  return (
    <Routes>
      <Route path="/client/:slug/login" element={<ClientLogin />} />
      <Route path="/client" element={<RequireClient><ClientPortalPage /></RequireClient>} />
      <Route path="*" element={<Navigate to="/client" replace />} />
    </Routes>
  );
}
