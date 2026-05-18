# TTA System — Developer Reference

**Project:** Trial Tracking Application (TTA) — India Khelo Football  
**Author:** Abhishek Anshuman  
**Server:** 47.245.98.149 (Alibaba Cloud) · `tta.indiakhelofootball.com`  
**Frontend Repo:** `D:\tta_frontend-main` (React + MUI)  
**Backend Repo:** `D:\tta_frontend-main\tta_backend\backend` (Django 3.2 + DRF + MariaDB)  
**Last Updated:** Feb 2026

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Tech Stack](#2-tech-stack)
3. [Module Status](#3-module-status)
4. [Working Conventions](#4-working-conventions)
5. [Module 1 — Project Setup (DONE)](#5-module-1--project-setup-done)
6. [Module 2 — Projects (CURRENT)](#6-module-2--projects-current)
7. [Module 3 — REP Management](#7-module-3--rep-management)
8. [Module 4 — Vendors](#8-module-4--vendors)
9. [Module 5 — Payments](#9-module-5--payments)
10. [Data Model Reference](#10-data-model-reference)
11. [API Reference](#11-api-reference)
12. [Backend Architecture Notes](#12-backend-architecture-notes)
13. [Frontend Architecture Notes](#13-frontend-architecture-notes)
14. [Known Issues & Decisions](#14-known-issues--decisions)

---

## 1. System Architecture

```
Browser (React SPA)
│
├── /login              → Login page
├── /dashboard          → DashboardHome
├── /trials/create      → TrialWizard  (Project Setup)
├── /trials             → TrialManagementPage  (Projects List)
├── /trials/:id         → ProjectDashboard  [TO BUILD]
├── /rep-management     → REPManagementPage
├── /vendors            → VendorManagementPage
├── /payments           → PaymentManagementPage
└── /profile            → ProfilePage

All protected routes wrapped in RequireAuth + DashboardLayout (Sidebar)
SUPER_ADMIN / ADMIN can access all modules.
```

```
Nginx (server)
├── /             → serves React build (static files)
└── /api/*        → proxies to Gunicorn (Django)

Django API
├── /api/auth/          → accounts app (login, profile, token refresh)
├── /api/trials/        → trials app
├── /api/trial-cities/  → trialcities app
├── /api/reps/          → reps app
├── /api/vendors/       → vendors app
└── /api/payments/      → payments app  [TO BUILD]
```

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, MUI v5 |
| State | Local component state (useState/useEffect) |
| HTTP | Native fetch with JWT bearer token (api.js) |
| Backend | Django 3.2, Django REST Framework |
| Database | MariaDB 10.1.48 |
| Auth | JWT (SimpleJWT) — access + refresh tokens |
| Server | Alibaba Cloud VPS, Nginx + Gunicorn |
| Country data | `country-state-city` npm package (India states/cities) |

---

## 3. Module Status

| Module | Route | Status | Notes |
|---|---|---|---|
| Login / Auth | `/login` | ✅ Done | JWT, role-based |
| Dashboard Home | `/dashboard` | ✅ Done | Stats overview |
| **Project Setup** | `/trials/create` | ✅ Done | 4-step wizard; backend bugs fixed Feb 2026 |
| **Projects** | `/trials` | 🔄 In Progress | List done; detail needs work |
| **Project Dashboard** | `/trials/:id` | 🔲 To Build | Replaces dialog |
| REP Management | `/rep-management` | ✅ Done | CRUD |
| Vendors | `/vendors` | ✅ Done | CRUD |
| Payments | `/payments` | 🔲 To Build | Frontend shell exists; no backend |

---

## 4. Working Conventions

### Development Order
Work **module by module**, fully completing one before moving to the next.
Current order: **Project Setup → Projects → REP → Vendors → Payments**

### Locked vs Editable Fields
Fields set at creation and **never changed** are shown with a lock icon and disabled input.  
Fields that **can be changed later** are editable inline or via an edit action.

### Dialog vs Dedicated Page
- Simple confirmations (delete) → Dialog is fine
- Simple add/edit forms (single entity, ~5 fields) → Dialog/Modal is fine
- Complex views (cities list, lots of data) → **Dedicated route / full page**

### Code Style
- camelCase field names in API (serializers alias snake_case → camelCase)
- MUI components only (no Tailwind except legacy auth pages)
- Consistent yellow accent: `#FDE68A` / `#FCD34D`
- Border radius: `4` (MUI units) on cards, `2` on smaller elements

### Frontend File Structure (components)
```
src/components/
├── trials/
│   ├── index.js               — barrel exports
│   ├── trialConstants.js      — enums, color maps
│   ├── TrialWizard.jsx        — /trials/create
│   ├── TrialManagementPage.jsx — /trials
│   ├── ProjectDashboard.jsx   — /trials/:id  [TO BUILD]
│   ├── TrialCard.jsx          — card on list page
│   ├── TrialDetailView.jsx    — (dialog, will be replaced by route)
│   ├── TrialEditModal.jsx     — edit dialog (project-level fields)
│   └── TrialDeleteDialog.jsx  — delete confirmation
├── trialCities/               — (legacy, kept for reference)
├── layout/
│   ├── DashboardLayout.jsx
│   └── Sidebar.jsx
├── payments/                  — [TO BUILD full CRUD]
│   ├── index.js
│   ├── PaymentManagementPage.jsx
│   └── PaymentModal.jsx
...
```

---

## 5. Module 1 — Project Setup (DONE)

**Route:** `/trials/create`  
**Component:** `TrialWizard.jsx`  
**Backend endpoint:** `POST /api/trials/`

### What the wizard collects (4 steps)

| Step | Fields |
|---|---|
| 1 — Project Setup | Project Name (dropdown: IKF / Project Nari Shakti), Season (Season 5 / Season 6) |
| 2 — Locations | State + City + Region + Ground Location (add one by one or bulk 10-row grid) |
| 3 — Schedule | Per-city: Month + Tentative Date |
| 4 — Review | Confirm all, submit |

### Auto-generated fields
- `trialCode` / `projectCode`: generated from `PROJECT_CODES[name] + season + sequence` e.g. `IKF-S5-001`
- City code: `IKF-{stateISO}-{cityAbbr3}-{seq}` e.g. `IKF-MH-MUM-001`

### What gets saved on submit

```js
// POST /api/trials/
{
  trialName: code,           // uses generated code as name
  trialCode: code,           // same
  season: "Season 5",
  trialType: description,    // free text or project name
  tierType: "Not Any",       // always "Not Any" at creation
  scheduleType: "Tentative", // always Tentative at creation
  status: "Draft",
  assignedCities: [
    {
      state: "Maharashtra",
      cityName: "Mumbai",
      region: "South Mumbai",
      trialRegion: "South Mumbai",
      confirmed: false,
      code: "IKF-MH-MUM-001",
      tentativeMonth: "March",
      tentativeDate: null
    },
    ...
  ]
}
```

### What gets stored in backend

- `Trial` table: all project-level fields
- `TrialCity` table: one row per city (`trial_id`, `city_code`, `assigned_by`, `assigned_at`)
- `TrialCityLocation` table: upserted with state/city/region/month data (global master pool)

### After creation
- User is redirected (or shown success) and navigates to Projects list (`/trials`)
- Project appears in the cards grid

---

## 6. Module 2 — Projects (CURRENT)

### 6.1 Projects List — `/trials` (DONE)

**Component:** `TrialManagementPage.jsx` + `TrialCard.jsx`

**What it does:**
- Loads all trials via `GET /api/trials/`
- Displays as a card grid (3 columns on desktop)
- Search (client-side on name, code, season, cities)
- Sort menu (latest, oldest, name A-Z/Z-A, upcoming, past)
- Filter menu (season, status, date filter)
- Summary stats: Total Trials, Active Trials, Upcoming This Month
- Each card shows: name, code, status chip, season, schedule date, city count (expandable list), tier

**Card actions:**
- **View** → currently opens `TrialDetailView` dialog — **TO CHANGE to navigate(`/trials/:id`)**
- **Edit** → opens `TrialEditModal` dialog
- **Delete** → opens `TrialDeleteDialog` confirmation

---

### 6.2 Project Dashboard — `/trials/:id` (TO BUILD)

**Component:** `ProjectDashboard.jsx` (new)  
**Backend endpoints:** `GET /api/trials/:id/` (already exists), new city sub-endpoints

This replaces the dialog (`TrialDetailView`) entirely. A project can have 30+ cities — they need dedicated screen space.

#### Page Layout

```
┌────────────────────────────────────────────────────────────────┐
│  ← Back to Projects          [Edit Project] [Delete]          │
│                                                                │
│  IKF-S5-001                                    ● Active       │
│  IKF Season 5  ·  Season 5                                    │
│                                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ 28 Cities│  │ Tentative│  │ Draft    │  │ Mar 2025 │     │
│  │ Assigned │  │ Schedule │  │ Status   │  │ Month    │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  CITIES  ─────────────────────────────────────── [+ Add City] │
│                                                                │
│  Search cities...                      Filter: State ▾        │
│                                                                │
│  #  State         City        Region   Ground  Month  Confirmed│
│  1  Maharashtra   Mumbai      South    XYZ     Mar    ✓       │
│  2  Delhi         New Delhi   —        —       Apr    —       │
│  ...                                                          │
│                                                                │
│  [Pagination: showing 1-20 of 28]                             │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│  PROJECT INFO (collapsible or tab)                             │
│  Schedule · Tier · Notes                                      │
│  Audit: Created by / Created at / Updated at                  │
└────────────────────────────────────────────────────────────────┘
```

#### Locked Fields (shown as read-only, lock icon)
These are set at creation and cannot be changed:
- `trialName` — Project Name (generated code like `IKF-S5-001`)
- `trialCode` — Project Code (same as name)
- `season` — Season
- `trialType` — Project Description

#### Editable Fields (on dashboard or via Edit modal)
- `status` — can change via dropdown inline or in edit form
- `scheduleType` + dates — editable in edit form
- `tierType` + tier details + amount — editable in edit form
- `comment` — editable inline or in edit form
- Cities — managed entirely inline on dashboard (see below)

#### 6.2.1 Cities Management (core feature)

Each city row in the table is **independently manageable**:

| Column | Type | Notes |
|---|---|---|
| # | display | row number |
| State | display | e.g. Maharashtra |
| City | display | e.g. Mumbai |
| Region / Sub-city | editable | e.g. South Mumbai |
| Ground Location | editable | e.g. Andheri Sports Complex |
| Month | editable | tentative month for this city |
| Date | editable | tentative or confirmed date |
| Confirmed | toggle | checkbox/switch — is this city confirmed? |
| Actions | buttons | Edit row (pencil) · Remove city (trash) |

**Add City flow:**
- Click "Add City" → row appears at top of table OR a drawer/inline form
- Select State → City → fill Region (optional) → Ground (optional) → Month → Save

**Edit city row:**
- Click pencil icon on a row → row fields become editable inline → save / cancel

**Remove city:**
- Click trash → confirm dialog → city removed from this project only (does not affect `TrialCityLocation` master data)

**Confirm city toggle:**
- Click checkbox in Confirmed column → instant PATCH to backend

---

### 6.3 Edit Project Modal (keep, but scope it right)

`TrialEditModal.jsx` remains as a dialog for editing **project-level** fields only:
- Tier (type, details, amount, participants)
- Schedule (type, dates)
- Notes / Comments
- Status

**Cities are no longer edited inside this modal.** They are managed on the dashboard.

The current modal already shows locked fields (name, season, description) with lock icons — that is correct.

---

### 6.4 Backend Changes Required for Projects Module

#### A. Extend `TrialCity` model

File: `tta_backend/backend/trials/models.py`

Add fields to `TrialCity`:

```python
class TrialCity(models.Model):
    trial = models.ForeignKey(Trial, on_delete=models.CASCADE, related_name='cities')
    city_code = models.CharField(max_length=50, db_index=True)
    assigned_at = models.DateTimeField(auto_now_add=True)
    assigned_by = models.CharField(max_length=255)
    
    # --- NEW FIELDS ---
    state = models.CharField(max_length=100, blank=True, default='')
    city_name = models.CharField(max_length=100, blank=True, default='')
    region = models.CharField(max_length=255, blank=True, default='')
    ground_location = models.CharField(max_length=255, blank=True, default='')
    tentative_month = models.CharField(max_length=20, blank=True, default='')
    tentative_date = models.DateField(null=True, blank=True)
    confirmed = models.BooleanField(default=False)

    class Meta:
        unique_together = ('trial', 'city_code')
```

**Why:** Per-trial city data (confirmed, month, date, ground) belongs on the junction table (`TrialCity`), not on `TrialCityLocation`. `TrialCityLocation` is a global pool — the same city can be in multiple trials with different months/confirmed status.

#### B. Update `TrialSerializer.get_assignedCities`

Read per-trial data from `TrialCity` instead of `TrialCityLocation`:

```python
def get_assignedCities(self, obj):
    cities = obj.cities.all()
    result = []
    for tc in cities:
        result.append({
            'code': tc.city_code,
            'state': tc.state,
            'cityName': tc.city_name,
            'region': tc.region,
            'trialRegion': tc.region,
            'groundLocation': tc.ground_location,
            'tentativeMonth': tc.tentative_month or None,
            'tentativeDate': str(tc.tentative_date) if tc.tentative_date else None,
            'confirmed': tc.confirmed,
        })
    return result
```

#### C. Update `TrialSerializer.create` / `_save_city_locations`

When wizard submits, save city details directly to `TrialCity` (not just code):

```python
TrialCity.objects.bulk_create([
    TrialCity(
        trial=trial,
        city_code=city['code'],
        assigned_by=assigned_by,
        state=city.get('state', ''),
        city_name=city.get('cityName', ''),
        region=city.get('region', ''),
        ground_location=city.get('groundLocation', ''),
        tentative_month=city.get('tentativeMonth', ''),
        tentative_date=city.get('tentativeDate') or None,
        confirmed=city.get('confirmed', False),
    )
    for city in city_details
])
```

#### D. Add City Sub-Endpoints on `TrialViewSet`

File: `tta_backend/backend/trials/views.py`

```python
@action(detail=True, methods=['post'], url_path='cities')
def add_city(self, request, pk=None):
    # POST /api/trials/:id/cities/
    # Body: { cityCode, state, cityName, region, groundLocation, tentativeMonth, tentativeDate }
    trial = self.get_object()
    # create TrialCity row + upsert TrialCityLocation
    ...

@action(detail=True, methods=['patch'], url_path='cities/(?P<city_code>[^/.]+)')
def update_city(self, request, pk=None, city_code=None):
    # PATCH /api/trials/:id/cities/:cityCode/
    # Body: { confirmed, groundLocation, tentativeMonth, tentativeDate, region }
    ...

@action(detail=True, methods=['delete'], url_path='cities/(?P<city_code>[^/.]+)/delete')
def remove_city(self, request, pk=None, city_code=None):
    # DELETE /api/trials/:id/cities/:cityCode/
    ...
```

#### E. Migration

```bash
cd tta_backend/backend
python manage.py makemigrations trials --name="add_per_trial_city_fields"
python manage.py migrate
```

---

### 6.5 Frontend Changes Required for Projects Module

#### A. New `ProjectDashboard.jsx`

File: `src/components/trials/ProjectDashboard.jsx`

Key sections:
- **Header**: Back button, project name/code, status chip, Edit + Delete buttons
- **Stats row**: city count, schedule type, status, tentative month
- **Cities table**: full CRUD (see layout above)
- **Project info accordion**: tier, schedule, notes, audit trail

Data loading:
```js
// On mount: GET /api/trials/:id/ → sets trial state
// Add city: POST /api/trials/:id/cities/
// Update city: PATCH /api/trials/:id/cities/:code/
// Remove city: DELETE /api/trials/:id/cities/:code/delete/
// Edit project: PUT /api/trials/:id/ (via existing TrialEditModal)
// Delete project: DELETE /api/trials/:id/ → navigate back to /trials
```

#### B. Update `TrialCard.jsx`

Change "View" button from:
```jsx
onClick={() => onViewDetails(trial)}
```
to:
```jsx
import { useNavigate } from 'react-router-dom';
const navigate = useNavigate();
onClick={() => navigate(`/trials/${trial.id}`)}
```

Remove `onViewDetails` prop entirely.

#### C. Update `TrialManagementPage.jsx`

- Remove `detailViewTrial` state
- Remove `<TrialDetailView>` from render
- Remove `handleViewDetails` function
- `TrialCard` no longer receives `onViewDetails` prop

#### D. Update `App.js` — Add Route

```jsx
import { ProjectDashboard } from './components/trials';

// inside DashboardLayout routes:
<Route path="/trials/:id" element={
  <RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
    <ProjectDashboard />
  </RoleBasedRoute>
} />
```

#### E. Update `src/components/trials/index.js`

```js
export { default as ProjectDashboard } from './ProjectDashboard';
```

#### F. Update `src/services/api.js` — Add City Methods

```js
export const trialsAPI = {
  // ...existing methods...
  
  getCityList: async (trialId) => {
    return apiService.request(`/trials/${trialId}/`);
    // cities are included in the trial response
  },

  addCity: async (trialId, cityData) => {
    return apiService.request(`/trials/${trialId}/cities/`, {
      method: 'POST',
      body: JSON.stringify(cityData),
    });
  },

  updateCity: async (trialId, cityCode, data) => {
    return apiService.request(`/trials/${trialId}/cities/${encodeURIComponent(cityCode)}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  removeCity: async (trialId, cityCode) => {
    return apiService.request(`/trials/${trialId}/cities/${encodeURIComponent(cityCode)}/delete/`, {
      method: 'DELETE',
    });
  },
};
```

---

## 7. Module 3 — REP Management

**Route:** `/rep-management`  
**Status:** ✅ Done (CRUD)  
**Backend:** `/api/reps/`

REPs (Regional Enrollment Partners) — manage name, contact, region, assigned cities/trials.  
Currently functional. Future: link REPs to specific trial cities.

---

## 8. Module 4 — Vendors

**Route:** `/vendors`  
**Status:** ✅ Done (CRUD)  
**Backend:** `/api/vendors/`

Manages vendor entities. Future: link vendors to payments.

---

## 9. Module 5 — Payments

**Route:** `/payments`  
**Status:** 🔲 Frontend shell exists, backend missing  
**Backend needed:** `/api/payments/`

### Frontend (exists, `src/components/payments/`)
- `PaymentManagementPage.jsx` — table view with stats
- `PaymentModal.jsx` — add/edit payment form
- Status colors: Paid (green), Pending (yellow), Overdue (red), Not Raised (blue)

### Backend (to build, `tta_backend/backend/payments/`)

**Payment model:**
```python
class Payment(models.Model):
    STATUS_CHOICES = [
        ('Not Raised', 'Not Raised'),
        ('Pending', 'Pending'),
        ('Paid', 'Paid'),
        ('Overdue', 'Overdue'),
    ]
    vendor = models.ForeignKey('vendors.Vendor', on_delete=models.SET_NULL, null=True, blank=True)
    trial = models.ForeignKey('trials.Trial', on_delete=models.SET_NULL, null=True, blank=True)
    invoice_number = models.CharField(max_length=100, blank=True, default='')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Not Raised')
    due_date = models.DateField(null=True, blank=True)
    paid_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

**Register in:** `settings.py` INSTALLED_APPS, `backend/urls.py`

---

## 10. Data Model Reference

### Trial (trials app)

| Field | Type | Locked | Notes |
|---|---|---|---|
| id | int PK | — | auto |
| trial_name | CharField(255) unique | ✅ Yes | set at creation, equals trial_code |
| trial_code | CharField(50) unique | ✅ Yes | auto-generated, editable=False |
| season | CharField(50) | ✅ Yes | e.g. "Season 5" |
| trial_type | CharField(255) | ✅ Yes | free text description |
| tier_type | ChoiceField | No | Not Any / Basic / Standard / Premium |
| tier_details | TextField | No | required if tier ≠ Not Any |
| tier_amount | Decimal | No | required if tier ≠ Not Any |
| expected_participants | IntegerField | No | optional |
| schedule_type | ChoiceField | No | Fixed / Tentative |
| start_date | DateField | No | required if Fixed |
| end_date | DateField | No | required if Fixed |
| tentative_month | CharField | No | required if Tentative |
| tentative_date_range | CharField | No | e.g. "Mid June – End June" |
| next_trial_date | DateField | No | confirmed date (maps to confirmedProjectDate in frontend) |
| status | ChoiceField | No | Draft → Active → Completed / Cancelled |
| comment | TextField | No | notes |
| created_by | CharField | — | set from request.user at create |
| created_at | DateTimeField | — | auto |
| updated_at | DateTimeField | — | auto |

### TrialCity (trials app — junction table)

| Field | Type | Notes |
|---|---|---|
| id | int PK | |
| trial | FK → Trial | CASCADE |
| city_code | CharField(50) | e.g. IKF-MH-MUM-001 |
| assigned_at | DateTimeField | auto |
| assigned_by | CharField | user email |
| state | CharField(100) | **NEW** e.g. Maharashtra |
| city_name | CharField(100) | **NEW** e.g. Mumbai |
| region | CharField(255) | **NEW** sub-city / area |
| ground_location | CharField(255) | **NEW** venue name |
| tentative_month | CharField(20) | **NEW** e.g. March |
| tentative_date | DateField | **NEW** |
| confirmed | BooleanField | **NEW** default False |

### TrialCityLocation (trialcities app — global master pool)

| Field | Type | Notes |
|---|---|---|
| id | int PK | |
| code | CharField(50) unique | e.g. IKF-MH-MUM-001 |
| state | CharField(100) | |
| region | ChoiceField | North/South/East/West/Central (cardinal) |
| trial_city_name | CharField(255) | sub-city/area name |
| city | CharField(100) | base city name |
| assigned_rep | CharField | REP assigned |
| ground_location | CharField(255) | venue |
| ground_verified | BooleanField | |
| trial_type | CharField | |
| trial_date | DateField | (global — use TrialCity.tentative_date for per-trial) |
| month_only | CharField | (global — use TrialCity.tentative_month for per-trial) |
| comment | TextField | |
| next_trial_date | DateField | |
| created_at, updated_at | DateTimeField | auto |

### Status Transition Rules (Trial)

```
Draft  →  Active  →  Completed
  ↓          ↓
Cancelled  Cancelled
Cancelled  →  Draft  (can reopen)
```

---

## 11. API Reference

### Base URL
`http://localhost:8000/api` (dev) · `https://tta.indiakhelofootball.com/api` (prod)

### Auth
`Authorization: Bearer <access_token>`  
Refresh via: `POST /api/auth/token/refresh/`

### Trials

| Method | Endpoint | Description |
|---|---|---|
| GET | `/trials/` | List all (supports: status, trial_type, season, search, sort, page, limit) |
| POST | `/trials/` | Create trial |
| GET | `/trials/:id/` | Get single trial (returns `{ trial: {...} }`) |
| PUT | `/trials/:id/` | Update trial |
| PATCH | `/trials/:id/` | Partial update |
| DELETE | `/trials/:id/` | Delete trial |
| GET | `/trials/check-name/?name=X` | Check name uniqueness |
| POST | `/trials/:id/cities/` | **[TO ADD]** Add city to trial |
| PATCH | `/trials/:id/cities/:code/` | **[TO ADD]** Update city in trial |
| DELETE | `/trials/:id/cities/:code/delete/` | **[TO ADD]** Remove city from trial |

### Trial Cities (global pool)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/trial-cities/` | List all locations |
| POST | `/trial-cities/` | Create location |
| GET | `/trial-cities/:code/` | Get single |
| PUT | `/trial-cities/:code/` | Update |
| DELETE | `/trial-cities/:code/` | Delete |

### REPs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/reps/` | List |
| POST | `/reps/` | Create |
| GET/PUT/DELETE | `/reps/:id/` | CRUD |

### Vendors

| Method | Endpoint | Description |
|---|---|---|
| GET | `/vendors/` | List |
| POST | `/vendors/` | Create |
| GET/PUT/DELETE | `/vendors/:id/` | CRUD |

### Payments (TO BUILD)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/payments/` | List |
| POST | `/payments/` | Create |
| GET/PUT/DELETE | `/payments/:id/` | CRUD |

---

## 12. Backend Architecture Notes

### Django Apps
```
backend/
├── accounts/      — User model, JWT auth, permissions
├── trials/        — Trial + TrialCity models
├── trialcities/   — TrialCityLocation model (global city master)
├── reps/          — REP model
├── vendors/       — Vendor model
└── payments/      — [TO CREATE]
```

### Permissions
- `IsAuthenticated` — read operations
- `IsAdminForWrite` — write operations (POST/PUT/PATCH/DELETE)
- Roles: `super_admin`, `admin` (from `accounts.permissions`)

### Serializer Pattern
All serializers use camelCase aliases for frontend compatibility:
- `trialName` → `trial_name`
- `assignedCities` (write) → `assigned_cities` (snake_case on model)
- `get_assignedCities` (read) → enriched list from `TrialCity`

### The `to_internal_value` Pattern
`TrialSerializer.to_internal_value` intercepts `assignedCities` (camelCase list of objects from frontend) and:
1. Extracts `code` strings into `assigned_cities` for `TrialCity` creation
2. Stores full city objects in `self._city_details_raw` for `TrialCityLocation` upsert

After adding per-trial fields to `TrialCity`, step 2 will instead write to `TrialCity` fields.

---

## 13. Frontend Architecture Notes

### API Service (`src/services/api.js`)
- Single `APIService` class with `request()` method
- Auto token refresh on 401
- Named exports: `trialsAPI`, `repAPI`, `trialCitiesAPI`, `vendorsAPI`, `paymentsAPI`

### Routing (`src/App.js`)
- All dashboard pages wrapped in `<RequireAuth>` + `<DashboardLayout>`
- Role-based access via `<RoleBasedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>`

### Toast Pattern
All pages use a local `toast` state:
```js
const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });
```

### Color Tokens (consistent across app)
```
Primary accent:    #5B63D3 (indigo/purple)
Yellow accent:     #FDE68A / #FCD34D
Success green:     #22C55E
Warning amber:     #F59E0B
Error red:         #ef4444
Background:        #fafafa
Card background:   #ffffff
Border:            rgba(0,0,0,0.06)
Text primary:      #1d1d1f
Text secondary:    #86868b
```

---

## 14. Known Issues & Decisions

### Issue: TrialCityLocation stores per-trial data globally
**Problem:** `TrialCityLocation.month_only` and `.trial_date` get overwritten if the same city is in two trials.
**Fix:** Added 7 per-trial fields to `TrialCity` model (state, city_name, region, ground_location, tentative_month, tentative_date, confirmed). Serializer now reads/writes from `TrialCity` directly. `TrialCityLocation` is no longer written to by the wizard.
**Status:** ✅ Fixed — migration `0003_add_per_trial_city_fields` applied.

### Decision: Dialog vs Page for Project Detail
**Decision:** Replace `TrialDetailView` dialog with a dedicated route `/trials/:id`.  
**Reason:** 30+ cities cannot be managed in a dialog; need full page real estate.  
**Impact:** `TrialCard` "View" button navigates instead of opening dialog; `TrialDetailView` will be retired.

### Decision: Keep `TrialEditModal` as a dialog
**Decision:** `TrialEditModal` stays as a modal dialog for editing project-level fields (tier, schedule, notes, status).  
**Reason:** City management moves to the dashboard; the remaining fields fit comfortably in a dialog.

### Decision: Trial name = Trial code after wizard
**Behavior:** Wizard sets `trialName = trialCode = generateProjectCode(...)` (e.g. `IKF-S5-001`).
**Reason:** Projects are identified by their code; name field is redundant but kept for DB uniqueness constraint.
**Fixed:** `trialCode` serializer field changed from `read_only=True` to writable (`validators=[]`). Backend now stores the frontend-generated code instead of auto-generating a different format. `trial_code` immutability enforced in `validate()` on update.

### Issue: No payments backend
**Status:** Frontend (`PaymentManagementPage`, `PaymentModal`) calls `/api/payments/` but this endpoint doesn't exist.  
**Fix:** Build `payments` Django app.  
**Priority:** After Projects module is complete.

### Issue: `Trial.trial_type` has legacy TYPE_CHOICES in model
**Status:** Backend model still has `TYPE_CHOICES` tuple but uses `CharField(max_length=255)` — no longer enforced.  
The serializer was updated to use free-text `CharField`. The choices tuple can be cleaned up.

---

## Appendix: File Quick-Reference

| File | Purpose |
|---|---|
| `src/App.js` | All routes |
| `src/services/api.js` | All API calls |
| `src/components/trials/trialConstants.js` | Enums, color maps, dropdown options |
| `src/utils/trialCodeGenerator.js` | Project/city code generation |
| `tta_backend/backend/trials/models.py` | Trial + TrialCity models |
| `tta_backend/backend/trials/serializers.py` | TrialSerializer |
| `tta_backend/backend/trials/views.py` | TrialViewSet |
| `tta_backend/backend/trialcities/models.py` | TrialCityLocation model |
| `tta_backend/backend/trialcities/serializers.py` | TrialCityLocationSerializer |
| `tta_backend/backend/trialcities/views.py` | TrialCityViewSet |
| `tta_backend/backend/backend/urls.py` | Root URL config |
| `tta_backend/backend/backend/settings.py` | Django settings |
