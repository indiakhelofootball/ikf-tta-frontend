# Pass 4.5 — Session / token expiry

**Date:** 2026-08-03 · **Mode:** read-only

**Question:** is the single-flight guard actually covering every refresh path?

## Answer

**Yes — within a single browser tab. No, across tabs.**

The guard in `api.js:100–134` is correct and it covers **every** API call in the
application, because every API module routes through `apiService.request` and
`refreshToken()` has exactly one caller. I checked all five direct `fetch()` calls
outside `api.js`: two are the postal-pincode lookup, two fetch local blobs/assets,
one is commented out. **None touches your API.** So there is no second refresh
path to miss.

But `_refreshInFlight` is an instance field on a per-JS-context singleton. **Two
open tabs are two contexts and two guards** — so the exact bug the guard was
written for reproduces the moment a user has the app open twice.

**Count: 6 findings (1 high, 2 medium, 3 low).**

---

## The guard, and what it does right

```js
async refreshToken() {
  if (this._refreshInFlight) return this._refreshInFlight;
  this._refreshInFlight = (async () => { ... })();
  return this._refreshInFlight;
}
```

The comment above it is one of the best in the codebase — it names the exact
mechanism (parallel 401s → each starting its own refresh →
`ROTATE_REFRESH_TOKENS` + `BLACKLIST_AFTER_ROTATION` → the first refresh
blacklists the token → siblings rejected → force-logout of a valid session).

Two details it gets right that are easy to get wrong:

- `_refreshInFlight` is cleared in `finally`, **after** the result settles, so a
  later 401 can refresh again rather than being stuck on a resolved promise.
- The 401 handler reads `tta_user`'s role *before* clearing storage, so an expired
  funder is redirected to their branded portal login rather than the internal
  `/login` — which does not exist in the split client bundle.

---

## Findings

### S-1 · The guard is per-tab; two tabs still blacklist each other — **HIGH**

`_refreshInFlight` lives in one JavaScript context. Open the app in two tabs, leave
both idle past the 24-hour access-token lifetime, then click in each: both tabs
send their own refresh with the **same** stored refresh token. The first rotates
and blacklists it; the second gets a 401 from `/auth/token/refresh/`, returns
`false`, and force-logs-out — **with a session that is perfectly valid.**

Worse, both tabs share `localStorage`, so tab A's rotation writes a new
`tta_refresh` that tab B may read mid-flight, producing a race whose outcome
depends on timing.

Two tabs is not an exotic scenario for this app — a payments operator with the
Payments screen and the Banking screen open is the normal working pattern.

**Fix shape:** move the single-flight coordination into `localStorage` (a lock key
with a timestamp) or a `BroadcastChannel`, so the guard is per-*browser* rather
than per-tab. Or set `ROTATE_REFRESH_TOKENS = False`, which removes the whole
class of problem at a stated security cost.

### S-2 · Logging out does not revoke the refresh token — **MEDIUM**

`accounts/views.py:109–134` implements `LogoutView` correctly: it takes
`refresh_token`, calls `token.blacklist()`, returns 205.

**Nothing calls it.** `AuthContext.logout()` (`:312–325`) only removes
`localStorage` keys and clears the timer. Grep for `authAPI.logout` across `src/`
returns zero call sites; the three `logout()` calls are all the local function.

So after a user clicks Sign Out, their refresh token remains valid on the server
for the full `REFRESH_TOKEN_LIFETIME` of **30 days**. A token captured before
logout (shared machine, browser backup, devtools, XSS) survives the logout that
was supposed to end it.

The endpoint is built and tested. It just is not wired up.

### S-3 · Changing a password does not invalidate existing sessions — **MEDIUM**

`ChangePasswordView` (`accounts/views.py:170–196`) verifies the old password,
validates the new one against Django's validators, calls `set_password` and
`save()`. Correct as far as it goes.

It does **not** blacklist the user's outstanding refresh tokens. With
`ACCESS_TOKEN_LIFETIME = 24 hours` and `REFRESH_TOKEN_LIFETIME = 30 days`, anyone
already holding this user's tokens keeps full access for up to 30 days after the
password change.

This matters because "change my password" is what a user does *when they think
their account is compromised* — and in this system it does not lock the attacker
out.

### S-4 · Two independent expiry clocks that disagree — **MEDIUM**

| Layer | Setting | Value |
|---|---|---|
| Frontend | `SESSION_TIMEOUT` | **8 hours** |
| Frontend | `REMEMBER_ME_DURATION` | **7 days** |
| Backend | `ACCESS_TOKEN_LIFETIME` | **24 hours** |
| Backend | `REFRESH_TOKEN_LIFETIME` | **30 days** |

Neither knows about the other. Consequences:

- **Without "remember me":** the frontend force-logs-out at 8 hours while the
  backend token is still valid for another 16. The session ends because a
  `setTimeout` fired, not because anything expired.
- **With "remember me":** the frontend holds a session for 7 days, silently
  rotating refresh tokens. The user's "session" is really 7 days long.
- The frontend clock is `tta_login_time` in `localStorage` — **a value the user can
  edit**. It is not a security control (the server still checks the JWT), but it
  means the 8-hour policy is advisory only.

### S-5 · The 8-hour timer runs from login, not from activity — **LOW (but visible daily)**

```js
const resetActivityTimer = () => { ... };   // AuthContext.jsx:159
```

It is exported through the context (`:339`) and **called by nothing**. Grep across
`src/` returns only the definition and the export.

So `startSessionTimer` is armed once at login/restore and never extended. A user
who logs in at 09:00 and works continuously is logged out at **17:00, mid-task**,
regardless of activity.

And the logout is announced with a **blocking `window.alert()`**
(`AuthContext.jsx:152`), which freezes the page until dismissed and cannot be
styled or deferred — so an unsaved form is lost behind a modal dialog the user
cannot postpone.

### S-6 · A restored session is trusted without validating the token — **LOW**

`initSession` (`:85–110`) restores `user` from `localStorage` if `tta_login_time`
is within the timeout. It never verifies the token is still good — no `/auth/me/`
call, no decode, no expiry check on the JWT itself.

Result: after a server-side revocation (user deleted, token blacklisted, key
rotated), the app renders a fully logged-in UI until the first API call returns
401. Since that first call is usually a data fetch whose failure is swallowed
(Pass 4.1), the user may see a logged-in shell with no data and no explanation
before the redirect eventually fires.

---

## What is clean

- **The single-flight guard covers every in-tab refresh path.** Verified
  exhaustively: one caller, and no API-touching `fetch()` outside `apiService`.
  The pass question's answer is yes.
- The 401 → refresh → retry-once flow is correct and does not loop.
- Role-aware redirect on expiry (internal vs funder portal), with the reasoning
  documented.
- `SIGNING_KEY = SECRET_KEY` with `HS256`, and `SECRET_KEY` fails closed in
  production — so token forgery is not possible unless the key leaked. **Which is
  exactly why Pass 0.1's S-2 needs answering.**
- Throttling on the anonymous auth endpoints: login 10/min, otp-request 5/min,
  otp-verify 10/min, per IP.
- `token_blacklist` is installed and working — the dump shows
  `token_blacklist_outstandingtoken` at 0.11 MB, i.e. rotation is genuinely
  happening in production.

---

## ✓ Pass complete

- **Do I have a number?** 6 findings; 1 refresh path, fully covered in-tab; 0 of 5
  non-`apiService` `fetch()` calls bypass the guard.
- **Have I seen one with my own eyes?** Yes — `api.js:100–134` and
  `AuthContext.jsx:85–165, 312–325` read in full; `resetActivityTimer` and
  `authAPI.logout` confirmed to have zero call sites.
- **Do I know what the user experiences?** Yes — for S-1, a spurious "session
  expired" logout in the second tab; for S-5, a forced logout with a blocking
  alert at exactly 8 hours regardless of what they were doing.

**Two one-line fixes worth doing immediately:** call `authAPI.logout(refresh)`
from `AuthContext.logout()` (S-2), and wire `resetActivityTimer` to a debounced
document-level activity listener (S-5). Both are contained, both are already
built, and both remove a daily annoyance.
