// src/auth/Login.jsx
import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';
import { validateLoginForm } from '../utils/validation';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [errors, setErrors] = useState({ email: '', password: '', general: '' });

  const { login } = useAuth();
  const navigate = useNavigate();

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

  const features = [
    'Manage REPs across India',
    'Track Work Orders & Vendors',
    'Trial City Management',
    'Payment & Invoice Tracking',
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── LEFT PANEL ───────────────────────────────────────── */}
      <Box
        sx={{
          display: { xs: 'none', lg: 'flex' },
          width: '50%',
          flexDirection: 'column',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
          px: 10,
          py: 8,
        }}
      >
        {/* Dot pattern overlay */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            opacity: 0.08,
            backgroundImage: 'radial-gradient(circle at 20px 20px, #ffffff 2px, transparent 0)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Floating circles */}
        <Box sx={{ position: 'absolute', top: 80, right: 80, width: 64, height: 64, bgcolor: '#FDE68A', borderRadius: '50%', opacity: 0.45, animation: 'float 6s ease-in-out infinite' }} />
        <Box sx={{ position: 'absolute', bottom: 160, left: 40, width: 96, height: 96, bgcolor: '#F59E0B', borderRadius: '50%', opacity: 0.3, animation: 'floatDelayed 7s ease-in-out infinite' }} />
        <Box sx={{ position: 'absolute', top: '33%', left: '25%', width: 48, height: 48, bgcolor: '#FEF3C7', borderRadius: '50%', opacity: 0.4, animation: 'floatSlow 8s ease-in-out infinite' }} />

        {/* Content */}
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography
            variant="h1"
            sx={{ fontSize: '3.25rem', fontWeight: 900, color: '#78350F', lineHeight: 1.1, mb: 1 }}
          >
            India Khelo Football
          </Typography>

          <Typography variant="h5" sx={{ color: '#92400E', fontWeight: 600, mb: 4 }}>
            Trial Tracking Application
          </Typography>

          {features.map((feat) => (
            <Box key={feat} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#78350F', flexShrink: 0 }} />
              <Typography sx={{ color: '#78350F', fontWeight: 600, fontSize: '1.05rem' }}>
                {feat}
              </Typography>
            </Box>
          ))}

          {/* SVG Illustration */}
          <Box sx={{ mt: 4, maxWidth: 480 }}>
            <svg viewBox="0 0 600 400" style={{ width: '100%', height: 'auto' }}>
              <defs>
                <linearGradient id="grassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: '#86efac', stopOpacity: 0.8 }} />
                  <stop offset="100%" style={{ stopColor: '#22c55e', stopOpacity: 0.9 }} />
                </linearGradient>
                <filter id="shadow">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.3" />
                </filter>
              </defs>

              <ellipse cx="300" cy="370" rx="280" ry="30" fill="url(#grassGradient)" opacity="0.6" />

              {/* Sun */}
              <circle cx="520" cy="60" r="40" fill="#fbbf24" opacity="0.9">
                <animate attributeName="r" values="40;45;40" dur="3s" repeatCount="indefinite" />
              </circle>
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                return (
                  <line
                    key={i}
                    x1={520 + Math.cos(rad) * 50} y1={60 + Math.sin(rad) * 50}
                    x2={520 + Math.cos(rad) * 65} y2={60 + Math.sin(rad) * 65}
                    stroke="#fbbf24" strokeWidth="3" strokeLinecap="round" opacity="0.8"
                  >
                    <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
                  </line>
                );
              })}

              {/* Kid 1 */}
              <g filter="url(#shadow)">
                <ellipse cx="120" cy="365" rx="25" ry="6" fill="#000" opacity="0.2" />
                <ellipse cx="120" cy="260" rx="25" ry="35" fill="#fbbf24" />
                <circle cx="120" cy="220" r="24" fill="#fef3c7" />
                <path d="M 105 217 Q 100 205 110 200 Q 120 197 130 200 Q 138 205 133 217" fill="#422006" />
                <circle cx="114" cy="220" r="2.5" fill="#000" />
                <circle cx="126" cy="220" r="2.5" fill="#000" />
                <path d="M 114 228 Q 120 231 126 228" stroke="#000" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <line x1="100" y1="250" x2="80" y2="240" stroke="#fef3c7" strokeWidth="10" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" values="0 100 250; -25 100 250; 0 100 250" dur="0.8s" repeatCount="indefinite" />
                </line>
                <line x1="140" y1="250" x2="160" y2="265" stroke="#fef3c7" strokeWidth="10" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" values="0 140 250; 25 140 250; 0 140 250" dur="0.8s" repeatCount="indefinite" />
                </line>
                <line x1="112" y1="295" x2="105" y2="340" stroke="#1e40af" strokeWidth="12" strokeLinecap="round" />
                <line x1="128" y1="295" x2="135" y2="340" stroke="#1e40af" strokeWidth="12" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" values="0 128 295; 35 128 295; 0 128 295" dur="0.8s" repeatCount="indefinite" />
                </line>
              </g>

              {/* Kid 2 */}
              <g filter="url(#shadow)">
                <ellipse cx="300" cy="365" rx="25" ry="6" fill="#000" opacity="0.2">
                  <animate attributeName="opacity" values="0.2;0.05;0.2" dur="1.2s" repeatCount="indefinite" />
                </ellipse>
                <ellipse cx="300" cy="250" rx="27" ry="38" fill="#f97316" />
                <circle cx="300" cy="205" r="26" fill="#fef3c7" />
                <ellipse cx="300" cy="192" rx="28" ry="18" fill="#1c1917" />
                <circle cx="293" cy="205" r="2.5" fill="#000" />
                <circle cx="307" cy="205" r="2.5" fill="#000" />
                <path d="M 293 213 Q 300 217 307 213" stroke="#000" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <line x1="275" y1="240" x2="250" y2="220" stroke="#fef3c7" strokeWidth="10" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" values="0 275 240; -12 275 240; 0 275 240" dur="1.2s" repeatCount="indefinite" />
                </line>
                <line x1="325" y1="240" x2="350" y2="220" stroke="#fef3c7" strokeWidth="10" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" values="0 325 240; 12 325 240; 0 325 240" dur="1.2s" repeatCount="indefinite" />
                </line>
                <line x1="290" y1="288" x2="282" y2="340" stroke="#1e40af" strokeWidth="12" strokeLinecap="round" />
                <line x1="310" y1="288" x2="318" y2="340" stroke="#1e40af" strokeWidth="12" strokeLinecap="round" />
                <animateTransform attributeName="transform" type="translate" values="0,0; 0,-35; 0,0" dur="1.2s" repeatCount="indefinite" />
              </g>

              {/* Kid 3 */}
              <g filter="url(#shadow)">
                <ellipse cx="480" cy="365" rx="25" ry="6" fill="#000" opacity="0.2" />
                <ellipse cx="480" cy="260" rx="25" ry="35" fill="#fbbf24" />
                <circle cx="480" cy="220" r="24" fill="#fef3c7" />
                <path d="M 465 217 Q 460 205 470 200 Q 480 197 490 200 Q 498 205 493 217" fill="#7c2d12" />
                <circle cx="474" cy="220" r="2.5" fill="#000" />
                <circle cx="486" cy="220" r="2.5" fill="#000" />
                <path d="M 473 228 Q 480 231 487 228" stroke="#000" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                <line x1="460" y1="250" x2="445" y2="245" stroke="#fef3c7" strokeWidth="10" strokeLinecap="round" />
                <line x1="500" y1="250" x2="520" y2="210" stroke="#fef3c7" strokeWidth="10" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" values="0 500 250; 8 500 250; -8 500 250; 0 500 250" dur="0.6s" repeatCount="indefinite" />
                </line>
                <line x1="472" y1="295" x2="468" y2="340" stroke="#1e40af" strokeWidth="12" strokeLinecap="round" />
                <line x1="488" y1="295" x2="492" y2="340" stroke="#1e40af" strokeWidth="12" strokeLinecap="round" />
              </g>

              {/* Football */}
              <g filter="url(#shadow)">
                <circle cx="200" cy="300" r="22" fill="#ffffff" stroke="#000" strokeWidth="2.5" />
                <path d="M 200 282 L 193 292 L 207 292 Z" fill="#000" />
                <path d="M 186 300 L 200 307 L 200 292 Z" fill="#000" />
                <path d="M 214 300 L 200 307 L 200 292 Z" fill="#000" />
                <path d="M 193 313 L 200 322 L 207 313 Z" fill="#000" />
                <animateTransform attributeName="transform" type="translate" values="0,0; 80,-20; 180,0; 280,-20; 0,0" dur="6s" repeatCount="indefinite" />
              </g>

              {/* Grass */}
              {[...Array(18)].map((_, i) => (
                <line key={`g-${i}`} x1={60 + i * 30} y1="378" x2={60 + i * 30} y2="390"
                  stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" opacity="0.5" />
              ))}
            </svg>
          </Box>
        </Box>
      </Box>

      {/* ── RIGHT PANEL ──────────────────────────────────────── */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'var(--yellow-50)',
          py: 6,
          px: { xs: 3, sm: 6 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: 440 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#111827', mb: 0.5 }}>
            Welcome Back
          </Typography>
          <Typography variant="body1" sx={{ color: '#6B7280', mb: 4 }}>
            Sign in to continue
          </Typography>

          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
          >
            {/* General error */}
            {errors.general && (
              <Alert
                severity="error"
                sx={{ animation: 'shake 0.5s ease-in-out' }}
              >
                {errors.general}
              </Alert>
            )}

            {/* Email */}
            <TextField
              type="email"
              label="Email Address"
              value={email}
              onChange={handleEmailChange}
              error={!!errors.email}
              helperText={errors.email}
              disabled={isLoading}
              autoComplete="email"
              fullWidth
            />

            {/* Password */}
            <TextField
              type={showPassword ? 'text' : 'password'}
              label="Password"
              value={password}
              onChange={handlePasswordChange}
              error={!!errors.password}
              helperText={errors.password}
              disabled={isLoading}
              autoComplete="current-password"
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                      edge="end"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            {/* Remember me */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLoading}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 500, color: '#374151' }}>
                  Remember me for 7 days
                </Typography>
              }
            />

            {/* Submit */}
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              fullWidth
              disabled={isLoading}
              sx={{ py: 1.75, mt: 0.5 }}
            >
              {isLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <CircularProgress size={20} sx={{ color: '#111827' }} />
                  <span>Signing in...</span>
                </Box>
              ) : (
                'Sign In'
              )}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
