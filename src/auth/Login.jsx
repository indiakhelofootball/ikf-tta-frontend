// src/auth/Login.jsx
// The TTA operations front door. Three login SCREENS, one auth engine:
// /login (this), /csr/login (CSR office), /client/:slug/login (external funder).
// The plan-of-record constraint — "one login page, one endpoint, one JWT, one
// AuthContext" — is about the AUTH MECHANISM, not the UI. Nothing below changes
// what login()/otpLogin() do, what they validate, or where they land; only the
// surface around them.
//
// ---------------------------------------------------------------------------
// WHY THIS SCREEN IS AMBER
// ---------------------------------------------------------------------------
// A login is the one screen whose job is to say WHOSE product this is. TTA's
// identity is amber, so this door is amber — the CSR door is navy and orange
// because it carries IKF's own identity, and the funder door is whatever the
// funder's is. Three doors, three brands, one shape. Siblings, not clones: the
// illustrated panel sits LEFT here and RIGHT on the CSR door, which is the
// arrangement each screen already had.
//
// AMBER_TEXT (#A35905) is the only amber allowed to carry words. Raw #FBBF24
// measures 1.60:1 on a light ground and #D97706 measures 3.05:1 — both below
// AA — which is exactly why muiTheme.js defines AMBER_TEXT at all. The light
// ramp (#FEF3C7 / #FDE68A / #FBBF24) appears here only as FILL, never as text.
// The values are restated locally rather than imported because a login has no
// data in it: the theme's tokens carry app meanings with no referent here.
//
// The illustration is drawn, not photographed. There is no image asset in the
// repo and a stock photo would say less than nothing. Inline SVG costs no
// request, scales to any width, and can be swapped for a real illustration
// later without touching the layout. Deliberately no human figures — hand-drawn
// anatomy at this size reads as a mistake rather than a style.

import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { validateLoginForm } from '../utils/validation';
import api from '../services/api';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Alert from '@mui/material/Alert';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import MailIcon from '@mui/icons-material/MailOutline';
import LockIcon from '@mui/icons-material/LockOutlined';
import PhoneIcon from '@mui/icons-material/PhoneIphone';
import KeyIcon from '@mui/icons-material/PasswordOutlined';
import VisibilityIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffOutlined';

// TTA's amber, split by role. Text roles take AMBER_TEXT; fills take the ramp.
const AMBER_TEXT = '#A35905';
const AMBER_DEEP = '#7E3A06';
const AMBER_FILL = '#FBBF24';
const AMBER_LIGHT = '#FDE68A';
const AMBER_PALE = '#FEF3C7';
const ON_AMBER = '#5C2C06';
const INK = '#111827';
const MUTED = '#5F6672';
const LINE = '#E5E7EB';
const BONE = '#FDFBF6';

// The IKF mark. Drawn rather than imported: there is no logo asset in the repo,
// and a wordmark set in type is honest where a fake image would not be. Painted
// in the on-amber brown because it sits on the amber panel, not on paper.
function IkfMark() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
      <Box component="svg" viewBox="0 0 132 64" sx={{ width: 104, height: 50, flex: 'none' }} aria-hidden>
        <rect x="2" y="4" width="9" height="56" fill={ON_AMBER} />
        <path d="M26 4h9v22l18-22h11L44 30l20 30H52L35 34v26h-9z" fill={ON_AMBER} />
        <circle cx="35" cy="46" r="9" fill="#FFFDF7" stroke={ON_AMBER} strokeWidth="2.5" />
        <path d="M35 40.5l4 2.9-1.5 4.7h-5L31 43.4z" fill={ON_AMBER} />
        <path d="M78 4h30v9H87v14h19v9H87v24h-9z" fill="#FFFDF7" />
      </Box>
      <Box sx={{ width: '1px', alignSelf: 'stretch', bgcolor: 'rgba(92,44,6,0.28)', my: 0.5 }} />
      <Box sx={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.11em',
        lineHeight: 1.55, color: ON_AMBER, textTransform: 'uppercase',
      }}>
        India<br />Khelo<br />Football
      </Box>
    </Box>
  );
}

// The pitch, seen from the touchline. Flat shapes only, drawn wide because it
// is the panel's ground rather than a spot illustration.
function PitchScene() {
  return (
    <Box
      component="svg"
      viewBox="0 0 640 420"
      sx={{ width: '100%', height: 'auto', display: 'block' }}
      aria-hidden
    >
      <defs>
        <linearGradient id="tta-turf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF3D0" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#FFFDF7" stopOpacity="0.62" />
        </linearGradient>
        <radialGradient id="tta-ball" cx="0.34" cy="0.28" r="0.85">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#FFF8EA" />
          <stop offset="100%" stopColor="#E7D3AC" />
        </radialGradient>
      </defs>

      {/* the pitch itself */}
      <path d="M92 108h456l72 268H20z" fill="url(#tta-turf)" />
      <g stroke="#FFFDF7" strokeWidth="3" fill="none" opacity="0.85">
        <path d="M92 108h456l72 268H20z" />
        <path d="M56 242h528" />
        <ellipse cx="320" cy="242" rx="74" ry="34" />
        <path d="M196 108h248l14 52H182z" />
        <path d="M150 376h340l-18-62H168z" />
      </g>
      <circle cx="320" cy="242" r="5" fill="#FFFDF7" opacity="0.85" />

      {/* the goal at the far end */}
      <g stroke="#FFFDF7" strokeWidth="4" fill="none" opacity="0.9">
        <path d="M258 108V72h124v36" />
        <path d="M258 72h124" />
      </g>
      <path d="M258 72h124v36H258z" fill="#FFFDF7" opacity="0.14" />
      <g stroke="#FFFDF7" strokeWidth="1" opacity="0.35">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={`n-${i}`} x1={258 + i * 17.7} y1="72" x2={258 + i * 17.7} y2="108" />
        ))}
        {[0, 1, 2].map((i) => (
          <line key={`m-${i}`} x1="258" y1={82 + i * 12} x2="382" y2={82 + i * 12} />
        ))}
      </g>

      {/* The ball on the spot. A football is panelled with a pentagon nearest
          the viewer and hexagons around it; getting that wrong is what makes a
          drawn ball read as a placeholder. */}
      <g transform="translate(392 296)">
        <ellipse cx="30" cy="58" rx="28" ry="7" fill={ON_AMBER} opacity="0.18" />
        <circle cx="30" cy="30" r="29" fill="url(#tta-ball)" stroke="#E7D3AC" strokeWidth="1" />
        <path d="M30 12l12.3 9-4.7 14.5H22.4L17.7 21z" fill="#3B2408" />
        <g stroke="#3B2408" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M30 12V1.5" />
          <path d="M42.3 21l10-3.2" />
          <path d="M37.6 35.5l6.2 8.5" />
          <path d="M22.4 35.5l-6.2 8.5" />
          <path d="M17.7 21L7.7 17.8" />
        </g>
        <path d="M30 1.5l8.8 2.8-1.3 4-7.5 1.8-7.5-1.8L21.2 4.3z" fill="#3B2408" opacity="0.9" />
        <path d="M52.3 17.8l3.5 8.4-3.3 2.8-7-3.1-2-4.9z" fill="#3B2408" opacity="0.9" />
        <path d="M43.8 44l-2.3 8.7-4.4-1-3.2-7 2.3-4z" fill="#3B2408" opacity="0.9" />
        <path d="M16.2 44l2.3 8.7 4.4-1 3.2-7-2.3-4z" fill="#3B2408" opacity="0.9" />
        <path d="M7.7 17.8l-3.5 8.4 3.3 2.8 7-3.1 2-4.9z" fill="#3B2408" opacity="0.9" />
        <ellipse cx="19" cy="16" rx="10" ry="7" fill="#FFFFFF" opacity="0.5" transform="rotate(-28 19 16)" />
      </g>
    </Box>
  );
}

export default function Login() {
  // Password login state
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '', general: '' });

  // OTP state
  const [loginMode, setLoginMode] = useState('password'); // 'password' | 'otp-phone' | 'otp-verify'
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const { login, otpLogin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  // ── Password login ──────────────────────────────────────────────
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (errors.email) setErrors((prev) => ({ ...prev, email: '', general: '' }));
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    if (errors.password) setErrors((prev) => ({ ...prev, password: '', general: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({ email: '', password: '', general: '' });

    const validation = validateLoginForm(email, password);
    if (!validation.isValid) {
      setErrors((prev) => ({ ...prev, ...validation.errors }));
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const result = await login(email.trim(), password, rememberMe);
      if (result.success) {
        navigate('/');
      } else {
        setErrors({ email: '', password: '', general: result.message || 'Invalid email or password. Please try again.' });
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrors({ email: '', password: '', general: error.message || 'An unexpected error occurred. Please try again.' });
      setIsLoading(false);
    }
  };

  // ── OTP: Send ───────────────────────────────────────────────────
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setOtpError('');

    if (!phone || !/^\d{10}$/.test(phone)) {
      setOtpError('Enter a valid 10-digit mobile number.');
      return;
    }

    setOtpLoading(true);
    try {
      await api.requestOTP(phone);
      setLoginMode('otp-verify');
      setCountdown(60);
    } catch (err) {
      setOtpError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  // ── OTP: Resend ─────────────────────────────────────────────────
  const handleResendOTP = async () => {
    if (countdown > 0) return;
    setOtpError('');
    setOtpCode('');
    setOtpLoading(true);
    try {
      await api.requestOTP(phone);
      setCountdown(60);
    } catch (err) {
      setOtpError(err.message || 'Failed to resend OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  // ── OTP: Verify ─────────────────────────────────────────────────
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setOtpError('');

    if (!otpCode || !/^\d{6}$/.test(otpCode)) {
      setOtpError('Enter the 6-digit OTP sent to your phone.');
      return;
    }

    setOtpLoading(true);
    try {
      const result = await otpLogin(phone, otpCode);
      if (result.success) {
        navigate('/');
      } else {
        setOtpError(result.message || 'Verification failed.');
      }
    } catch (err) {
      setOtpError(err.message || 'Verification failed.');
    } finally {
      setOtpLoading(false);
    }
  };

  const switchToOTP = () => {
    setOtpError('');
    setPhone('');
    setOtpCode('');
    setCountdown(0);
    setLoginMode('otp-phone');
  };

  const switchToPassword = () => {
    setOtpError('');
    setLoginMode('password');
  };

  const maskedPhone = phone ? `****${phone.slice(-4)}` : '';

  const features = [
    'Manage REPs across India',
    'Track Work Orders & Vendors',
    'Trial City Management',
    'Payment & Invoice Tracking',
  ];

  // Chrome's autofill paints its own blue over any theme, which on a branded
  // page is the loudest colour on screen and belongs to no brand. The inset
  // shadow repaints the field; the long transition delay outlasts the browser's
  // own repaint.
  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: '#FFFFFF',
      borderRadius: '10px',
      '& fieldset': { borderColor: LINE },
      '&:hover fieldset': { borderColor: '#D8C6A8' },
      '&.Mui-focused fieldset': { borderColor: AMBER_TEXT, borderWidth: '1px' },
      '&.Mui-focused': { boxShadow: `0 0 0 3px ${AMBER_TEXT}1F` },
    },
    '& input:-webkit-autofill': {
      WebkitBoxShadow: '0 0 0 1000px #FFFFFF inset',
      WebkitTextFillColor: INK,
      transition: 'background-color 9999s ease-out',
    },
    '& .MuiInputBase-input': { color: INK, fontSize: '0.9375rem', py: 1.75 },
    '& .MuiInputBase-input::placeholder': { color: MUTED, opacity: 1 },
  };

  // Solid and brand-coloured, not the app's light-amber chip button. AMBER_TEXT
  // under white ink measures 5.27:1; the light ramp under white would not.
  const ctaSx = {
    py: 1.6,
    borderRadius: '10px',
    bgcolor: AMBER_TEXT,
    color: '#FFFFFF',
    fontSize: '0.9375rem',
    fontWeight: 600,
    textTransform: 'none',
    boxShadow: 'none',
    transition: 'background-color 140ms cubic-bezier(0, 0, 0.2, 1)',
    '&:hover': { bgcolor: AMBER_DEEP, boxShadow: 'none' },
    '&.Mui-disabled': { bgcolor: '#C0A177', color: '#FFFFFF' },
  };

  const quietLinkSx = {
    background: 'none',
    border: 'none',
    color: MUTED,
    fontSize: '0.8125rem',
    cursor: 'pointer',
    textDecoration: 'underline',
    p: 0,
    '&:hover': { color: INK },
  };

  const accentLinkSx = {
    background: 'none',
    border: 'none',
    color: AMBER_TEXT,
    fontWeight: 600,
    fontSize: '0.8125rem',
    cursor: 'pointer',
    textDecoration: 'underline',
    p: 0,
    '&:hover': { color: AMBER_DEEP },
    '&:disabled': { color: MUTED, cursor: 'default' },
  };

  const heading = (text, sub) => (
    <>
      <Typography
        component="h1"
        sx={{
          fontSize: { xs: '2.125rem', md: '2.75rem' },
          fontWeight: 700,
          letterSpacing: '-0.025em',
          lineHeight: 1.05,
          color: INK,
          mb: 1.5,
        }}
      >
        {text}
      </Typography>
      <Typography sx={{ color: MUTED, fontSize: '0.9375rem', lineHeight: 1.6, maxWidth: '36ch', mb: 4 }}>
        {sub}
      </Typography>
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: BONE }}>

      {/* ── LEFT PANEL — the brand moment ─────────────────────── */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          width: '48%',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          background: `linear-gradient(158deg, ${AMBER_LIGHT} 0%, ${AMBER_FILL} 52%, #E9962B 100%)`,
          px: 8,
          py: 8,
        }}
      >
        {/* Dot pattern overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.10,
            backgroundImage: 'radial-gradient(circle at 20px 20px, #FFFDF7 2px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 560 }}>
          <IkfMark />

          <Typography
            component="p"
            sx={{
              mt: 5,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: ON_AMBER,
              opacity: 0.8,
            }}
          >
            Trial Tracking Application
          </Typography>

          <Typography
            component="p"
            sx={{
              mt: 1,
              fontSize: '1.75rem',
              fontWeight: 700,
              lineHeight: 1.22,
              letterSpacing: '-0.02em',
              color: ON_AMBER,
              maxWidth: '20ch',
            }}
          >
            Every trial, vendor and rupee in one place.
          </Typography>

          <Box sx={{ mt: 3.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {features.map((feat) => (
              <Box
                key={feat}
                sx={{
                  px: 1.5,
                  py: 0.65,
                  borderRadius: '999px',
                  bgcolor: 'rgba(255,253,247,0.55)',
                  color: ON_AMBER,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                }}
              >
                {feat}
              </Box>
            ))}
          </Box>

          <Box sx={{ mt: 5, maxWidth: 520 }}>
            <PitchScene />
          </Box>
        </Box>
      </Box>

      {/* ── RIGHT PANEL — the form ────────────────────────────── */}
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
        <Box sx={{ width: '100%', maxWidth: 440 }}>

          {/* ── PASSWORD MODE ─────────────────────────────────── */}
          {loginMode === 'password' && (
            <>
              {heading('Welcome back', 'Sign in to run trials, work orders and payments for India Khelo Football.')}

              <Box
                component="form"
                onSubmit={handleSubmit}
                noValidate
                sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                {errors.general && (
                  <Alert severity="error" sx={{ borderRadius: '10px' }}>
                    {errors.general}
                  </Alert>
                )}

                <TextField
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={handleEmailChange}
                  error={!!errors.email}
                  helperText={errors.email}
                  disabled={isLoading}
                  autoComplete="email"
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
                  onChange={handlePasswordChange}
                  error={!!errors.password}
                  helperText={errors.password}
                  disabled={isLoading}
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
                            disabled={isLoading}
                            edge="end"
                            size="small"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            sx={{ color: MUTED }}
                          >
                            {showPassword
                              ? <VisibilityOffIcon sx={{ fontSize: 20 }} />
                              : <VisibilityIcon sx={{ fontSize: 20 }} />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <FormControlLabel
                  sx={{ ml: -0.75, mt: -0.5 }}
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={isLoading}
                      size="small"
                      sx={{ color: '#B9B3A6', '&.Mui-checked': { color: AMBER_TEXT } }}
                    />
                  }
                  label={
                    <Typography variant="body2" sx={{ fontWeight: 500, color: MUTED }}>
                      Remember me for 7 days
                    </Typography>
                  }
                />

                <Button
                  type="submit"
                  size="large"
                  fullWidth
                  disabled={isLoading}
                  sx={ctaSx}
                >
                  {isLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <CircularProgress size={18} sx={{ color: '#FFFFFF' }} />
                      <span>Signing in…</span>
                    </Box>
                  ) : (
                    'Sign in'
                  )}
                </Button>

                <Box sx={{ textAlign: 'center' }}>
                  <Typography component="button" type="button" onClick={switchToOTP} sx={accentLinkSx}>
                    Sign in with an OTP instead
                  </Typography>
                </Box>
              </Box>
            </>
          )}

          {/* ── OTP MODE: PHONE INPUT ─────────────────────────── */}
          {loginMode === 'otp-phone' && (
            <>
              {heading('Sign in with OTP', 'We will text a six-digit code to your registered mobile number.')}

              <Box
                component="form"
                onSubmit={handleSendOTP}
                noValidate
                sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                {otpError && <Alert severity="error" sx={{ borderRadius: '10px' }}>{otpError}</Alert>}

                <TextField
                  value={phone}
                  onChange={(e) => {
                    setOtpError('');
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                  }}
                  disabled={otpLoading}
                  autoComplete="tel"
                  fullWidth
                  placeholder="10-digit mobile number"
                  sx={fieldSx}
                  slotProps={{
                    htmlInput: { 'aria-label': 'Mobile number', inputMode: 'numeric' },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PhoneIcon sx={{ fontSize: 20, color: MUTED }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <Button type="submit" size="large" fullWidth disabled={otpLoading} sx={ctaSx}>
                  {otpLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <CircularProgress size={18} sx={{ color: '#FFFFFF' }} />
                      <span>Sending OTP…</span>
                    </Box>
                  ) : (
                    'Send OTP'
                  )}
                </Button>

                <Box sx={{ textAlign: 'center' }}>
                  <Typography component="button" type="button" onClick={switchToPassword} sx={quietLinkSx}>
                    Back to email login
                  </Typography>
                </Box>
              </Box>
            </>
          )}

          {/* ── OTP MODE: VERIFY ──────────────────────────────── */}
          {loginMode === 'otp-verify' && (
            <>
              {heading('Enter your code', `We sent a six-digit code to ${maskedPhone}.`)}

              <Box
                component="form"
                onSubmit={handleVerifyOTP}
                noValidate
                sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
              >
                {otpError && <Alert severity="error" sx={{ borderRadius: '10px' }}>{otpError}</Alert>}

                <TextField
                  value={otpCode}
                  onChange={(e) => {
                    setOtpError('');
                    setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  }}
                  disabled={otpLoading}
                  autoComplete="one-time-code"
                  fullWidth
                  placeholder="6-digit OTP"
                  sx={fieldSx}
                  slotProps={{
                    htmlInput: { 'aria-label': '6-digit OTP', inputMode: 'numeric' },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <KeyIcon sx={{ fontSize: 20, color: MUTED }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <Button type="submit" size="large" fullWidth disabled={otpLoading} sx={ctaSx}>
                  {otpLoading ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <CircularProgress size={18} sx={{ color: '#FFFFFF' }} />
                      <span>Verifying…</span>
                    </Box>
                  ) : (
                    'Verify OTP'
                  )}
                </Button>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography
                    component="button"
                    type="button"
                    onClick={() => setLoginMode('otp-phone')}
                    sx={quietLinkSx}
                  >
                    Change number
                  </Typography>

                  {countdown > 0 ? (
                    <Typography variant="body2" sx={{ color: MUTED, fontSize: '0.8125rem' }}>
                      Resend in {countdown}s
                    </Typography>
                  ) : (
                    <Typography
                      component="button"
                      type="button"
                      onClick={handleResendOTP}
                      disabled={otpLoading}
                      sx={accentLinkSx}
                    >
                      Resend OTP
                    </Typography>
                  )}
                </Box>
              </Box>
            </>
          )}

          {/* The other doors. There is no self-serve reset route in this app —
              ClientChangePasswordDialog covers a signed-IN user only — so this
              says who to ask rather than linking to a page that does not exist.
              The funder door is slug-addressed and per-funder, so it cannot be
              linked generically; the invitation email is the real route. */}
          <Box
            sx={{
              mt: 5, pt: 3, borderTop: `1px solid ${LINE}`,
              display: 'flex', gap: 3, flexWrap: 'wrap', rowGap: 1,
              fontSize: '0.8125rem', color: MUTED,
            }}
          >
            <Link component={RouterLink} to="/csr/login" underline="hover" sx={{ color: AMBER_TEXT, fontWeight: 600 }}>
              CSR office
            </Link>
            <Box component="span">Forgotten your password? Ask your administrator to reset it.</Box>
          </Box>

          {/* Only where the amber panel is not: below lg the brand has to live
              somewhere, and a bare form on bone says nothing. */}
          <Box
            sx={{
              display: { xs: 'block', lg: 'none' },
              mt: 3, px: 2, py: 1.5,
              borderRadius: '10px',
              bgcolor: AMBER_PALE,
              color: ON_AMBER,
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            India Khelo Football · Trial Tracking
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
