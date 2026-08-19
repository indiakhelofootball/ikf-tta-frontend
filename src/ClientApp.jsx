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
    // The slug IS available, and the old comment here claiming otherwise was
    // simply wrong. ClientLogin.jsx:50 writes `tta_client_slug` on every
    // successful sign-in and loginDoor.js:36 already reads it. Without this
    // branch, a funder who signs out deliberately -- not just one whose session
    // expired -- landed on a screen telling them to open a portal link, with no
    // link on it, and could not get back in without finding an old email.
    //
    // loginDoor.js:37 sends a slug-less funder to '/client', which is this
    // component, so the fallback below is genuinely the last stop. Redirecting
    // to the branded door is a different path, so there is no loop.
    const slug = (() => {
      try {
        return localStorage.getItem('tta_client_slug');
      } catch {
        return null; // storage blocked (private mode / embedded webview)
      }
    })();

    if (slug) return <Navigate to={`/client/${slug}/login`} replace />;

    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Typography color="text.secondary" align="center" sx={{ maxWidth: '42ch' }}>
          Your session has ended. Open your organisation&rsquo;s portal link to sign
          in again &mdash; it is in the invitation email from India Khelo Football.
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
