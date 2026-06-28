> **SUPERSEDED — see `_docs/planning/CSR_COMPLETE_REFERENCE.md` (the single source of truth). Kept for history. NOTE: this doc's `CSR_OPS` role is WRONG — internal CSR is a `csr` grant, not a role.**

# CSR — Implementation Plan

How we are building the CSR app on top of TTA. Companion to
`_docs/planning/CSR_MODULE_SPEC.md` (which captures the owner's intent from the call
recordings). This document is purely technical: file paths, models, APIs, sequence.

---

## 1. Guiding principles (from the call)

- **TTA is the origin.** Trials, vendors, work orders, REPs, cities, payments — all live
  in TTA and stay there. CSR consumes them.
- **CSR is a separate app, same anatomy.** It uses the same shell (`DashboardLayout`,
  auth, theme, MUI patterns, `Page → Card → DetailView → Modal` convention) but has its
  own sidebar, own routes, own pages, own dashboard.
- **No parallel system.** Don't rebuild trials/vendors/WO/payments. Import the existing
  modules and APIs.
- **Don't bloat the spec.** Build only what CSR explicitly needs that TTA doesn't already
  offer.

---

## 2. Three apps, one codebase, one DB

Same React build, same Django backend, same MariaDB. Apps separated by **route prefix**,
**sidebar config**, and **role gating** — not by deployment.

| App              | Route prefix     | Sidebar       | Roles                       |
| ---------------- | ---------------- | ------------- | --------------------------- |
| TTA management   | `/`              | `Sidebar`     | SUPER_ADMIN, ADMIN, REP     |
| CSR (new)        | `/csr/*`         | `CSRSidebar`  | SUPER_ADMIN, ADMIN, CSR_OPS |
| Client (new)     | `/client/*`      | `ClientSidebar` | CSR_CLIENT                |

DB stays single. Reasons recapped: cross-DB joins not possible, Utilisation Certificate
uniqueness rule needs a DB-level constraint, and "TTA as origin" requires direct FK
access into trials/workorders/payments tables. Isolation is enforced by **role + row
scoping**, not by separate databases.

---

## 3. Frontend changes

### 3.1 Roles (`src/auth/roles.js`)

Add two roles to `ROLES`:

```js
CSR_OPS:    "CSR_OPS",     // internal staff managing CSR projects
CSR_CLIENT: "CSR_CLIENT",  // external client viewing their project
```

Add permission group `CSR_*` (VIEW_CSR_PROJECT, CREATE_CSR_PROJECT, EDIT_CSR_PROJECT,
MANAGE_CSR_ACTIVITY, UPLOAD_CSR_REPORT, TAG_CSR_EXPENSE, VIEW_CSR_CLIENT_DASHBOARD,
GENERATE_UTILISATION_CERTIFICATE).

Map them in `ROLE_PERMISSIONS`:
- `SUPER_ADMIN` + `ADMIN` — all CSR perms.
- `CSR_OPS` — manage projects/activities/reports, no expense tagging, no UC generation.
- `CSR_CLIENT` — `VIEW_CSR_CLIENT_DASHBOARD` only.

### 3.2 Routing (`src/App.js`)

Three layout outlets, not one. Keep existing `/` routes untouched. Add:

```
<Route element={<RequireAuth />}>
  <Route element={<DashboardLayout sidebar={<CSRSidebar />} />}>
    <Route path="/csr"                  element={<RoleBasedRoute allowedRoles={[SUPER_ADMIN, ADMIN, CSR_OPS]}><CSRProjectsPage /></RoleBasedRoute>} />
    <Route path="/csr/:id"              element={<CSRProjectDetail />} />
    <Route path="/csr/:id/activities"   element={<CSRActivitiesPage />} />
    <Route path="/csr/:id/reports"      element={<CSRReportsPage />} />
    <Route path="/csr/utilisation"      element={<UtilisationCertificatePage />} />
    <Route path="/csr/admin"            element={<CSRAdminConfigPage />} />
  </Route>

  <Route element={<DashboardLayout sidebar={<ClientSidebar />} />}>
    <Route path="/client"               element={<RoleBasedRoute allowedRoles={[CSR_CLIENT]}><ClientDashboard /></RoleBasedRoute>} />
    <Route path="/client/activities"    element={<ClientActivities />} />
    <Route path="/client/reports"       element={<ClientReports />} />
  </Route>
</Route>
```

### 3.3 Layout — make sidebar pluggable

Right now `DashboardLayout` hard-imports `Sidebar`. Two-line change:

```jsx
// DashboardLayout.jsx
export default function DashboardLayout({ sidebar }) {
  ...
  <>{sidebar ?? <Sidebar collapsed={...} onToggle={...} />}</>
  ...
}
```

Then `CSRSidebar` and `ClientSidebar` live in `src/components/layout/` alongside
`Sidebar.jsx`, same CSS classes, same NavItem pattern — only the items differ.

### 3.4 CSR sidebar items

```
Dashboard           → /csr
Projects            → /csr (list)
Activities          → /csr/:id/activities  (visible inside project)
Reports             → /csr/:id/reports
Utilisation Cert.   → /csr/utilisation     (SUPER_ADMIN, ADMIN only)
CSR Admin Config    → /csr/admin           (SUPER_ADMIN, ADMIN only)
```

Notably **absent on purpose** (owner was explicit):
- No Payments tab.
- No Vendors tab.
- No REP Management tab.
- No Banking / TDS.
- No Courier.

Trials, vendors, WOs, payments are still **reachable** from inside a CSR project
detail page (e.g. "Link existing trial as Boys Trial activity") but are not first-class
sidebar items in CSR.

### 3.5 Client sidebar items

```
Dashboard         → /client
My Activities     → /client/activities
My Reports        → /client/reports
```

That's it. Read-only. Scoped to one project.

### 3.6 New module folder (mirrors `trials/` exactly)

```
src/components/csr/
├── index.js
├── csrConstants.js          // ACTIVITY_TYPES, STATUSES
├── CSRProjectsPage.jsx      // list + filters
├── CSRProjectCard.jsx       // card on the list
├── CSRProjectDetail.jsx     // tabs: Overview / Activities / Work Order / Reports
├── CSRProjectModal.jsx      // create / edit project
├── CSRActivityCard.jsx
├── CSRActivityModal.jsx     // create activity OR link existing trial
├── CSRReportUploadModal.jsx
├── UtilisationCertificatePage.jsx
└── ExpenseTagModal.jsx
```

```
src/components/client/
├── index.js
├── ClientDashboard.jsx
├── ClientActivities.jsx
└── ClientReports.jsx
```

### 3.7 API service (`src/services/api.js`)

Add one block at the bottom — same singleton, same `request()`:

```js
export const csrAPI = {
  // projects
  getAll:        ()        => api.request('/csr/projects/'),
  getById:       (id)      => api.request(`/csr/projects/${id}/`),
  create:        (body)    => api.request('/csr/projects/', { method:'POST', body: JSON.stringify(body) }),
  update:        (id,body) => api.request(`/csr/projects/${id}/`, { method:'PATCH', body: JSON.stringify(body) }),

  // activities (linked or custom)
  listActivities:  (pid)            => api.request(`/csr/projects/${pid}/activities/`),
  createActivity:  (pid, body)      => api.request(`/csr/projects/${pid}/activities/`, { method:'POST', body: JSON.stringify(body) }),
  linkTrial:       (pid, trialId)   => api.request(`/csr/projects/${pid}/activities/link-trial/`, { method:'POST', body: JSON.stringify({ trial_id: trialId }) }),

  // reports
  uploadReport:    (pid, formData)  => api.request(`/csr/projects/${pid}/reports/`, { method:'POST', body: formData, headers: {} }),

  // expense tagging (Utilisation Cert)
  tagPayment:      (pid, paymentId) => api.request(`/csr/projects/${pid}/tag-expense/`, { method:'POST', body: JSON.stringify({ payment_id: paymentId }) }),
  tagManual:       (pid, body)      => api.request(`/csr/projects/${pid}/tag-expense/`, { method:'POST', body: JSON.stringify(body) }),
  utilisationCert: (pid)            => api.request(`/csr/projects/${pid}/utilisation-certificate/`),
};

export const clientAPI = {
  myProject:        () => api.request('/client/me/project/'),
  myActivities:     () => api.request('/client/me/activities/'),
  myReports:        () => api.request('/client/me/reports/'),
};
```

CSR pages **also import** `trialsAPI`, `workOrdersAPI`, `vendorsAPI`, `paymentRequestsAPI`
from the same file — no duplication.

### 3.8 Reused config (admin-managed dropdowns)

`src/utils/adminStorage.js` already caches config values from `configAPI`. Extend it
with two getters: `getCSRActivityTypes()` and `getCSRMasterTemplates()`. Owner said
activity types are defined from the backend and "some are master, some are custom" — this
fits the existing pattern (same as vendor types, project names, etc.).

---

## 4. Backend changes (`tta_backend/backend/`)

### 4.1 New Django app `csr/`

```
backend/csr/
├── __init__.py
├── apps.py
├── admin.py
├── models.py
├── serializers.py
├── views.py
├── urls.py
├── permissions.py        // CSRClientScoped, IsCSROps
└── migrations/
```

Wire in `backend/backend/settings.py` `INSTALLED_APPS` and `backend/backend/urls.py`
(`path('api/csr/', include('csr.urls'))` and `path('api/client/', include('csr.urls_client'))`).

### 4.2 Models

```python
# csr/models.py
from django.db import models
from trials.models import Trial
from workorders.models import WorkOrder
from payments.models import PaymentRequest   # name TBD — verify in payments/models.py

class CSRProject(models.Model):
    name             = models.CharField(max_length=200)
    client_name      = models.CharField(max_length=200)
    sanctioned_amount = models.DecimalField(max_digits=14, decimal_places=2)
    start_date       = models.DateField(null=True, blank=True)
    end_date         = models.DateField(null=True, blank=True)
    status           = models.CharField(max_length=32, default='ACTIVE')
    work_order       = models.OneToOneField(WorkOrder, on_delete=models.PROTECT, related_name='csr_project')
    created_at       = models.DateTimeField(auto_now_add=True)

class CSRActivityType(models.Model):           # admin-defined, master vs custom
    name      = models.CharField(max_length=120, unique=True)
    is_master = models.BooleanField(default=False)   # reusable across projects

class CSRActivity(models.Model):
    project       = models.ForeignKey(CSRProject, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.ForeignKey(CSRActivityType, on_delete=models.PROTECT)
    linked_trial  = models.ForeignKey(Trial, null=True, blank=True, on_delete=models.SET_NULL)
    title         = models.CharField(max_length=200)   # e.g. "Career Guidance — Bhilai batch 1"
    description   = models.TextField(blank=True)
    start_date    = models.DateField(null=True, blank=True)
    end_date      = models.DateField(null=True, blank=True)
    status        = models.CharField(max_length=32, default='PLANNED')

class CSRReport(models.Model):
    project    = models.ForeignKey(CSRProject, on_delete=models.CASCADE, related_name='reports')
    activity   = models.ForeignKey(CSRActivity, null=True, blank=True, on_delete=models.SET_NULL)
    title      = models.CharField(max_length=200)
    file       = models.FileField(upload_to='csr_reports/')
    uploaded_by = models.ForeignKey('accounts.User', on_delete=models.PROTECT)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    visible_to_client = models.BooleanField(default=False)

class CSRExpenseTag(models.Model):
    """One payment can only be tagged to ONE CSR project (audit uniqueness)."""
    project       = models.ForeignKey(CSRProject, on_delete=models.PROTECT, related_name='expense_tags')
    payment       = models.OneToOneField(PaymentRequest, null=True, blank=True, on_delete=models.PROTECT)
    manual_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    manual_note   = models.CharField(max_length=300, blank=True)
    tagged_at     = models.DateTimeField(auto_now_add=True)
    tagged_by     = models.ForeignKey('accounts.User', on_delete=models.PROTECT)

    class Meta:
        constraints = [
            models.CheckConstraint(
                check=models.Q(payment__isnull=False) | models.Q(manual_amount__isnull=False),
                name='csr_expense_payment_or_manual',
            ),
        ]

class CSRClientUser(models.Model):
    """Pairs an accounts.User (role=CSR_CLIENT) to exactly one project."""
    user    = models.OneToOneField('accounts.User', on_delete=models.CASCADE)
    project = models.ForeignKey(CSRProject, on_delete=models.CASCADE, related_name='client_users')
```

### 4.3 Permissions

```python
# csr/permissions.py
class IsCSROps(BasePermission):
    def has_permission(self, request, view):
        return request.user.role in {'SUPER_ADMIN','ADMIN','CSR_OPS'}

class CSRClientScoped(BasePermission):
    """CSR_CLIENT sees only rows under their project. SUPER_ADMIN/ADMIN see all."""
    def has_object_permission(self, request, view, obj):
        if request.user.role in {'SUPER_ADMIN','ADMIN','CSR_OPS'}:
            return True
        client = getattr(request.user, 'csr_client', None)
        if not client:
            return False
        # Resolve obj → project_id and compare
        return getattr(obj, 'project_id', getattr(obj, 'id', None)) == client.project_id
```

### 4.4 Endpoints

`urls.py` for `/api/csr/...`:
- `projects/` (list, create), `projects/<id>/` (retrieve, patch)
- `projects/<id>/activities/` (list, create), `projects/<id>/activities/link-trial/`
- `projects/<id>/reports/` (list, upload)
- `projects/<id>/tag-expense/` (POST), `projects/<id>/utilisation-certificate/` (GET)

`urls_client.py` for `/api/client/...`:
- `me/project/`, `me/activities/`, `me/reports/` — all auto-filter to
  `request.user.csr_client.project`.

---

## 5. Reuse map (what we DO NOT rebuild)

| CSR needs        | We use                                                              |
| ---------------- | ------------------------------------------------------------------- |
| Auth, JWT, refresh | `src/auth/*`, `accounts` app — extend role enum only             |
| Layout, sidebar shell | `DashboardLayout.jsx` — make `sidebar` a prop                  |
| Trials as activities | `trials` app, `trialsAPI.getAll()`, link via `linked_trial` FK  |
| Work Orders for contract | `workorders` app, `workOrdersAPI`, `OneToOneField(WorkOrder)` |
| Vendors          | `vendors` app — referenced via existing WO/payment chain only       |
| Payments         | `payments` app — referenced via `CSRExpenseTag.payment` FK          |
| Admin-config dropdowns | `configAPI` + `adminStorage.js` — add 2 getters               |
| Module UI pattern | Page → Card → DetailView → Modal, copied from `trials/`            |
| Reports infra    | `src/components/reports/` patterns for the Utilisation Certificate page |
| Excel exports    | `fullDetailsExcel.js` style if UC needs export                      |

---

## 6. Build sequence

1. **Doc + mock approval** (this file + `CSR_MODULE_SPEC.md`) — owner sign-off before code.
2. **Backend: `csr` app + migrations** — models, no business logic yet.
3. **Roles + permissions** — add `CSR_OPS`, `CSR_CLIENT`; wire into `accounts.User`.
4. **Layout pluggable sidebar** — `DashboardLayout` takes `sidebar` prop;
   `CSRSidebar`, `ClientSidebar` added.
5. **CSR project list + detail + WO link** — minimum viable admin flow.
6. **Activities** — create custom + link existing trial.
7. **Reports upload + client visibility toggle.**
8. **Utilisation Certificate page** — manual tag + payment-link tag, with uniqueness
   constraint enforced both DB-side and API-side.
9. **Client app** — `/client` read-only dashboard, scoped queries.
10. **End-to-end test** — create project → add activity from existing trial → upload
    report → tag a real payment → log in as client → verify visibility.

---

## 7. Things to verify before coding

- Exact model name for payments (`PaymentRequest` vs `Payment` vs `PaymentBatch`) —
  check `tta_backend/backend/payments/models.py`.
- Whether `accounts.User` already has a `role` field or uses Django groups — affects
  how `CSR_OPS` / `CSR_CLIENT` are stored.
- How report files are served — existing `FileField`/media storage convention.
- Owner's answers to the four open questions in `CSR_MODULE_SPEC.md` §7.
