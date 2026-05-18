# Firebase Phone OTP — Implementation Plan

**Created**: 2026-03-16
**Status**: Pending — waiting for Firebase project setup

---

## Overview

Add phone OTP as a mandatory second step during login. The existing email+password flow stays as step 1. Firebase Phone Auth handles SMS delivery and verification (free up to 10K/month).

---

## Flow

```
Step 1: User enters email + password
         └─> Backend validates credentials (does NOT issue JWT tokens yet)
         └─> Returns: pre_auth_token + masked phone number + full phone number

Step 2: Frontend triggers Firebase signInWithPhoneNumber()
         └─> Firebase sends SMS OTP to user's phone
         └─> User enters 6-digit OTP
         └─> Firebase verifies OTP client-side
         └─> Returns Firebase ID token

Step 3: Frontend sends Firebase ID token + pre_auth_token to backend
         └─> Backend verifies Firebase token via firebase-admin SDK
         └─> Backend checks phone number matches user record
         └─> Backend issues SimpleJWT tokens (access + refresh)
         └─> Login complete — same flow as before from here
```

---

## Pre-requisites (Manual — Abhishek)

Before coding begins, set up Firebase:

- [ ] Create Firebase project at https://console.firebase.google.com
- [ ] Enable **Phone Authentication** in Console → Authentication → Sign-in method
- [ ] Download **service account JSON** from Project Settings → Service accounts → Generate new private key
- [ ] Copy **web app config** (apiKey, authDomain, projectId, appId) from Project Settings → Your apps → Web app
- [ ] Add **authorized domain**: `tta.indiakhelofootball.com` in Console → Authentication → Settings → Authorized domains

---

## Tasks

### TASK 1: Add `phone_number` field to User model

**Repo**: Backend
**File**: `tta_backend/backend/accounts/models.py`

Add after the `role` field:
```python
phone_number = models.CharField(max_length=15, blank=True, default='')
```

Store in E.164 format: `+919876543210`

Then generate migration:
```bash
python manage.py makemigrations accounts
```

**Server**: `migrate accounts` after pull.

---

### TASK 2: Update serializers to include phone_number

**Repo**: Backend
**File**: `tta_backend/backend/accounts/serializers.py`

- **UserSerializer**: Add `phone_number` to `fields` and `read_only_fields`
- **UserRegistrationSerializer**: Add `phone_number` to `fields`, validate E.164 format

---

### TASK 3: Install firebase-admin on backend

**Repo**: Backend
**File**: `tta_backend/requirements.txt`

Add:
```
firebase-admin>=6.0,<7.0
```

**Server**: `/root/TTA/backend/venv/bin/pip install firebase-admin`

---

### TASK 4: Firebase config + utility file

**Repo**: Backend

**File**: `tta_backend/backend/backend/settings.py`
Add at bottom:
```python
FIREBASE_SERVICE_ACCOUNT_KEY = config('FIREBASE_SERVICE_ACCOUNT_KEY', default='')
```

**New file**: `tta_backend/backend/accounts/firebase_utils.py`
- Initialize Firebase Admin SDK (singleton)
- `verify_firebase_token(id_token)` — verifies Firebase ID token, returns decoded claims (contains `phone_number`, `uid`)

**Server .env**: Add `FIREBASE_SERVICE_ACCOUNT_KEY=/root/TTA/backend/firebase-service-account.json`

---

### TASK 5: Rework LoginView + add VerifyOTPView

**Repo**: Backend
**File**: `tta_backend/backend/accounts/views.py`

**LoginView.post() changes:**
1. Authenticate email+password (same as now)
2. Check `user.phone_number` exists
3. If yes: generate pre_auth_token using `django.core.signing.dumps()` (5 min expiry), return:
   ```json
   {
     "success": true,
     "requires_otp": true,
     "pre_auth_token": "signed-token",
     "phone_number": "+91****3210",
     "phone_number_full": "+919876543210"
   }
   ```
4. If no phone number: issue JWT tokens directly (graceful fallback)

**New VerifyOTPView.post():**
1. Receive `pre_auth_token` + `firebase_id_token`
2. Validate pre_auth_token using `signing.loads()` (max_age=300 seconds)
3. Verify Firebase ID token using `verify_firebase_token()`
4. Check `decoded.phone_number == user.phone_number`
5. Issue SimpleJWT tokens (same response shape as current login)

**Helper**: `mask_phone(phone)` — returns `+91****3210`

---

### TASK 6: Add verify-otp URL

**Repo**: Backend
**File**: `tta_backend/backend/accounts/urls.py`

Add:
```python
path('verify-otp/', VerifyOTPView.as_view(), name='verify_otp'),
```

Endpoint: `POST /api/auth/verify-otp/`

---

### TASK 7: Install Firebase JS SDK on frontend

**Repo**: Frontend

```bash
npm install firebase
```

---

### TASK 8: Create Firebase JS config

**Repo**: Frontend

**New file**: `src/services/firebase.js`
- Initialize Firebase app with config from env vars
- Export `auth`, `RecaptchaVerifier`, `signInWithPhoneNumber`

**File**: `.env`
```
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

These are safe to commit — Firebase web API keys are restricted by domain in Firebase Console.

---

### TASK 9: Add verifyOTP API method

**Repo**: Frontend
**File**: `src/services/api.js`

Add method:
```javascript
async verifyOTP(preAuthToken, firebaseIdToken) {
  return this.request('/auth/verify-otp/', {
    method: 'POST',
    body: JSON.stringify({
      pre_auth_token: preAuthToken,
      firebase_id_token: firebaseIdToken,
    }),
  });
}
```

---

### TASK 10: Build OTP input component

**Repo**: Frontend
**New file**: `src/auth/OTPVerification.jsx`

Component receives: `phoneNumberFull`, `maskedPhone`, `onVerified` callback

On mount:
1. Set up invisible RecaptchaVerifier
2. Call `signInWithPhoneNumber(auth, phoneNumberFull, recaptchaVerifier)`
3. Store `confirmationResult`

On OTP submit:
1. `confirmationResult.confirm(otp)` — Firebase verifies
2. `user.getIdToken()` — get Firebase ID token
3. Call `onVerified(firebaseIdToken)`

UI:
- Shows masked phone: "OTP sent to +91****3210"
- 6-digit input boxes
- 60-second countdown timer
- "Resend OTP" button
- Error handling (wrong OTP, expired, etc.)

---

### TASK 11: Rewrite Login.jsx for 2-step flow

**Repo**: Frontend
**File**: `src/auth/Login.jsx`

Add state:
```javascript
const [authStep, setAuthStep] = useState('credentials'); // 'credentials' | 'otp'
const [preAuthToken, setPreAuthToken] = useState(null);
const [phoneNumber, setPhoneNumber] = useState('');
const [maskedPhone, setMaskedPhone] = useState('');
```

On login submit:
- If response has `requires_otp: true` → store preAuthToken, phoneNumber, switch to `authStep: 'otp'`
- If no OTP required → complete login as before

Render:
- `authStep === 'credentials'` → current email/password form (unchanged)
- `authStep === 'otp'` → `<OTPVerification>` component

On OTP verified:
- Call `completeOTPLogin(preAuthToken, firebaseIdToken)`
- Navigate to dashboard

---

### TASK 12: Update AuthContext.jsx

**Repo**: Frontend
**File**: `src/auth/AuthContext.jsx`

Split login into:
1. `login(email, password, rememberMe)` — calls API, returns `{ requires_otp, preAuthToken, ... }` or completes login
2. `completeOTPLogin(preAuthToken, firebaseIdToken, rememberMe)` — calls `api.verifyOTP()`, stores tokens, sets user

Extract current token-storage logic (lines 113-155) into `finalizeLogin(response, rememberMe)` helper used by both functions.

Export both in context value.

---

### TASK 13: Add phone_number to Django admin

**Repo**: Backend
**File**: `tta_backend/backend/accounts/admin.py`

Add `phone_number` to `list_display` and make it editable in the form, so admins can assign phone numbers to users.

---

### TASK 14: Firebase Console config (manual)

- [ ] Add `tta.indiakhelofootball.com` to authorized domains
- [ ] Add `localhost` if not already there (for local testing)

---

## Server Deployment Checklist

```
1. Push backend → git push origin main (from tta_backend/)
2. On server:
   cd /root/TTA/backend/ikf-tta-backend && git pull origin main
3. Install firebase-admin:
   /root/TTA/backend/venv/bin/pip install firebase-admin
4. Upload firebase-service-account.json to /root/TTA/backend/
5. Add to .env:
   FIREBASE_SERVICE_ACCOUNT_KEY=/root/TTA/backend/firebase-service-account.json
6. Run migration:
   cd backend && /root/TTA/backend/venv/bin/python manage.py migrate accounts
7. Assign phone numbers to users:
   /root/TTA/backend/venv/bin/python manage.py shell
   >>> from accounts.models import User
   >>> u = User.objects.get(email='admin@example.com')
   >>> u.phone_number = '+919876543210'
   >>> u.save()
8. Restart:
   sudo systemctl restart tta
   sudo systemctl status tta

9. Push frontend → git push origin main (from tta_frontend-main/)
10. npm run build && deploy.bat
```

---

## Cost

| Tier | Verifications/month | Cost |
|------|-------------------|------|
| Free | Up to 10,000 | $0 |
| Pay-as-you-go | 10,001+ | ~$0.01-0.06/verification |

For your current scale, the free tier is more than enough.

---

## Files Summary

| # | File | Action | Repo |
|---|------|--------|------|
| 1 | `accounts/models.py` | Add phone_number field | Backend |
| 2 | `accounts/migrations/0002_*.py` | Auto-generated | Backend |
| 3 | `accounts/serializers.py` | Add phone_number | Backend |
| 4 | `requirements.txt` | Add firebase-admin | Backend |
| 5 | `backend/settings.py` | Add Firebase config | Backend |
| 6 | `accounts/firebase_utils.py` | **NEW** — SDK init + verify | Backend |
| 7 | `accounts/views.py` | Rework LoginView + VerifyOTPView | Backend |
| 8 | `accounts/urls.py` | Add verify-otp endpoint | Backend |
| 9 | `accounts/admin.py` | Show phone_number | Backend |
| 10 | `package.json` | npm install firebase | Frontend |
| 11 | `.env` | Firebase web config | Frontend |
| 12 | `src/services/firebase.js` | **NEW** — Firebase JS init | Frontend |
| 13 | `src/services/api.js` | Add verifyOTP() | Frontend |
| 14 | `src/auth/OTPVerification.jsx` | **NEW** — OTP input component | Frontend |
| 15 | `src/auth/Login.jsx` | 2-step flow | Frontend |
| 16 | `src/auth/AuthContext.jsx` | Split login + completeOTPLogin | Frontend |
