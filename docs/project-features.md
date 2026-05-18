# TTA — Project Features & Functionality

> Complete reference for all TTA modules, processes, and workflows.

---

## Table of Contents

1. [Login & Authentication](#1-login--authentication)
2. [Dashboard](#2-dashboard)
3. [Creating a New Project](#3-creating-a-new-project)
4. [Projects List](#4-projects-list)
5. [Inside a Project](#5-inside-a-project)
6. [Admin Settings](#6-admin-settings)
7. [Vendor Management (Service Providers)](#7-vendor-management-service-providers)
8. [REP Management](#8-rep-management)
9. [Work Order Management](#9-work-order-management)
10. [Payment Flow — End-to-End](#10-payment-flow--end-to-end)
11. [Complete Data Flow Summary](#11-complete-data-flow-summary)

---

## 1. Login & Authentication

TTA uses **email-based login** with secure token authentication (JWT).

### Logging In

1. Open the TTA application URL
2. Enter your **email address** and **password**
3. Click **Login**

On successful login, you are redirected to the Dashboard. Your session stays active until you log out or the token expires.

### Session Management

- Sessions are managed via **access tokens** (short-lived) and **refresh tokens** (longer-lived)
- If your session expires, you will be redirected to the login page
- Click **Logout** from the sidebar to end your session

### Security

- All API requests are authenticated — unauthenticated requests are rejected
- Passwords are hashed and never stored in plain text
- Tokens are stored securely in the browser

---

## 2. Dashboard

The Dashboard is the landing page after login. It provides a high-level overview of your system's current state.

Key metrics displayed:

- **Projects** — Total number of projects in the system
- **Vendors** — Total registered vendors
- **Work Orders** — Total work orders across all vendors
- **Payments** — Summary of payment activity

The sidebar navigation provides quick access to all modules: Projects, Service Providers, Work Orders, Payments, Bank, REP Management, and Admin Settings.

---

## 3. Creating a New Project

To create a new project, click **New Project** from the Projects page. A three-step wizard will guide you through the process.

---

### Step 1 — Project Setup

Select the project name and season from the two dropdowns.

- **Project Name** — Choose from the available project options (e.g., IKF, Narishakti).
- **Season** — Choose the season this project belongs to.

Once both are selected, an identity card appears below showing:

- **Display ID** — A readable name combining the project and season (e.g., *IKF — Season 6*). This is how the project will appear across the system.
- **Reference Code** — A system-generated unique code (e.g., *IKF-S6-001*) used internally to identify the project.

Both fields are required. You cannot proceed without selecting them.

---

### Step 2 — Location & Schedule

Add one or more cities where the trial will be held. This step is optional — you can skip it and add cities later from inside the project.

**Saved Cities panel** (left side) shows all cities confirmed so far. The entry form sits on the right.

#### Adding a City

Fill in the following fields:

- **State** — Required. Select the state from the dropdown.
- **City** — Required. Select the city after choosing a state.
- **Sub City** — Optional. Enter a specific locality within the city (e.g., Andheri, Bandra).
- **Month** — Optional. The tentative month for the trial in this city.
- **Date** — Optional. A specific date if known.

Click **Save Location** to confirm the city. It will appear in the Saved Cities panel on the left.

#### Adding Multiple Cities

Two buttons are available below the entry form:

- **+ Add City** — Opens one new blank entry card.
- **+ Add 5 in Bulk** — Opens five blank entry cards at once for faster entry.

Both buttons are disabled until the current open card is saved.

#### Duplicate City Check

If you try to save a city that has already been added — either in this session or already stored in the system under the same project — a warning dialog will appear and the city will not be saved. Choose a different city or remove the existing one first.

---

### Step 3 — Review

A summary of everything entered is shown before the project is created.

- Check the project name, season, reference code, and all assigned cities.
- Tick the confirmation checkbox to confirm all details are correct.
- Click **Create Project** to finalise.

Once created, the project is saved with a **Draft** status.

---

## 4. Projects List

All created projects appear as cards on the Projects page.

Each card shows:

- **Display ID** — The readable project name (e.g., *IKF — Season 6*) in the project's identity style.
- **Regions** — Number of cities assigned to the project.
- **Tier and Amount** — Shown only if a tier has been applied.
- **Notes preview** — A short preview of any comments added.

#### Actions on each card

- **Open** — Go into the project to view details and manage cities.
- **Delete** — Permanently remove the project.

---

## 5. Inside a Project

Clicking **Open** on a project card takes you to the project dashboard.

### Project Header

Shows the Display ID, status chip, and city count at a glance.

### Managing Locations

All assigned cities are listed in a table with the following columns:

| Column | Description |
|--------|-------------|
| City | Name of the city |
| Sub City | Locality within the city, if added |
| State | State the city belongs to |
| Month | Tentative trial month |
| Date | Specific trial date, if set |
| Confirmed | Whether the trial in this city is confirmed |

#### Search

Type any city name, sub city, or state into the search bar. Suggestions will appear as you type — select one or keep typing to filter the list.

#### Filter by State

Use the **All States** dropdown to narrow the list to cities within a specific state.

#### Sort

Use the sort dropdown to reorder the list by:

- Most recent
- City name (A–Z or Z–A)
- State name
- Month
- Confirmed cities first

#### Adding a New Location

Click **Add Location** to open the entry form. Fill in State, City, Sub City (optional), Month, and Date (optional), then click **Save Location**.

The form follows the same layout and style as the project setup wizard.

#### Editing a City Row

Click the edit icon on any row to update the Sub City, Month, Date, or Confirmed status inline. Save or cancel using the icons that appear.

#### Removing a City

Click the delete icon on any row to remove that city from the project. A confirmation step will appear before deletion.

#### Bulk Add

Click **Bulk Add** to open a dialog for adding multiple cities at once.

### Deleting the Project

Click **Delete** in the top-right corner to permanently remove the entire project, including all assigned cities.

---

### Key Rules (Projects)

- A city can only appear once per project. Duplicates are blocked at the point of saving.
- Project name and season are the only mandatory fields. Locations and schedule can be added later.
- The Display ID is automatically generated from the project name and season and cannot be edited manually.
- The Reference Code is system-generated and unique to each project.

---

## 6. Admin Settings

Admin Settings is the configuration hub for the entire TTA system. All dropdown options used across vendor registration, work orders, and payments are managed here.

### Accessing Admin Settings

Navigate to **Admin Settings** from the sidebar.

### Configurable Lists

| Setting | Purpose | Used In |
|---------|---------|---------|
| **Service Types** | Categories of vendor services (e.g., Photography, Videography, REP, Ground Events) | Vendor registration, Work Order creation, filtering |
| **Entity Types** | Legal structure of vendors (e.g., Individual, Proprietorship, Private Limited, LLP) | Vendor registration |
| **Vendor Names** | Pre-approved vendor names — each can be tagged with a service type and entity type | Vendor registration (autocomplete dropdown) |
| **Bank Names** | List of banks available in vendor bank details (e.g., HDFC Bank, ICICI Bank, SBI) | Vendor registration (bank details section) |
| **Account Types** | Bank account categories (e.g., Savings, Current) | Vendor registration (bank details section) |

### Managing Each List

For each setting type:

1. **View** — All existing entries are displayed in a list
2. **Add** — Click the add button to create a new entry
3. **Edit** — Modify an existing entry inline
4. **Delete** — Remove an entry (if not in use by any vendor or work order)

### Why Admin Settings Matter

These settings ensure consistency across the system:

- Vendor names come from a curated list — reducing duplicates and typos
- Service types are standardised — making filtering and reporting reliable
- Bank names and account types are controlled — ensuring payment data is clean

**Admin Settings must be configured before any vendors can be registered.**

---

## 7. Vendor Management (Service Providers)

The Vendor module is where you register and manage every external service provider (photographer, videographer, REP, etc.) your organisation works with. A vendor must exist in the system before a work order or payment can be created for them.

---

### 7.1 Vendor List Page

Navigate to **Service Providers** from the sidebar. All registered vendors appear as cards in a responsive grid.

Each vendor card shows:

- **Vendor Name** — The registered name of the vendor.
- **Service Type** — A coloured chip showing the vendor's service category (e.g., Photography, Videography).
- **PAN Number** — Displayed in monospace for easy reading.
- **GST Number** — Displayed in monospace; shows "N/A" if not provided.
- **Status** — A chip showing the current status (Pending, Verified, etc.).
- **Actions** — View, Edit, Delete, Statement, and Create Work Order buttons.

#### Search

A search bar at the top lets you search across:

- Vendor name
- Contact person
- Email
- GST number
- PAN number
- Entity name
- City
- State

Results update in real-time as you type.

#### Filter by Service Type

Click the **Filter** button to see a dropdown of all service types configured in Admin Settings. Select one to show only vendors of that type. An active filter is shown as a chip — click it to clear.

#### Sort

Click the **Sort** button to reorder the list:

- **Latest** (default) — Most recently added first
- **Oldest** — Oldest first
- **Name A–Z** — Alphabetical
- **Name Z–A** — Reverse alphabetical

#### Bulk Add

Click the **Bulk Add** button to open a spreadsheet-style dialog for adding multiple vendors at once. Each row represents one vendor. All the same validation rules apply.

---

### 7.2 Adding a Vendor

Click **Add Vendor** to open the vendor registration form.

#### Step 1 — Find or Select the Vendor

Before filling in any details, you must identify the vendor. The top section of the form provides search filters:

- **Service Type** — Filter by the vendor's service category (e.g., Photography).
- **Entity Type** — Filter by company type (e.g., Individual, Private Limited).
- **State** — Filter by the vendor's state.
- **City** — Filter by city (available after selecting a state).

Below these filters, a **Vendor Name** autocomplete dropdown shows:

- Admin-configured vendor names (from Admin Settings) that match the selected filters.
- Existing vendor names already registered in the system.

Select a vendor name from the list or type a new one. The form fields below remain greyed out until a vendor name is confirmed.

#### Step 2 — Fill in Vendor Details

Once a vendor name is confirmed, the following sections become active:

**Documents**

| Field | Rules |
|-------|-------|
| PAN Number | Required. Must match format `AABCU9603R` (5 letters, 4 digits, 1 letter). |
| GST Number | Optional. If entered, must match format `27AABCU9603R1ZM` (2 digits, PAN, 1 char, Z, 1 char). |
| PAN Verified | Checkbox — mark after PAN has been verified externally. |
| GST Verified | Checkbox — mark after GST has been verified externally. |
| TDS Type | Dropdown — select the applicable TDS section (e.g., "TDS @ 2% (Sec 194C)"). |
| PAN Card Upload | Upload a scan of the PAN card. Accepts images (PNG, JPG) and PDFs. Maximum 3 MB. |

**Contact Details**

| Field | Rules |
|-------|-------|
| Contact Person | Required. Name of the primary contact. |
| Phone | Required. Must be exactly 10 digits and start with 6–9. |
| Email | Required. Must be a valid email format. |
| Address | Optional. Full postal address. |
| Pin Code | Optional. If entered, must be 6 digits starting with 1–9. Auto-fills the State field. |
| State | Auto-filled from pin code, or select from dropdown of all Indian states. |
| City | Select from cities available for the chosen state. |

**Bank Details**

| Field | Rules |
|-------|-------|
| Bank Name | Select from admin-configured bank names list. |
| Account Number | Free text. |
| Account Type | Select from admin-configured account types (e.g., Savings, Current). |
| IFSC Code | Optional. If entered, must match format `SBIN0001234` (4 letters, 0, 6 alphanumeric). |
| Branch Pin Code | Optional. Must be 6 digits if entered. |
| Branch Address | Optional. The bank branch address. |

Click **Save** to create the vendor. All vendors are created with **Verified** status by default.

---

### 7.3 Editing a Vendor

Click **Edit** on a vendor card to open the same form pre-filled with the vendor's existing data. All fields are editable. The same validation rules apply on save.

---

### 7.4 Viewing Vendor Details

Click **View** on a vendor card to open a detailed read-only dialog showing all vendor information organised into sections:

- **Basic Information** — Name, service type, company type, entity name.
- **Documents** — GST number, PAN number, TDS type, PAN card image/PDF preview.
- **Contact Details** — Contact person, phone, email, address, pin code.
- **Bank Details** — Bank name, account type, account number, IFSC code, branch pin code, branch address. PAN number is repeated in the bank section header for cross-reference.

The dialog opens at a comfortable width for easy reading.

---

### 7.5 Deleting a Vendor

Click **Delete** on a vendor card. A confirmation dialog asks you to confirm — this action is permanent and cannot be undone.

---

### 7.6 Vendor Statement

Click **Statement** on a vendor card to view a complete financial summary for that vendor:

- All work orders created for the vendor
- All payment requests raised against those work orders
- TDS deducted and deposited
- Outstanding balances

This provides a single-page financial overview per vendor.

---

### 7.7 Create Work Order from Vendor Card

Each vendor card has a **Create Work Order** button. Clicking it navigates directly to the Work Orders page and opens the work order creation form with the vendor pre-selected and locked. This is the fastest way to create a work order for a specific vendor.

---

### 7.8 REP-Sourced Vendors

Some vendors are sourced from the REP (Regional Executive Partner) module. These vendors appear in the vendor list with all the same information but have restrictions:

- They **cannot be edited** from the Vendor Management page.
- The detail view shows a note: *"Edit this vendor from REP Management"*.

This prevents conflicting edits between the two modules.

---

### Key Rules (Vendors)

- **PAN is mandatory** — Every vendor must have a valid PAN number.
- **Phone must be 10 digits** and start with 6, 7, 8, or 9 (Indian mobile numbers).
- **GST and IFSC are validated** against standard Indian formats when entered.
- **Pin code auto-fills state** — Entering a 6-digit pin code automatically looks up and fills the state.
- **Vendor names come from Admin Settings** — The admin configures available vendor names, service types, and entity types. These populate the dropdowns in the vendor form.
- **Duplicate prevention** — The search-first workflow (filter by service type → entity type → select name) encourages reusing existing vendor names rather than creating duplicates.
- **Bank details from Admin Settings** — Bank names and account types are admin-configured, ensuring consistency.

---

## 8. REP Management

REP (Regional Executive Partner) Management handles vendors sourced through regional partners.

### How It Works

1. REPs can submit vendor details through their interface
2. REP-sourced vendors appear in the main **Service Providers** list with all the same fields
3. These vendors are tagged as REP-sourced and **can only be edited from REP Management** — not from the Vendor Management page

### Why It's Separate

REP-sourced vendors go through a different onboarding path. Keeping edits restricted to REP Management prevents conflicting updates between modules and maintains data integrity.

### Viewing REP Vendors in Service Providers

REP vendors show in the main vendor list like any other vendor. The only difference:

- The **Edit** button on a REP vendor shows a note: *"Edit this vendor from REP Management"*
- All other actions (View, Statement, Create Work Order, Delete) work the same

---

## 9. Work Order Management

A work order is a formal agreement between your organisation and a vendor for a specific service. Work orders define what the vendor will do, how much they will be paid, and under what terms (fixed amount or periodic payments). Every payment request must be linked to a work order.

---

### 9.1 Work Order List Page

Navigate to **Work Orders** from the sidebar. All work orders appear as cards in a responsive grid.

Each work order card shows:

- **Work Order Number** — Auto-generated (e.g., WO-PH-TV-001).
- **Vendor Name** — The vendor this work order belongs to.
- **Type** — A chip showing "Fixed" or "Periodic".
- **Status** — Current status chip (Issued, Completed, etc.).
- **Amount/Total** — For Fixed: the total amount. For Periodic: the per-period amount × number of periods.
- **Actions** — View, Edit, and Delete buttons.

If no work orders exist, an empty state with a prompt to create one is displayed.

---

### 9.2 Creating a Work Order

Click **New Work Order** to open the creation form.

#### Phase 1 — Select a Vendor

The top section provides search filters to find the right vendor:

- **Service Type** — Filter vendors by their service category (e.g., Photography, Videography).
- **Entity Type** — Filter by company structure (e.g., Individual, Private Limited).

Below the filters, a **Vendor** autocomplete dropdown shows all vendors matching the active filters. Select one.

> **Note:** If you arrive here from a vendor card's "Create Work Order" button, the vendor is pre-selected and the search section is skipped entirely.

#### Phase 2 — Review Existing Work Orders (Duplicate Prevention)

After selecting a vendor, the system checks for any existing work orders for that vendor. Two scenarios:

**If existing work orders are found:**

A panel titled *"Existing Work Orders for [Vendor Name]"* appears, showing each work order as a compact card with:

- **Service Description** — What the work order is for (shown as the primary identifier, not the WO number, because codes alone are not meaningful).
- **Type chip** — "Fixed" or "Periodic".
- **Amount** — The total or per-period amount.
- **Payment Status chip** — Shows real-time payment progress:
  - For Periodic WOs: *"2/4 periods paid"*
  - For Fixed WOs: *"₹50,000 / ₹1,00,000 paid"* or *"No payments yet"* or *"Fully paid"*
- **Status chip** — The work order status (Issued, Completed, etc.).
- **Open button** — Opens the full work order detail view for review.

Below the existing work orders panel, a **Create New Work Order** button allows you to proceed if this is genuinely a new engagement.

**If no existing work orders are found:**

A message *"No previous work orders found for [Vendor Name]"* is displayed, and the form proceeds directly to the creation step.

This approach is **informative, not blocking** — you are always allowed to create a new work order, but the system ensures you are aware of what already exists before doing so.

#### Phase 3 — Fill in Work Order Details

After clicking "Create New Work Order" (or if no existing WOs were found), the vendor search section is hidden and replaced by a compact **Vendor Identity Card** showing:

- Vendor name
- Service type chip
- Company type chip
- PAN number chip

This confirms which vendor you are creating the work order for, without allowing changes. To change the vendor, close and reopen the form.

**Work Order Number** — Auto-generated based on the vendor's service type and name (e.g., WO-PH-RM-001). This is read-only.

**Work Order Type** — Choose between:

- **Fixed** — A single total amount for the entire engagement.
- **Periodic** — A recurring amount paid over multiple periods (e.g., monthly, quarterly).

Toggle between the two types using the Fixed/Periodic selector. Changing the type clears any previously entered amounts.

**For Fixed Work Orders:**

| Field | Rules |
|-------|-------|
| Total Amount | Required. Must be greater than 0. Enter the full engagement amount. |

**For Periodic Work Orders:**

| Field | Rules |
|-------|-------|
| Amount per Period | Required. Must be greater than 0. |
| Number of Periods | Required. Must be greater than 0 (e.g., 4 for quarterly over a year). |
| Total Amount | Auto-calculated: Amount per Period × Number of Periods. Displayed for review. |
| Confirmation Checkbox | Required. You must tick "I confirm the total amount of ₹X" before saving. This prevents accidental miscalculation. |

**TDS (Tax Deducted at Source):**

| Field | Description |
|-------|-------------|
| TDS Rate (%) | The percentage of tax to deduct from each payment. Auto-populated from the vendor's TDS type if set (e.g., "TDS @ 2% (Sec 194C)" → 2%). Can be overridden. |
| TDS Comment | A note about the applicable TDS section (e.g., "Sec 194C — Contractor"). |

**Service Description** — Required. A free-text description of what the vendor will deliver under this work order (e.g., "Photography coverage for IKF Season 6 — all 12 cities").

**Vendor Details Preview** — A read-only section at the bottom shows the vendor's contact, document, and bank details as they will be stored on the work order. This serves as a final check before saving.

Click **Create Work Order** to save.

---

### 9.3 Editing a Work Order

Click **Edit** on a work order card. The form opens pre-filled with existing data.

In edit mode:

- The vendor is shown as a locked identity card at the top — no search or vendor change is allowed.
- All work order fields (type, amounts, description, TDS) can be modified.
- The same validation rules apply.

---

### 9.4 Viewing Work Order Details

Click **View** on a work order card to open a detailed read-only dialog:

- **Work Order Number** and **Status**
- **Service Description**
- **Type** — Fixed or Periodic
- **Financial Summary** — Amount, TDS rate, TDS amount, net payable
- **Vendor Details** — Name, service type, company type, PAN, GST, contact person, phone, email
- **Bank Details** — Bank name, account type, account number, IFSC code
- **Payment Progress** — For Periodic WOs, which periods have been paid. For Fixed WOs, how much of the total has been paid.

The detail view opens at a comfortable width with spacious layout for easy reading.

From the detail view, click **Edit** to switch to edit mode.

---

### 9.5 Deleting a Work Order

Click **Delete** on a work order card. A confirmation dialog asks: *"Delete work order WO-PH-RM-001?"* — this is permanent.

---

### 9.6 Vendor Pre-Selection Flow

When you click **Create Work Order** from a vendor card on the Service Providers page:

1. The system navigates to the Work Orders page.
2. The work order creation modal opens automatically.
3. The vendor is pre-selected and locked — no search is shown.
4. You go directly to the existing work orders check (Phase 2) or form (Phase 3).

This shortcut saves time when you already know which vendor you want to create a work order for.

---

### 9.7 Offline Support

If the backend server is unavailable, work orders are saved to and loaded from the browser's local storage. A toast message indicates when an action was performed offline (e.g., "Work order created (offline)"). Data syncs back to the server when the connection is restored.

---

### Key Rules (Work Orders)

- **Every work order belongs to exactly one vendor.** The vendor cannot be changed after creation.
- **Work order numbers are auto-generated** from the vendor's service type and name — they cannot be edited.
- **Periodic work orders require confirmation** — You must acknowledge the calculated total amount before saving.
- **TDS rate is auto-populated** from the vendor's TDS type but can be overridden per work order.
- **Service description is the primary identifier** — When the system shows existing work orders (e.g., in the duplicate prevention panel or payment flow), the service description is displayed rather than the work order number, because descriptions are meaningful while codes are not.
- **Duplicate prevention is informative** — The system shows existing work orders for a vendor before allowing creation of a new one, but never blocks you. You can always create a new work order if the existing ones serve a different purpose.
- **Payment progress is tracked in real-time** — Work orders show how much has been paid (for Fixed) or how many periods have been paid (for Periodic), synced from the payment module.

---

## 10. Payment Flow — End-to-End

The payment process in TTA follows a strict order. Each step feeds into the next.

---

### Step 1 — Admin Setup

Before any payments can happen, an admin must configure the system:

1. Go to **Admin Settings**
2. Add **Service Types** (e.g., Photography, Videography, REP)
3. Add **Entity Types** (e.g., Individual, Private Limited, LLP)
4. Add **Vendor Names** — each vendor name can be tagged with a service type and entity type

These options populate dropdowns across the vendor and work order modules.

See **Section 6 — Admin Settings** for full details.

---

### Step 2 — Vendor Registration

1. Go to **Service Providers** page
2. Click **Add Vendor**
3. Select a vendor name from the admin-configured list, or type a new one
4. Fill in details:
   - **PAN Number** (mandatory, validated format: AABCU9603R)
   - **GST Number** (optional, validated format: 27AABCU9603R1ZM)
   - **Contact Person, Phone, Email** (all mandatory)
   - **Bank Details** — bank name, account number, IFSC code, account type
   - **TDS Type** — e.g., "TDS @ 2% (Sec 194C)"
5. Save — vendor is created with **Verified** status

See **Section 7 — Vendor Management** above for full details.

---

### Step 3 — Work Order Creation

1. Go to **Work Orders** page, or click **Create Work Order** on a vendor card
2. Select the vendor (filtered by service type and entity type)
3. Review any existing work orders for the vendor (duplicate prevention)
4. Choose work order type:
   - **Fixed** — one total amount (e.g., ₹1,00,000 for an event)
   - **Periodic** — amount per period × number of periods (e.g., ₹30,000 × 4 quarters = ₹1,20,000)
5. Set **TDS Rate** (%) and comment (e.g., "Sec 194C — Contractor")
6. Add a service description
7. For Periodic: confirm the total amount via checkbox
8. Save — work order is created with status **Issued**

The system auto-generates a **Work Order Number** (e.g., WO-PH-TV-001).

See **Section 9 — Work Order Management** above for full details.

---

### Step 4 — Raise a Payment Request

This step is about **raising a request** — no money is sent at this point.

1. Go to **Payments** page
2. Click **Payment Request** (yellow button, top-right)
3. **Step 1 of 3: Vendor & Work Order**
   - Select vendor — system shows all active (unpaid) work orders
   - Select a work order — shows remaining balance and progress bar
4. **Step 2 of 3: Payment Amount**
   - For Fixed WO: enter gross amount (cannot exceed remaining balance)
   - For Periodic WO: select which period (e.g., Quarter 1) — amount auto-fills
   - Enter invoice date
   - TDS is auto-calculated: Gross × TDS Rate% = TDS Amount
   - Net payable = Gross − TDS
5. **Step 3 of 3: Preview & Submit**
   - Review all details: vendor, bank, WO, amounts, TDS breakdown
   - Click **Raise Payment** to submit the request

After saving:

- The payment request is created with **Draft** status
- The work order's **paid amount** is updated immediately
- For Periodic WOs, the selected **period is marked as paid**
- A **TDS record** is auto-created (if TDS > 0)
- Work order data is **re-synced from the server** to ensure all views show accurate payment progress

The system prevents:

- Paying more than the remaining WO balance
- Paying an already-paid period

---

### Step 5 — Send to Payment (Batch Creation)

This is where payment requests are **grouped into a batch** and an Excel file is generated for actual bank transfer.

#### On the Payments Page

The Payments page has two sections:

1. **Active Payment Requests** — All Draft payment requests that have not been sent yet
2. **Past Raised Payments** — Payment requests that have been sent, grouped by batch

#### Sending to Payment

1. Review the payment requests in the Active section
2. A **consolidated totals bar** at the bottom shows the sum of all active requests (gross, TDS, net)
3. Click **Send to Payment** (blue button)
4. The system:
   - Creates a **Payment Batch** with an auto-incremented batch number (e.g., `BATCH-001`, `BATCH-002`)
   - Links all active payment requests to this batch
   - Updates each payment request's status from **Draft** to **Sent to Accounts**
   - Generates and downloads an **Excel file** in IDFC FIRST Bank's bulk payment format

#### The IDFC Bank Excel File

The downloaded Excel file (`BLKPAY_TTA_YYYY-MM-DD.xlsx`) follows the **BLKPAY_PMR2L** template:

| # | Column | What gets filled | Required? |
|---|--------|------------------|-----------|
| 1 | Beneficiary Name | Vendor name | MANDATORY |
| 2 | Beneficiary Account Number | Vendor's bank account number | MANDATORY |
| 3 | IFSC | Vendor's bank IFSC code | Required for NEFT/RTGS |
| 4 | Transaction Type | NEFT (default). Options: IFT (within bank), NEFT, RTGS | MANDATORY |
| 5 | Debit Account Number | Your IDFC FIRST Bank account (enter manually) | MANDATORY |
| 6 | Transaction Date | Today's date (DD/MM/YYYY) | MANDATORY |
| 7 | Amount | Net payable amount (after TDS deduction) | MANDATORY |
| 8 | Currency | INR | MANDATORY |
| 9 | Beneficiary Email ID | — | OPTIONAL |
| 10 | Remarks | Payment Request ID + Work Order number | OPTIONAL |
| 11–15 | Custom Header 1–5 | Credit advice fields (editable headers) | OPTIONAL |
| 16 | PAN | Vendor's PAN number | — |

> **Row 1** contains column headers. **Row 2** contains field-by-field instructions (what to enter, format rules, mandatory/optional). **Row 3 onwards** contains the actual payment data — one row per payment request.

#### Post-Download Confirmation

After the file downloads, a **confirmation modal** appears with:

- **File name and count** — e.g., "BLKPAY_TTA_2026-03-21.xlsx — 5 payment requests exported"
- **About this Excel File** — Visual explanation of the 3-row structure (Row 1 = headers, Row 2 = instructions, Row 3+ = data), colour-coded to match the Excel
- **What You Need to Fill** — Split into two columns:
  - **Auto-filled by TTA**: Beneficiary Name, Account Number, IFSC, Amount (Net), Currency, Transaction Date, Remarks, PAN
  - **You must enter**: Debit Account Number (your IDFC FIRST Bank account) and Transaction Type (NEFT/IFT/RTGS)
- **Next Steps** — Step-by-step guide for what to do with the file

The system also attempts to **auto-open the Excel file** in your default spreadsheet application.

#### What to Do Next (Outside TTA)

1. Open the downloaded Excel file
2. Fill in the **Debit Account Number** and **Transaction Type** columns
3. Upload this Excel to your bank portal (IDFC FIRST Bank / PhonePe / any bank)
4. Make the payment through the bank
5. Come back to TTA and update the payment status on the **Bank** page

#### Past Raised Payments

After "Send to Payment" is clicked, the payment requests move from the Active section to **Past Raised Payments**, grouped under their batch:

- Each batch shows its **batch number**, **date**, and **count of payment requests**
- Payment requests within each batch show their current status (Sent to Accounts, Payment Done, Payment Bounced)
- This provides a historical record of all batches sent for payment

---

### Step 6 — Bank Management (Payment Tracking & TDS)

The **Bank** page is a **status tracker** — it shows payments that have been sent for processing and lets you confirm outcomes. No payment initiation happens here.

#### Page Overview

- **Header**: "Bank Management" with subtitle "Track payments sent for processing, confirm completions, and handle bounces"
- **Stats Cards**: Three summary cards at the top:
  - **Awaiting Confirmation** — Total amount and count of payments with "Sent to Accounts" status
  - **Payments Done** — Total amount and count of completed payments
  - **Bounced** — Count of bounced payments needing attention

#### Two Tabs

The page has two tabs:

1. **Payment Tracking** — Track and confirm payment outcomes
2. **TDS Deposits** — Track TDS deposits to the government

---

#### Tab 1: Payment Tracking

This tab shows all payments that have been sent for processing (status is not "Draft").

**Table Columns:**

| Column | Description |
|--------|-------------|
| PAYMENT | Payment request ID and invoice date |
| VENDOR / BANK | Vendor name, bank name, and account number |
| AMOUNT | Gross amount, TDS deducted, and net payable |
| STATUS | Current payment status as a colour-coded chip |
| ACTIONS | Action buttons based on current status |

**Available Actions per Status:**

| Current Status | Available Actions |
|----------------|-------------------|
| **Sent to Accounts** | **Mark Done** (confirms payment was successful) and **Mark Bounced** (flags the payment as bounced) |
| **Payment Done** | No actions — payment is complete |
| **Payment Bounced** | **Fix & Re-submit** — opens a dialog to correct bank details and re-submit |

**Mark Done Process:**

1. Click the green checkmark icon on a "Sent to Accounts" payment
2. The system updates the status to **Payment Done** on the server
3. The payment date is recorded as today's date
4. A success toast confirms the action

**Mark Bounced Process:**

1. Click the red bounce icon on a "Sent to Accounts" payment
2. The system updates the status to **Payment Bounced** on the server
3. A warning toast confirms the action

**Fix & Re-submit Process (for Bounced Payments):**

1. Click the edit icon on a bounced payment
2. A **Fix Bank Details** dialog opens showing:
   - An error alert with the bounce reason
   - Editable fields: Bank Name, Account Number, IFSC Code
3. Correct the details and click **Re-submit to Accounts**
4. The system updates the status back to **Sent to Accounts** on the server
5. The payment re-enters the "Awaiting Confirmation" queue

**Empty State:**

If no payments have been sent for processing yet, the table shows: *"No payments sent for processing yet. Use 'Send to Payment' on the Payments page to begin."*

---

#### Tab 2: TDS Deposits

This tab tracks TDS (Tax Deducted at Source) that must be deposited with the government.

**TDS Due Date Banner:**

At the top of the tab, a banner shows:
- **Due date** — The 7th of the next month (statutory deadline for TDS deposit)
- **Days remaining** — Countdown to the due date
- **Pending amount** — Total TDS pending deposit across all deductions

**TDS Summary by Month:**

TDS records are grouped by month. Each month card shows:

- **Month name** (e.g., "March 2026")
- **Number of TDS records** for that month
- **Total TDS amount** for the month
- **Status** — Pending or Deposited
- **Mark as Deposited** button (for pending months)

**Marking TDS as Deposited:**

1. Click **Mark as Deposited** on a month card
2. A confirmation dialog appears showing:
   - The month being marked
   - Number of TDS records affected
   - Total amount being marked as deposited
   - A reminder: *"Make sure the deposit has been completed with the government before confirming"*
3. Click **Confirm Deposit**
4. All TDS records for that month are updated to **Deposited** status
5. The deposited date is recorded

**TDS Details Table:**

Below the monthly summary, a detailed table shows individual TDS records:

| Column | Description |
|--------|-------------|
| Vendor Name | The vendor whose TDS was deducted |
| PAN | Vendor's PAN number |
| Section | TDS section (e.g., 194C) |
| Rate | TDS percentage |
| Work Order | The work order this TDS relates to |
| Month | Deduction month |
| Gross Amount | Original gross amount |
| TDS Amount | Amount deducted |
| Status | Pending or Deposited |

**Export TDS Summary:**

Click the **Download** button to export all TDS records as a CSV file (`tds_summary_YYYY-MM-DD.csv`) for filing with the government.

---

### Payment Status Lifecycle

```
Draft → (Send to Payment) → Sent to Accounts → Payment Done
                                               → Payment Bounced → (Fix & Re-submit) → Sent to Accounts → ...
```

- **Draft** — Payment request raised but not yet sent for processing
- **Sent to Accounts** — Included in a payment batch and Excel downloaded; awaiting bank confirmation
- **Payment Done** — Bank transfer confirmed successful
- **Payment Bounced** — Bank transfer failed (wrong details, insufficient funds, etc.)

A bounced payment can be fixed and re-submitted, restarting the Sent to Accounts → Done/Bounced cycle.

### TDS Status Lifecycle

```
Pending → Deposited (after filing with government)
```

- **Pending** — TDS has been deducted from a payment but not yet deposited with the government
- **Deposited** — TDS has been filed and deposited with the government by the statutory deadline

---

### Key Rules (Payments)

- A payment request **does not send money** — it only raises a request.
- **"Send to Payment"** creates a batch, generates the bank Excel, and moves requests from Draft to Sent to Accounts.
- Actual money transfer happens **outside TTA** via bank portal using the exported Excel.
- The **Bank page is a status tracker only** — it confirms outcomes (done/bounced) but does not initiate payments.
- TDS is auto-calculated and auto-tracked — no manual TDS entry needed.
- Work order balance is updated in real-time as payment requests are raised.
- Over-payment is blocked — you cannot pay more than the remaining WO balance.
- Periodic WOs track payment per period — each period can only be paid once.
- After a payment is raised, work order data is automatically re-synced from the server so that payment progress is accurate across all pages.
- TDS must be deposited by the **7th of the following month** — the system tracks this deadline.
- All status changes (mark done, mark bounced, fix & re-submit) are **persisted to the server** — they are not just local updates.

---

## 11. Complete Data Flow Summary

```
Admin Settings (Service Types, Entity Types, Vendor Names, Banks)
        ↓
  Vendor Registration (Service Providers page)
        ↓
  Work Order Creation (linked to one vendor)
        ↓
  Payment Request — Draft (linked to one work order, TDS auto-created)
        ↓
  Send to Payment — Batch created, Excel downloaded, status → Sent to Accounts
        ↓
  Bank Transfer (outside TTA — via IDFC / any bank portal)
        ↓
  Bank Page — Confirm: Payment Done ✓ or Payment Bounced ✗
        ↓                                    ↓
  Complete                          Fix bank details → Re-submit → Bank Transfer → ...
        ↓
  TDS Deposit — Mark as Deposited when filed with government
```

Each step depends on the one before it. You cannot create a work order without a vendor. You cannot raise a payment without a work order. The system enforces this chain at every step.
