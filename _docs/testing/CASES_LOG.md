# Login / RBAC Case Log — 2026-08-21

Method: curl against local backend :8000 + source reading. No browser.

| Case | Status |
|---|---|
| TC-LOG-02 | CONFIRMED |
| TC-LOG-03 | CONFIRMED (fix works; proven by seeding a legacy row) |
| TC-LOG-04 | UNABLE TO VERIFY — not testable in this env |
| TC-LOG-05 | CORRECTED — not always /login |

Cleanup: test user `tclog-admin@demo.com` and every row it created were deleted. No leftovers.

---
## TC-LOG-02 — Admin granted exactly 2 modules; server-side deny — CONFIRMED

Test user: `tclog-admin@demo.com` (id 65, role ADMIN), created via `POST /api/auth/register/` as SUPER_ADMIN.

Grant set via `PUT /api/permissions/users/65/` with `{"report_trials":{can_view},"courier":{can_view,can_edit}}` → 200, response grants exactly those two.

Grant count is exactly 2:
`GET /api/permissions/users/` → user 65 `grantedModules: ["courier","report_trials"]` (len 2).

Non-granted module refused **server-side**, logged in as that user (its own JWT, no UI involved):
```
GET /api/vendors/ -> 403 {"detail":"You do not have permission to perform this action on this module."}
```
That message is `ModulePermission.message` at `tta_backend/backend/permissions/enforcement.py:58` — a DRF permission class on the viewset (`vendors/views.py:71`), not a frontend guard. Deny is server-side.

Granted endpoints for the same token: `GET /api/courier/shipments/` 200, `GET /api/reports/trials/` 200.

### One result that looks like a leak and is not
`GET /api/reps/` returned **200** for this user despite no `reps` grant. This is the deliberate read-dependency rule, not a bug:
- `permissions/enforcement.py:82-93` — on SAFE_METHODS, a grant on any module that *depends* on the requested one grants READ.
- `permissions/registry.py:102` — `'courier': ['reps']`. The user holds `courier`, so courier's dependency `reps` is readable. Writes to `reps` still require a `reps` edit grant (the dependency branch is SAFE_METHODS-only).

`GET /api/workorders/` and `GET /api/payments/payment-requests/` returned 404 (those URL paths do not exist under those names) — not evidence either way; the vendors 403 is the deny evidence.

## TC-LOG-03 — Legacy aggregate keys inflating the module count — CONFIRMED FIXED (settled with data)

`_granted_module_keys` DOES exclude legacy aggregates. `tta_backend/backend/permissions/views.py:74-82`:
```python
grantable = registry.grantable_modules()
return sorted(k for k in _grants_dict(user) if k in grantable)
```
and `permissions/registry.py:144-147` — `grantable_modules()` drops anything with `legacy: True`. `'bank'` (registry.py:38) and `'reports'` (registry.py:46) are both marked `legacy: True`.

### Real rows queried (dev DB `tta_backend/backend/dev_local.sqlite3`, table `user_module_permissions`)
```
by module: config 1, csr 6, csr_certificate 4, payments 3, reps 2, vendors 5, workorders 2
rows where module in ('reports','bank'): 0
```
Zero legacy rows exist in this environment, so the Mayur/sauksha complaint cannot be reproduced from existing local data. Mayur and sauksha are prod accounts and are not in this DB.

### So it was reproduced by seeding one
Inserted a legacy row for the TC-LOG-02 test user (id 65) via Django shell: `UserModulePermission(user_id=65, module='reports', can_view=True)`. Raw DB rows for that user then: `['courier','report_trials','reports']`.

With that legacy row present:
- `GET /api/permissions/users/` → `grantedModules: ["courier","report_trials"]`, **count 2** — legacy row excluded, no inflation.
- `GET /api/permissions/users/65/` → `grants: ["courier","report_trials","reports"]` — the detail endpoint returns the raw dict, legacy included, but the grid only renders `grantable_modules()` so it shows 2 boxes.

The "2 modules but really 1" symptom is therefore fixed at the summary level.

### Still true, and worth knowing
`apply_grants` (views.py:28) iterates only `grantable`, so a stale legacy row is **never deleted on save**. Verified: re-PUT the same two grants, response still lists `reports`. The row is inert (it gates nothing, since no view declares `permission_module = 'reports'`) but it is permanent until removed by a data migration.

## TC-LOG-04 — OTP sign-in — NOT TESTABLE LOCALLY (fully wired, but blocked on two hard dependencies)

The feature is completely wired end to end:
- Backend: `otp` in `INSTALLED_APPS` (`backend/settings.py:63`); routes mounted at `backend/urls.py:14` → `POST /api/auth/otp/request/`, `POST /api/auth/otp/verify/` (`otp/urls.py`). Throttles `otp-request 5/min`, `otp-verify 10/min` (settings.py:168-169).
- Frontend: `src/auth/Login.jsx:175` has a three-state `loginMode` (`password` / `otp-phone` / `otp-verify`); `src/services/api.js:167,178` call both endpoints.
- Endpoints are live now — probed without triggering any SMS:
  - `POST /api/auth/otp/request/ {"phone":"123"}` → **400** (format check, `otp/views.py:33`)
  - `POST /api/auth/otp/request/ {"phone":"0000000000"}` → **404** (no such user, `otp/views.py:44`)
  - `POST /api/auth/otp/verify/` → **400**

It cannot be completed locally for two independent reasons:

1. **No SMS credentials.** `send_otp_sms` (`otp/sms.py`) reads `OTP_SMS_API_KEY` / `CLIENT_ID` / `SENDER_ID` / `ENTITY_ID` / `TEMPLATE_ID`, all `config(..., default='')` at `backend/settings.py:210-214`, and none are set in `tta_backend/backend/.env`. The call to the external gateway `panel.optimusconsultants.in:4430` would go out with a blank ApiKey.
2. **No user has a phone number.** Query on the dev DB: `users with phone: 0 of 20`. `OTPRequestView` looks the user up by `phone` (`otp/views.py:41`), so every request 404s before reaching the SMS call.

Even with a phone seeded, the code is never returned in the API response — it is stored only as a SHA-256 hash (`otp/views.py:73`) and delivered by SMS. There is no dev bypass, no console print, no `settings.DEBUG` shortcut. Verifying an actual OTP round trip requires a real handset or a stub of `otp.sms.send_otp_sms`.

Stated plainly: **OTP sign-in is not testable in this dev environment without code or data changes, and no live OTP was sent.**

## TC-LOG-05 — Session expiry / 401-refresh path — CORRECTED

**It does not always dump the user at `/login`.** The redirect target is computed per session.

### The path
`src/services/api.js:25-49` — on a 401 with a token present, `request()` calls `refreshToken()`:
- success → retry the original request with the new access token (line 29-36);
- failure → read the role *before* clearing (`storedRole()`, line 42), clear `tta_token` / `tta_refresh` / `tta_user`, call `redirectToLoginDoor(expiredRole)`, throw `'Session expired'`.

`refreshToken()` (`src/services/api.js:94-132`) returns `false` on no stored refresh token, on a non-ok response, or on a network throw. It is de-duplicated behind `_refreshInFlight` (line 103) so parallel 401s share one refresh — necessary because SimpleJWT runs `ROTATE_REFRESH_TOKENS` + `BLACKLIST_AFTER_ROTATION` (`backend/settings.py:179-180`), which would blacklist the token out from under sibling refreshes.

Server side confirmed live:
```
POST /api/auth/token/refresh/ {"refresh":"garbage"} -> 401
GET  /api/vendors/  Authorization: Bearer garbage   -> 401
```

### Which door
`src/auth/loginDoor.js`, `expiredSessionLoginPath()`:
1. current path is `/csr` or under `/csr/` → `/csr/login`
2. stored role is `CSR_CLIENT` → `/client/<tta_client_slug>/login`, or `/client` if no slug is stored
3. otherwise → `/login`

`redirectToLoginDoor()` also skips the redirect when already on the target path, so a failed request fired from a login screen does not reload in a loop.

The same module is used by `AuthContext.jsx`, `RequireAuth.jsx`, `RoleBasedRoute.jsx`, `GrantedRoute.jsx` and `DashboardLayout.jsx`, so deliberate sign-out and expiry land on the same door.

### The nuance worth flagging
Routing is by **current URL path**, not by the door the user actually authenticated through. There is no stored "door" value. Consequences:
- A CSR_OPS user who signed in at `/csr/login` but whose session expires while on a non-`/csr` route lands at `/login`, not `/csr/login`.
- An ordinary TTA operator whose session expires while on a `/csr/*` route lands at `/csr/login`.

For CSR_CLIENT the role is stored, so that branch is reliable regardless of path. For the two internal doors it is a path heuristic. In practice the two internal doors share a bundle and `/login` works for both, so this is a cosmetic mismatch, not a dead end — the dead end that the module was written to prevent (funder sent to a route absent from their bundle) is correctly handled.

There are no unit tests covering `loginDoor.js`.

