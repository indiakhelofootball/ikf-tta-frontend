# Work Status & Plan — RBAC, User Management, Courier

Snapshot of everything in flight as of 2026-06-10. All changes below are **uncommitted** in the working tree unless stated. Frontend repo = `D:\tta_frontend-main`; backend repo = `tta_backend/` (separate, never mix commits).

---

## 1. What this work is about

Two threads run in parallel:

1. **Authorization overhaul** — move from the old role-based system (SUPER_ADMIN / ADMIN / REP hardcoded) to a **UI-managed, per-user, per-module grant system** ("Access Control"), enforced server-side. SUPER_ADMIN creates user logins and ticks View/Edit per module.
2. **Courier slip** — make the downloadable courier PDF match IKF's official branded package-slip artwork, generated from live data.

---

## 2. DONE (in the working tree, verified)

### 2.1 User Management page (frontend)
- New `src/components/users/UserManagementPage.jsx` — SUPER_ADMIN creates logins (first/last name, email, password) and lists users.
- `permissionsAPI.createUser` in `src/services/api.js` → `POST /auth/register/`.
- Route `/user-management` (SUPER_ADMIN-only) in `App.js`; sidebar entry in `Sidebar.jsx`.
- Created users default to role REP with zero grants (no role picker — adding `role` to the register serializer was rejected).

### 2.2 Branded courier slip PDF (frontend only)
- Rewrote `downloadPDF` in `src/components/courier/CourierManagementPage.jsx` to a branded landscape layout matching the WhatsApp reference image: To block, indigo `# / Item / Qty` table + totals, IKF logo, From block (IKF Thane), "Aap Khelo, Mauka Hum Denge!" tagline, filename `Package Slip - {City}.pdf`.
- New `src/components/courier/ikfLogo.js` (logo embedded as base64) and `src/assets/ikf-logo.png`.
- No new dependencies, no backend change. Verified end-to-end via Playwright (PDF button → branded slip downloads).
- Caveat: logo was cropped from the WhatsApp JPEG — swap for the original high-res PNG when available.

### 2.3 Backend RBAC enforcement (pre-existing uncommitted, reviewed this session)
- `permissions/` app: `UserModulePermission`, `AccessRequest`, `registry.py`, `rules.py`, `enforcement.py`. Applied to all 8 domain viewsets. Security-reviewed: server-side, fail-closed, grant endpoints SUPER_ADMIN-only. Solid.

---

## 3. OPEN ISSUES (found, not yet fixed)

### 3.1 CRITICAL — RBAC is non-functional for non-admin users
Two authorization systems coexist and conflict:
- Routes in `App.js` still use old `RoleBasedRoute allowedRoles={[SUPER_ADMIN, ADMIN]}` (role-based).
- The new system grants access per-user regardless of role; created users are REP.

Result: grant a REP a module → sidebar shows it → clicking it → `RoleBasedRoute` redirects to `/unauthorized`. **Granted REPs can never open any module.** Proven live (`reptest@demo.com` + vendors grant → /vendors = Access Denied).

### 3.2 Courier address edits don't persist / propagate
- `courier/views.py` PATCH (~line 74) saves only `notes` + `items` — address/snap_* dropped.
- Address is a snapshot from `reps.REPCityAssignment`, live-refreshed only while Draft, frozen on dispatch. A manual address on a Draft+assigned shipment is overwritten on next read.
- Workaround (no deploy): edit the address on the REP City Assignment while shipment is Draft.

### 3.3 No live data sync ("updates don't show for others")
- No polling / websocket / refetch-on-focus / React Query anywhere. Pages fetch once on mount.
- Admin dropdowns (`adminStorage.js` cache) and RBAC grants (`getMine`) load only at login.
- Other users see stale data until they reload / re-login.

### 3.4 User lifecycle gaps
- No disable/deactivate, delete, or admin password reset (UI or backend). `is_active` exposed but unused.
- `register` endpoint allows ADMIN, though UI/registry intend users SUPER_ADMIN-only.
- No audit log on direct grant changes.

---

## 4. PLANNED FIXES (priority order)

1. **[CRITICAL, frontend] Grant-based route guard.** Build `GrantedRoute module="x"` reading `perms.grants` (SUPER_ADMIN always passes). Replace `RoleBasedRoute` on domain routes (`/vendors`, `/payments`, `/work-orders`, `/trials`, `/rep-management`, `/bank-tds`, `/reports`, `/courier`). Keep `/user-management` + `/access-control` SUPER_ADMIN-only. This makes the whole RBAC actually work.
2. **[frontend] Migrate in-page checks.** `usePermission` / `ProtectedByPermission` read the static `roles.js` map, not grants — convert to grants. Retire/repurpose `roles.js` (its PERMISSIONS list is stale: ATM/Scouts/Logistics don't exist).
3. **[frontend] Relogin-free grants.** Add `refreshPerms()` to `AuthContext`, call on window focus so grant changes reflect without re-login.
4. **[backend + frontend] User lifecycle.** Admin endpoint to toggle `is_active` + reset password; surface disable/reset in User Management. Decide whether `register` should be SUPER_ADMIN-only.
5. **[backend] Courier address fix.** Make Draft PATCH persist a manual address override and stop the refresh from clobbering it.
6. **[frontend, broad] Stale data.** Refetch on window focus (cheap), or adopt TanStack Query (real cure). Refresh `adminStorage` more often than login.
7. **[backend] Grant audit log.** Record who changed whose grants and when.

---

## 5. Other uncommitted work (not part of the above)
- **CSR module** — planning only, owner sign-off pending. Docs: `_docs/planning/CSR_IMPLEMENTATION.md`, `CSR_MODULE_SPEC.md`, `CSR_VISUAL_FLOW.md`.
- **Security tracker** — `look_up/SECURITY.md`: C1 SECRET_KEY default, C2 DEBUG, C3 DB_PASSWORD all hinge on one server `.env` check (not yet run); C4 rate-limit, H1 OTP enumeration, H2 token lifetime pending.

---

## 6. Deployment notes
- Branded courier PDF + all RBAC frontend work = **frontend only** → `npm run build` → `deploy.bat`. No backend pull/migrate/restart for those.
- The `permissions/` app + courier address fix (when done) = **backend** → push backend repo, pull on server, migrate, `systemctl restart tta`.

---

## 7. Cleanup (local only)
Test artifacts left in repo root: `_demo_walkthrough.py`, `_gen_courier_pdf.py`, `_rep_route_test.py`. Local SQLite test data: `reptest@demo.com`, shipment `CR-2026-0001`. Delete before committing.
