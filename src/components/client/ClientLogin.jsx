// src/components/client/ClientLogin.jsx
// The external funder's front door. Three login SCREENS, one auth engine:
// /login (TTA staff), /csr/login (CSR office), /client/:slug/login (this).
// Nothing below changes what login() does, what it validates, or where it
// lands — only the surface around it.
//
// ---------------------------------------------------------------------------
// WHY THIS FILE HAS NO PALETTE
// ---------------------------------------------------------------------------
// The other two doors state a brand. This one CANNOT: it is white-labelled, and
// the accent belongs to whichever funder owns the slug. A hardcoded accent here
// is a bug, not a style choice — it would paint one funder's colour on every
// other funder's login.
//
// So every coloured surface on this page comes from the branding record via
// clientThemeFrom(), and the neutrals below are genuinely neutral: ink, paper,
// hairline, graphite. The graphite is the DELIBERATE unbranded fallback — a
// funder with no primaryColor set gets a quiet slate door, never TTA's amber,
// which is what a naive `theme.palette.primary` fallback would have produced.
//
// The fill/on-fill pair is read back off the theme rather than recomputed here.
// clientTheme.js measures contrast for both roles (legibleFill for a fill that
// carries text, legibleOnLight for the colour used AS text) and its
// containedPrimary override is the one place both halves of that pair already
// sit together. Recomputing it locally would be a second implementation of the
// same WCAG maths, free to drift from the first.
//
// NO OTP HERE, deliberately. otp/views.py:159 refuses an external client
// outright, so an OTP button on the funder's door would advertise a route that
// always returns 403. The staff and CSR doors offer it; this one must not.

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import {
  Box, Avatar, Typography, TextField, Button, Alert, CircularProgress, CssBaseline,
  InputAdornment, IconButton,
} from '@mui/material';
import {
  MailOutline as MailIcon,
  LockOutlined as LockIcon,
  VisibilityOutlined as ShowIcon,
  VisibilityOffOutlined as HideIcon,
} from '@mui/icons-material';

import { clientAPI } from '../../services/api';
import { useAuth } from '../../auth/AuthContext';
import clientThemeFrom from './clientTheme';

// Neutrals only. Nothing here carries a brand.
const INK = '#111827';
const MUTED = '#5F6672';
const LINE = '#E5E7EB';
const PAPER = '#FFFFFF';
const CANVAS = '#FAFAFB';
// The unbranded ground: graphite, and white on it measures 14.68:1.
const GRAPHITE = '#243040';
const ON_GRAPHITE = '#FFFFFF';

const HEX = /^#?[0-9a-fA-F]{6}$/;

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
  const [showPassword, setShowPassword] = useState(false);
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

  // A malformed hex is treated as absent, exactly as clientTheme.js treats it —
  // otherwise this file would paint a brand the theme itself refused.
  const branded = HEX.test(String(brand?.primaryColor || '').trim());
  const contained = theme.components?.MuiButton?.styleOverrides?.containedPrimary;
  // The AA-checked pair, or graphite when the funder set no colour.
  const heroFill = (branded && contained?.backgroundColor) || GRAPHITE;
  const onHero = (branded && contained?.color) || ON_GRAPHITE;
  // primary.main is clientTheme's on-light-legible variant — the only brand
  // value safe to use as text or as a focus ring on a white field.
  const accent = branded ? theme.palette.primary.main : INK;

  if (brandLoading) {
    // Inside the ThemeProvider, not outside it. Rendered bare, this spinner fell
    // through to the global TTA theme and painted amber (#FBBF24) — measured in
    // the browser — which is the first thing a funder sees on their own branded
    // login. The brand has not loaded yet, so it is neutral rather than TTA's.
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{
          minHeight: '100vh', bgcolor: CANVAS,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CircularProgress sx={{ color: 'text.disabled' }} />
        </Box>
      </ThemeProvider>
    );
  }

  // Chrome's autofill paints its own blue over any theme. On a funder's branded
  // page that blue is the loudest colour on screen and belongs to neither brand.
  // The inset shadow repaints the field; the long transition delay outlasts the
  // browser's own repaint.
  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: PAPER,
      borderRadius: '10px',
      '& fieldset': { borderColor: LINE },
      '&:hover fieldset': { borderColor: '#CBD2DA' },
      '&.Mui-focused fieldset': { borderColor: accent, borderWidth: '1px' },
      '&.Mui-focused': { boxShadow: `0 0 0 3px ${accent}1F` },
    },
    '& input:-webkit-autofill': {
      WebkitBoxShadow: `0 0 0 1000px ${PAPER} inset`,
      WebkitTextFillColor: INK,
      transition: 'background-color 9999s ease-out',
    },
    '& .MuiInputBase-input': { color: INK, fontSize: '0.9375rem', py: 1.75 },
    '& .MuiInputBase-input::placeholder': { color: MUTED, opacity: 1 },
  };

  // variant="contained" so the fill and its text colour come from the theme's
  // own measured pair rather than from anything written here.
  const ctaSx = {
    py: 1.6,
    borderRadius: '10px',
    fontSize: '0.9375rem',
    fontWeight: 600,
    textTransform: 'none',
    boxShadow: 'none',
    transition: 'background-color 140ms cubic-bezier(0, 0, 0.2, 1)',
    '&:hover': { boxShadow: 'none' },
    ...(branded ? {} : {
      bgcolor: GRAPHITE,
      color: ON_GRAPHITE,
      '&:hover': { bgcolor: '#16202C', boxShadow: 'none' },
    }),
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: CANVAS }}>

        {/* ── HERO ────────────────────────────────────────────────
            The funder's own surface. Where they supplied a login image it runs
            full-bleed and the wordmark sits on a dark scrim — a scrim rather
            than a brand tint because no contrast promise can be made about an
            image nobody has seen. Where they did not, the ground is their brand
            colour with the on-fill colour the theme already measured for it. */}
        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            width: '46%',
            position: 'relative',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            overflow: 'hidden',
            bgcolor: heroFill,
            ...(brand?.loginImageUrl
              ? {
                backgroundImage: `url(${brand.loginImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
              : {}),
            p: 7,
          }}
        >
          {brand?.loginImageUrl ? (
            <Box sx={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, rgba(12,16,22,0.82) 0%, rgba(12,16,22,0.36) 40%, rgba(12,16,22,0) 70%)',
            }} />
          ) : (
            // A quiet concentric field, drawn in the on-fill colour so it is
            // legible against any brand ground without a second colour choice.
            <Box
              component="svg"
              viewBox="0 0 600 800"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden
              sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.13 }}
            >
              <g fill="none" stroke={onHero} strokeWidth="1.5">
                {[80, 160, 240, 320, 400, 480].map((r) => (
                  <circle key={r} cx="520" cy="150" r={r} />
                ))}
              </g>
              <g fill={onHero} opacity="0.5">
                {Array.from({ length: 49 }, (_, i) => (
                  <circle
                    key={i}
                    cx={40 + (i % 7) * 34}
                    cy={520 + Math.floor(i / 7) * 34}
                    r="2.5"
                  />
                ))}
              </g>
            </Box>
          )}

          <Box sx={{ position: 'relative', maxWidth: 460 }}>
            <Typography
              component="p"
              sx={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: brand?.loginImageUrl ? '#FFFFFF' : onHero,
                opacity: 0.78,
                mb: 1.5,
              }}
            >
              CSR Portal
            </Typography>
            <Typography
              component="p"
              sx={{
                fontSize: '2rem',
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                color: brand?.loginImageUrl ? '#FFFFFF' : onHero,
              }}
            >
              {title}
            </Typography>
            <Box sx={{
              mt: 3, width: 56, height: 3, borderRadius: '2px',
              bgcolor: brand?.loginImageUrl ? '#FFFFFF' : onHero, opacity: 0.55,
            }} />
          </Box>
        </Box>

        {/* ── FORM ────────────────────────────────────────────────
            The logo lives on this side, on white. A funder's logo is drawn for
            a white letterhead; over a coloured hero or a photograph a dark mark
            can disappear entirely, and there is no way to know in advance. */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            py: 6,
            px: { xs: 3, sm: 6 },
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 420 }}>
            {brand?.logoUrl ? (
              <Box
                component="img"
                src={brand.logoUrl}
                alt={title}
                sx={{ maxHeight: 52, maxWidth: 220, display: 'block', mb: 4 }}
              />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                <Avatar sx={{ bgcolor: heroFill, color: onHero, width: 40, height: 40, fontWeight: 700 }}>
                  {title.charAt(0)}
                </Avatar>
                <Typography sx={{ fontWeight: 700, color: INK, fontSize: '1rem' }}>{title}</Typography>
              </Box>
            )}

            <Typography
              component="h1"
              sx={{
                fontSize: { xs: '2rem', md: '2.5rem' },
                fontWeight: 700,
                letterSpacing: '-0.025em',
                lineHeight: 1.05,
                color: INK,
                mb: 1.5,
              }}
            >
              Sign in
            </Typography>
            <Typography sx={{ color: MUTED, fontSize: '0.9375rem', lineHeight: 1.6, maxWidth: '38ch', mb: 4 }}>
              View your CSR project activity and published reports.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>{error}</Alert>}

            <Box component="form" onSubmit={submit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                fullWidth
                sx={fieldSx}
                slotProps={{
                  htmlInput: { 'aria-label': 'Email address' },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <MailIcon sx={{ fontSize: 20, color: MUTED }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                fullWidth
                sx={fieldSx}
                slotProps={{
                  htmlInput: { 'aria-label': 'Password' },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ fontSize: 20, color: MUTED }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          sx={{ color: MUTED }}
                        >
                          {showPassword ? <HideIcon sx={{ fontSize: 20 }} /> : <ShowIcon sx={{ fontSize: 20 }} />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Button
                type="submit" variant="contained" fullWidth size="large"
                disabled={submitting} sx={ctaSx}
              >
                {submitting ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <CircularProgress size={18} sx={{ color: 'inherit' }} />
                    <span>Signing in…</span>
                  </Box>
                ) : 'Sign In'}
              </Button>
            </Box>

            {/* There is no self-serve reset route in this app —
                ClientChangePasswordDialog covers a signed-IN user only — so this
                says who to ask rather than linking to a page that does not exist. */}
            <Box sx={{
              mt: 5, pt: 3, borderTop: `1px solid ${LINE}`,
              fontSize: '0.8125rem', color: MUTED,
            }}>
              Forgotten your password? Ask your programme contact to reset it.
            </Box>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
