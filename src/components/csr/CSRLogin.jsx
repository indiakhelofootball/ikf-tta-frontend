// src/components/csr/CSRLogin.jsx
// The CSR office team's own front door. Three login SCREENS, one auth engine:
// /login (TTA staff), /csr/login (this), /client/:slug/login (external funder).
// The plan-of-record constraint -- "one login page, one endpoint, one JWT, one
// AuthContext" -- is about the AUTH MECHANISM, not the UI. So this calls the very
// same useAuth().login() as src/auth/Login.jsx, hits the same endpoint and stores
// the same token. Only the branding and the post-login destination differ.
//
// No permission check here on purpose: /csr/* is grant-gated by GrantedRoute,
// which renders /unauthorized on its own. Re-checking here would duplicate the
// security boundary and let the two drift apart.
//
// ---------------------------------------------------------------------------
// THE ARTWORK IS AN ASSET, NOT A DRAWING
// ---------------------------------------------------------------------------
// An earlier version hand-drew this scene as inline SVG because no image asset
// existed. It reached the ceiling of what flat vector shapes can do and still
// read as amateur -- the owner's verdict, and correct. src/assets/csr-login.png
// replaced it.
//
// The image carries its own layout: a cream field on the left with a soft
// curved edge, and the photograph occupying the right. That curve is why there
// is no panel, no card and no clipPath here -- the artwork already separates
// the form from the scene, and drawing a second boundary on top of it would
// fight the thing it is sitting on.
//
// It is anchored RIGHT and the page ground is set to the image's own cream
// (#F6F2E9, sampled from it). So as the viewport widens past the image's 3:2,
// the extra width is absorbed by cream that matches seamlessly, and the player
// and goalposts stay put. Below md the image is dropped entirely: `cover` on a
// tall viewport crops horizontally, which would eat the cream the form needs.
//
// Palette is IKF's, read off the artwork, and deliberately does NOT come from
// ttaTheme -- those tokens mean things ("moss = money utilised") with no
// referent on a screen that has no data on it. The workspace behind this door
// keeps the Ledger system; a login is the brand's one moment.
import React, { useState, useEffect } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Alert, Link, InputAdornment, IconButton,
} from '@mui/material';
import {
  MailOutline as MailIcon,
  LockOutlined as LockIcon,
  VisibilityOutlined as ShowIcon,
  VisibilityOffOutlined as HideIcon,
  PhoneIphoneOutlined as PhoneIcon,
} from '@mui/icons-material';

import { useAuth } from '../../auth/AuthContext';
import api from '../../services/api';
import { ROLES } from '../../auth/roles';
import { validateLoginForm } from '../../utils/validation';
import ikfLogo from '../../assets/ikf-logo.png';
import loginArt from '../../assets/csr-login.png';

// Sampled from the artwork rather than chosen beside it, so the form and the
// image cannot drift apart. Every value below is a pixel from csr-login.png.
//
// PITCH is the kit green off the player's shorts: 10.22:1 on the cream ground
// and it carries white at 11.42, so it can be both the primary text tone and
// the button fill without a second variant.
//
// SUN is the artwork's one saturated colour, the band across the sky. It
// measures 1.75:1 as text on cream -- unusable, and precisely the trap amber
// sprang on this project once already. It is therefore a MARK ONLY: a rule, a
// fill, never a word. SUN_TEXT is that same hue darkened along itself until it
// clears AA on cream (4.61) and on white (5.15), for the rare case a word
// needs it.
const PITCH = '#1F3F3E';
const PITCH_DEEP = '#132A29';
const SUN = '#FAA844';
const SUN_TEXT = '#946328';
const INK = '#1C2B25';
const MUTED = '#66756D';
const LINE = '#DFDCD2';
const CREAM = '#F6F2E9';

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
  const { login, otpLogin, isAuthenticated, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '', general: '' });
  const [submitting, setSubmitting] = useState(false);

  // OTP. The mechanism already existed end to end -- otp/views.py, the API
  // service, and AuthContext.otpLogin -- and was wired into TTA's door only,
  // so a CSR operator had no way to reach it. Same three modes and the same
  // 60-second cooldown as src/auth/Login.jsx, deliberately: two doors that
  // behave differently for the same action teach people the product is
  // inconsistent.
  //
  // NOT offered on the funder's door. otp/views.py:159 refuses an external
  // client outright, so putting it there would advertise a route that always
  // returns 403.
  const [mode, setMode] = useState('password'); // password | otp-phone | otp-verify
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    // An external funder who wandered to the staff door belongs in the portal —
    // same guard DashboardLayout applies to the internal shell.
    navigate(user?.role === ROLES.CSR_CLIENT ? '/client' : '/csr', { replace: true });
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const afterLogin = () =>
    navigate(roleAfterLogin() === ROLES.CSR_CLIENT ? '/client' : '/csr', { replace: true });

  const sendOtp = async (e) => {
    if (e) e.preventDefault();
    setOtpError('');
    if (!/^\d{10}$/.test(phone)) {
      setOtpError('Enter a valid 10-digit mobile number.');
      return;
    }
    setOtpLoading(true);
    try {
      await api.requestOTP(phone);
      setMode('otp-verify');
      setCountdown(60);
    } catch (err) {
      setOtpError(err.message || 'Could not send the code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const resendOtp = async () => {
    if (countdown > 0) return;
    setOtpError('');
    setOtpCode('');
    setOtpLoading(true);
    try {
      await api.requestOTP(phone);
      setCountdown(60);
    } catch (err) {
      setOtpError(err.message || 'Could not resend the code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setOtpError('');
    if (!/^\d{6}$/.test(otpCode)) {
      setOtpError('Enter the 6-digit code sent to your phone.');
      return;
    }
    setOtpLoading(true);
    try {
      const result = await otpLogin(phone, otpCode);
      if (result?.success) afterLogin();
      else setOtpError(result?.message || 'Verification failed.');
    } catch (err) {
      setOtpError(err.message || 'Verification failed.');
    } finally {
      setOtpLoading(false);
    }
  };

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

  // Chrome's autofill paints its own blue over any theme, which on a branded
  // page is the loudest colour on screen and belongs to neither brand. The
  // inset shadow trick repaints the field; the long transition delay outlasts
  // the browser's own repaint.
  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: '#FFFFFF',
      borderRadius: '4px',
      '& fieldset': { borderColor: LINE },
      '&:hover fieldset': { borderColor: '#C3CFDA' },
      '&.Mui-focused fieldset': { borderColor: PITCH, borderWidth: '1px' },
      '&.Mui-focused': { boxShadow: `0 0 0 3px ${PITCH}1A` },
    },
    '& input:-webkit-autofill': {
      WebkitBoxShadow: '0 0 0 1000px #FFFFFF inset',
      WebkitTextFillColor: INK,
      transition: 'background-color 9999s ease-out',
    },
    '& .MuiInputBase-input': { color: INK, fontSize: '0.9375rem', py: 1.75 },
    '& .MuiInputBase-input::placeholder': { color: MUTED, opacity: 1 },
  };

  const primaryBtnSx = {
    mt: 2.5, py: 1.6, borderRadius: '4px',
    bgcolor: PITCH, color: '#FFFFFF',
    fontSize: '0.9375rem', fontWeight: 600, textTransform: 'none', boxShadow: 'none',
    transition: 'background-color 140ms cubic-bezier(0, 0, 0.2, 1)',
    '&:hover': { bgcolor: PITCH_DEEP, boxShadow: 'none' },
    '&.Mui-disabled': { bgcolor: '#93A8BC', color: '#FFFFFF' },
  };

  const secondaryBtnSx = {
    py: 1.5, borderRadius: '4px',
    border: '1px solid ' + LINE, bgcolor: '#FFFFFF', color: INK,
    fontSize: '0.9375rem', fontWeight: 600, textTransform: 'none',
    transition: 'background-color 140ms cubic-bezier(0, 0, 0.2, 1), border-color 140ms cubic-bezier(0, 0, 0.2, 1)',
    '&:hover': { bgcolor: '#F6F8FA', borderColor: '#C3CFDA' },
  };

  const backBtnSx = {
    mt: 1.5, py: 1.25, borderRadius: '4px',
    color: MUTED, fontSize: '0.875rem', fontWeight: 600, textTransform: 'none',
    transition: 'color 140ms cubic-bezier(0, 0, 0.2, 1)',
    '&:hover': { color: INK, bgcolor: 'transparent' },
  };

  const dividerSx = {
    my: 2.5, display: 'flex', alignItems: 'center', gap: 2,
    color: MUTED, fontSize: '0.8125rem',
    '&::before, &::after': { content: '""', flex: 1, height: '1px', bgcolor: LINE },
  };

  return (
    // Two layers, as the reference has it: the artwork bleeds to the viewport
    // edges, and a rounded card floats on it holding everything.
    //
    // The form used to sit directly on the page with nothing containing it, so
    // the fields and the button read as loose objects on a photograph rather
    // than as one panel. The card is what ties them together -- and the shadow
    // and the inset are what make the bleed read as a layer behind rather than
    // as a mistake in the crop.
    //
    // Both layers draw the SAME image at different scales. They are not
    // aligned and are not meant to be: the rounded edge and the shadow declare
    // the card a separate plane, which is exactly how the reference behaves.
    <Box sx={{
      // 100dvh, not 100vh: on mobile 100vh counts the collapsing browser
      // chrome and leaves the page taller than the screen.
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'center',
      bgcolor: CREAM,
      // The backdrop below is deliberately sized past this box, so the clip
      // has to happen here. Without it the page scrolled in BOTH axes at every
      // width -- 1544px of scroll width on a 1440px viewport.
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* The backdrop is the same artwork, blurred and scaled past the frame.
          Sharp, it read as a misaligned duplicate of the card -- two copies of
          one photograph a few pixels out of register, which the eye reads as a
          rendering fault rather than as depth. Out of focus it becomes what it
          is meant to be: colour and light behind the card, taking its palette
          from the same source so nothing clashes.

          The scale is what keeps the blur honest -- blurring in place samples
          past the element's own edges and leaves a pale halo around the
          viewport. */}
      <Box aria-hidden sx={{
        position: 'absolute',
        // Inset to zero and scaled from the centre. The blur still needs to
        // sample past the edges or it leaves a pale halo, but the scale alone
        // does that now -- the negative inset was doubling the overshoot and
        // was what pushed the document wider than the window.
        inset: 0,
        display: { xs: 'none', md: 'block' },
        backgroundImage: `url(${loginArt})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        filter: 'blur(26px) saturate(0.9) brightness(1.04)',
        transform: 'scale(1.06)',
      }} />
      <Box sx={{
        position: 'relative',
        width: '100%',
        // No maxWidth and no inset. The card was capped at 1320 and floated in
        // the middle of a blurred copy of its own artwork, which wasted the
        // screen on every monitor wider than that and made the backdrop the
        // largest thing on the page. The artwork is the subject; it should
        // have the room.
        display: 'flex',
        alignItems: 'center',
        borderRadius: 0,
        overflow: 'hidden',
        bgcolor: CREAM,
        // Anchored right so the player and the goal hold their place as the
        // card widens; the growth is absorbed by the image's own cream, which
        // is also the card's ground, so the two meet without a seam.
        backgroundImage: { xs: 'none', md: `url(${loginArt})` },
        backgroundSize: 'cover',
        backgroundPosition: 'center right',
        backgroundRepeat: 'no-repeat',
        // A hairline, not a shadow. The reference outlines its card with a
        // fine light stroke and casts nothing -- which is what lets it read as
        // a pane laid ON the artwork rather than an object hovering above it.
        // A drop shadow here also fought the blurred backdrop: two soft dark
        // gradients meeting at the card's edge muddied both.
        border: { xs: 'none', md: '1px solid rgba(255,255,255,0.55)' },
        boxShadow: 'none',
      }}>
        <Box sx={{
          width: '100%',
          maxWidth: { xs: '100%', md: 520 },
          px: { xs: 3, sm: 6, md: 7 },
          py: { xs: 6, md: 6 },
        }}>
          <Box
            component="img"
            src={ikfLogo}
            alt="India Khelega Foundation"
            // The asset is RGB with no alpha, so it carries a white rectangle that
            // reads as a sticker on the cream ground. `multiply` maps white to the
            // ground beneath it and leaves the mark's own colours essentially
            // unchanged against a near-white -- cheaper and more honest than
            // shipping a second, keyed copy of a logo we did not author.
            sx={{
              height: 64, width: 'auto', display: 'block',
              mixBlendMode: 'multiply', mb: { xs: 4, md: 6 },
            }}
          />

            {/* The artwork's one saturated colour, used as a mark rather than a
              word -- it is 1.75:1 on this ground and could never carry text.
              Angled to echo the band of sky it was sampled from. */}
          <Box sx={{
            width: 52, height: 4, bgcolor: SUN, borderRadius: '2px',
            transform: 'skewX(-24deg)', mb: 2.5,
          }} />

          <Typography component="h1" sx={{
            fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
            fontSize: { xs: '2.125rem', md: '2.75rem' },
            fontWeight: 700,
            letterSpacing: '-0.025em',
            lineHeight: 1.05,
            color: INK,
            mb: 1.5,
          }}>
            Welcome back
          </Typography>

          <Typography sx={{ color: MUTED, fontSize: '0.9375rem', lineHeight: 1.6, maxWidth: '32ch', mb: 4 }}>
            Together, we create opportunities that change lives through football.
          </Typography>

          {errors.general && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px' }}>{errors.general}</Alert>
          )}

          {mode === 'password' && (
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                type="email"
                value={email}
                fullWidth
                placeholder="Email address"
                autoComplete="username"
                error={Boolean(errors.email)}
                helperText={errors.email}
                sx={{ ...fieldSx, mb: 2 }}
                slotProps={{ input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailIcon sx={{ fontSize: 20, color: MUTED }} />
                    </InputAdornment>
                  ),
                } }}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email || errors.general) {
                    setErrors((prev) => ({ ...prev, email: '', general: '' }));
                  }
                }}
              />

              <TextField
                type={showPassword ? 'text' : 'password'}
                value={password}
                fullWidth
                placeholder="Password"
                autoComplete="current-password"
                error={Boolean(errors.password)}
                helperText={errors.password}
                sx={fieldSx}
                slotProps={{ input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ fontSize: 20, color: MUTED }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword((v) => !v)}
                        edge="end"
                        size="small"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        sx={{ color: MUTED }}
                      >
                        {showPassword ? <HideIcon sx={{ fontSize: 20 }} /> : <ShowIcon sx={{ fontSize: 20 }} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                } }}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password || errors.general) {
                    setErrors((prev) => ({ ...prev, password: '', general: '' }));
                  }
                }}
              />

              {/* There is no self-serve reset route -- ClientChangePasswordDialog
                  covers a signed-IN user only -- so this says who to ask rather
                  than linking to a page that does not exist. */}
              <Box sx={{ mt: 1.25, textAlign: 'right', fontSize: '0.8125rem', color: MUTED }}>
                Forgotten your password? Ask your administrator to reset it.
              </Box>

              <Button type="submit" fullWidth disabled={submitting} sx={primaryBtnSx}>
                {submitting ? 'Signing in...' : 'Log in'}
              </Button>

              <Box sx={dividerSx}><span>or</span></Box>

              <Button
                fullWidth
                onClick={() => { setOtpError(''); setOtpCode(''); setCountdown(0); setMode('otp-phone'); }}
                startIcon={<PhoneIcon sx={{ fontSize: 19 }} />}
                sx={secondaryBtnSx}
              >
                Use a one-time code
              </Button>
            </Box>
          )}

          {mode === 'otp-phone' && (
            <Box component="form" onSubmit={sendOtp} noValidate>
              <TextField
                value={phone}
                fullWidth
                placeholder="10-digit mobile number"
                autoComplete="tel"
                inputMode="numeric"
                error={Boolean(otpError)}
                helperText={otpError}
                sx={fieldSx}
                slotProps={{ input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon sx={{ fontSize: 20, color: MUTED }} />
                    </InputAdornment>
                  ),
                } }}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                  if (otpError) setOtpError('');
                }}
              />

              <Button type="submit" fullWidth disabled={otpLoading} sx={primaryBtnSx}>
                {otpLoading ? 'Sending...' : 'Send code'}
              </Button>

              <Button fullWidth onClick={() => { setOtpError(''); setMode('password'); }} sx={backBtnSx}>
                Back to password
              </Button>
            </Box>
          )}

          {mode === 'otp-verify' && (
            <Box component="form" onSubmit={verifyOtp} noValidate>
              <Typography sx={{ color: MUTED, fontSize: '0.875rem', mb: 2 }}>
                We sent a 6-digit code to{' '}
                <Box component="span" sx={{ color: INK, fontWeight: 600 }}>{phone}</Box>.
              </Typography>

              <TextField
                value={otpCode}
                fullWidth
                placeholder="000000"
                autoComplete="one-time-code"
                inputMode="numeric"
                autoFocus
                error={Boolean(otpError)}
                helperText={otpError}
                sx={{
                  ...fieldSx,
                  '& .MuiInputBase-input': {
                    color: INK, fontSize: '1.5rem', fontWeight: 600,
                    letterSpacing: '0.4em', textAlign: 'center', py: 1.75,
                  },
                }}
                onChange={(e) => {
                  setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  if (otpError) setOtpError('');
                }}
              />

              <Button type="submit" fullWidth disabled={otpLoading} sx={primaryBtnSx}>
                {otpLoading ? 'Verifying...' : 'Verify and sign in'}
              </Button>

              {/* The countdown is stated rather than hidden behind a disabled
                  button: someone waiting on a code needs to know how long. */}
              <Box sx={{
                mt: 2, textAlign: 'center', fontSize: '0.875rem',
                // The accent's legible variant, on the one line that is about
                // waiting. Everywhere else the accent stays a mark.
                color: countdown > 0 ? SUN_TEXT : MUTED,
              }}>
                {countdown > 0 ? (
                  'Resend available in ' + countdown + 's'
                ) : (
                  <Link
                    component="button"
                    type="button"
                    onClick={resendOtp}
                    underline="hover"
                    sx={{ color: PITCH, fontWeight: 600 }}
                  >
                    Resend code
                  </Link>
                )}
              </Box>

              <Button
                fullWidth
                onClick={() => { setOtpError(''); setOtpCode(''); setMode('otp-phone'); }}
                sx={backBtnSx}
              >
                Use a different number
              </Button>
            </Box>
          )}

          {/* The other door. A CSR operator who took a wrong turn needs a way
              across; a funder does not belong here at all and is served by
              RequireClient redirecting them to their own branded door, so
              telling them to check their email would be advice for a problem
              they cannot have on this screen. */}
          <Box sx={{
            mt: 4, pt: 3, borderTop: `1px solid ${LINE}`,
            fontSize: '0.875rem', color: MUTED,
          }}>
            <Link component={RouterLink} to="/login" underline="hover" sx={{ color: PITCH, fontWeight: 600 }}>
              TTA operations
            </Link>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
