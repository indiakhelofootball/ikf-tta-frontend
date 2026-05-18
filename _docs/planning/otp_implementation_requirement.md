## OTP (Mobile Phone Login) — Implementation Requirements

### Document control (versioning)

| Item | Value |
|---|---|
| Document name | OTP (Mobile Phone Login) — Implementation Requirements |
| Version | 1.0 |
| Date | 31 Mar 2026 |
| Status | Draft |
| Notes | Prepared for client confirmation and development |

---

### Objective (plain language)

The client wants users to log in using a **mobile number** with an **OTP** (one-time code).

Instead of “email + password”, the user should be able to:

- Enter their **mobile number**
- Receive a **one-time code (OTP)** on their phone
- Enter the OTP and successfully log in

---

### Important note (OTP needs a service provider)

OTP cannot be delivered “directly” by our frontend/backend alone.

To send OTP to a phone, we must use an **OTP delivery provider** (examples: Firebase Phone Auth, Twilio, MSG91, etc.).

So this feature requires:
- A provider to **send** OTP
- A provider to **verify** OTP (or our backend verifies OTP if we choose to handle it ourselves)

---

### Options for OTP provider (explained for non-technical stakeholders)

#### Option A: Firebase Phone Authentication (SMS OTP)

What it means:
- We use **Google Firebase** to send the OTP SMS and confirm whether the code is correct.
- After Firebase confirms the OTP, our app logs the user in.

Why clients choose this:
- Faster implementation (Firebase already has the OTP system)
- Less OTP-specific backend logic to maintain

What is needed from client/IT:
- Approval to use Firebase for OTP
- Firebase project setup (we can do it, but client must approve)
- Add allowed domains for production and local testing

#### Option B: SMS Gateway Provider (Twilio / MSG91 / Textlocal / AWS SNS / Gupshup)

What it means:
- We use a **mobile SMS gateway company** to deliver the OTP SMS.
- OTP verification can be done either:
  - by the provider (they confirm OTP validity), or
  - by our backend (we store OTP temporarily and verify it ourselves).

Why clients choose this:
- They already use a specific SMS vendor
- They want vendor-level controls and reporting

What is needed from client/IT:
- Provider account and access (API key/credentials)
- Sender ID / templates / approvals required by the provider and telecom rules (varies by country)

---

### Chosen approach (current proposal)

Mobile Number + OTP (no password), delivered using **Option A: Firebase Phone Authentication** (SMS OTP).

Reason for this choice:
- Fast to implement
- Reliable OTP delivery + verification flow
- Less custom security logic to maintain

---

### Scope

In scope:
- Mobile number login using OTP
- Resend OTP, cooldown, attempt limits
- Clear user-friendly messages for errors
- Backend login token/session after OTP verification

Out of scope (unless client requests):
- WhatsApp OTP
- User self-registration (sign-up)
- Changing phone number during login

---

### What stays the same (post-login)
- After OTP login, user access inside the app stays the same as it is today (no change to modules or screens).

---

### What we need from the client (required for coding)

This section is the most important. Without these inputs, OTP login cannot be completed.

#### A) OTP provider confirmation
Client must confirm:
- Provider option:
  - Option A: Firebase Phone Authentication, or
  - Option B: Twilio/MSG91/etc.

#### B) Mobile number format to be used in the login page
Client must confirm:
- What the user will type:
  - Local number only (example: 10 digits), or
  - Full number with country code (example: +91xxxxxxxxxx)
- Whether country code is fixed or selectable (if multiple regions are needed)

#### C) OTP rules (values client must approve)
Client must confirm these values:
- OTP digits: **6**
- OTP expiry: **5 minutes**
- Max wrong attempts: **3**
- Resend cooldown: **30 seconds**
- Max resends: **3**

Current proposal: use the values above.

#### D) User list / onboarding (how phone numbers enter the system)
Client must confirm:
- Who adds users and mobile numbers:
  - Option 1: Admin adds/maintains users
  - Option 2: Users self-register (not recommended unless requested)
- Where the “truth” of user phone numbers comes from:
  - Excel/CSV shared by client, or manual entry by admin

Current proposal: Admin maintains user phone numbers (Excel import later if needed).

#### E) Support and recovery text (when OTP fails)
Client must provide:
- Support contact text to show on login screen, e.g.:
  - “If you changed your number or didn’t receive OTP, contact: <name/phone>”

---

### User experience requirements (what the user will see)

#### Step 1: Enter mobile number
- Title: Login
- Field: Mobile Number
- Action button: Send OTP

Validation messages:
- “Enter a valid mobile number”
- “This mobile number is not registered. Please contact support.”

#### Step 2: Enter OTP
After OTP is sent:
- Message: “We sent a 6-digit code to your phone number ending with …1234”
- Field: OTP input (6 digits)
- Action button: Verify & Login
- Secondary actions:
  - Resend OTP (enabled after cooldown)
  - Change Number

Failure messages:
- “OTP is incorrect”
- “OTP expired — please resend”
- “Too many attempts — please try again later”

Success:
- “Login successful”
- Redirect to Dashboard/home

---

### Security and privacy requirements

- Never show full mobile number; show only last 2–4 digits (e.g. “...1234”).
- Do not log OTP values in console or server logs.
- Rate-limit OTP resend to avoid abuse.
- If a user is disabled/inactive in backend, login must be blocked even if OTP is correct.

---

### Backend requirements (what must exist server-side)

Even if OTP verification is done through Firebase, the backend must still:

- Identify which user is logging in (by phone number)
- Return the same kind of login response the frontend already expects (token/session)
- Enforce “active/inactive” status

Minimum backend data needed per user:
- **phoneNumber** (unique)
- **name**
- **access level** (whatever the current system uses internally)
- **status** (Active/Inactive)

---

### Implementation deliverables (what will be built)

#### Frontend deliverables
- Login page updated to support:
  - Mobile number entry
  - OTP entry
  - Resend + cooldown
  - Clear error messages
- Session/token handling remains as today after backend confirms login

#### Backend deliverables
- OTP login endpoints (or OTP token verification endpoint depending on architecture)
- User lookup by phone number
- Return auth token + user details
- Audit logs (optional)

#### Provider configuration deliverables
- If Option A (Firebase):
  - Firebase project configured for Phone Auth
  - Authorized domains for local + production
  - Keys/config added to environment variables (not hardcoded)
- If Option B (Twilio/MSG91/etc.):
  - Provider account configured
  - Required templates/sender IDs approved (as applicable)
  - Credentials stored securely via environment variables

---

### Acceptance testing (client sign-off checklist)

Client can sign off when:
- OTP is received for valid phone number
- OTP login works and user lands on dashboard
- Wrong OTP shows correct error
- Resend works after cooldown
- Unregistered phone shows “contact support”
- Inactive user cannot log in

---

### Open questions (client must answer)

1) Choose provider option: Firebase Phone Auth OR Twilio/MSG91/etc.  
2) Mobile number format: local-only OR include country code?  
3) Who will maintain phone number list (admin vs self registration)?  
4) What support contact should be shown on login screen?  
5) Any OTP content/branding requirement for SMS text?

---

### Final decision summary (current proposal)

- Login method: Mobile number + OTP (no password)
- OTP channel: SMS
- Provider: Firebase Phone Authentication
- Number format: To be confirmed by client
- Rules: 6-digit OTP, 5 min expiry, 3 attempts, resend after 30s, max 3 resends

