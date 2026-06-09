# Auth System Plan — Internal + External Users

Status: proposal. Spans both repos (frontend `D:\tta_frontend-main`, backend `tta_backend/`). Backend changes commit to the backend repo, frontend to the frontend repo — never mixed.

---

## 1. Goal

Support two populations of users on one platform:

- **Internal** (inside IKF): SUPER_ADMIN, ADMIN, FINANCE, and other office roles. Full or scoped access to the admin app.
- **External** (outside IKF): REPs (field partners) and Vendors. Self-service, see only their own data.

Login by **email + password** and **phone + OTP**. **Self-signup** allowed for external users (with verification + approval); internal users stay admin-invited. Libraries: anything free/open-source.

---

## 2. Why the current system can't do this yet

Read the code, not memory. Three structural facts decide the design:

1. **Authorization is cosmetic.** The rich `PERMISSIONS`/`ROLE_PERMISSIONS` map in `src/auth/roles.js` lives only in the browser. The backend enforces one rule (`accounts/permissions.py` → `IsAdminForWrite`): everyone reads, admins write. Any ADMIN token can hit any write endpoint regardless of the frontend permission map. **Real authz must move server-side** — the frontend map becomes a UI mirror, not the source of truth.

2. **External users have no account to log into.** `reps/models.py` (`REP`) and `vendors/models.py` (`Vendor`) are standalone records with **no foreign key to `User`**. There is no way today to say "this login *is* this rep." Without that link, "show me only my work orders" is unanswerable on the server.

3. **One flat role field.** `User.role` mixes internal and external roles in a single list of 3 choices. As roles grow (FINANCE, AUDITOR, VENDOR…), a flat field gets ambiguous — is REP internal or external? We need to separate *which world a user belongs to* from *what they do in it*.

Everything below follows from these three.

---

## 3. The mental model: two axes, and authn ≠ authz

Keep two ideas separate or the design collapses into spaghetti:

- **Authentication** = proving who you are (password, OTP). Mostly already built.
- **Authorization** = what you're allowed to do once authenticated. This is the real work.

And authorization itself has **two axes** — don't conflate them:

| Axis | Question | Mechanism |
|------|----------|-----------|
| **Domain** | Inside or outside the org? | `User.user_type` = `INTERNAL` \| `EXTERNAL` |
| **Role** | What job within that domain? | `User.role` = SUPER_ADMIN, ADMIN, FINANCE, REP, VENDOR… |

Plus a third concern that only external users need:

- **Object scoping** (row-level): even with the VIEW_WORK_ORDERS permission, a vendor sees *only work orders tied to their own Vendor record*. This is enforced by the `User → REP/Vendor` link, not by roles.

Roles answer "what kinds of things." Object scoping answers "which specific rows." Both are required.

---

## 4. Target architecture

### 4.1 User model changes (`accounts/models.py`)

Add to the existing custom `User` (one migration, `AddField` only — non-destructive):

```python
USER_TYPE_CHOICES = [('INTERNAL', 'Internal'), ('EXTERNAL', 'External')]
user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES, default='INTERNAL')

# nullable links — an external login points at exactly one record
rep     = models.OneToOneField('reps.REP',       null=True, blank=True, on_delete=models.SET_NULL, related_name='account')
vendor  = models.OneToOneField('vendors.Vendor', null=True, blank=True, on_delete=models.SET_NULL, related_name='account')

# self-signup lifecycle
APPROVAL_CHOICES = [('PENDING', 'Pending'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected')]
approval_status = models.CharField(max_length=10, choices=APPROVAL_CHOICES, default='APPROVED')
email_verified  = models.BooleanField(default=False)
```

Expand `ROLE_CHOICES` to include `FINANCE`, `VENDOR`, and whatever internal roles you confirm (see Open Questions). Login gate becomes: `is_active AND approval_status == 'APPROVED' AND (email_verified OR invited)`.

The `OneToOneField` is the spine from §2.2 — it makes object scoping possible.

### 4.2 Server-side authorization (the core build)

Define the permission catalog **once, on the backend** (e.g. `accounts/permissions_map.py`) — mirror of today's `roles.js` but authoritative. Then:

- A DRF permission class maps `(role, view action)` → allow/deny, replacing the blunt `IsAdminForWrite`.
- For external users, a queryset filter scopes every list/detail endpoint to `request.user.rep` / `.vendor`. (DRF `get_queryset()` override per viewset, or a shared mixin.)
- Frontend `roles.js` is regenerated from / kept in sync with the backend map and used only to hide UI — never as the security boundary.

### 4.3 Auth flows

| Flow | Who | Path |
|------|-----|------|
| Email + password login | all | exists (`LoginView`) — keep |
| Phone + OTP login | reps, vendors | exists (`otp` app) — keep, extend to vendors |
| Admin-invited create | internal + optionally external | exists (`RegisterView`), extend with role/user_type |
| **Self-signup** | external | **new** — register → verify email → land in PENDING → admin approves → linked to REP/Vendor |
| Password reset | all | **new** — token email flow |
| Email verification | self-signup | **new** |

The new flows (signup, reset, verify) are exactly what `django-allauth` + `dj-rest-auth` give for free — see §5.

### 4.4 Token / session strategy

Keep SimpleJWT. Current tokens sit in `localStorage` (`AuthContext.jsx`) — XSS-exfiltratable. Acceptable for an internal-only tool; **a real risk once external users and self-signup exist**. Recommendation: move refresh token to an `httpOnly` cookie for external-facing flows. This is a hardening item, not a blocker — flagged in §7, deferred to its own phase so it doesn't stall the rollout.

---

## 5. Library choices (all free / open-source)

Lean on the current stack; add only where it removes real work.

| Need | Recommendation | Why | Alternative |
|------|----------------|-----|-------------|
| Tokens | **SimpleJWT** (keep) | already wired, refresh + blacklist working | — |
| OTP | **existing `otp` app** (keep) | already does hashing/expiry/cooldown/attempts correctly | — |
| Self-signup, email verification, password reset | **django-allauth + dj-rest-auth** | battle-tested, gives all three flows as endpoints; far less custom code than rolling our own | code it by hand (more surface area, more bugs) |
| Object-level authz (does this rep own this row) | **django-rules** *or* DRF `get_queryset` scoping | declarative ownership rules, testable in isolation | plain queryset filters (fine to start) |
| Role→permission enforcement | **custom DRF permission class** off a shared map | small, explicit, no dependency; this is app-specific logic | django-guardian (heavier, per-object rows in DB — overkill here) |

Deliberately **not** recommending a managed provider (Clerk/Auth0/Supabase). For an internal finance tool with an existing Django `User` table and working JWT, migrating auth out is a large, risky move with an external dependency and a free-tier ceiling, for little gain. Revisit only if social login or multi-tenant SSO becomes a hard requirement.

---

## 6. Phased roadmap

Ordered so each phase ships value and de-risks the next. Stop at any phase boundary.

- **Phase 0 — Foundation (no behavior change).** Add `user_type`, `rep`/`vendor` FKs, `approval_status`, `email_verified` to `User`. Migrate (AddField only). Backfill existing users to `INTERNAL`/APPROVED. Expand role choices.

- **Phase 1 — Server-side authz.** Build the authoritative permission map + DRF permission class. Replace `IsAdminForWrite` per viewset. Add queryset scoping mixin for external users. Sync `roles.js` to mirror it. *This closes the biggest security hole and is worth doing even if external users slip.*

- **Phase 2 — External accounts (admin-created).** Admin creates a rep/vendor login and links it to the REP/Vendor record. External user logs in (password or OTP) and sees only their data. Build the external-facing read-only views/portal routes.

- **Phase 3 — Self-signup.** Add allauth/dj-rest-auth. Signup → email verify → PENDING → admin approval queue → link to REP/Vendor on approval.

- **Phase 4 — Hardening.** httpOnly refresh cookie for external flows, rate-limit login, audit log of role/permission changes, password reset for all.

---

## 7. Security checklist (track across phases)

- [ ] Authz enforced server-side, not just in `roles.js` (Phase 1)
- [ ] External users' querysets scoped to their own record — verify no IDOR (Phase 2)
- [ ] Email enumeration: keep the constant-time pattern already in `backends.py`; apply same to signup/reset
- [ ] Rate-limit login + OTP request (OTP already cooldowns; password login does not)
- [ ] Move external refresh tokens to httpOnly cookies (Phase 4)
- [ ] Audit trail for role/approval changes
- [ ] `approval_status` + `email_verified` actually gate login, not just stored

---

## 8. Open questions (need your answer before Phase 0)

1. **Internal roles beyond FINANCE** — who else? (Auditor, Ops, view-only manager?) Each needs a column in the permission matrix.
2. **One login surface or two?** Do external users hit the same `/login` and get routed by `user_type`, or a separate branded portal URL? (Affects routing + token strategy.)
3. **Vendor self-signup** — should vendors self-register, or only reps, with vendors always admin-created? (Vendors carry bank/PAN data — self-signup there is higher risk.)
4. **Linking on approval** — when an external user signs up, do they pick their existing REP/Vendor record, or does the admin link them during approval? (Recommend admin-links, to prevent impersonation.)
5. **OTP for vendors** — `User.phone` is unique; vendors have phones on the `Vendor` record. Confirm vendors authenticate by the `User.phone`, set at account creation.

---

## 9. Permission Model (UI-managed) — DECIDED 2026-06-04

Refines §4.2. Authorization is **per-user, module-level, granted by SUPER_ADMIN through a checkbox UI**, stored in the DB, enforced server-side. Replaces the idea that role alone decides access — role becomes (optionally) a template; the grant rows are the source of truth.

### 9.1 The two-axis split (why DB + registry, not all-DB)

- **Permission** ("does *this user* have access") → varies per user → stored in **DB**.
- **Capability** ("does an operation even exist for this module") → fixed system rule, same for everyone incl. SUPER_ADMIN → lives in a code **registry**.

Putting capability in the DB would make a business invariant (e.g. "TDS is never hand-deleted") an editable toggle — corruptible by a bad screen or UPDATE. So: **DB answers *who*, registry answers *what's even possible*.**

### 9.2 Per-user storage

New table `UserModulePermission` — one row per module a user is granted:

| Field | Type |
|-------|------|
| `user_id` | FK |
| `module` | string |
| `can_view` | bool |
| `can_edit` | bool |

Only two booleans per row. No row = no access. SUPER_ADMIN bypasses grants entirely (role check). New users start with zero grants until SUPER_ADMIN ticks boxes.

### 9.3 What the checkboxes mean

- **View** = read only.
- **Edit** = write = create + edit + delete *together*, but bounded by the module's capability registry.
- No separate Create / Delete / Approve checkboxes.

### 9.4 Module capability registry (code constant — what Edit unlocks)

| Module | Create | Edit | Delete |
|--------|--------|------|--------|
| Vendors / Reps / Trials / TrialCities / Config / Courier | yes | yes | yes |
| Work Orders | yes | yes | yes (unpaid only — status-gated) |
| Payments (Payment Requests) | yes | yes | no (delete via bounce-resolve flow only) |
| Bank (Payment Batches) | yes | yes | no |
| TDS | no | yes | no (audit — corrections only) |
| Reports | — | — | — (View only; Edit checkbox disabled) |
| Users / Permissions | SUPER_ADMIN only | | |

### 9.5 Maker-checker (no separate Approve action needed)

Raise and approve already live in **separate modules** (verified in code):
- **Raise** → Payments module (`payments/PaymentManagementPage.jsx`, `PaymentRequestModal.jsx`)
- **Approve / process / pay / bounce** → Bank module (`bank/BankManagementPage.jsx`)

So separation of duties is achieved by *not granting one person Edit on both*. Decided enforcement: **soft warning** — SUPER_ADMIN may still grant Edit on both Payments + Bank, but gets a "this lets one person raise and approve payments" prompt first. No hard block (that's SUPER_ADMIN's call).

### 9.6 Enforcement

- DRF permission class maps `(module, HTTP method)` → checks `can_view` (safe methods) / `can_edit` (writes) on the user's grant row, then applies the registry to allow/deny create vs delete.
- Frontend `roles.js` reads the same grants only to hide menus/buttons — never the security boundary.
