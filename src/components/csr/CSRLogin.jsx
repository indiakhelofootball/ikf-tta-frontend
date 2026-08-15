// src/components/csr/CSRLogin.jsx
// The CSR office team's own front door. Three login SCREENS, one auth engine:
// /login (TTA staff), /csr/login (this), /client/:slug/login (external funder).
// The plan-of-record constraint — "one login page, one endpoint, one JWT, one
// AuthContext" — is about the AUTH MECHANISM, not the UI. So this calls the very
// same useAuth().login() as src/auth/Login.jsx, hits the same endpoint and stores
// the same token. Only the branding and the post-login destination differ.
//
// No permission check here on purpose: /csr/* is grant-gated by GrantedRoute,
// which renders /unauthorized on its own. Re-checking here would duplicate the
// security boundary and let the two drift apart.

import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Paper, Avatar, Typography, TextField, Button, Alert, Link,
} from '@mui/material';
import { VolunteerActivism as CSRIcon } from '@mui/icons-material';

import { useAuth } from '../../auth/AuthContext';
import { ROLES } from '../../auth/roles';
import { validateLoginForm } from '../../utils/validation';

// login() resolves to { success } only — the context `user` is still stale in
// this closure right after the await. AuthContext writes `tta_user` to
// localStorage synchronously before returning, so that is the authoritative
// read for the redirect fork.
const roleAfterLogin = () => {
  try {
    return JSON.parse(localStorage.getItem('tta_user') || '{}').role || null;
  } catch {
    return null;
  }
};

export default function CSRLogin() {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({ email: '', password: '', general: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    // An external funder who wandered to the staff door belongs in the portal —
    // same guard DashboardLayout applies to the internal shell.
    navigate(user?.role === ROLES.CSR_CLIENT ? '/client' : '/csr', { replace: true });
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({ email: '', password: '', general: '' });

    const validation = validateLoginForm(email, password);
    if (!validation.isValid) {
      setErrors((prev) => ({ ...prev, ...validation.errors }));
      return;
    }

    setSubmitting(true);
    try {
      const result = await login(email.trim(), password);
      if (result?.success) {
        navigate(roleAfterLogin() === ROLES.CSR_CLIENT ? '/client' : '/csr', { replace: true });
      } else {
        setErrors({
          email: '',
          password: '',
          general: result?.message || 'Invalid email or password. Please try again.',
        });
        setSubmitting(false);
      }
    } catch (error) {
      setErrors({
        email: '',
        password: '',
        general: error?.message || 'An unexpected error occurred. Please try again.',
      });
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 400 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Avatar sx={{ bgcolor: 'primary.main', mb: 1 }}>
            <CSRIcon fontSize="small" />
          </Avatar>
          <Typography variant="h6" align="center">CSR</Typography>
          <Typography variant="body2" align="center" color="text.secondary">
            Project Delivery
          </Typography>
        </Box>

        {errors.general && <Alert severity="error" sx={{ mb: 2 }}>{errors.general}</Alert>}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Email"
            type="email"
            value={email}
            fullWidth
            margin="normal"
            autoComplete="username"
            error={Boolean(errors.email)}
            helperText={errors.email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email || errors.general) {
                setErrors((prev) => ({ ...prev, email: '', general: '' }));
              }
            }}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            fullWidth
            margin="normal"
            autoComplete="current-password"
            error={Boolean(errors.password)}
            helperText={errors.password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (errors.password || errors.general) {
                setErrors((prev) => ({ ...prev, password: '', general: '' }));
              }
            }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={submitting}
            sx={{ mt: 2 }}
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </Button>
        </Box>

        <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 3 }}>
          Looking for TTA operations?{' '}
          <Link component={RouterLink} to="/login">Sign in here</Link>
        </Typography>
      </Paper>
    </Box>
  );
}
