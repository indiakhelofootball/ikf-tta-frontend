// G3 — the external funder app, isolated.
//
// This tree imports ONLY the client portal, auth, and theme — never App.js or
// any internal TTA/CSR page. When the bundler builds from `client-index.js`,
// nothing internal is reachable, so none of the staff app's JavaScript is
// shipped to an external funder. That is the whole point of the separate build:
// route-gating hides data, this hides the code.
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

import { useAuth } from './auth/AuthContext';
import { ROLES } from './auth/roles';
import ClientLogin from './components/client/ClientLogin';
import ClientPortalPage from './components/client/ClientPortalPage';

function RequireClient({ children }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated || user?.role !== ROLES.CSR_CLIENT) {
    // No slug here to pick a branded login, so guide them to their portal link
    // rather than bounce to a non-existent internal login.
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Typography color="text.secondary" align="center">
          Please open your organisation&rsquo;s portal link to sign in.
        </Typography>
      </Box>
    );
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
