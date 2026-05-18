# TTA Codebase Audit — 2026-03-27

## 1. Role & Authorization System

### 3 Roles Defined (Backend — `accounts/models.py:46-50`)

| Role | Description |
|------|-------------|
| SUPER_ADMIN | Full access to everything |
| ADMIN | Same as Super Admin in practice |
| REP | View-only — can only see dashboard & profile |

### Backend Authorization

Only **one** custom permission class exists — `IsAdminForWrite` (`accounts/permissions.py`):
- GET = any authenticated user
- POST/PUT/DELETE = only SUPER_ADMIN or ADMIN

### Frontend Authorization

40+ granular permissions defined in `src/auth/roles.js` but **none are actually checked**. Every route/sidebar check just does:
```js
user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN
```

The granular permissions (CREATE_TRIAL, APPROVE_PAYMENT, etc.) sit unused.

### Files Involved

**Backend (6 files):**
| File | Role logic |
|------|-----------|
| `accounts/models.py:46-50` | Defines ROLE_CHOICES |
| `accounts/permissions.py` | IsAdminForWrite class |
| `accounts/views.py:25` | RegisterView — only admin can create users |
| `accounts/serializers.py:77` | Returns role field (read-only) |
| `vendors/views.py:70` | Uses IsAdminForWrite |
| `config/views.py` | Uses IsAdminForWrite |

**Frontend (9 files):**
| File | What it does |
|------|-------------|
| `auth/roles.js` | 3 roles, 40+ permissions, role-permission mapping |
| `auth/RoleBasedRoute.jsx` | Blocks routes by role |
| `auth/RequireAuth.jsx` | Blocks if not logged in (no role check) |
| `auth/AuthContext.jsx:130` | Attaches ROLE_PERMISSIONS to user on login |
| `auth/ProtectedComponent.jsx` | ProtectedByPermission, ProtectedByRole, usePermission, useRole |
| `utils/permissions.js` | hasPermission, hasAnyPermission, hasAllPermissions, hasRole |
| `App.js` | Every route wrapped in RoleBasedRoute allowedRoles={[SUPER_ADMIN, ADMIN]} |
| `components/layout/Sidebar.jsx` | Hides nav items if not SUPER_ADMIN/ADMIN |
| `components/dashboard/DashboardHome.jsx:87` | isAdmin check for dashboard sections |
| `components/Unauthorized.jsx` | "Access Denied" page |

### Simplification Plan (Approved, Not Yet Done)

Remove multi-role system, keep only SUPER_ADMIN. All users = full access.

**Backend changes:**
1. `accounts/models.py` — remove ROLE_CHOICES, hardcode SUPER_ADMIN or remove role field
2. `accounts/permissions.py` — delete IsAdminForWrite
3. `accounts/views.py:25` — remove role check in RegisterView
4. `vendors/views.py` — remove IsAdminForWrite from permission_classes
5. `config/views.py` — same

**Frontend changes:**
1. `auth/roles.js` — delete or keep just ROLES.SUPER_ADMIN
2. `utils/permissions.js` — delete
3. `auth/ProtectedComponent.jsx` — delete
4. `auth/RoleBasedRoute.jsx` — delete
5. `App.js` — remove all RoleBasedRoute wrappers, keep RequireAuth
6. `Sidebar.jsx` — remove canAccess* checks, show everything
7. `AuthContext.jsx:130` — remove permissions attachment
8. `DashboardHome.jsx:87` — remove isAdmin check
9. `Unauthorized.jsx` — delete

---

## 2. Critical Issues

### Backend

#### 2.1 Hardcoded SECRET_KEY (`backend/settings.py:12`)
Default insecure key exposed in source code. Remove default; require via .env only.

#### 2.2 Missing Permission on Payments & WorkOrders
- `payments/views.py:17` — only `IsAuthenticated`, no `IsAdminForWrite`
- `workorders/views.py:11` — only `IsAuthenticated`, no `IsAdminForWrite`
- Any logged-in REP user can create/delete payments and work orders via API

#### 2.3 No `@transaction.atomic` on Payment Creation (`payments/serializers.py:111-154`)
Creating PaymentRequest updates WorkOrder amounts and creates TDSRecord in separate DB ops. If one fails mid-way, data becomes inconsistent.

#### 2.4 No DEFAULT_PERMISSION_CLASSES in REST_FRAMEWORK settings
If any view forgets to set permissions, it defaults to open access.

#### 2.5 Pagination Bug
- `workorders/views.py:71` — `total = WorkOrder.objects.count()` counts ALL records, ignoring filters
- `payments/views.py:65` — same issue

### Frontend

#### 2.6 Artificial Login Delay (`LoginPage.jsx:54`)
```js
await new Promise((resolve) => setTimeout(resolve, 1000));
```
1-second delay on every login. Remove it.

#### 2.7 `alert()` for Session Timeout (`AuthContext.jsx:86`)
Should use toast notification instead of browser alert.

#### 2.8 Empty Catch Blocks
Errors silently swallowed in:
- `AdminPage.jsx:505`
- `BankManagementPage.jsx:160-166`
- `PaymentManagementPage.jsx:202, 212`
- `REPModal.jsx`

---

## 3. Medium Priority Issues

### Backend

| Issue | File | Detail |
|-------|------|--------|
| Bank details in list APIs | vendors, workorders, payments serializers | Account numbers exposed in list responses |
| No rate limiting | settings.py | Vulnerable to brute force on login |
| Bare except | accounts/views.py:120 | `except Exception` should catch specific token errors |
| WO status transitions | workorders/models.py | No validation (unlike Trial model) |
| No API tests | all test files empty | Zero test coverage |

### Frontend

| Issue | File | Detail |
|-------|------|--------|
| Profile only in localStorage | AuthContext.jsx | Not synced with backend; lost on browser clear |
| External API no error handling | REPModal.jsx:499 | `https://api.postalpincode.in` called without proper fallback |
| No pagination on dashboard | DashboardHome.jsx | Fetches all trials/reps/vendors without limits |
| Unused dependencies | package.json | react-hook-form, zod, axios installed but never used |
| console.error left in | VendorManagementPage:75, ProfilePage:125 | Should use centralized logger |
| Long component files | REPModal.jsx (1400+ lines) | Should be broken into smaller components |

---

## 4. Pending Items (from PENDING.md)

### Migrations Not Deployed
- workorders migration 0002 (WorkOrderChangeLog table)
- reps migration 0009 (removes PAN/GST columns from REP)

### Approved But Not Implemented
- **Remove WO Status field entirely** — user approved removal
- **3-letter minimum for vendor autocomplete** — in WorkOrderModal and PaymentRequestModal

---

## 5. What's Working Well

- JWT auth flow with refresh tokens and session timeout
- All CRUD across trials, reps, vendors, work orders, payments
- Payment batch processing with bank format exports
- Work order change log audit trail
- MUI v7 theme — clean, responsive UI
- API service with automatic 401 token refresh
- Error boundary wrapping the app
- Client-side filtering/sorting on work orders
- Amount lock/unlock system with backend validation

---

## 6. Recommended Fix Priority

| # | Item | Effort | Area |
|---|------|--------|------|
| 1 | Add IsAdminForWrite to payments & workorders views | 5 min | Backend |
| 2 | Remove hardcoded SECRET_KEY default | 2 min | Backend |
| 3 | Add DEFAULT_PERMISSION_CLASSES to settings | 2 min | Backend |
| 4 | Wrap payment creation in @transaction.atomic | 10 min | Backend |
| 5 | Fix pagination count bug in workorders/payments | 10 min | Backend |
| 6 | Remove login delay + replace alert with toast | 5 min | Frontend |
| 7 | Deploy pending migrations to server | 5 min | Server |
| 8 | Implement WO status removal | 30 min | Both |
| 9 | Simplify role system to single role | 30 min | Both |
| 10 | 3-letter vendor autocomplete minimum | 15 min | Frontend |
