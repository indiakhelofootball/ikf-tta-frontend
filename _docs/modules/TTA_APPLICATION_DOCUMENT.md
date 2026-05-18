# TTA — Trial & Tournament Administration Platform

# Complete Application Documentation

---

## Overview

TTA is a full-stack web platform built for **India Khelo Football (IKF)** to manage the complete lifecycle of football trials across India. It handles project creation, city-level REP assignments, vendor onboarding, work order contracting, payment processing with automatic TDS calculation, and tax compliance tracking — replacing manual spreadsheets and email chains with a centralized, validated system.

**Live:** [tta.indiakhelofootball.com](https://tta.indiakhelofootball.com)

---

---

# Part 1 — Business Overview (Non-Technical)

---

## What Problem Does TTA Solve?

IKF runs football trials across dozens of Indian cities every season. Each trial needs:
- A **Regional Event Partner (REP)** managing on-ground logistics (venue, courier, ground staff)
- Multiple **service vendors** (photographers, caterers, transport providers, ground rental, accommodation)
- **Work orders** (contracts) with each vendor specifying payment amounts and TDS rates
- **Payments** processed through bank transfers with tax deducted at source
- **TDS compliance** — monthly tracking, government deposit, and reconciliation

Before TTA, all of this was managed through spreadsheets, WhatsApp, and manual bank files. TTA centralizes every step with built-in validation, audit trails, and financial controls.

---

## The Complete Business Flow

This is how the platform is used in day-to-day operations, from start to finish:

### Step 1: Admin Configuration (Done Once Per Season)

Before anything else, an admin sets up the dropdown options that the rest of the system uses:

| Category | Examples | Where Used |
|----------|----------|-----------|
| **Seasons** | Season 5, Season 6 | Trial creation, REP assignment |
| **Project Names** | Regular, CSR, Championship, School Partnership | Trial creation |
| **Service Types** | Accommodation, Catering, Transport, Ground Rental, Staffing | Vendor creation, Work Order filtering |
| **Entity Types** | Individual, Company, Partnership, Trust/NGO | Vendor creation |
| **Vendor Names** | Pre-approved vendor names | Vendor creation autocomplete |
| **Bank Names** | SBI, HDFC, ICICI, Axis (52 Indian banks) | Vendor bank details |
| **Account Types** | Savings, Current, Overdraft, Cash Credit | Vendor bank details |

These are managed on the **Admin page** (`/admin`) and cached locally for fast access across all modules.

### Step 2: Create Trial Projects

A **Trial** (also called a **Project**) represents a football trial season. Created via a wizard:

1. Select **Project Name** (e.g., "Regular") from admin dropdown
2. Select **Season** (e.g., "Season 5") from admin dropdown
3. System auto-generates a **Project Code**: `TRL-S5-REG-001`
   - Format: `TRL-{season code}-{type code}-{sequential number}`
   - Season codes: S1–S10, CUS (Custom)
   - Type codes: REG (Regular), CSR, CHP (Championship), SPR (School Partnership)
4. System checks for duplicates (same project name + season combination)
5. Project starts in **Draft** status

**Project Status Lifecycle:**
```
Draft → Active → Completed
  ↓
Cancelled ← Active
  ↓
Draft (can be revived)
```

Each project can have multiple **cities** assigned, with per-city details:
- City name, state, region (North/South/East/West/Central)
- Ground location
- Schedule (fixed date or tentative month)
- Confirmation status

**Project Tiers:** Not Any, Basic, Standard, Premium — determines scope and budget.

### Step 3: REP Onboarding & City Assignment

A **REP (Regional Event Partner)** is an organization that manages trial logistics in cities. The system tracks two levels of information:

**Organization Level (one record per REP):**
- REP name (unique across the system)
- Primary contact: name, phone (Indian 10-digit, starts with 6-9), email
- Backup contact: name, phone, email
- Online presence: website, Facebook, Instagram, Telegram (each with "Not Available" checkbox)
- Legal: MoU status (Signed / Pending / Not Required), uploaded MoU document, REP logo
- Season reference

**City Assignment Level (one record per REP + project + city):**
Each assignment links a REP to a specific project in a specific city, with:

- **Location:** city, state, region
- **Courier details:** accepting person name, phone, address, PIN code, additional info
- **Ground details:** location name, Google Maps link, PIN code, ground PIN code, reporting time
- **Ground contact:** name, phone
- **Physical address**

**Key business rules:**
- One REP organization can operate in Mumbai for Season 5 AND Delhi for Season 6 — each is a separate assignment
- Same REP + same project + same city = blocked (unique constraint)
- Same REP + different projects + same city = allowed (different assignments)
- Deleting a REP cascades to all its city assignments
- Deleting a project cascades to all REP assignments for that project

**REP Creation Flow (Add Mode):**
1. Select project (from active trials)
2. Select state and city
3. Enter REP name — system does a debounced search (500ms, min 2 chars)
4. If existing REP found: org fields pre-fill as read-only, user adds new assignment only
5. If new REP: fill all org fields + assignment fields
6. Save creates both REP record and city assignment

**REP Edit Mode:**
- Edit org-level fields directly
- View existing assignments list with delete buttons
- "Add New Assignment" opens inline form for project/state/city + courier/ground details

### Step 4: Vendor Registration

A **Vendor** is any service provider doing work for IKF trials. The registration captures:

**Company Information:**
- Vendor name, vendor type (from admin dropdown)
- Company type: Individual, Sole Proprietorship, Partnership Firm, Private Limited, Public Limited, LLP, One Person Company, HUF, Trust/NGO/Society, Section 8 Company
- Entity name (legal entity)

**Tax Documents:**
- PAN number (required, format: `ABCDE1234F` — 5 letters, 4 digits, 1 letter)
- PAN card image upload (PNG/JPG/PDF, max 3MB)
- GST number (optional, 15-char format: `27AABCU9603R1ZM`)
- PAN verified checkbox, GST verified checkbox
- TDS type (determines tax deduction rate for payments)

**Contact Details:**
- Contact person name, phone (10-digit Indian), email
- PIN code (6 digits, auto-fills state from postal API)
- State, city/area, full address

**Bank Details:**
- Bank name (autocomplete from 52 Indian banks)
- Account type (Savings/Current/Overdraft/Cash Credit/Fixed Deposit)
- Account number
- IFSC code (format: `SBIN0001234` — 4 letters, 0, 6 alphanumeric)
- Branch PIN code, branch address

**Vendor Status:** Verified / Pending / Rejected

**Bulk Add:** CSV upload for adding multiple vendors at once.

### Step 5: Work Order Creation (The Contract)

A **Work Order** is a payment commitment to a vendor for specific work. Two types exist to handle different payment patterns:

**Fixed Work Order (Lump Sum):**
- Total contract value in one amount field
- Can be paid in multiple installments
- Example: "Photography for Mumbai trial — Rs 50,000"
- Pay Rs 30,000 now, Rs 20,000 later

**Periodic Work Order (Recurring):**
- Amount per period x number of periods = total value
- One payment per period, each period tracked individually
- Period types: Monthly, Quarterly, Half-Yearly, Yearly
- Example: "Monthly ground rent — Rs 10,000/month x 6 months = Rs 60,000"

**Work Order Fields:**
- Auto-generated WO number (unique identifier)
- Linked vendor (selected via filtered autocomplete — service type → entity type → vendor name)
- Service description (what work is being done)
- Project reference
- TDS rate (tax percentage, extracted from vendor's TDS type, e.g., "TDS @ 2% (Sec 194C)" → 2%)
- TDS comment

**Work Order Status Lifecycle:**
```
Issued → Partially Paid → Fully Paid → Completed
                                           ↓
                                       Cancelled
```
Status auto-updates based on payments:
- **Issued:** No payments yet (`paid_gross_amount = 0`)
- **Partially Paid:** Some payments made (`0 < paid_gross_amount < amount`)
- **Fully Paid:** All money paid (`paid_gross_amount >= amount`)

**The Amount Lock System:**
Once payments are batched (sent to accounts team), the work order amount is **permanently locked**. This prevents the scenario where someone edits the contract value after money has already been processed. Before batching, amounts can be edited with an explicit "Unlock" button, but:
- New amount must be >= already paid amount
- For periodic: cannot reduce periods below the highest paid period
- Every edit is recorded in the **Change Log** (who changed what, when, old → new value)

### Step 6: Payment Processing

The payment flow has three steps in the UI:

**Step 1 — Select Vendor & Work Order:**
- Filter by service type → entity type → vendor name (min 3 characters to search)
- Shows all work orders for selected vendor with payment progress:
  - Fixed: "Rs 30,000 / Rs 50,000 paid" with progress bar
  - Periodic: "3 / 6 periods paid" with checkmarks
- Select one WO to pay against

**Step 2 — Enter Payment Amount:**
- For periodic WOs: select which period to pay (already-paid periods disabled)
- Enter gross amount (the amount vendor receives before tax)
- **Validation:** gross amount cannot exceed remaining balance on the WO
- System auto-calculates:
  - **TDS amount** = gross amount x TDS rate %
  - **Net amount** = gross amount - TDS amount (what actually goes to vendor's bank)
- Enter invoice date, optional notes

**Step 3 — Preview & Submit:**
- Shows full breakdown: request ID, vendor details, bank info, amount breakdown
- On submit, the system:
  1. Creates PaymentRequest record with auto-generated PR number (`PR-2026-001`)
  2. Updates WO: `paid_gross_amount += gross_amount`
  3. For periodic WO: marks the period as paid
  4. Auto-updates WO status (Partially Paid / Fully Paid)
  5. Auto-creates TDS Record if TDS amount > 0

**Payment Status Lifecycle:**
```
Draft → Sent to Accounts → Payment Done
                              ↓
                        Payment Bounced
                              ↓
                     (reverses all amounts)
```

**What happens on Payment Bounce:**
- WO `paid_gross_amount` is reduced by the bounced amount
- If periodic, the period is unmarked as paid
- WO status recalculates (may go from Fully Paid back to Partially Paid)
- Admin can fix bank details and re-submit

**What happens on Payment Delete:**
- Same reversal as bounce: WO amounts and period status reset
- Associated TDS record auto-deleted

### Step 7: Payment Batching & Bank Processing

Multiple payment requests are grouped into a **Payment Batch** for bank processing:

1. On the Payments page, select multiple Draft payments
2. Click "Send to Payment"
3. System creates a batch with auto-generated number (`BATCH-2026-001`)
4. **Downloads XLSX file** in IDFC FIRST Bank format with columns:
   - Beneficiary Name, Account Number, IFSC, Transaction Type (NEFT)
   - Debit Account Number, Transaction Date, Amount (net), Currency (INR)
   - Beneficiary Email, Remarks (PR ID | WO Number), PAN Number
5. All selected payments move to "Sent to Accounts" status
6. **WO amounts are permanently locked** — no more edits to contract value

### Step 8: TDS Compliance

Every payment with a TDS rate > 0 automatically generates a **TDS Record** containing:
- Tax section (e.g., "194C — Contractor (Individual)")
- Rate (e.g., "2%")
- Gross amount and TDS amount
- Month (from invoice date, e.g., "Jan 2026")
- Associated vendor and work order number

**Monthly TDS Processing:**
- The Banking/TDS page shows TDS records grouped by month
- Shows alert: "TDS due by 7th of next month" with days remaining
- Summary table: section, rate, vendor count, gross amount, TDS amount per section
- Admin clicks "Mark as Deposited" for a month → all records update with deposit date
- Deposit status: Pending → Deposited

---

## How the Money Flows (Complete Chain)

```
Trial Project Created
       ↓
REP assigned to City (manages on-ground logistics)
       ↓
Vendor registered (provides services — photography, ground, catering, etc.)
       ↓
Work Order issued to Vendor
  ├── Fixed: "Rs 1,00,000 for photography"
  └── Periodic: "Rs 10,000/month x 6 months"
       ↓
Payment Request created against Work Order
  ├── Gross Amount: Rs 50,000 (what vendor invoiced)
  ├── TDS @ 2%: Rs 1,000 (tax deducted, held for government)
  └── Net Amount: Rs 49,000 (what vendor actually receives)
       ↓
Payment Batch created (groups multiple payments for bank)
  ├── XLSX exported in IDFC FIRST Bank format
  ├── WO amounts permanently locked
  └── Status: Sent to Accounts
       ↓
Bank processes payment
  ├── Success: "Payment Done" — cycle complete
  └── Bounce: amounts reversed, period unmarked, admin fixes bank details
       ↓
TDS deposited with government
  ├── Monthly grouping by section/rate
  ├── "Mark as Deposited" when proof received
  └── Compliance tracking for audit
```

---

## Dashboard

The home screen (`/dashboard`) provides at-a-glance stats:

| Card | Metric | Color | Calculation |
|------|--------|-------|-------------|
| **Total Projects** | Count of Active projects | Green | `status === 'Active' OR 'Scheduled'` |
| **REPs** | Total registered REPs | Yellow | All REP records |
| **Vendors** | Total registered vendors | Blue | All vendor records |
| **Work Orders** | Active WOs | Purple | `status !== 'Cancelled' AND !== 'Completed'` |
| **Payment Requests** | Pending payments | Orange | `status === 'Draft' OR 'Sent to Accounts'` |

**Quick Actions (Admin/SuperAdmin only):**
- New Project → `/trials/create`
- Work Orders → `/work-orders`
- Vendors → `/vendors`
- Payments → `/payments`

---

## User Roles & Access

| Role | What They Can Do | What They Cannot Do |
|------|-----------------|-------------------|
| **Super Admin** | Everything — all modules, create users, manage config | Nothing restricted |
| **Admin** | All operations — projects, REPs, vendors, WOs, payments, config | Cannot create other admin users |
| **REP** | View dashboard, view own profile | Cannot create/edit/delete anything |

**Session Management:**
- Default session: 8 hours
- With "Remember Me": 7 days
- Auto-logout with notification on expiry
- JWT tokens with automatic refresh on 401

---

---

# Part 2 — Technical Documentation

---

## Architecture

```
┌─────────────────────────────┐         ┌──────────────────────────────┐
│        FRONTEND              │         │         BACKEND               │
│                              │  HTTPS  │                              │
│  React 18 + MUI v7 (7.3.7)  │ ◄─────► │  Django 3.2 + DRF 3.x       │
│  Single Page Application     │   JWT   │  REST API (JSON)             │
│                              │         │                              │
│  Nginx (static files)        │         │  Gunicorn (WSGI server)      │
│                              │         │                              │
│  localStorage for:           │         │  python-decouple (.env)      │
│  - JWT tokens                │         │  SimpleJWT + token blacklist │
│  - Admin dropdown cache      │         │                              │
│  - Per-user profile cache    │         │                              │
└─────────────────────────────┘         └──────────────┬───────────────┘
                                                       │
                                             ┌─────────▼──────────┐
                                             │   MariaDB 10.1.48  │
                                             │   (MySQL compat)   │
                                             └────────────────────┘
```

### Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Frontend | React | 18.x | SPA with client-side routing |
| UI Library | Material UI (MUI) | 7.3.7 | `slotProps` API (InputProps deprecated) |
| Backend | Django | 3.2 | Downgraded from 4.x for MariaDB 10.1 compatibility |
| API Framework | Django REST Framework | 3.x | ViewSets + Serializers |
| Authentication | SimpleJWT | — | Access (24h) + Refresh (30d) tokens, blacklist on logout |
| Database | MariaDB | 10.1.48 | Very old — no JSON fields, limited ALTER TABLE |
| Runtime | Python | 3.13 | With `legacy-cgi` package for Django 3.2 compat |
| Web Server | Nginx | — | Frontend static files + reverse proxy to Gunicorn |
| App Server | Gunicorn | — | Managed by systemd (`tta` service) |
| Server | Alibaba Cloud ECS | Linux | Domain: `tta.indiakhelofootball.com` |
| Config | python-decouple | — | `.env` file for secrets |

### Repository Structure

Two independent Git repositories, developed locally on the same machine:

| Repo | GitHub | Local Path | Deploy |
|------|--------|------------|--------|
| Frontend | `indiakhelofootball/ikf-tta-frontend` | `D:\tta_frontend-main\` | `npm run build` → `deploy.bat` (SCP) |
| Backend | `indiakhelofootball/ikf-tta-backend` | `D:\tta_frontend-main\tta_backend\` | `git push` → server `git pull` → migrate → restart |

`tta_backend/` is in frontend's `.gitignore` — they are completely independent repos that happen to live in the same parent directory locally.

---

## Authentication & Session Management

### Login Flow
```
1. User enters email + password on /login page
2. POST /api/auth/login/ → EmailBackend authenticates (email as username)
3. Server returns: { token: "access_jwt", tokens: { access, refresh }, user: { id, email, role, name } }
4. Frontend stores in localStorage:
   - tta_token (access JWT)
   - tta_refresh (refresh JWT)
   - tta_user (user object JSON)
   - tta_login_time (timestamp)
   - tta_remember_me (boolean)
5. Session timer starts: 8 hours default, 7 days with "Remember Me"
```

### Token Refresh
```
1. API call returns 401 Unauthorized
2. Frontend sends refresh token to POST /api/auth/token/refresh/
3. Server returns new access token
4. Frontend updates tta_token, retries original request
5. If refresh also fails → forced logout
```

### JWT Configuration (Backend)
```python
ACCESS_TOKEN_LIFETIME = 24 hours
REFRESH_TOKEN_LIFETIME = 30 days
ROTATE_REFRESH_TOKENS = True
BLACKLIST_AFTER_ROTATION = True
ALGORITHM = 'HS256'
```

### CORS Configuration
```python
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://tta.indiakhelofootball.com',
]
CORS_ALLOW_CREDENTIALS = True
```

### Permission Classes
```python
# accounts/permissions.py
class IsAdminForWrite:
    # GET, HEAD, OPTIONS → any authenticated user
    # POST, PUT, PATCH, DELETE → only SUPER_ADMIN or ADMIN
```

---

## Database Schema (Complete)

### accounts_user

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | AutoField | PK | |
| email | EmailField | UNIQUE, NOT NULL | Used as username (USERNAME_FIELD) |
| first_name | CharField(150) | | |
| last_name | CharField(150) | | |
| password | CharField(128) | NOT NULL | Django hashed |
| role | CharField(20) | NOT NULL, default='REP' | SUPER_ADMIN / ADMIN / REP |
| is_staff | BooleanField | default=False | |
| is_active | BooleanField | default=True | |
| is_superuser | BooleanField | default=False | |
| date_joined | DateTimeField | auto_now_add | |
| last_login | DateTimeField | nullable | |

### trials_trial

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | AutoField | PK | |
| trial_name | CharField(255) | UNIQUE | Immutable after creation |
| trial_code | CharField(50) | UNIQUE | Auto: `TRL-S{n}-{TYPE}-{###}`, immutable after creation |
| season | CharField(50) | NOT NULL | Season 1–10 or Custom |
| trial_type | CharField(50) | NOT NULL | Regular / CSR / Championship / School Partnership |
| tier_type | CharField(50) | default='Not Any' | Not Any / Basic / Standard / Premium |
| tier_details | TextField | blank | Nulled if tier='Not Any' |
| tier_amount | Decimal(12,2) | nullable | Nulled if tier='Not Any' |
| expected_participants | IntegerField | nullable | Nulled if tier='Not Any' |
| schedule_type | CharField(20) | default='Tentative' | Fixed / Tentative |
| start_date | DateField | nullable | Required if Fixed, nulled if Tentative |
| end_date | DateField | nullable | Required if Fixed, must be > start_date |
| tentative_month | CharField(50) | blank | For Tentative schedule |
| tentative_date_range | CharField(100) | blank | For Tentative schedule |
| next_trial_date | DateField | nullable | |
| status | CharField(20) | default='Draft' | Draft / Active / Completed / Cancelled |
| comment | TextField | blank | |
| created_by | CharField(100) | blank | User email |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**Indexes:** status, season, trial_type, start_date

**Status Transitions (enforced in serializer):**
| From | Allowed To |
|------|-----------|
| Draft | Active, Cancelled |
| Active | Completed, Cancelled |
| Completed | (none — terminal) |
| Cancelled | Draft (can revive) |

### trials_trialcity

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | AutoField | PK | |
| trial_id | FK → Trial | CASCADE | |
| city_code | CharField(50) | INDEXED | |
| state | CharField(100) | | |
| city_name | CharField(100) | | |
| region | CharField(50) | | |
| ground_location | CharField(255) | blank | |
| tentative_month | CharField(50) | blank | |
| tentative_date | DateField | nullable | |
| confirmed | BooleanField | default=False | |
| assigned_at | DateTimeField | auto_now_add | |
| assigned_by | CharField(100) | blank | User email |

**Unique:** (trial, city_code)

### reps_rep

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | AutoField | PK | |
| rep_name | CharField(255) | UNIQUE | Organization identifier |
| season | CharField(50) | blank | |
| contact_name | CharField(255) | NOT NULL | |
| phone | CharField(20) | NOT NULL | 10-digit Indian, starts 6-9 |
| email | EmailField | NOT NULL | |
| backup_contact_name | CharField(255) | blank | |
| backup_phone | CharField(20) | blank | 10-digit Indian if provided |
| backup_email | EmailField | blank | |
| website | URLField(500) | blank | |
| website_na | BooleanField | default=False | "Not Available" flag |
| facebook | URLField(500) | blank | |
| facebook_na | BooleanField | default=False | |
| instagram | URLField(500) | blank | |
| instagram_na | BooleanField | default=False | |
| telegram | CharField(500) | blank | |
| telegram_na | BooleanField | default=False | |
| mou_status | CharField(20) | default='Pending' | Signed / Pending / Not Required |
| mou_document_name | CharField(500) | blank | Filename only (no actual upload) |
| mou_document_url | TextField | blank | URL or base64 |
| rep_logo_name | CharField(500) | blank | |
| rep_logo_url | TextField | blank | |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**M2M:** `trials` via `REPCityAssignment` through table

### reps_repcityassignment

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | AutoField | PK | |
| rep_id | FK → REP | CASCADE | |
| trial_id | FK → Trial | CASCADE | |
| state | CharField(100) | NOT NULL | |
| city | CharField(100) | NOT NULL | |
| region | CharField(50) | blank | North / South / East / West / Central |
| courier_accepting_name | CharField(255) | blank | |
| courier_accepting_phone | CharField(20) | blank | |
| courier_address | TextField | blank | |
| courier_additional_info | TextField | blank | |
| courier_pin_code | CharField(10) | blank | 6-digit Indian PIN |
| physical_address | TextField | blank | |
| ground_location | CharField(255) | blank | |
| google_map_link | URLField(500) | blank | |
| pin_code | CharField(10) | blank | |
| ground_pin_code | CharField(10) | blank | |
| reporting_time | CharField(20) | blank | |
| ground_contact_name | CharField(255) | blank | |
| ground_contact_phone | CharField(20) | blank | |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**Unique:** (rep, trial, city)
**Indexes:** city, state

### trialcities_trialcitylocation

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | AutoField | PK | |
| code | CharField(50) | UNIQUE | City identifier/lookup key |
| state | CharField(100) | | |
| region | CharField(50) | | North/South/East/West/Central |
| trial_city_name | CharField(100) | | Display name |
| city | CharField(100) | | |
| assigned_rep | CharField(255) | blank | |
| ground_location | CharField(255) | blank | |
| ground_verified | BooleanField | default=False | |
| trial_type | CharField(50) | blank | |
| trial_date | DateField | nullable | |
| month_only | CharField(50) | blank | For tentative dates |
| comment | TextField | blank | |
| next_trial_date | DateField | nullable | |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**Indexes:** region, state, city. **Lookup field:** `code` (not id)

### vendors_vendor

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | AutoField | PK | |
| vendor_name | CharField(255) | NOT NULL | |
| vendor_type | CharField(100) | blank | Service type category |
| company_type | CharField(100) | blank | Individual / Partnership / Pvt Ltd / etc. |
| entity_name | CharField(255) | blank | Legal entity name |
| gst_number | CharField(20) | blank | 15-char GST format |
| pan_number | CharField(20) | NOT NULL | `^[A-Z]{5}[0-9]{4}[A-Z]$` |
| pan_card_image_name | CharField(500) | blank | |
| pan_card_image_url | TextField | blank | Base64 or URL |
| gst_verified | BooleanField | default=False | |
| pan_verified | BooleanField | default=False | |
| tds_type | CharField(100) | blank | e.g., "TDS @ 2% (Sec 194C)" |
| contact_person | CharField(255) | NOT NULL | |
| phone | CharField(20) | NOT NULL | 10-digit Indian |
| email | EmailField | NOT NULL | |
| address | TextField | blank | |
| contact_pin_code | CharField(10) | blank | 6-digit |
| state | CharField(100) | blank | |
| city | CharField(100) | blank | |
| bank_name | CharField(255) | blank | |
| account_number | CharField(50) | blank | |
| account_type | CharField(50) | blank | Savings / Current / etc. |
| ifsc_code | CharField(20) | blank | `^[A-Z]{4}0[A-Z0-9]{6}$` |
| bank_pin_code | CharField(10) | blank | |
| branch_address | TextField | blank | |
| status | CharField(20) | default='Pending' | Verified / Pending / Rejected |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**Indexes:** status, vendor_type, state

### workorders_workorder

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | AutoField | PK | |
| work_order_number | CharField(50) | UNIQUE | Auto-generated |
| vendor_id | FK → Vendor | PROTECT | Cannot delete vendor with WOs |
| type | CharField(20) | NOT NULL | Fixed / Periodic |
| project_ref | CharField(255) | blank | Project reference text |
| service_description | TextField | blank | |
| amount | Decimal(12,2) | NOT NULL | Total contract value |
| tds_rate | Decimal(5,2) | default=0 | Tax deduction percentage |
| tds_comment | CharField(255) | blank | |
| status | CharField(20) | default='Issued' | Issued / Partially Paid / Fully Paid / Completed / Cancelled |
| period_type | CharField(20) | blank | Monthly / Quarterly / Half-Yearly / Yearly |
| number_of_periods | PositiveIntegerField | nullable | For Periodic |
| amount_per_period | Decimal(12,2) | nullable | For Periodic |
| paid_gross_amount | Decimal(12,2) | default=0 | Running total of all payments |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**Computed:** `remaining = amount - paid_gross_amount`
**Indexes:** vendor, type, status

**Amount Lock Rules (enforced in serializer):**
- If any PaymentRequest has status "Sent to Accounts" or "Payment Done": amount fields blocked entirely
- For Fixed: `new_amount >= paid_gross_amount` (can't reduce below what's paid)
- For Periodic: `new_number_of_periods >= highest_paid_period` and `total >= paid_gross_amount`

**Status Auto-Update Rules (triggered by payment events):**
```python
if paid_gross_amount <= 0:       status = 'Issued'
elif paid_gross_amount < amount: status = 'Partially Paid'
elif paid_gross_amount >= amount: status = 'Fully Paid'
```

### workorders_workorderperiod

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | AutoField | PK | |
| work_order_id | FK → WorkOrder | CASCADE | |
| period_number | PositiveIntegerField | NOT NULL | 1-based |
| label | CharField(100) | | e.g., "Month 3 of 6" |
| amount | Decimal(12,2) | | Per-period amount |
| is_paid | BooleanField | default=False | Toggled by payment events |

**Unique:** (work_order, period_number)
**Ordering:** period_number ASC

### workorders_workorderchangelog

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | AutoField | PK | |
| work_order_id | FK → WorkOrder | CASCADE | |
| changed_by_id | FK → User | SET_NULL, nullable | |
| field_name | CharField(100) | | amount, tds_rate, type, etc. |
| old_value | CharField(500) | | |
| new_value | CharField(500) | | |
| changed_at | DateTimeField | auto_now_add | |

**Tracked fields:** amount, amount_per_period, number_of_periods, tds_rate, service_description, type
**Ordering:** -changed_at (newest first)

### payments_paymentrequest

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | AutoField | PK | |
| request_number | CharField(50) | UNIQUE | Auto: `PR-{YYYY}-{###}` |
| work_order_id | FK → WorkOrder | PROTECT | Cannot delete WO with payments |
| vendor_id | FK → Vendor | PROTECT | |
| batch_id | FK → PaymentBatch | SET_NULL, nullable | Assigned when batched |
| status | CharField(30) | default='Draft' | Draft / Sent to Accounts / Payment Done / Payment Bounced |
| payment_date | DateField | nullable | Auto-set to today() on "Payment Done" |
| gross_amount | Decimal(12,2) | NOT NULL | What vendor invoiced |
| tds_rate | Decimal(5,2) | default=0 | From work order |
| tds_amount | Decimal(12,2) | | Auto: `gross_amount * tds_rate / 100` |
| net_amount | Decimal(12,2) | | Auto: `gross_amount - tds_amount` |
| period_number | PositiveIntegerField | nullable | For periodic WOs |
| period_label | CharField(100) | blank | For periodic WOs |
| invoice_date | DateField | NOT NULL | |
| notes | TextField | blank | |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**Indexes:** vendor, work_order, status, batch
**Immutable after creation:** gross_amount, tds_rate, work_order, vendor

**Side Effects on Create:**
```python
# 1. Update WO running total
work_order.paid_gross_amount += gross_amount
work_order.save()

# 2. Mark period paid (if periodic)
if period_number:
    WorkOrderPeriod.objects.filter(work_order=wo, period_number=period_number).update(is_paid=True)

# 3. Auto-create TDS record (if tds > 0)
if tds_amount > 0:
    TDSRecord.objects.create(
        payment_request=instance,
        vendor=vendor,
        section=vendor.tds_type,        # e.g., "194C — Contractor"
        rate=f"{tds_rate}%",
        gross_amount=gross_amount,
        tds_amount=tds_amount,
        month=invoice_date.strftime('%b %Y'),  # e.g., "Jan 2026"
        work_order_number=wo.work_order_number,
    )
```

**Side Effects on Bounce (status → "Payment Bounced"):**
```python
work_order.paid_gross_amount -= gross_amount  # Reverse amount
WorkOrderPeriod.update(is_paid=False)          # Unmark period
# Recalculate WO status: Issued / Partially Paid / Fully Paid
```

**Side Effects on Un-Bounce (status "Bounced" → "Done" or "Sent"):**
```python
work_order.paid_gross_amount += gross_amount  # Re-add amount
WorkOrderPeriod.update(is_paid=True)           # Re-mark period
# Recalculate WO status
```

**Side Effects on Delete:**
```python
work_order.paid_gross_amount = max(0, paid - gross_amount)  # Reverse
WorkOrderPeriod.update(is_paid=False)                        # Unmark
# Recalculate WO status
# TDSRecord auto-deleted via CASCADE
```

### payments_paymentbatch

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | AutoField | PK | |
| batch_number | CharField(50) | UNIQUE | Auto: `BATCH-{YYYY}-{###}` |
| file_name | CharField(255) | blank | |
| total_gross | Decimal(12,2) | | Aggregate of batch payments |
| total_tds | Decimal(12,2) | | |
| total_net | Decimal(12,2) | | |
| payment_count | PositiveIntegerField | | |
| sent_at | DateTimeField | auto_now_add | |

**On Batch Create:**
```python
# 1. Aggregate selected payments
totals = PaymentRequest.objects.filter(id__in=payment_ids).aggregate(
    Sum('gross_amount'), Sum('tds_amount'), Sum('net_amount')
)

# 2. Create batch record
batch = PaymentBatch.objects.create(batch_number=..., totals...)

# 3. Update all selected payments
PaymentRequest.objects.filter(id__in=payment_ids).update(
    batch=batch, status='Sent to Accounts'
)

# 4. Auto-update WO statuses for all affected work orders
for wo in affected_work_orders:
    if wo.paid_gross_amount >= wo.amount:
        wo.status = 'Fully Paid'
    else:
        wo.status = 'Partially Paid'
    wo.save()
```

### payments_tdsrecord

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | AutoField | PK | |
| payment_request_id | OneToOne → PaymentRequest | CASCADE | |
| vendor_id | FK → Vendor | PROTECT | |
| section | CharField(100) | | e.g., "194C — Contractor (Individual)" |
| rate | CharField(20) | | e.g., "2%" |
| gross_amount | Decimal(12,2) | | |
| tds_amount | Decimal(12,2) | | |
| month | CharField(20) | | e.g., "Jan 2026" |
| work_order_number | CharField(50) | | Denormalized for reporting |
| status | CharField(20) | default='Pending' | Pending / Deposited |
| deposited_date | DateField | nullable | Set by mark_deposited action |
| created_at | DateTimeField | auto_now_add | |

**Indexes:** status, month, vendor

**Mark Deposited Action:**
```python
# POST /api/tds/mark_deposited/  { month: "Jan 2026" }
TDSRecord.objects.filter(month=month, status='Pending').update(
    status='Deposited', deposited_date=today()
)
```

### config_configoption

| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | AutoField | PK | |
| category | CharField(50) | NOT NULL | service_type / entity_type / season / project_name / vendor_name |
| value | CharField(255) | NOT NULL | The option text |
| comment | CharField(255) | blank | |
| service_type | CharField(100) | blank | For vendor_name tagging |
| entity_type | CharField(100) | blank | For vendor_name tagging |
| is_active | BooleanField | default=True | Soft delete |
| created_at | DateTimeField | auto_now_add | |
| updated_at | DateTimeField | auto_now | |

**Unique:** (category, value)
**Delete = soft delete:** Sets `is_active=False`
**Bulk create:** `POST /api/config/bulk/` with `{ items: [...] }` — uses `get_or_create` per item

---

## API Endpoints (Complete Reference)

### Authentication (`/api/auth/`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register/` | Admin only | Create user. Body: `{ email, password, password2, firstName, lastName, role }` |
| POST | `/api/auth/login/` | Public | Login. Body: `{ email, password }`. Returns: `{ token, tokens: { access, refresh }, user }` |
| POST | `/api/auth/logout/` | Auth | Blacklist refresh token. Body: `{ refresh }` |
| POST | `/api/auth/token/refresh/` | Public | Refresh access token. Body: `{ refresh }`. Returns: `{ access }` |
| GET | `/api/auth/profile/` | Auth | Get current user profile |
| PUT | `/api/auth/profile/` | Auth | Update profile. Body: `{ firstName, lastName }` |
| POST | `/api/auth/change-password/` | Auth | Body: `{ old_password, new_password, new_password2 }` |
| GET | `/api/auth/me/` | Auth | Get current user (minimal) |

### Trials (`/api/trials/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trials/?status=&trial_type=&season=&search=&sort=&page=&limit=` | List trials. Sort: latest, oldest, name-asc, name-desc. Default limit: 20, max: 100 |
| POST | `/api/trials/` | Create trial with optional cities |
| GET | `/api/trials/{id}/` | Get trial with assigned cities |
| PUT | `/api/trials/{id}/` | Full update (validates status transitions, immutable name/code) |
| PATCH | `/api/trials/{id}/` | Partial update |
| DELETE | `/api/trials/{id}/` | Delete trial (cascades to cities, REP assignments) |
| GET | `/api/trials/check-name/?name=` | Check if trial name already exists |
| POST | `/api/trials/{id}/cities/` | Add city. Body: `{ cityCode, state, cityName, region, ... }` |
| PATCH | `/api/trials/{id}/cities/{code}/` | Update city details |
| DELETE | `/api/trials/{id}/cities/{code}/` | Remove city from trial |

**Response format:** `{ trials: [...], total, page, limit }`

### REPs (`/api/reps/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reps/?city=&region=&search=&sort=&page=&limit=` | List REPs with nested cityAssignments. Search across: repName, contactName, assignment city/state/trialName |
| POST | `/api/reps/` | Create REP. Body includes optional `cityAssignment` + `trialIds` for inline assignment creation |
| GET | `/api/reps/{id}/` | Get REP with all assignments (prefetched) |
| PUT | `/api/reps/{id}/` | Update org fields only (pops cityAssignment/trialIds) |
| DELETE | `/api/reps/{id}/` | Delete REP (cascades to all assignments) |
| POST | `/api/reps/{id}/assignments/` | Add city assignment. Body: `{ trialId, state, city, region, courier*, ground* }` |
| PUT | `/api/reps/{id}/assignments/{aid}/` | Update assignment (partial) |
| DELETE | `/api/reps/{id}/assignments/{aid}/` | Delete specific assignment |

**Response format:** `{ reps: [...], total, page, limit }` (list) or `{ rep: {...} }` (detail)

**Create with get-or-create:**
```python
# If REP with same name exists, reuse org record and update fields
existing = REP.objects.filter(rep_name__iexact=name).first()
if existing:
    rep = existing  # Update fields
else:
    rep = REP.objects.create(...)

# Then create assignments for each trialId
for trial_id in trial_ids:
    REPCityAssignment.objects.get_or_create(rep=rep, trial_id=trial_id, city=city, defaults={...})
```

### Trial Cities (`/api/trial-cities/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trial-cities/?region=&search=` | List. Search: trial_city_name, code, state, city. Lookup by `code` field |
| POST | `/api/trial-cities/` | Create |
| GET | `/api/trial-cities/{code}/` | Get by code (not id) |
| PUT | `/api/trial-cities/{code}/` | Update |
| DELETE | `/api/trial-cities/{code}/` | Delete |

### Vendors (`/api/vendors/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/vendors/?status=&vendor_type=&state=&city=&search=&sort=&page=&limit=` | List. Search: vendorName, entityName, contactPerson, email, gstNumber, panNumber. Max limit: 1000 |
| POST | `/api/vendors/` | Create vendor |
| GET | `/api/vendors/{id}/` | Get vendor detail |
| PUT | `/api/vendors/{id}/` | Update vendor |
| DELETE | `/api/vendors/{id}/` | Delete vendor (blocked if WOs exist — PROTECT) |
| GET | `/api/banks/` | List of 52 Indian banks (hardcoded) |
| GET | `/api/company-types/` | Company type choices from model |

### Work Orders (`/api/work-orders/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/work-orders/?vendor=&type=&status=&search=&sort=&page=&limit=` | List (uses WorkOrderListSerializer — excludes changeLogs). Sort: latest, oldest, amount-desc, amount-asc. Max limit: 200 |
| POST | `/api/work-orders/` | Create WO + auto-create periods for Periodic type |
| GET | `/api/work-orders/{id}/` | Detail with periods, changeLogs (with user info), vendor |
| PUT | `/api/work-orders/{id}/` | Update (validates amount lock, logs changes) |
| DELETE | `/api/work-orders/{id}/` | Delete (blocked if payments exist — PROTECT) |

**Prefetch:** vendor (select_related), periods + change_logs + change_logs__changed_by (prefetch_related)

### Payments (`/api/payment-requests/`, `/api/payment-batches/`, `/api/tds/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payment-requests/?vendor=&workOrder=&status=&search=&sort=&page=&limit=` | List. Max limit: 200 |
| POST | `/api/payment-requests/` | Create PR (auto-calculates TDS, updates WO amounts, creates TDS record) |
| GET | `/api/payment-requests/{id}/` | Detail |
| PUT | `/api/payment-requests/{id}/` | Update (status changes only — amount fields immutable). Handles bounce/un-bounce side effects |
| PATCH | `/api/payment-requests/{id}/` | Partial update (for status change) |
| DELETE | `/api/payment-requests/{id}/` | Delete (reverses WO amounts, unmarked periods, cascades TDS) |
| GET | `/api/payment-batches/` | List batches |
| POST | `/api/payment-batches/` | Create batch from paymentIds. Updates all PRs to "Sent to Accounts", locks WO amounts |
| GET | `/api/tds/` | List TDS records. Filters: status, month, vendor |
| GET | `/api/tds/summary/?month=` | Monthly TDS summary grouped by section/rate |
| POST | `/api/tds/mark_deposited/` | Mark month's pending TDS as deposited |

### Configuration (`/api/config/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/config/?category=&active=true&search=` | List config options |
| POST | `/api/config/` | Create option (unique: category + value) |
| GET | `/api/config/{id}/` | Get option |
| PUT | `/api/config/{id}/` | Update option |
| DELETE | `/api/config/{id}/` | Soft delete (sets is_active=False) |
| POST | `/api/config/bulk/` | Bulk create. Body: `{ items: [...] }`. Uses get_or_create, returns created/skipped counts |
| GET | `/api/config-categories/` | Available category choices |

---

## Frontend Component Architecture

```
src/
├── App.js                              # All routes, RequireAuth + RoleBasedRoute wrappers
├── auth/
│   ├── AuthContext.jsx                  # JWT state, login/logout, session timer, profile caching
│   ├── RequireAuth.jsx                  # Redirect to /login if not authenticated
│   ├── RoleBasedRoute.jsx              # Redirect to /unauthorized if wrong role
│   ├── roles.js                         # SUPER_ADMIN/ADMIN/REP definitions, 34 permissions
│   ├── ProtectedComponent.jsx          # Permission-based UI gating (mostly unused)
│   └── LoginPage.jsx                    # Email + password form, "Remember Me" checkbox
│
├── services/
│   └── api.js                           # Central API client (10 modules), auto 401 refresh
│       ├── trialsAPI      — 10 methods  # CRUD + city management + name check
│       ├── repAPI         — 9 methods   # CRUD + assignment CRUD + search
│       ├── trialCitiesAPI — 5 methods   # CRUD by code
│       ├── vendorsAPI     — 6 methods   # CRUD + banks + companyTypes
│       ├── workOrdersAPI  — 5 methods   # CRUD
│       ├── paymentsAPI    — 5 methods   # CRUD (legacy, unused)
│       ├── paymentRequestsAPI — 6 methods  # CRUD + PATCH
│       ├── paymentBatchesAPI  — 2 methods  # List + Create
│       ├── tdsAPI         — 3 methods   # List + Summary + Mark Deposited
│       └── configAPI      — 6 methods   # CRUD + Bulk + Categories
│
├── components/
│   ├── dashboard/
│   │   └── DashboardHome.jsx            # 5 stat cards, quick action buttons
│   │
│   ├── layout/
│   │   ├── DashboardLayout.jsx          # Header bar + sidebar + content area
│   │   └── Sidebar.jsx                  # 9 menu items, collapsible, role-filtered
│   │       Menu: Dashboard, Admin, Project Setup, Projects, REP Management,
│   │             Vendors, Work Orders, Payments, Banking
│   │
│   ├── admin/
│   │   └── AdminPage.jsx               # 3 sections: Project, Vendors, Banking
│   │       ├── Project Names panel      # Add/edit/delete dropdown options
│   │       ├── Seasons panel
│   │       ├── Service Types panel
│   │       ├── Entity Types panel
│   │       ├── Vendor Names panel       # Special: service/entity type tagging per vendor
│   │       ├── Bank Names panel
│   │       └── Account Types panel
│   │
│   ├── trials/
│   │   ├── TrialManagementPage.jsx      # Grid list, search, filter (season, type), sort
│   │   ├── TrialWizard.jsx              # Project Name + Season → auto-generate code → create
│   │   ├── ProjectDashboard.jsx         # Single project overview with city list
│   │   ├── TrialCard.jsx                # Card display in grid
│   │   ├── TrialEditModal.jsx           # Edit project fields
│   │   ├── TrialDetailView.jsx          # Read-only view
│   │   └── TrialDeleteDialog.jsx        # Confirmation dialog
│   │
│   ├── rep/
│   │   ├── REPManagementPage.jsx        # Stats (REPs, cities, assignments), search, filter, sort
│   │   │   Filters: trialName, city     # Bulk CSV import (repName, phone, email, contactName)
│   │   ├── REPModal.jsx                 # Add: project→state→city, debounced name search, assignment fields
│   │   │                                # Edit: org fields + assignment list with add/delete
│   │   ├── REPCard.jsx                  # City chips (max 3), assignment chips (trialType — city)
│   │   └── REPDetailView.jsx            # Full org info + all assignments with courier/ground details
│   │
│   ├── trialCities/
│   │   ├── TrialCitiesPage.jsx          # Master city database list
│   │   ├── CityModal.jsx               # Add/edit city location
│   │   └── CityCard.jsx                # City card in grid
│   │
│   ├── vendors/
│   │   ├── VendorManagementPage.jsx     # Grid, search (8 fields), filter (type), sort, bulk add
│   │   ├── VendorModal.jsx              # 4 sections: search, documents, contact, bank
│   │   │   Documents: PAN (required), GST, PAN image upload (PNG/JPG/PDF, 3MB)
│   │   │   Contact: auto-fill state from PIN code via postal API
│   │   │   Bank: 52 banks autocomplete, IFSC validation
│   │   ├── VendorCard.jsx               # Card with status chip, bank info
│   │   ├── VendorDetailView.jsx         # Full vendor details
│   │   ├── VendorBulkModal.jsx          # CSV bulk upload
│   │   ├── VendorSearchDialog.jsx       # Vendor search popup
│   │   └── VendorStatementDialog.jsx    # Vendor payment statement
│   │
│   ├── workorders/
│   │   ├── WorkOrderManagementPage.jsx  # Filters: type, service type, status, payment progress
│   │   │   Payment progress: Unpaid (paid=0) / Partial (0<paid<total) / Paid (paid>=total)
│   │   ├── WorkOrderModal.jsx           # Fixed/Periodic toggle, vendor autocomplete (min 3 chars)
│   │   │   TDS rate extracted from vendor.tdsType string (regex)
│   │   │   Shows existing WOs for selected vendor with payment progress
│   │   ├── WorkOrderCard.jsx            # Card with amount, status, progress bar
│   │   └── WorkOrderDetailView.jsx      # Full WO with periods, change log timeline
│   │
│   ├── payments/
│   │   ├── PaymentManagementPage.jsx    # 3 tabs: Draft, Sent to Payment, TDS View
│   │   │   Batch creation: select drafts → "Send to Payment" → XLSX download (IDFC FIRST format)
│   │   │   XLSX columns: Beneficiary, Account, IFSC, NEFT, Amount, PAN, etc.
│   │   ├── PaymentRequestModal.jsx      # 3-step wizard:
│   │   │   Step 1: Service type → Entity type → Vendor (3-char min) → WO selection with progress
│   │   │   Step 2: Period selector (periodic), gross amount, invoice date, auto TDS calc
│   │   │   Step 3: Preview all details, submit
│   │   └── PaymentDetailDialog.jsx      # Payment request details view
│   │
│   ├── bank/
│   │   └── BankManagementPage.jsx       # 2 tabs:
│   │       Tab 1: Payment Tracking — status management (Done/Bounced), bank detail fix
│   │       Tab 2: TDS Deposits — monthly grouping, "Mark Deposited", summary table, CSV export
│   │       Shows TDS due date alert: "7th of next month" with countdown
│   │
│   ├── profile/
│   │   └── ProfilePage.jsx             # View/edit name, designation, phone, department, location
│   │
│   └── error/
│       ├── ErrorBoundaryWrapper.jsx     # React error boundary
│       └── ErrorFallback.jsx            # Error display UI
```

### Frontend Routes

| Route | Component | Access |
|-------|-----------|--------|
| `/login` | LoginPage | Public |
| `/unauthorized` | Unauthorized | Public |
| `/dashboard` | DashboardHome | All authenticated |
| `/profile` | ProfilePage | All authenticated |
| `/admin` | AdminPage | Admin / SuperAdmin |
| `/trials/create` | TrialWizard | Admin / SuperAdmin |
| `/trials` | TrialManagementPage | Admin / SuperAdmin |
| `/trials/:id` | ProjectDashboard | Admin / SuperAdmin |
| `/rep-management` | REPManagementPage | Admin / SuperAdmin |
| `/vendors` | VendorManagementPage | Admin / SuperAdmin |
| `/work-orders` | WorkOrderManagementPage | Admin / SuperAdmin |
| `/payments` | PaymentManagementPage | Admin / SuperAdmin |
| `/bank-tds` | BankManagementPage | Admin / SuperAdmin |

---

## Data Relationships (Entity-Relationship)

```
accounts_user
  └── changed_by ──→ workorders_workorderchangelog

trials_trial
  ├── 1:N ──→ trials_trialcity (cities within a project)
  ├── 1:N ──→ reps_repcityassignment (REPs assigned to this trial)
  └── referenced by workorders_workorder.project_ref (loose text reference)

reps_rep
  ├── 1:N ──→ reps_repcityassignment (city-level assignments)
  └── M2M ──→ trials_trial (via REPCityAssignment through table)

vendors_vendor
  ├── 1:N ──→ workorders_workorder (PROTECT — can't delete vendor with WOs)
  ├── 1:N ──→ payments_paymentrequest (PROTECT)
  └── 1:N ──→ payments_tdsrecord (PROTECT)

workorders_workorder
  ├── N:1 ──→ vendors_vendor (PROTECT)
  ├── 1:N ──→ workorders_workorderperiod (CASCADE — for Periodic type)
  ├── 1:N ──→ workorders_workorderchangelog (CASCADE — audit trail)
  └── 1:N ──→ payments_paymentrequest (PROTECT — can't delete WO with payments)

payments_paymentrequest
  ├── N:1 ──→ workorders_workorder (PROTECT)
  ├── N:1 ──→ vendors_vendor (PROTECT)
  ├── N:1 ──→ payments_paymentbatch (SET_NULL — batch can be deleted without losing PR)
  └── 1:1 ──→ payments_tdsrecord (CASCADE — deleting PR deletes TDS)

payments_paymentbatch
  └── 1:N ──→ payments_paymentrequest (SET_NULL)

config_configoption           — standalone lookup table
trialcities_trialcitylocation — standalone master city database
```

### Deletion Protection Chain
```
Cannot delete Vendor if Work Orders exist         (PROTECT)
Cannot delete Work Order if Payments exist         (PROTECT)
Deleting Payment reverses WO amounts + deletes TDS (CASCADE + manual reversal)
Deleting REP cascades to all assignments           (CASCADE)
Deleting Trial cascades to cities + REP assignments (CASCADE)
Config "delete" is soft-delete (is_active=False)
```

---

## Validation Rules Reference

### Phone Numbers (Indian Mobile)
- **Rule:** Exactly 10 digits, must start with 6, 7, 8, or 9
- **Regex:** `^[6-9]\d{9}$`
- **Applied to:** REP phone, backup phone, ground contact phone, courier accepting phone, vendor phone
- **Backend:** Strips non-digit characters before validation

### PIN Codes (Indian Postal)
- **Rule:** Exactly 6 digits, first digit 1-9
- **Regex:** `^[1-9][0-9]{5}$`
- **Applied to:** Courier PIN, ground PIN, vendor contact PIN, bank PIN
- **Frontend:** Auto-fills state/city via `api.postalpincode.in`

### PAN Number
- **Rule:** 5 uppercase letters + 4 digits + 1 uppercase letter
- **Regex:** `^[A-Z]{5}[0-9]{4}[A-Z]$`
- **Example:** `AABCU9603R`
- **Required** for vendor creation

### GST Number
- **Rule:** 2 digits + 5 letters + 4 digits + 1 letter + 1 alphanumeric + Z + 1 alphanumeric
- **Regex:** `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$`
- **Example:** `27AABCU9603R1ZM`
- **Optional** for vendor creation

### IFSC Code
- **Rule:** 4 uppercase letters + 0 + 6 alphanumeric
- **Regex:** `^[A-Z]{4}0[A-Z0-9]{6}$`
- **Example:** `SBIN0001234`
- **Optional** for vendor bank details

### Email
- Standard email format validation (Django EmailField)

### Unique Constraints Summary

| Entity | Unique Field(s) | Scope |
|--------|-----------------|-------|
| Trial | `trial_name` | Global |
| Trial | `trial_code` | Global |
| Trial City | `(trial, city_code)` | Per trial |
| REP | `rep_name` | Global |
| REP Assignment | `(rep, trial, city)` | Per REP per trial |
| Vendor | (none enforced) | Duplicates allowed |
| Work Order | `work_order_number` | Global |
| Payment Request | `request_number` | Global |
| Payment Batch | `batch_number` | Global |
| Config Option | `(category, value)` | Per category |

### Auto-Generated Identifiers

| Entity | Pattern | Example | Logic |
|--------|---------|---------|-------|
| Trial Code | `TRL-{season}-{type}-{###}` | `TRL-S5-REG-001` | Sequential per season+type |
| WO Number | Generated by frontend | — | Based on service type + vendor |
| PR Number | `PR-{YYYY}-{###}` | `PR-2026-001` | Sequential per year from last record |
| Batch Number | `BATCH-{YYYY}-{###}` | `BATCH-2026-001` | Sequential per year from last record |

---

## Key Design Decisions & Rationale

### Why Two-Model REP Structure?
**Before (pre-2026-03-31):** One REP record per city. "Taj Hotels Mumbai" and "Taj Hotels Delhi" were separate records. Editing one didn't affect the other. Duplicate data for org-level fields.

**After:** REP (org) + REPCityAssignment (per city per project). One "Taj Hotels" record, multiple city assignments. Mirrors the Vendor → Work Order pattern. Eliminates org-level data duplication.

### Why Admin Config in localStorage?
Admin dropdown options (service types, seasons, vendor names) change rarely. Caching in localStorage avoids backend calls on every modal open. The Admin page is the single point of update. Trade-off: not real-time if multiple admins edit simultaneously — acceptable for this team size.

### Why Amount Lock on Work Orders?
Prevents the scenario where contract value is edited after money is already processed. Before batching: soft lock with explicit "Unlock" button and minimum constraint. After batching: permanent lock with no unlock option.

### Why Change Log on Work Orders?
Financial audit trail requirement. Every edit to amount, TDS rate, periods, or description is logged with who/when/old-new values. List API excludes change logs for performance (separate list vs detail serializers).

### Why Separate TDS Records?
TDS has its own lifecycle (Pending → Deposited) independent of payment status. Monthly grouping for government deposit. Can track deposit proof. Needs vendor-level aggregation for compliance reporting.

### Why PROTECT on Vendor and WorkOrder FKs?
Prevents accidental cascade deletion of financial records. You must explicitly delete all payments before deleting a work order, and all work orders before deleting a vendor. Forces deliberate cleanup rather than accidental data loss.

### Why Client-Side Filtering on Work Orders?
Work order counts are manageable (<200 typically). Fetching all at once and filtering client-side gives instant filter response without API roundtrips. Pagination limit set to 200 for this reason.

---

## External Integrations

| Service | Purpose | Used In |
|---------|---------|---------|
| `api.postalpincode.in` | Auto-fill city/state from Indian PIN code | REP Modal (courier PIN), Vendor Modal (contact PIN) |
| IDFC FIRST Bank XLSX format | Payment batch export for bank processing | PaymentManagementPage batch creation |

---

## Deployment & Infrastructure

| Component | Detail |
|-----------|--------|
| **Server** | Alibaba Cloud ECS (Linux) |
| **Domain** | `tta.indiakhelofootball.com` |
| **Frontend** | Nginx serves React build (`/root/TTA/frontend/`) |
| **Backend** | Gunicorn behind Nginx reverse proxy (`/root/TTA/backend/`) |
| **Database** | MariaDB 10.1.48 (MySQL compatible) |
| **Python** | 3.13 with venv at `/root/TTA/backend/venv/` |
| **Process** | systemd service `tta` (gunicorn) |
| **Config** | `.env` file via `python-decouple` |
| **SSL** | HTTPS (likely via Let's Encrypt or Alibaba certificate) |

---

## Known Issues & Limitations

### Security
- Hardcoded SECRET_KEY default in `settings.py` (production overrides via `.env`)
- Missing `IsAdminForWrite` on payments and workorders views — any authenticated user can create/delete via API
- Payment creation not wrapped in `@transaction.atomic` — risk of partial data on failure
- No `DEFAULT_PERMISSION_CLASSES` in REST_FRAMEWORK settings
- No rate limiting on login endpoint

### Functional
- File uploads (MoU, logo, PAN card) store filename/base64 only — no actual file upload endpoint
- `courierAcceptingPhone` has no validation (frontend or backend)
- Pagination count bug in workorders/payments: `.count()` ignores filters
- Dashboard fetches all records without pagination
- Profile data only in localStorage — lost on browser cache clear

### UX
- 1-second artificial delay on login (`LoginPage.jsx`)
- Session timeout uses `alert()` instead of toast notification
- Empty catch blocks silently swallow errors in multiple components
- REP Modal is 700+ lines (should be split into sub-components)

### Pending Approved Work
- 3-letter minimum for vendor autocomplete in WO and Payment modals
- Role system simplification (remove multi-role, keep single admin role)

---

## UI Design System

### Color Palette

| Usage | Color | Hex |
|-------|-------|-----|
| Primary action (Add/Save buttons) | Yellow | `#FDE68A` / `#FBB040` |
| Success / Create | Green | `#22C55E` |
| Info / Blue highlights | Blue | `#3B82F6` |
| Danger / Delete | Red | `#ef4444` |
| Secondary / Outline | Light gray | `#e2e8f0` |
| Filter buttons | Indigo | `#5B63D3` |
| Text primary | Dark slate | `#1e293b` |
| Text secondary | Slate | `#64748b` |
| Text muted | Light slate | `#94a3b8` |
| Background | Near white | `#f8fafc` |
| Card border | Gray | `#e5e7eb` |

### Status Chip Colors

| Status | Background | Text |
|--------|-----------|------|
| Draft | Gray `#f1f5f9` | `#475569` |
| Sent to Accounts | Blue `#dbeafe` | `#1d4ed8` |
| Payment Done | Green `#dcfce7` | `#16a34a` |
| Payment Bounced | Red `#fee2e2` | `#dc2626` |
| Pending (MoU/TDS) | Yellow `#fef9c3` | `#854d0e` |
| Signed / Deposited | Green `#dcfce7` | `#16a34a` |
| Partially Paid | Amber `#fef3c7` | `#92400e` |
| Fully Paid | Green `#dcfce7` | `#16a34a` |
| Verified (Vendor) | Green | Green |
| Rejected (Vendor) | Red | Red |

### Typography

| Element | Size | Weight |
|---------|------|--------|
| Section headers | 0.72rem | 700, uppercase, blue `#3B82F6` |
| Sub-labels | 0.72rem | 700, uppercase, slate `#64748b` |
| Field labels | 0.72rem | 500, uppercase, light slate `#94a3b8` |
| Field values | 0.9rem | 600, dark `#1e293b` |
| Card titles | 0.88rem | 700 |
| Chip text | 0.7rem | 600 |

### Component Patterns

| Pattern | Description |
|---------|-------------|
| **Card Grid** | 3-4 columns (lg), 2 (md), 1 (xs) with consistent `cardSx` styling |
| **Modal** | MUI Dialog, `maxWidth="md"`, rounded corners, `#f8fafc` background |
| **Form Sections** | Blue uppercase section headers, 2-column grid (`grid2`) or 3-column (`grid3`) |
| **Search** | TextField with search icon, instant client-side filtering |
| **Filters** | Autocomplete dropdowns, "Clear All" button, result count display |
| **Empty State** | Centered text in dashed border box |
| **Loading** | Circular progress indicator |
| **Toast** | MUI Snackbar for success/error feedback |

---

*Last updated: 2026-03-31*
*Version: 2.0 — Post REP Restructure*
