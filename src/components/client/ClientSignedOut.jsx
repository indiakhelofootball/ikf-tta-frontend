// What /client shows to someone with no funder session: their branded login if
// this browser remembers it, otherwise the neutral funder page. Never TTA's
// staff /login -- a funder who signed in through a link that did not resolve
// has no stored slug, and sending them to the staff door was the dead end.
import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

import { storedClientSlug } from '../../auth/loginDoor';

export const SESSION_ENDED_MESSAGE =
  'Your session has ended. Open your organisation’s portal link to sign in again — '
  + 'it is in the invitation email from India Khelo Football.';

export default function ClientSignedOut() {
  const slug = storedClientSlug();
  if (slug) return <Navigate to={`/client/${slug}/login`} replace />;
  return (
    <Box
      component="main"
      sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}
    >
      <Typography color="text.secondary" align="center" sx={{ maxWidth: '42ch' }}>
        {SESSION_ENDED_MESSAGE}
      </Typography>
    </Box>
  );
}
