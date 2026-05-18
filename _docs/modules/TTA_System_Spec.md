# TTA System — Module Specification Document
**India Khelo Football | TTA Platform**
**Version:** 1.0 | **Date:** March 2026

---

## Overview

The TTA (Trial & Tournament Administration) system manages football trial projects, vendor payments, and financial compliance across India. This document describes the planned modules for vendor management, work orders, payment requests, and bank/TDS tracking.

---

## Module 1: Vendor Management

### Purpose
Maintain a master registry of all vendors (service providers) who work with IKF — videographers, photographers, event managers, printers, etc.

### Key Fields
| Field | Notes |
|---|---|
| Entity Name | Name of individual or company |
| Service Type | Videographer, Photographer, Event Manager, Printing, etc. |
| Company Type | Individual, Sole Proprietorship, Partnership, Pvt Ltd, LLP, etc. |
| GST Number | Mandatory |
| PAN Number | Mandatory |
| PAN Card Upload | Image or PDF document |
| Contact Person | Name of point of contact |
| Phone / Email | Contact details |
| Address + PIN Code | Contact address |
| Bank Name | HDFC Bank (dropdown) |
| Account Type | Savings / Current / Overdraft |
| Account Number | Linked to the PAN number |
| IFSC Code | Branch code |
| Branch PIN Code | Branch location |
| TDS Type | None / 194C @ 1% / 194C @ 2% / 194J @ 10% / 194H @ 10% |
| Status | Pending / Verified / Active |

### Important Rule
> **Bank details are linked to PAN.** When displaying bank details anywhere in the system, always show the label: *"Bank details linked to PAN: XXXXXX1234X"*

### Search & Filter
- Search by: Vendor name, entity name, or service type
- Before adding a new vendor, system shows existing matches to avoid duplicates

---

## Module 2: Work Order

### Purpose
A Work Order is a formal agreement issued to a vendor for a specific service. All financial details (TDS, bank account) are auto-filled from the vendor's saved profile.

### Work Order Types

#### 2A. One-time / Fixed
- Single engagement for a fixed amount
- Example: ₹50,000 for video coverage of Delhi Trial

#### 2B. Periodic / Recurring
- Repeating engagement over multiple periods
- User enters: **Amount per Period × Number of Periods = Total Value**
- System shows confirmation before saving:
  > *"₹15,000 × 6 months = ₹90,000 — Please confirm"*
- Periods can be: Monthly, Bi-monthly, Quarterly, or custom

### Work Order Fields
| Field | Notes |
|---|---|
| Work Order Number | Auto-generated (e.g., WO-S5-001) |
| Type | One-time (Fixed) / Periodic (Recurring) |
| Vendor | Selected from vendor registry |
| Project Reference | Linked trial/project (e.g., IKF-S5-001 – Delhi) |
| Location | City + State (for future location-based template use) |
| Scope of Work | Description of services |
| Service Period | From date → To date |
| Amount per Period | For periodic orders |
| Number of Periods | For periodic orders |
| Total Work Order Value | Gross amount (auto-calculated for periodic) |
| TDS Rate (%) | Auto-filled from vendor profile |
| TDS Amount | Auto-calculated |
| Net Payable | Total Value − TDS Amount |
| Status | Draft / Issued / Completed / Cancelled |
| Notes | Internal remarks |

### Vendor Confirmation (shown at bottom of Work Order form)
When a vendor is selected, the following are auto-populated and displayed as **read-only confirmation**:
- Vendor Name, Contact Person, Phone
- PAN Number, GST Number, TDS Type
- Bank Name, Account Type, Account Number, IFSC Code
- Label: *"Bank details linked to PAN: [PAN Number]"*

### Future: Location-Based Templates
Work orders will include a location field (city + state) so that in the future, standard work order templates can be auto-generated based on the trial city — e.g., auto-issue a videographer WO whenever a new Delhi trial is created.

---

## Module 3: Payment Request

### Purpose
Replaces the old "Raise Invoice" flow. A Payment Request is raised against an active Work Order and is sent to the accounts team for processing.

> **Terminology change:** "Raise Invoice" → **"Payment Request"**

### Step 1: Select Vendor

System checks if a Work Order exists for the selected vendor:

| Scenario | System Response |
|---|---|
| No Work Order found | Red banner: *"No Work Order Found"* + Button: **Create Work Order** |
| Work Order exists, all paid | Green banner: *"All Payments Cleared"* + Button: **Create New Work Order** |
| Work Order active | Shows WO summary: Total Amount / Already Paid / **Remaining Balance** |

### Step 2: Enter Payment Amount

**For Periodic Work Orders:**
- Period selector: "Select period" (e.g., Month 1, Month 2 … Month 6)
- Amount auto-fills based on selected period (amount per period)

**For Fixed Work Orders:**
- Manual amount entry
- System shows: *"Pending Balance: ₹X"*

### TDS Split (always shown separately)
```
Gross Amount:        ₹30,000
TDS Deduction (10%): ₹ 3,000
─────────────────────────────
Amount to be Paid:   ₹27,000
```

### Step 3: Preview Before Submitting

Before saving, user sees a final preview screen:

| Field | Value |
|---|---|
| Request ID | Auto-generated (e.g., PR-2026-001) |
| Work Order # | WO-S5-001 |
| Vendor Name | [Vendor Name] |
| Service Type | Videographer |
| Invoice Date | [Date] |
| Gross Amount | ₹30,000 |
| TDS Amount | ₹3,000 |
| Net Amount to Pay | ₹27,000 |
| PAN Number | [PAN] |
| Bank Account | [Account No] — [Bank Name] |
| IFSC | [IFSC Code] |

**Action buttons:**
- **Save Draft** — saves without sending
- **Save and Send to Accounts** — locks the request and moves it to the Bank module

---

## Module 4: Bank & TDS Management

### Purpose
The accounts team receives Payment Requests and processes actual bank transfers. This module tracks payment status and TDS compliance.

### 4A. Payment Processing

**Accounts team actions per request:**
| Action | Effect |
|---|---|
| Download Excel | Exports selected payment requests in bank-upload format |
| Upload Payment Confirmation | Uploads bank confirmation file |
| Mark as Payment Done | Locks the record (no further edits allowed) |
| Mark as Payment Bounced | Opens account detail edit (allows vendor bank details correction) |

**Record states:**
- `Pending` → Sent to accounts, awaiting action
- `Payment Done` → Processed, record locked
- `Payment Bounced` → Failed, bank details editable

### 4B. TDS Tracking

#### Monthly TDS Dues View
Shows TDS amounts that need to be deposited between **1st–7th of the following month**.

| TDS Type | Section | Vendor Count | Total TDS Due |
|---|---|---|---|
| Contractor (Individual) | 194C @ 1% | 3 | ₹1,250 |
| Contractor (Company) | 194C @ 2% | 2 | ₹2,000 |
| Professional Services | 194J @ 10% | 1 | ₹15,000 |
| Commission | 194H @ 10% | 0 | ₹0 |
| **Total** | | **6** | **₹18,250** |

#### TDS Register
An internal register (exportable to Excel) showing:
- All TDS deductions made (month-wise)
- Vendor name, PAN, TDS type, amount deducted, payment date
- Month-end summary for CA/compliance

---

## Data Flow Summary

```
Vendor Created (with PAN + Bank)
        ↓
Work Order Issued (type: Fixed or Periodic)
  → Vendor details auto-populated
  → TDS auto-calculated
        ↓
Payment Request Raised
  → WO status checked (Active / Cleared / None)
  → Amount entered (period selected for Periodic)
  → TDS shown separately
  → Preview → "Send to Accounts"
        ↓
Bank Module
  → Accounts downloads Excel
  → Uploads confirmation
  → Status: Payment Done (locked) or Bounced (editable)
        ↓
TDS Module
  → Monthly TDS dues view
  → TDS register export
```

---

## Module Status

| Module | Status |
|---|---|
| Vendor Management | Built — needs terminology and field updates |
| REP Management | Built |
| Work Order | Built (basic) — needs Periodic type + location field |
| Payment Request | In progress — needs WO-aware flow + TDS split |
| Bank Management | Not built |
| TDS Tracking | Not built |

---

*Document prepared for internal review and team alignment.*
*All amounts and examples are illustrative.*
