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
//
// ---------------------------------------------------------------------------
// WHY THIS SCREEN IS NAVY AND ORANGE WHEN THE MODULE IS MOSS AND BONE
// ---------------------------------------------------------------------------
// Built to the owner's reference mock (D:\CSR\references\, 18 Aug), which is
// IKF's own identity: navy ground, orange accent, no green anywhere. The
// workspace behind this door keeps the Ledger system.
//
// That is a deliberate split, not an inconsistency. A login is the one screen
// whose job is to say WHOSE product this is — it is the brand's moment, seen
// once, by someone deciding whether they are in the right place. Everything
// past it is the work, seen all day, where a quiet ledger serves better than a
// brand statement. Products that use their marketing identity on the door and a
// working chassis inside are following the same reasoning.
//
// The palette below is therefore local to this file and deliberately does NOT
// read from ttaTheme: those tokens mean things ("moss = money utilised") that
// have no referent on a login screen, and borrowing them here would put the
// module's meanings on a page with no data in it.
//
// The illustration is drawn, not photographed — there is no image asset, and a
// stock photograph would say less than nothing. It is inline SVG so it costs no
// request, scales to any width, and can be replaced by a real image later
// without touching the layout.

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

// IKF's identity, read off the reference mock.
const NAVY = '#12395E';
const NAVY_DEEP = '#0C2942';
const ORANGE = '#E2703A';
const INK = '#14304D';
const MUTED = '#5A7085';
const LINE = '#DCE3EA';
const PANEL = '#FCFCFD';
const SKY = '#8FB6D2';

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

// The IKF mark. Drawn rather than imported: there is no logo asset in the repo,
// and a wordmark set in type is honest where a fake image would not be. The
// football sits inside the K's counter exactly as the reference has it.
function IkfMark() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75 }}>
      <Box component="svg" viewBox="0 0 132 64" sx={{ width: 116, height: 56, flex: 'none' }} aria-hidden>
        <rect x="2" y="4" width="9" height="56" fill={NAVY} />
        <path d="M26 4h9v22l18-22h11L44 30l20 30H52L35 34v26h-9z" fill={NAVY} />
        <circle cx="35" cy="46" r="9" fill="#FFFFFF" stroke={NAVY} strokeWidth="2.5" />
        <path d="M35 40.5l4 2.9-1.5 4.7h-5L31 43.4z" fill={NAVY} />
        <path d="M78 4h30v9H87v14h19v9H87v24h-9z" fill={ORANGE} />
      </Box>
      <Box sx={{ width: '1px', alignSelf: 'stretch', bgcolor: LINE, my: 0.5 }} />
      <Box sx={{
        fontSize: 11, fontWeight: 700, letterSpacing: '0.11em',
        lineHeight: 1.55, color: NAVY, textTransform: 'uppercase',
      }}>
        India<br />Khelega<br />Foundation
      </Box>
    </Box>
  );
}

// The scene behind the card: sky, an orange headland with a sea arch, water,
// sand, and a ball resting on the beach.
//
// Drawn WIDE (1600x900) because it is the page background, not a portrait
// panel. The first attempt used a 720x980 viewBox with preserveAspectRatio
// slice, so on a 1440px screen every shape scaled 2x and the arch swallowed
// the layout.
//
// Deliberately no human figure. The reference has a player resting a foot on
// the ball, and hand-drawn SVG anatomy at this size reads as a mistake rather
// than a style -- the first attempt rendered as a white rectangle. A landscape
// forgives flat shapes; a person does not. If a real illustration or photograph
// arrives, it replaces this component and nothing else changes.
function ShoreScene() {
  return (
    <Box
      component="svg"
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      aria-hidden
    >
      <defs>
        <linearGradient id="ikf-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A8C7DE" />
          <stop offset="100%" stopColor="#DCE8F0" />
        </linearGradient>
        <linearGradient id="ikf-rock" x1="0.1" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#EE9159" />
          <stop offset="55%" stopColor="#DE7038" />
          <stop offset="100%" stopColor="#BF5122" />
        </linearGradient>
        <linearGradient id="ikf-rock-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E9A176" />
          <stop offset="100%" stopColor="#D8916A" />
        </linearGradient>
        <linearGradient id="ikf-arch" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#DCE8F0" />
          <stop offset="100%" stopColor="#BCD6E6" />
        </linearGradient>
        <radialGradient id="ikf-ball" cx="0.35" cy="0.3" r="0.85">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="62%" stopColor="#F4F6F8" />
          <stop offset="100%" stopColor="#D3DBE3" />
        </radialGradient>
        <linearGradient id="ikf-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5E97BC" />
          <stop offset="100%" stopColor="#A9CBE0" />
        </linearGradient>
        <linearGradient id="ikf-haze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E4EEF4" stopOpacity="0" />
          <stop offset="60%" stopColor="#E4EEF4" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#E4EEF4" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ikf-water-shadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2F5F7E" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#2F5F7E" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="1600" height="900" fill="url(#ikf-sky)" />
      {/* Haze along the horizon. Air thickens toward the water, and that wash
          is what lets the distant land sit BEHIND the near land instead of
          beside it. */}
      <rect x="0" y="330" width="1600" height="180" fill="url(#ikf-haze)" />

      {/* THE FAR HEADLAND. Two ridges, each drawn twice: the whole silhouette
          in its lit tone, then the slopes turned away from the light in a
          darker one. A flat wedge reads as a shape; a wedge with a shaded side
          reads as land. Saturation falls with distance, so the further ridge
          is nearly sky. */}
      <g opacity="0.6">
        <path d="M676 500l114-48 60 10 80-38 70 12 70-28 80 20 60 24 46 48z" fill="#E5C8B8" />
        <path d="M1070 408l80 20 60 24 46 48h-166z" fill="#D6AE9B" />
        <path d="M930 424l70 12 10 64h-64z" fill="#D6AE9B" opacity="0.7" />
      </g>
      <g opacity="0.85">
        <path d="M818 500l82-38 50 8 60-30 50 12 50-18 50 36 34 30z" fill="url(#ikf-rock-far)" />
        <path d="M1110 434l50 36 34 30h-78z" fill="#C4835F" opacity="0.7" />
        <path d="M1010 440l50 12 6 48h-50z" fill="#C4835F" opacity="0.5" />
        <path d="M900 462l50 8 6 30h-66z" fill="#F0B893" opacity="0.55" />
      </g>

      {/* THE SEA. Not one band: a chopped strip at the horizon, then two
          shallower planes that lighten toward the shore, then surf breaking in
          short lines of different lengths rather than one ruled edge. */}
      <rect x="0" y="500" width="1600" height="230" fill="url(#ikf-sea)" />
      <g fill="#4C86AD" opacity="0.3">
        <rect x="0" y="504" width="1600" height="3" />
        <rect x="180" y="514" width="520" height="3" />
        <rect x="860" y="512" width="460" height="3" />
        <rect x="1330" y="518" width="270" height="3" />
        <rect x="60" y="530" width="380" height="4" />
        <rect x="640" y="536" width="700" height="4" />
        <rect x="1400" y="542" width="200" height="4" />
      </g>
      <path d="M0 574c210 14 430 2 640 12s520 6 960 14v160H0z" fill="#7FADCC" opacity="0.7" />
      <path d="M0 624c260 16 520 2 780 14s560 6 820 10v104H0z" fill="#9AC3DC" opacity="0.75" />
      <g stroke="#FFFFFF" fill="none" strokeLinecap="round" opacity="0.5">
        <path d="M140 572c120 6 240 0 360 6" strokeWidth="4" />
        <path d="M626 566c90 5 180 1 268 5" strokeWidth="3" />
        <path d="M980 580c130 6 260 0 390 6" strokeWidth="4" />
        <path d="M60 608c180 8 360 2 540 8" strokeWidth="5" />
        <path d="M704 616c150 7 300 1 448 7" strokeWidth="5" />
        <path d="M1244 606c110 5 220 1 356 5" strokeWidth="4" />
        <path d="M300 646c220 9 440 3 660 9" strokeWidth="6" />
        <path d="M1058 654c160 7 320 1 480 6" strokeWidth="6" />
      </g>

      {/* Sea stacks -- broken-off fragments of the same headland, so they carry
          the same blocky language at a smaller scale, each with a shaded side.
          Stepped tops, not points: a triangle out in the water reads as a cone,
          not as rock. */}
      <path d="M868 505l4-27 14-6 6 12 8-4 6 25z" fill="#CE7A4C" opacity="0.75" />
      <path d="M892 484l4 21h-10z" fill="#9E4118" opacity="0.4" />
      <path d="M914 505l4-53 18-8 6 16 20-8 8 53z" fill="#CE7A4C" opacity="0.85" />
      <path d="M938 460l20-8 8 53h-24z" fill="#9E4118" opacity="0.4" />

      {/* THE HEADLAND. Built from straight segments at varying angles, with two
          ledges, a long plateau and an outward notch above the waterline -- a
          single smooth bezier is what made the earlier version read as a
          traffic cone, and evenly spaced peaks read as an alpine range. The
          arch is punched through the low left shoulder, well inside the safe
          zone at both 1440 and 1920 wide. */}
      <path d="M1005 505l58-74-16-26 61-84 40-22 58 8 30-52 64-6 24-50 88-12 26-34 102-6 60 14v344z"
            fill="url(#ikf-rock)" />

      {/* Buttresses. The right-hand mass was one uniform orange field; a cliff
          is not. These are vertical faces, alternately turned toward the light
          and away from it, each carrying the ledge it belongs to and each
          leaning slightly so it reads as a plane rather than a stripe. */}
      <path d="M1290 250l10-1 24-50 18-3 14 309h-74z" fill="#F0A06D" />
      <path d="M1386 190l26-3 26-34 10-1 10 353h-86z" fill="#C05B2A" />
      <path d="M1448 152l44-2 6 355h-40z" fill="#EC9560" />
      <path d="M1492 150l68-3-8 358h-54z" fill="#AE4A1D" />
      <path d="M1560 147l40 14v344h-48z" fill="#D9743B" />

      {/* Lit ledge caps: the top of each step catches the sky. This is what
          makes the steps read as bedding rather than as an outline. */}
      <g fill="#F7C39B" opacity="0.7">
        <path d="M1148 299l58 8 2 15-62-8z" />
        <path d="M1236 255l64-6 4 15-66 6z" />
        <path d="M1324 199l88-12 4 15-90 12z" />
        <path d="M1438 153l102-6 2 15-102 6z" />
      </g>

      {/* sunlit left shoulder, and the gully that separates it from the mass */}
      <path d="M1148 299L1206 307L1236 255L1300 249L1288 505L1130 505Z"
            fill="#F2AE80" opacity="0.4" />
      <path d="M1236 255L1250 257L1276 505L1242 505Z" fill="#A94518" opacity="0.3" />

      {/* Facets. Broad flat fields are what make drawn rock look like paper, so
          the faces are chipped with small planes tilted the same way as the
          bedding -- some catching light, some not. */}
      <g>
        <path d="M1150 400l60-20 16 44-62 22z" fill="#FFE0C8" opacity="0.16" />
        <path d="M1250 300l58-18 14 38-60 18z" fill="#8F3A12" opacity="0.12" />
        <path d="M1330 430l70-24 14 46-70 24z" fill="#FFE0C8" opacity="0.14" />
        <path d="M1440 250l60-22 14 40-62 22z" fill="#8F3A12" opacity="0.12" />
        <path d="M1160 470l66-22 12 38-66 19z" fill="#8F3A12" opacity="0.12" />
        <path d="M1500 400l66-24 14 42-68 22z" fill="#FFE0C8" opacity="0.14" />
        <path d="M1276 372l52-18 12 34-54 18z" fill="#FFE0C8" opacity="0.12" />
      </g>

      {/* Strata, following the bedding of the rock rather than the outline, and
          crossing the buttresses so the separate faces read as one landform. */}
      <g stroke="#8F3A12" strokeWidth="4" fill="none" opacity="0.2" strokeLinecap="round">
        <path d="M1120 392L1250 352L1380 296L1500 248" />
        <path d="M1160 450L1300 404L1440 344L1572 288" />
        <path d="M1232 498L1362 452L1492 398L1600 352" />
        <path d="M1296 252L1402 216" />
        <path d="M1424 322L1544 270" />
      </g>

      {/* the arch -- sea and haze read straight through it */}
      <path d="M1112 505v-77l24-34 32-16 34 14 26 36v77z" fill="url(#ikf-arch)" />
      <path d="M1112 496h116v9h-116z" fill="#8FB8D4" />
      <path d="M1112 428l24-34 32-16 34 14 26 36" stroke="#A94518" strokeWidth="7"
            fill="none" opacity="0.28" />

      {/* A broken shelf at the waterline, and in front of it a nearer spur at
          full saturation. A darker near plane overlapping a lighter far one is
          what gives the base of the cliff depth. */}
      <path d="M1232 505v-18l38-6 22 10 74-8 26 8 96-12 52 6 60-10v30z"
            fill="#A94518" opacity="0.22" />
      <path d="M1318 505l26-36 30 6 18-20 34 10 26-16 40 12 44-8 64 16v36z"
            fill="#9E4118" opacity="0.7" />
      {/* the cliff throws its weight onto the water */}
      <path d="M1046 505h554v46l-260-6-234-14z" fill="url(#ikf-water-shadow)" />
      {/* haze at the waterline, pushing the base of the cliff back */}
      <rect x="0" y="474" width="1600" height="34" fill="url(#ikf-haze)" opacity="0.5" />

      {/* THE BEACH, which gets the lower third and planes of its own: wet sand
          at the waterline, then two drier and lighter steps up the shore, with
          the foam drawn along the same curve so the two agree. */}
      <path d="M0 706C220 700 380 682 620 676S1080 660 1600 648V900H0Z" fill="#DCC9A8" />
      <g stroke="#FFFFFF" fill="none" strokeLinecap="round">
        <path d="M0 706C220 700 380 682 620 676S1080 660 1600 648" strokeWidth="15" opacity="0.85" />
        <path d="M40 692C240 684 400 668 640 662" strokeWidth="6" opacity="0.55" />
        <path d="M760 660C960 652 1180 642 1560 634" strokeWidth="6" opacity="0.5" />
        <path d="M180 676C320 670 420 662 560 656" strokeWidth="4" opacity="0.4" />
      </g>
      <path d="M0 762C260 756 420 740 700 732S1180 716 1600 706V900H0Z" fill="#E9DAC0" />
      <path d="M0 834C300 828 480 814 780 806S1220 792 1600 784V900H0Z" fill="#F4E9D6" />
      <g stroke="#DCC9A8" fill="none" strokeWidth="3" opacity="0.55" strokeLinecap="round">
        <path d="M120 812c180 10 360 2 540 10" />
        <path d="M840 786c200 8 400 2 620 8" />
        <path d="M200 868c260 10 520 2 780 10" />
      </g>

      {/* The ball, drawn as a ball. A football is panelled with a pentagon at
          the point nearest the viewer and hexagons around it; getting that
          wrong is what makes a drawn ball read as a placeholder. Shaded so it
          sits on the sand rather than floating as a flat disc. */}
      <g transform="translate(1020 748)">
        <ellipse cx="34" cy="64" rx="32" ry="8" fill="#C4A87F" opacity="0.4" />
        <circle cx="34" cy="34" r="33" fill="url(#ikf-ball)" stroke="#C4CDD6" strokeWidth="1" />
        <path d="M34 14l14 10.2-5.4 16.5H25.4L20 24.2z" fill="#1B2A36" />
        <g stroke="#1B2A36" strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M34 14V2" />
          <path d="M48 24.2l11.4-3.7" />
          <path d="M42.6 40.7l7 9.7" />
          <path d="M25.4 40.7l-7 9.7" />
          <path d="M20 24.2L8.6 20.5" />
        </g>
        <path d="M34 2l10 3.2-1.5 4.6-8.5 2-8.5-2L24 5.2z" fill="#1B2A36" opacity="0.9" />
        <path d="M59.4 20.5l4 9.6-3.8 3.2-7.9-3.6-2.3-5.5z" fill="#1B2A36" opacity="0.9" />
        <path d="M49.6 50.4l-2.6 9.9-5-1.2-3.6-8 2.6-4.6z" fill="#1B2A36" opacity="0.9" />
        <path d="M18.4 50.4l2.6 9.9 5-1.2 3.6-8-2.6-4.6z" fill="#1B2A36" opacity="0.9" />
        <path d="M8.6 20.5l-4 9.6 3.8 3.2 7.9-3.6 2.3-5.5z" fill="#1B2A36" opacity="0.9" />
        <ellipse cx="22" cy="18" rx="11" ry="8" fill="#FFFFFF" opacity="0.5" transform="rotate(-28 22 18)" />
      </g>

      {/* birds */}
      <g stroke="#3F5A6E" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6">
        <path d="M980 250c9-10 18-10 27 0" />
        <path d="M1042 226c9-10 18-10 27 0" />
        <path d="M1006 306c8-9 16-9 24 0" />
      </g>
    </Box>
  );
}

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
      borderRadius: '10px',
      '& fieldset': { borderColor: LINE },
      '&:hover fieldset': { borderColor: '#C3CFDA' },
      '&.Mui-focused fieldset': { borderColor: NAVY, borderWidth: '1px' },
      '&.Mui-focused': { boxShadow: `0 0 0 3px ${NAVY}1A` },
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
    mt: 2.5, py: 1.6, borderRadius: '10px',
    bgcolor: NAVY, color: '#FFFFFF',
    fontSize: '0.9375rem', fontWeight: 600, textTransform: 'none', boxShadow: 'none',
    transition: 'background-color 140ms cubic-bezier(0, 0, 0.2, 1)',
    '&:hover': { bgcolor: NAVY_DEEP, boxShadow: 'none' },
    '&.Mui-disabled': { bgcolor: '#93A8BC', color: '#FFFFFF' },
  };

  const secondaryBtnSx = {
    py: 1.5, borderRadius: '10px',
    border: '1px solid ' + LINE, bgcolor: '#FFFFFF', color: INK,
    fontSize: '0.9375rem', fontWeight: 600, textTransform: 'none',
    transition: 'background-color 140ms cubic-bezier(0, 0, 0.2, 1), border-color 140ms cubic-bezier(0, 0, 0.2, 1)',
    '&:hover': { bgcolor: '#F6F8FA', borderColor: '#C3CFDA' },
  };

  const backBtnSx = {
    mt: 1.5, py: 1.25, borderRadius: '10px',
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
    <Box sx={{
      minHeight: '100vh',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: { xs: 0, md: 5 },
      overflow: 'hidden',
      background: `linear-gradient(160deg, ${SKY} 0%, #C7DCEA 45%, #E9F0F5 100%)`,
    }}>
      {/* The scene is the PAGE, not a panel beside the form. In the reference it
          runs edge to edge and the card floats on it, which is what gives the
          screen depth — a boxed split would read as two rectangles. */}
      <Box sx={{ position: 'absolute', inset: 0, display: { xs: 'none', md: 'block' } }}>
        <ShoreScene />
      </Box>

      <Box sx={{
        position: 'relative',
        width: '100%',
        maxWidth: 1240,
        minHeight: { xs: '100vh', md: 700 },
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1.05fr' },
        borderRadius: { xs: 0, md: '20px' },
        overflow: 'hidden',
        boxShadow: { xs: 'none', md: '0 30px 90px rgba(12,41,66,0.28)' },
      }}>

        {/* ---------------- form ---------------- */}
        <Box sx={{
          p: { xs: 3, sm: 6, md: 7 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          bgcolor: { xs: PANEL, md: 'rgba(252,252,253,0.97)' },
          // The reference does not cut the panel with a straight line — its
          // right edge curves, so the scene reads as continuing underneath
          // rather than being stopped by a box. Widened past the column so the
          // curve has somewhere to bulge into.
          gridColumn: { md: '1 / 2' },
          // A straight edge, not the reference's organic curve. The clipPath
          // attempt produced visible artifacts where the curve met the card's
          // rounded corner, and a clean edge beats a broken flourish.
          width: { md: '100%' },
          zIndex: 2,
        }}>
          <Box sx={{ mb: { xs: 4, md: 6 } }}><IkfMark /></Box>

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

          <Typography sx={{ color: MUTED, fontSize: '0.9375rem', lineHeight: 1.6, maxWidth: '34ch', mb: 4 }}>
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
              <Box sx={{ mt: 2, textAlign: 'center', fontSize: '0.875rem', color: MUTED }}>
                {countdown > 0 ? (
                  'Resend available in ' + countdown + 's'
                ) : (
                  <Link
                    component="button"
                    type="button"
                    onClick={resendOtp}
                    underline="hover"
                    sx={{ color: NAVY, fontWeight: 600 }}
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

          {/* The other two doors. A funder who lands here needs a way across,
              and so does an operations user — this is the only screen where
              naming the other surfaces helps rather than leaking. */}
          <Box sx={{
            mt: 5, pt: 3, borderTop: `1px solid ${LINE}`,
            display: 'flex', gap: 3, flexWrap: 'wrap',
            fontSize: '0.875rem', color: MUTED,
          }}>
            <Link component={RouterLink} to="/login" underline="hover" sx={{ color: NAVY, fontWeight: 600 }}>
              TTA operations
            </Link>
            <Box component="span">Funders: use the link in your invitation email.</Box>
          </Box>
        </Box>

        {/* ---------------- caption over the scene ---------------- */}
        <Box sx={{
          position: 'relative',
          display: { xs: 'none', md: 'block' },
          minHeight: 700,
        }}>
          {/* Top-right links, as the reference has them. Real destinations
              only: no About/Impact/Partner pages exist in this app, and a nav
              that goes nowhere is worse than no nav. */}
          <Box sx={{
            position: 'absolute', top: 34, right: 40,
            display: 'flex', gap: 3, alignItems: 'center',
            fontSize: '0.875rem', fontWeight: 600, color: '#0E2E4A',
          }}>
            <Link component={RouterLink} to="/login" underline="hover" sx={{ color: 'inherit' }}>
              TTA operations
            </Link>
          </Box>

          <Box sx={{ position: 'absolute', left: 40, right: 40, bottom: 44, color: '#0E2E4A' }}>
            <Box sx={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.16em',
              textTransform: 'uppercase', opacity: 0.78, mb: 0.75,
            }}>
              Corporate Social Responsibility
            </Box>
            <Box sx={{
              fontSize: '1.375rem', fontWeight: 600, lineHeight: 1.3, maxWidth: '22ch',
              textShadow: '0 1px 12px rgba(255,255,255,0.55)',
            }}>
              Delivery, spend and reporting against every grant.
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
