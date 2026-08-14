# Pass 2.1 — Server enforcement vs UI hiding

**Date:** 2026-08-03 · **Mode:** read-only · **CORE pass**

**Question:** which privileged endpoints have no server-side check?

## Answer

**None.** Every write endpoint in the application is enforced server-side.

This is the pass that usually produces the worst findings in a vibe-coded app —
the plan calls it *"the commonest vibe-code flaw"* — and this codebase does not
have it. I looked for it specifically and it is not there.

**Count: 0 "UI only" rows. 0 "not at all" rows. 4 findings, none of them an open
endpoint** — they are about *granularity*, *fail-open UI*, and one dead
abstraction that could mislead a future change.

---

## The enforcement map

Every viewset and function view in all 14 backend apps, with what actually gates it:

| Endpoint group | Class / decorator | Gate | Verdict |
|---|---|---|---|
| Work Orders (CRUD, `resolve-bounced`) | `WorkOrderViewSet` | `ModulePermission` · `workorders` | ✅ server |
| Payment Requests (CRUD, `resolve`) | `PaymentRequestViewSet` | `ModulePermission` · `payments` | ✅ server |
| Payment Batches (list, create) | `PaymentBatchViewSet` | `ModulePermission` · `payments`, `http_method_names` blocks PUT/PATCH/DELETE | ✅ server |
| TDS (read, summary) | `TDSRecordViewSet` | `ModulePermission` · `tds`, `ReadOnlyModelViewSet` | ✅ server |
| TDS mark-deposited | `@action` | `get_permissions()` override → `module_permission('payments')` | ✅ server |
| Vendors (CRUD, `bank-details`) | `VendorViewSet` | `ModulePermission` · `vendors` | ✅ server |
| REPs (CRUD, assignments) | `REPViewSet` | `ModulePermission` · `reps` | ✅ server |
| Trials, Trial Cities | `TrialViewSet`, `TrialCityViewSet` | `ModulePermission` · `trials` / `trialcities` | ✅ server |
| Courier (11 function views incl. dispatch/deliver/lost) | `@api_view` ×11 | `module_permission('courier')` on **every one** | ✅ server |
| Config reference data | `ConfigOptionViewSet` | `ReadOpenModulePermission` — reads open to any authenticated user, writes need `config` edit | ✅ server (deliberate) |
| Reports ×5 | `@api_view` ×5 | one dedicated `module_permission('report_*')` each | ✅ server |
| CSR org surface (8 viewsets) | `_CSRViewSet` | `ModulePermission` · `csr` / `csr_certificate` | ✅ server |
| CSR funder onboarding | `CSRClientOnboardView` | `IsAuthenticated` + explicit `_is_admin(request)` on **both** GET and POST | ✅ server |
| Utilisation certificate | `UtilisationCertificateView` | `ModulePermission` · `csr_certificate` | ✅ server |
| Client portal (project/activities/reports) | `_ClientViewSet` | `IsCSRClient` + queryset scoped to one project | ✅ server (see Pass 2.2) |
| User registration | `RegisterView` | `IsAuthenticated` + role check + **separate check that only SUPER_ADMIN can assign non-REP roles** | ✅ server |
| Grant management (users list, set grants, change log) | `UsersListView`, `UserPermissionsView`, `GrantChangeLogView` | `IsSuperAdmin` | ✅ server |
| Access requests (create / list / decide) | `AccessRequestsView`, `DecideAccessRequestView` | `IsAuthenticated` + explicit `is_super_admin` check inside each method | ✅ server |
| Login / OTP request / OTP verify | `LoginView`, `OTPRequestView`, `OTPVerifyView` | `AllowAny` **+ `ScopedRateThrottle`** (10/min, 5/min, 10/min) | ✅ intentional |
| Public branding lookup | `ClientBrandingView` | `AllowAny`, `authentication_classes = []`, throttled 60/min, allowlist serializer | ⚠️ see A-4 |

`DEFAULT_PERMISSION_CLASSES = ['IsAuthenticated']` in `settings.py:162` means even
a view that forgot its decorator would still require a login. **The default is
fail-closed.**

`ModulePermission.has_permission` also fails closed on misconfiguration:

```python
module = getattr(self, 'fixed_module', None) or getattr(view, 'permission_module', None)
if not module:
    return False   # "a viewset opted into ModulePermission but forgot to declare its module"
```

**Exactly 4 endpoints in the entire backend are `AllowAny`**, all four are auth or
pre-auth branding, and all four are rate-throttled. Verified by grep across all
231 backend files.

---

## Findings

### A-1 · No object-level scoping on internal modules — **MEDIUM (probably intentional; confirm)**

`ModulePermission` is a **module-level** check. There is no row-level filtering on
any internal viewset. A user with `view` on `workorders` sees **every** work order
in the system; `reps` shows every REP; `payments` shows every payment request.
`REPViewSet.get_queryset` starts from `REP.objects.all()` with no user filter.

For internal finance staff this is almost certainly correct and intended. It
matters because of one thing: **the `REP` role exists**, and
`ROLE_PERMISSIONS.REP` in the frontend says *"REP can only view their own data"* —
a promise nothing in the backend implements. If any REP-role user has ever been
granted a module, they see everyone's data.

**Check to run:** `SELECT u.email, p.module FROM permissions_usermodulepermission p
JOIN accounts_user u ON u.id = p.user_id WHERE u.role = 'REP';` — any row is a
REP seeing organisation-wide data.

---

### A-2 · The UI grant layer fails *open* for admins and *closed* for everyone else — **MEDIUM**

`src/auth/useGrants.js:18–21` and `src/auth/GrantedRoute.jsx:38–41` share a
fallback: when the `/permissions/me` fetch fails, `perms` is `null` and both fall
back to a role check.

```js
const legacyAdmin = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;
const canView = (mod) => isSuper || (grants ? !!grants[mod]?.can_view : legacyAdmin);
```

Two opposite failures from one line:

- **An ADMIN** whose grants fetch fails sees *every* menu item and every route —
  then gets 403 from the API on each one. Not a data leak (the server holds), but
  the app becomes a wall of failures with no explanation of why.
- **A granted non-admin** whose grants fetch fails sees **nothing**. Their whole
  navigation disappears. No error is shown — `perms` is simply `null`. This is
  the same *silent-empty* shape as Pass 4.1, applied to the permission system,
  and it is a strong candidate for "the app randomly logs me out of everything".

The comment says the fallback exists *"so admins are never locked out"*. That is a
reasonable goal; the cost is that neither outcome tells the user what happened.

---

### A-3 · Destructive `@action`s are gated by the *create* verb, not delete — **LOW**

`rules.decide` maps `POST → can_edit AND registry.can_create(module)`. DRF
`@action(methods=['post'])` endpoints therefore check the **create** capability
regardless of what they do.

`WorkOrderViewSet.resolve_bounced` is a POST that *"permanently delete[s] this WO
and all its bounced PRs"*. It is checked against `can_create('workorders')`, not
`can_delete('workorders')`. Both happen to be `True` for `workorders` today, so
there is **no live gap** — but the registry's whole purpose is to let you say
"this module can be created but never deleted" (which it does say for `payments`
and `csr_certificate`), and a POST-shaped delete silently escapes that rule.

If a future action does a destructive POST on `payments` — where `can_delete` is
deliberately `False` — it would be permitted. Worth a one-line note in
`registry.py` before that happens.

---

### A-4 · Public branding endpoint allows enumerating your funder list — **LOW**

`GET /api/client/branding/<slug>/` is `AllowAny` with `authentication_classes = []`.
It returns `displayName`, `logoUrl`, `loginImageUrl`, and brand colours for any
active branding row.

Slugs are short and human-chosen (the demo seed uses `acme`), so an unauthenticated
visitor can walk a wordlist and learn **which CSR funders you work with**. The
allowlist serializer is correct — no project id, no `is_active`, nothing
financial — and the 60/min throttle is a deliberate anti-enumeration measure that
the code comments call out by name.

This is a business-confidentiality question, not a security hole. Flagging it so
the decision is conscious.

---

### A-5 · `src/auth/roles.js` contains a large dead permission system — **LOW (cleanup, but read the warning)**

`PERMISSIONS` (35 constants) and `ROLE_PERMISSIONS` describe a **completely
different** authorisation model from the one the app runs on: `APPROVE_PAYMENT`,
`APPROVE_WORK_ORDER`, `VIEW_ATM`, `MANAGE_ATM`, `ASSIGN_SCOUTS`,
`APPROVE_VENDOR_DOCS`. None of these correspond to anything in
`permissions/registry.py`. There is no ATM module, no scout assignment, and — as
Pass 1.4 found — no approval step anywhere.

It is not entirely dead: `AuthContext.jsx:196,249` stuffs `ROLE_PERMISSIONS[role]`
onto the user object, `src/utils/permissions.js` reads it, and
`ProtectedComponent.jsx` documents a `usePermission(PERMISSIONS.EDIT_TRIAL)` API.
So a developer adding a feature can reasonably reach for `PERMISSIONS.APPROVE_PAYMENT`,
wire a button to it, and ship a control that is gated by **nothing on the server** —
manufacturing exactly the vulnerability this pass came looking for and didn't find.

**This is the one Tier 6 item worth doing early:** delete it, or mark it
`@deprecated` at the top of the file with a pointer to `useGrants`.

---

## What this pass confirms about the codebase

The `permissions/` app is the strongest thing in this repository, and it is worth
saying plainly so you don't spend fixing effort here:

- `rules.py` is **pure logic** — no Django, no DB, no DRF — precisely so it can be
  unit-tested in isolation. That is a deliberate architectural choice most teams
  never make.
- `registry.py` encodes capabilities as **code constants, not data**, with the
  reasoning written down: *"no permission screen or bad UPDATE can flip them."*
- `EXTERNAL_ROLES` blocks `CSR_CLIENT` from every internal module **before any
  grant lookup**, and the block is repeated defensively in three more places
  (`UserPermissionsView.put`, `AccessRequestsView.post`,
  `DecideAccessRequestView` approve) with a comment explaining each is for
  legacy rows that predate the others.
- `MODULE_DEPENDENCIES` solves the real problem — a payments-only user needs to
  *read* vendors to raise a payment — by unlocking READ only, never write, with
  the frontend components that justify each dependency listed by name in a
  comment.
- `selftest_rules.py` exists.

None of the above is what an AI-generated permission layer looks like. Whoever
built this understood the problem.

---

## ✓ Pass complete

- **Do I have a number?** Yes — 0 unenforced endpoints out of ~60 checked; 4
  `AllowAny` endpoints, all intentional and throttled.
- **Have I seen one with my own eyes?** Yes — `enforcement.py`, `rules.py`, and
  `registry.py` read in full, and every `views.py` in all 14 apps enumerated.
- **Do I know what the user experiences?** Yes — for A-2, a menu that is either
  entirely present and entirely broken, or entirely absent.

**This finding is only as good as Pass 2.4.** Reading says these endpoints are
enforced; only probing proves it. Run 2.4 before you believe this page.
