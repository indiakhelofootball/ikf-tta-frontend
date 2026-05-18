# TTA System — Module Guide

> **India Khelo Football — Trial & Tournament Administration System**
> This document covers the **Vendor Management**, **Work Order**, **Payment Request**, and **Bank** modules — how they connect, what each screen does, and the full flow from vendor onboarding to final payment.

---

## Table of Contents

1. [System Overview & Flow](#1-system-overview--flow)
2. [Module 1 — Vendor Management](#2-module-1--vendor-management)
3. [Module 2 — Work Orders](#3-module-2--work-orders)
4. [Module 3 — Payment Requests](#4-module-3--payment-requests)
5. [Module 4 — Bank Management](#5-module-4--bank-management)
6. [Data Flow Across Modules](#6-data-flow-across-modules)
7. [Status Lifecycle](#7-status-lifecycle)
8. [File Structure](#8-file-structure)

---

## 1. System Overview & Flow

```
+------------------+       +------------------+       +---------------------+       +------------------+
|                  |       |                  |       |                     |       |                  |
|  VENDOR          | ----> |  WORK ORDER      | ----> |  PAYMENT REQUEST    | ----> |  BANK            |
|  MANAGEMENT      |       |  MANAGEMENT      |       |  (Raise + Batch)    |       |  MANAGEMENT      |
|                  |       |                  |       |                     |       |                  |
+------------------+       +------------------+       +---------------------+       +------------------+
  Register vendor            Create WO for a           Raise payment request,       Track payment
  with full KYC              vendor, specify            batch multiple requests,     outcomes: done or
  (PAN, GST, Bank,           type (Fixed or             download IDFC Excel,         bounced. Fix &
  TDS type)                  Periodic), amount,         TDS auto-calculated          re-submit bounced.
                             TDS, description                                        Track TDS deposits.
```

**The rule is simple:**
- No Work Order without a registered Vendor
- No Payment Request without an active Work Order
- No Bank Processing without a submitted Payment Request

---

## 2. Module 1 — Vendor Management

> **Route:** `/vendors` | **Sidebar Label:** Service Providers

### What This Module Does

This is the **master record** for every person or company IKF works with. Every vendor must be registered here BEFORE any work order or payment can be created for them.

### Screens & Components

| Component | File | Purpose |
|---|---|---|
| **VendorManagementPage** | `vendors/VendorManagementPage.jsx` | Main page — search, filter, list of vendor cards |
| **VendorCard** | `vendors/VendorCard.jsx` | Individual card showing name, type, PAN/GST, actions |
| **VendorModal** | `vendors/VendorModal.jsx` | Add / Edit vendor form (full details) |
| **VendorDetailView** | `vendors/VendorDetailView.jsx` | Read-only detail dialog showing all vendor info |
| **VendorBulkModal** | `vendors/VendorBulkModal.jsx` | Bulk add multiple vendors at once |
| **vendorConstants.js** | `vendors/vendorConstants.js` | Statuses, status colors, sort options |

### Vendor Form Fields

**Basic Information:**
| Field | Required | Notes |
|---|---|---|
| Vendor Name | Yes | Full legal name, from admin-configured list or typed manually |
| Service Type | No | e.g., Photography, Videography, Event Management |
| Entity Name / Company Type | No | Individual, Sole Proprietorship, Private Limited, LLP, etc. |

**Documents:**
| Field | Required | Notes |
|---|---|---|
| GST Number | No | Format validated: `27AABCU9603R1ZM` |
| PAN Number | Yes | Format validated: `AABCU9603R`, uppercase forced |
| PAN Card Upload | No | Image (PNG/JPG) or PDF, max 3MB |
| TDS Type | No | Dropdown: None, TDS @ 1% (194C), TDS @ 2% (194C), TDS @ 10% (194J), etc. |
| GST Verified | No | Checkbox |
| PAN Verified | No | Checkbox |

**Contact Details:**
| Field | Required | Notes |
|---|---|---|
| Contact Person | Yes | Primary contact name |
| Phone | Yes | 10 digits, must start with 6-9 |
| Email | Yes | Standard email validation |
| Address | No | Multi-line text |
| Pin Code | No | 6-digit Indian PIN, auto-fills State |

**Bank Details:**
| Field | Required | Notes |
|---|---|---|
| Bank Name | No | From admin-configured list |
| Account Type | No | From admin-configured list (Savings, Current, etc.) |
| Account Number | No | Free text |
| IFSC Code | No | Format validated: `SBIN0001234` |
| Branch Address | No | Multi-line text |
| Branch Pin Code | No | 6-digit PIN |

> **Key concept:** Bank details are always shown **linked to the PAN number**. Displayed as "Bank Details — linked to PAN XXXXX" throughout the system (Work Orders, Payment Requests, Bank module).

### Key Functions

| Action | What Happens |
|---|---|
| **Add Vendor** | Opens VendorModal with empty form, saves via API |
| **Bulk Add** | Opens VendorBulkModal — add multiple vendors inline, click edit for full details |
| **Edit** | Opens VendorModal pre-filled with vendor data |
| **View Details** | Opens VendorDetailView — read-only dialog with all sections |
| **Delete** | Removes vendor with confirmation dialog |
| **Statement** | Opens complete financial summary — all WOs, payments, TDS for this vendor |
| **Create Work Order** | Navigates to Work Orders page with vendor pre-selected |
| **Search** | Filters by vendor name, contact person, email, GST, PAN, city, state |
| **Filter** | By service type (from admin-configured list) |
| **Sort** | Latest First, Oldest First, Name A-Z, Name Z-A |

### REP-Sourced Vendors

Some vendors are sourced from the REP (Regional Executive Partner) module:
- They appear in the vendor list like any other vendor
- They **cannot be edited** from the Vendor page — detail view shows: *"Edit this vendor from REP Management"*
- All other actions (View, Statement, Create WO, Delete) work normally
- **Why:** Prevents conflicting edits between modules

---

## 3. Module 2 — Work Orders

> **Route:** `/work-orders` | **Sidebar Label:** Work Orders

### What This Module Does

A Work Order is a **formal agreement** between IKF and a vendor for a specific service. It captures what work needs to be done, how much will be paid, and TDS terms. The vendor's full profile (including bank details) is **snapshot-copied** into the work order at creation time.

### Two Types of Work Orders

```
+----------------------------+       +-----------------------------------+
|   FIXED (One-time)         |       |   PERIODIC (Recurring)            |
+----------------------------+       +-----------------------------------+
|                            |       |                                   |
|  Single gross amount       |       |  Amount per Period x No. of       |
|  e.g., Rs 50,000           |       |  Periods = Total                  |
|                            |       |  e.g., Rs 25,000 x 4 Quarterly   |
|  Payment: partial or full  |       |       = Rs 1,00,000 total        |
|  against this amount       |       |                                   |
|                            |       |  Payment: one period at a time    |
|  Track: paidGrossAmount    |       |  Track: paidPeriods array [1,2..] |
+----------------------------+       +-----------------------------------+
```

### Screens & Components

| Component | File | Purpose |
|---|---|---|
| **WorkOrderManagementPage** | `workorders/WorkOrderManagementPage.jsx` | Main page — stats, search, filter, grid of WO cards |
| **WorkOrderCard** | `workorders/WorkOrderCard.jsx` | Card showing WO number, type badge, vendor, amounts |
| **WorkOrderModal** | `workorders/WorkOrderModal.jsx` | Create/Edit WO form with type toggle, vendor search, financials |
| **WorkOrderDetailView** | `workorders/WorkOrderDetailView.jsx` | Full detail dialog — periodic info, progress bar, vendor, bank, financials |
| **workOrderData.js** | `workorders/workOrderData.js` | Helper functions: `parseTdsRate()`, `getVendorWOs()`, `getWORemainingGross()`, `isWOFullyPaid()`, `getPeriodLabel()` |

### Work Order Creation Flow

**1. Select Vendor** — Autocomplete search, filtered by service type and entity type. If navigated from a Vendor card, the vendor is pre-selected and locked.

**2. Duplicate Prevention** — After selecting a vendor, the system checks for existing WOs:
- If WOs exist: shows each as a card with service description, type, amount, and payment progress
- If no WOs: message "No previous work orders found" and proceeds directly
- This is **informative, not blocking** — you can always create a new WO

**3. Choose Type** — Toggle between "Fixed" and "Periodic"

**4. Financials:**

For **Fixed**:
| Field | Notes |
|---|---|
| Total Amount | Single amount in ₹ |
| TDS Rate | Pre-filled from vendor, editable |

For **Periodic**:
| Field | Notes |
|---|---|
| Amount per Period | ₹ per period |
| No. of Periods | How many periods |
| TDS Rate | Pre-filled from vendor |

When both Amount per Period and No. of Periods are filled, a **confirmation alert** appears:
```
₹25,000 x 4 periods = ₹1,00,000 total
Please confirm this total value is correct before saving.
```
Must tick the confirmation checkbox before saving.

**5. Service Description** — Required free-text description of scope of work

**6. Vendor Confirmation Section** — Shows vendor name, contact, PAN, GST, and bank details with label "Bank Details — linked to PAN XXXXX". This data gets **copied into the WO record** so it's preserved even if vendor details change later.

### Work Order Card Display

Each card shows:
- WO number + type badge (Fixed/Periodic)
- Vendor name and service type
- Service description (primary identifier — more meaningful than WO codes)
- For Periodic: progress showing paid periods vs total (e.g., "2/4 periods paid")
- For Fixed: paid amount / total amount
- View, Edit, Delete buttons

### Work Order Statuses

| Status | Color | Meaning |
|---|---|---|
| **Draft** | Gray | Created but not yet issued |
| **Issued** | Blue | Active, can have payments raised against it |
| **Completed** | Green | All work done, all payments cleared |
| **Cancelled** | Red | WO was cancelled |

### Key Helper Functions (workOrderData.js)

| Function | What It Does |
|---|---|
| `parseTdsRate(tdsType)` | Extracts number from "TDS @ 2% (Sec 194C)" → returns `2` |
| `getVendorWOs(vendorId)` | Returns all WOs for a vendor |
| `getWORemainingGross(wo)` | Fixed: `amount - paidGrossAmount`. Periodic: `unpaidPeriods x amountPerPeriod` |
| `isWOFullyPaid(wo)` | `true` if remaining <= 0 |
| `getPeriodLabel(wo, periodIndex)` | "Period 1 - Jan" (Monthly) or "Quarter 2" (Quarterly) |

---

## 4. Module 3 — Payment Requests

> **Route:** `/payments` | **Sidebar Label:** Payments

### What This Module Does

When you need to pay a vendor for work done under a Work Order, you create a **Payment Request**. This module handles raising the request, batching multiple requests together, and exporting them as an IDFC bank Excel for actual payment processing.

### Screens & Components

| Component | File | Purpose |
|---|---|---|
| **PaymentManagementPage** | `payments/PaymentManagementPage.jsx` | Main page — stats, active table, past batches, "Send to Payment" |
| **PaymentRequestModal** | `payments/PaymentRequestModal.jsx` | 3-step stepper: Vendor & WO → Amount → Preview & Submit |
| **paymentData.js** | `payments/paymentData.js` | Statuses, colors, `generatePRNumber()` |

### The 3-Step Payment Request Flow

```
+----------------------+     +---------------------+     +----------------------+
|  STEP 1              |     |  STEP 2             |     |  STEP 3              |
|  Vendor & Work Order | --> |  Payment Amount     | --> |  Preview & Submit    |
+----------------------+     +---------------------+     +----------------------+
|                      |     |                     |     |                      |
| - Filter by type     |     | - WO summary shown  |     | - Request ID         |
| - Select vendor      |     | - Periodic: pick    |     | - Invoice Date       |
| - See WO status:     |     |   period (chip UI)  |     | - WO details         |
|   * No WO found      |     | - Fixed: enter      |     | - Vendor details     |
|   * All paid          |     |   amount manually   |     | - Bank details       |
|   * Active (select)  |     | - TDS breakdown     |     | - Financial summary  |
| - Select a WO        |     | - Invoice date      |     | - Balance impact     |
| - See paid/remaining |     | - Notes             |     | - "Raise Payment"    |
+----------------------+     +---------------------+     +----------------------+
```

### Step 1 — Vendor & Work Order

**Select Vendor:** Filter by service type → entity type → search by name. Click to select.

**WO Status Banner** — Three scenarios:

| Scenario | Banner | Action |
|---|---|---|
| **No WOs exist** | Red alert: "No Work Order Found" | Button: "Create Work Order" |
| **All WOs fully paid** | Green alert: "All Payments Cleared" | Button: "New Work Order" |
| **Active WOs exist** | WO cards with paid/remaining balance + progress bar | Click to select |

If only 1 active WO exists, it **auto-selects**.

### Step 2 — Payment Amount

**WO Summary box** shows: WO number, type, total value, remaining balance.

**For Periodic WOs:**
- Period selector using **Chip UI**
- Already-paid periods are grayed out with strikethrough (not clickable)
- Clicking an available period **auto-fills the amount**
- Alert: "Amount auto-filled: ₹25,000 for Quarter 2"

**For Fixed WOs:**
- Manual amount entry
- Helper text shows: "Pending balance: ₹XX,XXX"

**TDS Breakdown box:**
```
Gross Amount:                    ₹25,000
TDS Deduction (2% - Sec 194C):  -₹500
─────────────────────────────────────────
Amount to be Paid:               ₹24,500
```

**Alerts:**
- Error if amount exceeds remaining balance (blocked)
- Success if amount clears the WO entirely
- Warning for partial payment (shows still-pending amount)

**Other fields:** Invoice Date (required), Notes/Remarks (optional)

### Step 3 — Preview & Submit

Full read-only preview:

- **Request Details:** Request ID, Invoice Date, WO number, WO Type, Period (if periodic)
- **Vendor:** Name, Service Type, PAN, GST, Bank Details (linked to PAN)
- **Payment Summary:** Gross → TDS → Net, WO Balance Before, Still Pending After

**"Raise Payment" button:** Saves the request with status "Sent to Accounts", updates WO paid amount, marks period as paid (for Periodic), and auto-creates a TDS record.

### Payments Page Layout

**Stats Cards (top):**

| Card | Color | Shows |
|---|---|---|
| Total Gross Value | Purple | Sum of all active payments' gross |
| Total Net Payable | Green | Sum of all active payments' net |
| Active Requests | Orange | Count of active payment requests |

**Active Payment Requests (main section):**
- Searchable table of all raised but un-batched payments
- Columns: Request ID, Work Order, Vendor, Gross, TDS, Net, Invoice Date, Actions (View/Edit/Delete)

**Consolidated Totals Bar (below table):**
- Shows total Gross, TDS, and Net across all active requests
- This total will be included in the next batch

**"Send to Payment" button:**
- Groups all active requests into a **Payment Batch** (auto-numbered)
- Downloads **IDFC FIRST Bank Excel** (`BLKPAY_TTA_YYYY-MM-DD.xlsx`)
- Moves payments from Active to Past Raised Payments
- Shows confirmation dialog explaining the Excel structure and next steps

**Excel auto-fills:** Beneficiary Name, Account Number, IFSC, Amount (Net), Currency, Transaction Date, Remarks, PAN
**You fill:** Debit Account Number (your bank account), Transaction Type (NEFT/RTGS/IFT)

**Past Raised Payments (collapsible section below):**
- Payments grouped by batch
- Each batch shows: file name, date sent, payment count, total net
- Expandable to see individual payments within each batch

### Payment Request Statuses

| Status | Color | Meaning |
|---|---|---|
| **Draft** | Gray | Saved but not submitted |
| **Sent to Accounts** | Blue | Raised and ready for bank processing |
| **Payment Done** | Green | Bank confirmed payment (LOCKED) |
| **Payment Bounced** | Red | Bank returned — wrong details |

---

## 5. Module 4 — Bank Management

> **Route:** `/bank-tds` | **Sidebar Label:** Bank

### What This Module Does

This is the **status tracking workspace**. Once payments have been sent for processing (via "Send to Payment" on the Payments page), they appear here. The accounts team confirms outcomes — marking payments as done or bounced — and tracks TDS deposits for government compliance.

**No payment initiation happens here.** The Bank page only tracks what has already been sent.

### Screens & Components

| Component | File | Purpose |
|---|---|---|
| **BankManagementPage** | `bank/BankManagementPage.jsx` | Two tabs: Payment Tracking + TDS Deposits. Includes BounceEditDialog, TDSDepositDialog, downloadTDSExcel() |

### Stats Cards (Top — always visible)

| Card | Color | Shows |
|---|---|---|
| **Awaiting Confirmation** | Blue | Total net amount + count of "Sent to Accounts" payments |
| **Payments Done** | Green | Total net amount + count of "Payment Done" payments |
| **Bounced** | Red | Count of bounced payments (shows "Needs attention" if > 0) |

### Tab 1 — Payment Tracking

**Table Columns (5 columns):**

| Column | Details |
|---|---|
| **PAYMENT** | Payment request ID + invoice date |
| **VENDOR / BANK** | Vendor name, bank name, account number |
| **AMOUNT** | Gross amount, TDS deduction, net payable |
| **STATUS** | Colour-coded status chip (Sent to Accounts / Payment Done / Payment Bounced) |
| **ACTIONS** | Action buttons based on current status |

**Actions per record:**

| Current Status | Available Actions |
|---|---|
| **Sent to Accounts** | ✅ "Mark Done" (green checkmark) + ❌ "Mark Bounced" (red icon) |
| **Payment Bounced** | ✏️ "Fix & Re-submit" (edit icon — opens BounceEditDialog) |
| **Payment Done** | No actions — payment is complete |

**Mark Done:**
- Updates status to "Payment Done" **on the server**
- Records payment date as today
- Toast: "Payment marked as done"

**Mark Bounced:**
- Updates status to "Payment Bounced" **on the server**
- Toast: "Payment marked as bounced"

**Fix & Re-submit (BounceEditDialog):**
- Opens dialog showing bounce reason in error alert
- Editable fields: Bank Name, Account Number, IFSC Code
- Click "Re-submit to Accounts" → status resets to "Sent to Accounts" on the server
- Toast: "Bank details updated — re-submitted to accounts"

**Empty State:** *"No payments sent for processing yet. Use 'Send to Payment' on the Payments page to begin."*

### Tab 2 — TDS Deposits

**TDS Due Date Banner:**
- Shows deadline: 7th of next month (statutory requirement)
- Shows days remaining and total pending amount
- **Why this exists:** Missing the deadline results in government penalties

**TDS Summary by Month:**
- Records grouped by month
- Each month: name, record count, total amount, Pending/Deposited status
- "Mark as Deposited" button for pending months

**TDS Deposit Confirmation (TDSDepositDialog):**
- Shows month, record count, total amount
- Reminder: *"Make sure the deposit has been completed with the government before confirming"*
- Click "Confirm Deposit" → all records for that month marked as Deposited

**TDS Details Table:**
- Per-vendor breakdown: Vendor, PAN, Section, Rate, Work Order, Month, Gross, TDS, Status

**Export:**
- Download button exports all TDS records as CSV (`tds_summary_YYYY-MM-DD.csv`)
- Use for offline government filing

**Important:** The actual TDS deposit with the government is done manually outside TTA. The system tracks amounts and deadlines — the accounts person handles the filing in their own Excel sheets, broken down by TDS section (194C, 194J, etc.) as required by law.

---

## 6. Data Flow Across Modules

### How Data Moves: Vendor → WO → Payment → Bank

```
VENDOR (master record)
  |
  |-- vendorName, vendorType, panNumber, gstNumber
  |-- tdsType -> parsed into tdsRate (e.g., "TDS @ 2%" -> 2)
  |-- bankName, accountNumber, ifscCode, accountType
  |
  v
WORK ORDER (snapshot of vendor data at creation time)
  |
  |-- Copies: vendorName, vendorType, panNumber, gstNumber
  |-- Copies: bankName, accountNumber, ifscCode, accountType
  |-- Adds: type, amount, description, TDS rate/section
  |-- Calculates: tdsAmount = amount x tdsRate / 100
  |-- Calculates: netPayable = amount - tdsAmount
  |-- Tracks: paidGrossAmount (Fixed) or paidPeriods[] (Periodic)
  |
  v
PAYMENT REQUEST (references WO + vendor)
  |
  |-- Links to: workOrderId, vendorId
  |-- Copies: vendor bank details (for accounts team)
  |-- Specifies: grossAmount, tdsRate, tdsAmount, netAmount
  |-- For Periodic: periodLabel ("Quarter 2 of 4")
  |-- Status: created as "Sent to Accounts"
  |-- Batched via "Send to Payment" → Excel downloaded
  |
  v
BANK MANAGEMENT (tracks payment outcomes)
  |
  |-- Shows: all sent payment requests with bank details
  |-- Actions: Mark Done (locks record) / Mark Bounced (allows fix)
  |-- Bounced: fix bank details → re-submit to accounts
  |-- TDS: tracked separately by month for government deposit
```

### Why Data is Copied (Snapshot Pattern)

When a Work Order is created, the vendor's details are **copied into the WO record**. This means:
- If vendor changes their bank account later, existing WOs still have the original bank details
- Each WO is a self-contained record of what was agreed at that time
- Same applies to Payment Requests — they snapshot the vendor/WO details

---

## 7. Status Lifecycle

### Vendor Lifecycle
```
[Created] --> Pending --> Verified --> Active
                  |
                  +--> Rejected
```

### Work Order Lifecycle
```
[Created] --> Draft --> Issued --> Completed
                          |
                          +--> Cancelled
```

### Payment Request Lifecycle
```
[Raised] --> Sent to Accounts --> (Batched via "Send to Payment") --> Bank confirms:
                                                                          |
                                                        +--> Payment Done (LOCKED)
                                                        |
                                                        +--> Payment Bounced
                                                                  |
                                                                  +--> Fix bank details
                                                                        |
                                                                        +--> Sent to Accounts (re-submitted)
```

### TDS Lifecycle
```
[Deducted at Payment] --> Pending --> Deposited (to government by 7th of next month)
```

---

## 8. File Structure

```
src/components/
|
+-- vendors/
|   +-- index.js                    # Barrel export
|   +-- VendorManagementPage.jsx    # Main page (search, filter, cards)
|   +-- VendorCard.jsx              # Individual vendor card
|   +-- VendorModal.jsx             # Add/Edit form (full details)
|   +-- VendorDetailView.jsx        # Read-only detail dialog
|   +-- VendorBulkModal.jsx         # Bulk add multiple vendors
|   +-- vendorConstants.js          # Statuses, colors, sort options
|
+-- workorders/
|   +-- index.js                    # Barrel export
|   +-- WorkOrderManagementPage.jsx # Main page (stats, search, filter, cards)
|   +-- WorkOrderCard.jsx           # WO card (type badge, amounts)
|   +-- WorkOrderModal.jsx          # Create/Edit form (type toggle, vendor select)
|   +-- WorkOrderDetailView.jsx     # Full detail dialog (periodic info, progress)
|   +-- workOrderData.js            # Helper functions
|
+-- payments/
|   +-- index.js                    # Barrel export
|   +-- PaymentManagementPage.jsx   # Main page (active table, past batches, Send to Payment)
|   +-- PaymentRequestModal.jsx     # 3-step stepper (Vendor->Amount->Preview)
|   +-- paymentData.js              # Statuses, PR number generator
|
+-- bank/
|   +-- index.js                    # Barrel export
|   +-- BankManagementPage.jsx      # Two tabs: Payment Tracking + TDS Deposits
|                                   # Includes: BounceEditDialog, TDSDepositDialog,
|                                   #           downloadTDSExcel()
|
+-- layout/
|   +-- Sidebar.jsx                 # Navigation with all module links
|   +-- DashboardLayout.jsx         # Layout wrapper with sidebar
|
+-- App.js                          # Routes: /vendors, /work-orders, /payments, /bank-tds
```

---

## Quick Reference — What Connects Where

| When you... | It uses data from... |
|---|---|
| Create a Work Order | Vendor profile (auto-populates name, PAN, GST, bank, TDS rate) |
| Create a Payment Request | Vendor list + that vendor's Work Orders |
| Select a period (Periodic WO) | WO's `amountPerPeriod` auto-fills the amount |
| Click "Raise Payment" | Creates request with "Sent to Accounts" status, updates WO balance |
| Click "Send to Payment" | Batches active requests, generates IDFC Excel, moves to Past |
| Open Bank page | Shows all sent payments for status tracking |
| Mark Payment Done | Record is locked, payment date recorded |
| Mark Payment Bounced | Opens edit dialog for bank details, re-submits |
| TDS Tracking | Aggregates TDS from all Payment Requests by month |
| Mark TDS Deposited | Updates all records for that month to "Deposited" |

---

*This document reflects the current implementation as of 21 March 2026.*
*TTA System — India Khelo Football*
