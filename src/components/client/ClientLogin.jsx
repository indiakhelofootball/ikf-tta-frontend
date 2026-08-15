import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import {
  Box, Paper, Avatar, Typography, TextField, Button, Alert, CircularProgress, CssBaseline,
} from '@mui/material';

import { clientAPI } from '../../services/api';
import { useAuth } from '../../auth/AuthContext';
import clientThemeFrom from './clientTheme';

// C3 — per-client branded login. Fetches PUBLIC branding by slug (pre-auth) so
// the screen is already in the funder's brand, then reuses the same auth engine.
export default function ClientLogin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [brand, setBrand] = useState(null);
  const [brandLoading, setBrandLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/client', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    let active = true;
    clientAPI.brandingBySlug(slug)
      .then((b) => { if (active) setBrand(b); })
      .catch(() => { if (active) setBrand(null); })
      .finally(() => { if (active) setBrandLoading(false); });
    return () => { active = false; };
  }, [slug]);

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Enter your email and password.'); return; }
    setSubmitting(true);
    setError('');
    const result = await login(email.trim(), password);
    setSubmitting(false);
    if (result?.success) {
      // Remember the branded slug so a later session-expiry can bounce the funder
      // back to THIS login screen (see api.js refresh-failure handling), not the
      // generic portal entry.
      if (slug) localStorage.setItem('tta_client_slug', slug);
      navigate('/client', { replace: true });
    } else setError(result?.message || 'Login failed.');
  };

  const theme = clientThemeFrom(brand);
  const title = brand?.displayName || 'CSR Portal';

  if (brandLoading) {
    // Inside the ThemeProvider, not outside it. Rendered bare, this spinner fell
    // through to the global TTA theme and painted amber (#FBBF24) — measured in
    // the browser — which is the first thing a funder sees on their own branded
    // login. The brand has not loaded yet, so it is neutral rather than TTA's.
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress sx={{ color: 'text.disabled' }} />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
          ...(brand?.loginImageUrl
            ? { backgroundImage: `url(${brand.loginImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
            : { bgcolor: 'background.default' }),
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            {brand?.logoUrl ? (
              <Box component="img" src={brand.logoUrl} alt={title} sx={{ maxHeight: 64, mb: 1 }} />
            ) : (
              <Avatar sx={{ bgcolor: 'primary.main', mb: 1 }}>{title.charAt(0)}</Avatar>
            )}
            <Typography variant="h6" align="center">{title}</Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={submit}>
            <TextField
              label="Email" type="email" value={email} fullWidth margin="normal"
              onChange={(e) => setEmail(e.target.value)} autoComplete="username"
            />
            <TextField
              label="Password" type="password" value={password} fullWidth margin="normal"
              onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
            />
            <Button
              type="submit" variant="contained" fullWidth size="large"
              disabled={submitting} sx={{ mt: 2 }}
            >
              {submitting ? 'Signing in…' : 'Sign In'}
            </Button>
          </Box>
        </Paper>
      </Box>
    </ThemeProvider>
  );
}
