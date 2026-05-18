# TTA (Trial & Talent Administration) — Module Documentation
### Client Presentation & Testing Guide
**Version:** 2.0 | **Date:** 21 March 2026

---

## System Overview

TTA is a vendor-to-payment lifecycle management system. The flow is:

```
Admin Setup → Vendor Onboarding → Work Order Creation → Payment Raising → Banking & TDS
```

Each module feeds into the next. A vendor must be registered before a work order can be created. A work order must exist before a payment can be raised. Once payment is raised, it appears on the Payments page for batching and Excel export, then moves to the Bank page for status tracking.

---

## How Data is Stored

| Module | Storage | Implication |
|--------|---------|-------------|
| Vendors | Server Database (API) | Persistent, shared across devices |
| Trials & REPs | Server Database (API) | Persistent, shared across devices |
| Admin Config | Browser (localStorage) | Per-browser, for demo |
| Work Orders | Server Database (API) + localStorage fallback | Persistent with offline support |
| Payments | Server Database (API) + localStorage fallback | Persistent with offline support |
| Banking | Server Database (API) | Persistent, shared across devices |

---

# MODULE 1: ADMIN PANEL

## Purpose
Configure the dropdown options used across the system — service types, entity types, vendor names, project names, and seasons. This is the **first thing to set up** before using any other module.

## Panels

### 1.1 Project Names
- Add project names (e.g., "IKF", "Project Nari Shakti")
- These appear in trial/project creation

### 1.2 Seasons
- Configure seasons (e.g., Season 5, Season 6)
- Used in trials and REP assignment

### 1.3 Vendor Types / Service Types
- Define what services vendors provide (e.g., Photography, Videography, Event Management, Printing)
- These appear as dropdown options when adding vendors and creating work orders
- **Why this exists:** Standardizes vendor categorization across the system. Prevents typos and inconsistent naming.

### 1.4 Entity Types
- Define company types (e.g., Individual, Sole Proprietorship, Private Limited, LLP, Partnership, HUF, Trust, Society, Government)
- Appears when adding vendors
- **Why this exists:** Different entity types have different TDS rates and compliance requirements

### 1.5 Vendor Names
- Pre-approve vendor names linked to a service type and entity type
- When creating a vendor, these names appear as suggestions
- **Why this exists:** Allows admin to pre-approve vendors before the accounts team onboards them. Prevents duplicate or unauthorized vendor entries.

### 1.6 Bank Names
- Add bank names (e.g., HDFC Bank, ICICI Bank, SBI)
- These appear in vendor bank details dropdown
- **Why this exists:** Ensures consistency in bank name entries across all vendors

### 1.7 Account Types
- Define bank account types (e.g., Savings, Current, Overdraft)
- Used in vendor bank details
- **Why this exists:** Standardizes account type entries

## Features
- Duplicate detection (case-insensitive)
- Edit and delete existing entries
- All changes saved immediately

## What to Test
- [ ] Add a service type (e.g., "Photography")
- [ ] Add an entity type (e.g., "Individual")
- [ ] Add a vendor name linked to the service type and entity type
- [ ] Add a bank name (e.g., "HDFC Bank")
- [ ] Add an account type (e.g., "Savings")
- [ ] Try adding a duplicate — should show error
- [ ] Edit an existing entry
- [ ] Delete an entry

### Comments / Feedback
```
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
```

---

# MODULE 2: VENDOR MANAGEMENT

## Purpose
Onboard and manage vendors (service providers). A vendor must be added here before any work order or payment can be created for them.

## Features

### 2.1 Add Vendor
**Two ways to add:**

**Single Add (Add Vendor button):**
1. Select Service Type → Entity Type → Vendor Name (from admin-configured list or type new)
2. Fill the form:

| Section | Fields | Required? |
|---------|--------|-----------|
| **Documents** | GST Number, PAN Number, PAN Card Image/PDF, TDS Type | PAN required |
| **Contact** | Contact Person, Phone, Email, Address, PIN Code, State, City | Person, Phone, Email required |
| **Bank** | Bank Name, Account Type, Account Number, IFSC Code, Branch PIN, Branch Address | Optional |

**Bulk Add (Bulk Add button):**
- Add multiple vendors in a table format
- Basic fields inline: Name, Contact Person, Service Type, Phone, Email, PAN
- Click "Edit" on any row to fill full details (bank, address, GST)
- Submit all at once

### 2.2 Vendor Card
Each vendor is displayed as a card showing:
- Vendor name + status badge (Verified/Pending/Rejected)
- Service type chip
- PAN and GST numbers (monospace)
- Actions: View, Edit, Delete, Statement, Create Work Order

### 2.3 Actions on Vendor Card
| Action | What it does |
|--------|-------------|
| **View Details** | Opens full read-only view of all vendor info |
| **Edit** | Opens the vendor form with pre-filled data |
| **Delete** | Removes vendor (with confirmation) |
| **Statement** | Shows complete financial summary — all WOs, payments, TDS |
| **Create Work Order** | Navigates to Work Order page with this vendor pre-selected |

### 2.4 Search, Filter & Sort
- **Search:** By name, contact person, email, GST, PAN, entity name, city, state
- **Filter:** By service type (from Admin Settings)
- **Sort:** Latest first, Oldest first, Name A-Z, Name Z-A
- Active filters shown as removable chips

### 2.5 Validations
| Field | Rule |
|-------|------|
| PAN | Required. Format: ABCDE1234F (5 letters, 4 digits, 1 letter) |
| GST | Optional. Format: 27ABCDE1234F1ZM (15 characters) |
| Phone | 10 digits, must start with 6-9 |
| Email | Valid email format |
| IFSC | Format: SBIN0001234 (4 letters, 0, 6 alphanumeric) |
| PIN Code | 6 digits, starts with 1-9. Auto-fills state |

**Why these validations:** These match Indian government formats. Invalid PAN/GST will cause issues during TDS filing and compliance.

### 2.6 REP-Sourced Vendors
Some vendors come from the REP module. They appear in the vendor list like any other vendor but:
- **Cannot be edited** from the Vendor page
- Detail view shows: *"Edit this vendor from REP Management"*
- **Why:** Prevents conflicting edits between modules

## What to Test
- [ ] Add a vendor with full details (documents + contact + bank)
- [ ] Add a vendor with minimum required fields only
- [ ] Try invalid PAN format — should show error
- [ ] Try invalid phone (less than 10 digits) — should show error
- [ ] Search for vendor by name
- [ ] Filter by service type
- [ ] Edit a vendor's details
- [ ] Delete a vendor
- [ ] Click "Create Work Order" on a vendor card
- [ ] Click "Statement" — review the financial summary
- [ ] Bulk add 3 vendors at once

### Comments / Feedback
```
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
```

---

# MODULE 3: WORK ORDER MANAGEMENT

## Purpose
Create work orders (contracts/assignments) for vendors. A work order defines the scope of work, payment amount, and TDS terms. It is the foundation for raising payments.

## Features

### 3.1 Create Work Order

**Vendor Selection:**
- Filter by Service Type → Entity Type → Select Vendor
- If navigated from a Vendor card, the vendor is pre-selected and locked

**Duplicate Prevention:**
After selecting a vendor, the system checks for existing work orders:

| Scenario | What You See | Action |
|----------|-------------|--------|
| **No WOs exist** | "No previous work orders found" | Proceed directly to form |
| **WOs exist** | Cards showing each WO with service description, type, amount, payment progress | Review existing WOs, then click "Create New Work Order" if needed |

**Why this exists:** Prevents accidental duplicate contracts. You always see what's already in place before creating something new. It never blocks you — it just informs you.

**Work Order Form:**

| Field | Description |
|-------|-------------|
| **WO Number** | Auto-generated (e.g., WO-PH-IN-001). Based on service type + vendor name + serial |
| **WO Type** | Toggle: **Fixed** (one-time payment) or **Periodic** (multiple installments) |
| **Amount** | Fixed: Total amount. Periodic: Amount per period + Number of periods |
| **TDS Rate (%)** | Percentage of TDS to deduct. Auto-filled from vendor's TDS type, can be overridden |
| **TDS Section** | The tax section (e.g., "Sec 194C – Contractor", "Sec 194J – Professional") |
| **Description** | Scope of work (required) |

### 3.2 Work Order Types

**Fixed Work Order:**
- Single total amount
- Payments can be made in any amount up to the remaining balance
- Example: ₹50,000 for event photography — pay ₹20,000 now, ₹30,000 later

**Periodic Work Order:**
- Amount per period × Number of periods = Total
- Each period is paid separately (one at a time)
- Example: ₹10,000 × 12 months = ₹1,20,000
- Must confirm total amount via checkbox before saving
- **Why this exists:** Many vendor contracts are monthly/quarterly retainers, not one-time payments

### 3.3 TDS Configuration
- **TDS Rate:** The percentage to deduct (0-100%)
- **TDS Section:** The Income Tax section under which TDS applies
- **Why this exists:** Different vendor types have different TDS rates mandated by law:
  - Individual contractors: 1% (Sec 194C)
  - Company contractors: 2% (Sec 194C)
  - Professionals: 10% (Sec 194J)
  - Commission agents: 10% (Sec 194H)
  - Rent: 2-10% (Sec 194I)

### 3.4 Vendor Confirmation Section
Below the work order form, the system displays all vendor details for verification:
- Vendor name, service type, PAN, GST
- Bank details — shown as "Bank Details — linked to PAN XXXXX"
- Contact details

**Why this is shown:** All this data gets saved with the work order. If the vendor changes their bank details later, the work order still has the original details from when the contract was created.

### 3.5 Work Order Card Display
Each card shows:
- WO Number + Type badge (Fixed/Periodic)
- Vendor name + service type
- Total amount
- For Periodic: progress showing paid periods vs total (e.g., "2/4 periods paid")
- For Fixed: paid vs remaining amount
- View, Edit, Delete buttons

### 3.6 Actions
| Action | What it does |
|--------|-------------|
| **View** | Opens detailed view with full financial breakdown and progress |
| **Edit** | Modify work order details (vendor cannot be changed) |
| **Delete** | Remove work order (with confirmation) |

## What to Test
- [ ] Create a Fixed work order for a vendor
- [ ] Create a Periodic work order (e.g., ₹10,000 × 4 periods)
- [ ] Verify auto-generated WO number format
- [ ] Set TDS rate and section
- [ ] Check that periodic WO requires confirmation checkbox
- [ ] Verify vendor details appear at the bottom of the form
- [ ] Edit an existing work order
- [ ] Delete a work order
- [ ] Navigate from Vendor card → Work Order (vendor should be pre-selected)
- [ ] Check that existing WOs are shown before creating a new one for the same vendor

### Comments / Feedback
```
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
```

---

# MODULE 4: PAYMENT MANAGEMENT (Raise Payment)

## Purpose
Raise payment requests against work orders. This is where TDS is calculated, invoice details are captured, and the request is submitted. Payment requests are then batched and exported as an Excel file for bank processing.

## Features

### 4.1 Raise Payment Request (3-Step Flow)

**Step 1: Select Vendor & Work Order**
- Filter by Service Type → Entity Type → Select Vendor
- System shows all active work orders for that vendor
- Each WO card displays:
  - WO Number + Type (Fixed/Periodic)
  - Total and remaining amount
  - Progress bar (paid vs remaining)
- Select the work order to pay against

Three possible scenarios after selecting a vendor:

| Scenario | What You See | Action |
|----------|-------------|--------|
| **No WOs exist** | Red alert: "No Work Order Found" | Button to create a work order |
| **All WOs fully paid** | Green alert: "All Payments Cleared" | Button to create new work order |
| **Active WOs with balance** | WO cards with remaining amounts | Select one to proceed |

**Step 2: Payment Amount**
- WO summary shown (WO number, type, total value, remaining balance)
- **For Fixed WO:** Enter gross amount (any amount up to remaining balance)
- **For Periodic WO:** Select which period to pay (already-paid periods are crossed out and disabled). Amount auto-fills.
- Enter Invoice Date (required)
- TDS is auto-calculated:
  ```
  Gross Amount:    ₹10,000
  TDS @ 2%:       -₹200
  Net Payable:     ₹9,800
  ```
- System shows alerts for:
  - Amount exceeding remaining balance (error — blocked)
  - Payment that will fully clear the WO (success message)
  - Partial payment (shows remaining balance after this payment)
- Optional notes/remarks

**Step 3: Preview & Submit**
- Full summary review showing:
  - Request ID (auto-generated), Invoice Date, WO details
  - Vendor info (name, PAN, GST, bank details)
  - Payment breakdown (Gross → TDS → Net)
  - WO balance before and after this payment
- Click **"Raise Payment"** to submit

**What happens after raising:**
- Payment request is created with status **"Sent to Accounts"**
- The work order's paid amount is updated immediately
- For Periodic WOs: the selected period is marked as paid
- A TDS record is auto-created (if TDS > 0)
- The payment appears in the **Active Payment Requests** section

### 4.2 Payments Page — Two Sections

**Active Payment Requests (top section):**
- Shows all payment requests that have been raised but not yet batched for bank export
- Searchable by Request ID, Work Order, Vendor name, or Vendor type
- Table columns:

| Column | Description |
|--------|-------------|
| REQUEST ID | Auto-generated ID (e.g., PR-2026-001) |
| WORK ORDER | WO number + period label (if periodic) |
| VENDOR | Vendor name + type |
| GROSS | Gross amount |
| TDS | TDS deduction (shown in red with rate %) |
| NET | Net payable (green, bold) |
| INVOICE DATE | Date from payment request |
| ACTIONS | View, Edit, Delete |

**Consolidated Totals Bar (below the table):**
- Appears when there are active requests
- Shows total Gross, total TDS, and total Net Payable across all active requests
- This is the total amount that will be included in the next batch

**Past Raised Payments (collapsible section below):**
- Shows payment requests that have already been sent for bank processing
- Grouped by **batch** — each batch shows:
  - File name (e.g., BLKPAY_TTA_2026-03-21.xlsx)
  - Date sent
  - Number of payments in the batch
  - Total net amount
- Click on a batch to expand and see individual payments within it

### 4.3 Send to Payment (Batch + Excel Export)

This is the key action that moves payments from "active" to "sent for processing."

1. Click **"Send to Payment"** (blue button below the totals bar)
2. The system:
   - Creates a **Payment Batch** with auto-incremented batch number
   - Groups all active payment requests into this batch
   - Generates and downloads an **IDFC FIRST Bank Excel file** (.xlsx)
   - Moves the payments from Active to Past Raised Payments
3. A **confirmation dialog** appears explaining:
   - File name and count of payments exported
   - Excel structure (Row 1 = headers, Row 2 = instructions, Row 3+ = data)
   - What's auto-filled by TTA vs what you need to fill manually

**The IDFC Bank Excel contains:**

| Column | Auto-filled? | Notes |
|--------|-------------|-------|
| Beneficiary Name | Yes | Vendor name |
| Account Number | Yes | Vendor's bank account |
| IFSC | Yes | Vendor's bank IFSC |
| Transaction Type | **No — you fill this** | NEFT, RTGS, or IFT |
| Debit Account Number | **No — you fill this** | Your IDFC bank account |
| Transaction Date | Yes | Today's date |
| Amount | Yes | Net payable (after TDS) |
| Currency | Yes | INR |
| Remarks | Yes | PR ID + WO number |
| PAN | Yes | Vendor PAN |

**After downloading the Excel:**
1. Open the file
2. Fill in your Debit Account Number and Transaction Type
3. Upload to your bank portal (IDFC FIRST Bank / PhonePe / any bank)
4. Process the payment through the bank
5. Go to the **Bank** page to confirm outcomes

### 4.4 Stats Cards (Top of Page)

| Card | Shows |
|------|-------|
| **Total Gross Value** | Sum of all active payments' gross amounts |
| **Total Net Payable** | Sum of all active payments' net amounts |
| **Active Requests** | Count of active payment requests |

## What to Test
- [ ] Raise a payment against a Fixed work order
- [ ] Raise a payment against a Periodic work order — select a specific period
- [ ] Verify TDS is auto-calculated correctly
- [ ] Try entering amount more than remaining — should show error
- [ ] Verify the payment appears in Active Requests after raising
- [ ] Click "Send to Payment" — verify Excel downloads
- [ ] Open the downloaded Excel — verify vendor details, amounts, and PAN are filled
- [ ] Check that payments moved from Active to Past Raised Payments
- [ ] Expand a past batch — verify all payments are listed
- [ ] Check totals bar matches the sum of active payments
- [ ] Search by vendor name in the active table
- [ ] View, Edit, and Delete a payment request

### Comments / Feedback
```
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
```

---

# MODULE 5: BANK MANAGEMENT

## Purpose
Track payments that have been sent for processing, confirm outcomes (done or bounced), and manage TDS deposits. This is the **status tracking** module — no payment initiation happens here.

**How payments arrive here:** When you click "Send to Payment" on the Payments page, those payment requests become visible on the Bank page for tracking.

## Page Layout

### Header
- **Title:** "Bank Management"
- **Subtitle:** "Track payments sent for processing, confirm completions, and handle bounces"

### Stats Cards (3 cards at the top)

| Card | Color | Shows |
|------|-------|-------|
| **Awaiting Confirmation** | Blue | Total amount + count of payments with "Sent to Accounts" status |
| **Payments Done** | Green | Total amount + count of completed payments |
| **Bounced** | Red | Count of bounced payments needing attention |

### Two Tabs

```
+------------------------------+------------------------------+
|  TAB 1: Payment Tracking     |  TAB 2: TDS Deposits         |
+------------------------------+------------------------------+
|                              |                              |
|  Table of sent payments      |  TDS due date banner         |
|  5-column layout             |  Monthly TDS summary         |
|  Actions: Done / Bounced     |  Detailed TDS register       |
|  Fix & Re-submit bounced     |  Mark as Deposited           |
|                              |  Export CSV                  |
+------------------------------+------------------------------+
```

## Features

### 5.1 Tab 1 — Payment Tracking

Shows all payments that have been sent for processing (everything except Draft status).

**Table Columns:**

| Column | What it shows |
|--------|--------------|
| **PAYMENT** | Payment request ID and invoice date |
| **VENDOR / BANK** | Vendor name, bank name, and account number |
| **AMOUNT** | Gross amount, TDS deducted, and net payable |
| **STATUS** | Colour-coded status chip |
| **ACTIONS** | Action buttons based on current status |

**Actions per Status:**

| Current Status | Available Actions | What Happens |
|----------------|-------------------|-------------|
| **Sent to Accounts** | ✅ Mark Done + ❌ Mark Bounced | Done: locks record, records payment date. Bounced: flags for correction |
| **Payment Done** | None | Record is complete — no further actions |
| **Payment Bounced** | ✏️ Fix & Re-submit | Opens dialog to correct bank details |

**Mark Done:**
- Click the green checkmark icon
- Status changes to "Payment Done" on the server
- Payment date is recorded as today
- A success toast confirms: "Payment marked as done"
- **Why it locks:** Once confirmed by the bank, the financial record must be immutable for audit and compliance

**Mark Bounced:**
- Click the red bounce icon
- Status changes to "Payment Bounced" on the server
- A toast confirms: "Payment marked as bounced"
- **Why it stays editable:** Bank rejections happen due to wrong account numbers, frozen accounts, etc. The record must remain editable so it can be corrected

**Fix & Re-submit (for Bounced Payments):**
- Click the edit icon on a bounced payment
- A **"Fix Bank Details"** dialog opens showing:
  - An error alert with the bounce reason
  - Editable fields: Bank Name, Account Number, IFSC Code
- Correct the details and click **"Re-submit to Accounts"**
- Status resets to "Sent to Accounts" on the server
- The payment re-enters the "Awaiting Confirmation" queue
- A toast confirms: "Bank details updated — re-submitted to accounts"

**Empty State:**
If no payments have been sent yet, the table shows:
*"No payments sent for processing yet. Use 'Send to Payment' on the Payments page to begin."*

---

### 5.2 Tab 2 — TDS Deposits

Tracks TDS (Tax Deducted at Source) that must be deposited with the government.

**TDS Due Date Banner:**
- Shows the statutory deadline: **7th of the next month**
- Shows days remaining until the deadline
- Shows total TDS amount pending deposit
- **Why this exists:** Missing the TDS deposit deadline results in government penalties and interest charges

**TDS Summary by Month:**
TDS records are grouped by month. Each month shows:
- Month name (e.g., "March 2026")
- Number of TDS records
- Total TDS amount
- Status: Pending or Deposited
- **"Mark as Deposited"** button (for pending months)

**Marking TDS as Deposited:**
1. Click "Mark as Deposited" on a month
2. A confirmation dialog shows:
   - The month being marked
   - Number of TDS records and total amount affected
   - Reminder: *"Make sure the deposit has been completed with the government before confirming"*
3. Click **"Confirm Deposit"**
4. All TDS records for that month update to "Deposited"
5. The deposited date is recorded

**TDS Details Table:**

| Column | Shows |
|--------|-------|
| Vendor Name | The vendor whose TDS was deducted |
| PAN | Vendor's PAN number |
| Section | TDS section (e.g., 194C) |
| Rate | TDS percentage |
| Work Order | Related work order |
| Month | Deduction month |
| Gross Amount | Original gross amount |
| TDS Amount | Amount deducted |
| Status | Pending or Deposited |

**Export TDS:**
- Click the **Download** button
- Downloads a CSV file (`tds_summary_YYYY-MM-DD.csv`) with all TDS records
- Use this for offline filing with the government

**Important note on TDS filing:** The actual TDS deposit with the government is done manually (outside TTA). The system tracks what's pending and what's been deposited — the accounts person handles the filing in their own Excel sheets, broken down by TDS section (194C, 194J, etc.) as required by law.

## What to Test
- [ ] Go to Payments page, raise a payment, click "Send to Payment"
- [ ] Go to Bank page — verify the payment appears in Payment Tracking tab
- [ ] Mark a payment as "Done" — verify status changes and toast appears
- [ ] Mark a payment as "Bounced" — verify status changes
- [ ] Click edit on a bounced payment — fix bank details — re-submit
- [ ] Verify re-submitted payment shows as "Sent to Accounts" again
- [ ] Switch to TDS Deposits tab
- [ ] Check TDS due date banner shows correct date
- [ ] Review TDS records grouped by month
- [ ] Mark TDS as deposited for a month — confirm the dialog
- [ ] Export TDS records as CSV
- [ ] Verify stats cards update after marking payments done/bounced

### Comments / Feedback
```
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
```

---

# MODULE 6: TRIALS (PROJECTS)

## Purpose
Manage trial events/projects — the core activities that vendors are hired to support.

## Features
- View all trials in a card/grid layout
- Search across trial name, code, season, type, comments
- Filter by trial type (Regular, CSR, Championship, School Partnership) and season
- Sort by date or name
- Edit trial details
- Delete trials

## Trial Fields
| Field | Description |
|-------|-------------|
| Trial Name | Unique project name |
| Trial Code | Auto-generated unique code |
| Season | Which season this belongs to |
| Trial Type | Regular, CSR, Championship, School Partnership |
| Tier | Not Any, Basic, Standard, Premium |
| Schedule | Fixed date or Tentative |
| Start/End Date | When the trial runs |
| Status | Active, Draft, Completed, Cancelled |
| Cities | Assigned cities with ground locations |

## What to Test
- [ ] View existing trials
- [ ] Search for a trial by name
- [ ] Filter by trial type
- [ ] Edit a trial's details
- [ ] Check city assignments within a trial

### Comments / Feedback
```
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
```

---

# MODULE 7: REP (Regional Execution Partner) MANAGEMENT

## Purpose
Manage REPs — local partners who execute trials in different cities. REPs can also be converted to vendors for payment purposes.

## Features
- Grid display of REP cards
- Search by name, city, state, contact
- Filter by trial name, period, city, status
- Sort by name, status, city
- Add/Edit/View individual REPs
- Bulk upload via CSV
- Upload/Download functionality

## REP Fields
| Section | Fields |
|---------|--------|
| **Basic** | Name, State, City, Season, Region (N/S/E/W/Central), Status |
| **Primary Contact** | Name, Phone, Email |
| **Backup Contact** | Name, Phone, Email |
| **Addresses** | Courier, Physical, Ground Location, Google Map Link |
| **Legal** | PAN Card, PAN Verified, GST, MOU Status |
| **Online** | Website, Facebook, Twitter, Telegram |
| **Trials** | Assigned trials (many-to-many) |

## What to Test
- [ ] View existing REPs
- [ ] Add a new REP with full details
- [ ] Search for a REP
- [ ] Filter by city or status
- [ ] Edit a REP's details
- [ ] Bulk upload REPs via CSV

### Comments / Feedback
```
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
```

---

# COMPLETE TESTING FLOW (End-to-End)

Follow this sequence to test the full lifecycle:

### Step 1: Admin Setup
1. Go to Admin Panel
2. Add Service Types: "Photography", "Videography", "Event Management"
3. Add Entity Types: "Individual", "Private Limited"
4. Add Vendor Names: "ABC Studios" (Photography, Individual)
5. Add Bank Names: "HDFC Bank", "ICICI Bank"
6. Add Account Types: "Savings", "Current"

### Step 2: Add Vendor
1. Go to Vendor Management (Service Providers)
2. Click "Add Vendor"
3. Select Service Type → Entity Type → Vendor Name (from admin list)
4. Fill PAN: ABCDE1234F
5. Fill Contact: Person name, phone (10 digits), email
6. Fill Bank: Select bank name, account number, IFSC
7. Set TDS Type: "TDS @ 2% (Sec 194C)"
8. Save vendor

### Step 3: Create Work Order
1. On the vendor card, click "Create Work Order"
2. Vendor should be pre-selected — review existing WOs (if any)
3. Choose Type: Fixed, Amount: ₹50,000
4. TDS Rate should auto-fill as 2% from vendor
5. Add description: "Photography for Delhi Trial"
6. Confirm vendor details shown at the bottom
7. Save

### Step 4: Raise Payment
1. Go to Payments
2. Click "Payment Request" (yellow button)
3. Select the vendor → Select the work order
4. Enter Gross Amount: ₹50,000
5. Verify TDS shows: ₹1,000 (2%)
6. Verify Net shows: ₹49,000
7. Enter Invoice Date
8. Preview all details and click "Raise Payment"
9. Payment appears in Active Requests

### Step 5: Send to Payment (Batch + Excel)
1. On the Payments page, review the Active Requests
2. Check the totals bar at the bottom
3. Click "Send to Payment" (blue button)
4. Excel file downloads — open and verify data
5. Review the confirmation dialog (explains what to fill)
6. Payment moves to "Past Raised Payments" section

### Step 6: Process in Bank
1. Fill Debit Account Number and Transaction Type in the Excel
2. Upload Excel to your bank portal and process payment
3. Go to **Bank** page in TTA
4. Find the payment in the Payment Tracking tab
5. Mark as **"Done"** if successful → record locks
6. Or mark as **"Bounced"** if bank rejected → fix bank details → re-submit

### Step 7: Complete TDS
1. Switch to **TDS Deposits** tab on Bank page
2. Check the due date banner (7th of next month)
3. Review pending TDS amounts by month
4. After depositing TDS with the government offline, click "Mark TDS as Deposited"
5. Confirm → Status changes to "Deposited"
6. Export TDS CSV for your records

---

# OVERALL COMMENTS / FEEDBACK

```
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
```

---

*Document prepared for client review and testing.*
*TTA System — India Khelo Football*
*Version 2.0 — 21 March 2026*
