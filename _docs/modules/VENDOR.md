# Vendor Management Module

## What Is This?

The Vendor Management module is where we store and manage all the financial and operational records of vendors who work with IndiaKhelo Football (IKF) across events and trials.

A **vendor** in this context is any external party — individual or company — that provides a service for our operations. This includes photographers who shoot at trial events, REPs (regional scouts/representatives) who manage ground-level work, and printing companies that produce branded materials like kits, banners, and certificates.

---

## Why Does This Exist?

### Problem It Solves
Before this module, vendor data was scattered — phone numbers in WhatsApp, PAN cards in email threads, bank details in spreadsheets. Payments were being made without proper documentation, which created:
- **Duplicate payments** to the same vendor under different names
- **Missing PAN/GST** at the time of TDS filing
- **No accountability** for which vendor is doing which work

### What This Module Enables
1. **Single source of truth** for every vendor's identity, contact, tax, and banking information
2. **Prevents duplicates** — the search-first flow forces the operator to find an existing vendor before filling data
3. **Faster data entry** — service type and entity type filters narrow down the vendor list before you even start typing the name
4. **Audit trail** — every vendor record is linked to work orders and payment history

---

## Who Adds Vendors?

Vendors are **registered in the backend by admins**. The frontend does not create new vendor records. The frontend's job is **data entry** — filling in the tax, contact, and banking details for vendors that already exist as registered entries.

This separation exists to prevent unauthorised or duplicate vendor creation.

---

## Search Flow (How to Find a Vendor)

The form uses a **progressive narrowing** approach:

```
Service Type (optional) → Entity Type (optional) → Vendor Name (required)
```

| Step | Field | Purpose |
|---|---|---|
| 1 | Service Type | Narrows list to Photography / REP / Printing vendors only |
| 2 | Entity Type | Further narrows to Individual / Any Company Type / specific type |
| 3 | Vendor Name | Final search — type to filter, select from dropdown |

All three filters are **optional**. If you know the vendor name directly, skip the filters and search by name alone. The filters exist to make the dropdown list shorter and reduce the chance of selecting the wrong vendor.

Once a vendor is selected, the full data entry form appears below with whatever information is already on record pre-filled.

---

## Data Fields & Types

### Find Vendor (Search Filters)

| Field | Key | Type | Required | Notes |
|---|---|---|---|---|
| Service Type | `vendorType` | Dropdown | No | REP, Photography, Printing |
| Entity Type | `entityType` | Dropdown | No | Individual, Any Company Type, Sole Proprietorship, Partnership Firm, Private Limited, Public Limited, LLP, One Person Company, HUF, Trust / NGO / Society |
| Vendor Name | `vendorName` | Searchable Dropdown | Yes | Must select from list — no free entry |

---

### Basic Information

| Field | Key | Type | Required | Notes |
|---|---|---|---|---|
| Vendor Name | `vendorName` | String | Yes | Auto-filled from search selection |
| Service Type | `vendorType` | String | Yes | Auto-filled from search selection |
| Entity Type | `entityType` | String | No | Auto-filled from search selection |

---

### Documents

| Field | Key | Type | Required | Validation |
|---|---|---|---|---|
| GST Number | `gstNumber` | String | No | Format: `27AABCU9603R1ZM` (15 chars) |
| PAN Number | `panNumber` | String | Yes | Format: `AABCU9603R` (10 chars, alphanumeric) |
| PAN Card Upload | `panCardImage` | File | No | Image (PNG/JPG) or PDF, max 3MB |
| GST Verified | `gstVerified` | Boolean (checkbox) | No | Tick when GST is confirmed |
| PAN Verified | `panVerified` | Boolean (checkbox) | No | Tick when PAN is confirmed |

> **PAN is mandatory** — it is the primary identity document used for TDS deduction and payment records. Every bank account in this system is linked to a PAN.

---

### Contact Details

| Field | Key | Type | Required | Validation |
|---|---|---|---|---|
| Contact Person | `contactPerson` | String | Yes | Name of the person to contact |
| Phone | `phone` | String | Yes | 10 digits, must start with 6–9 |
| Email | `email` | String | Yes | Standard email format |
| Address | `address` | String (multiline) | No | Full address |
| Pin Code | `contactPinCode` | String | No | 6-digit Indian PIN code |

---

### Bank Details

| Field | Key | Type | Required | Validation |
|---|---|---|---|---|
| Bank Name | `bankName` | Autocomplete | No | Select from known banks |
| Account Type | `accountType` | Dropdown | No | Savings, Current, Overdraft, Cash Credit, Fixed Deposit |
| Account Number | `accountNumber` | String | No | Numeric, no spaces |
| IFSC Code | `ifscCode` | String | No | Format: `SBIN0001234` (11 chars) |
| Branch Address | `branchAddress` | String (multiline) | No | Physical branch address |
| Branch Pin Code | `bankPinCode` | String | No | 6-digit Indian PIN code |

> **Bank details are linked to PAN.** The PAN number entered in the Documents section is displayed prominently in the Bank Details section header as a reminder — every bank account must correspond to the vendor's PAN for TDS compliance.

---

## Work Orders (View Only)

Each vendor's detail view shows:

- **Total Paid Till Date** — sum of all completed work orders assigned to this vendor
- **Currently Active** — work orders currently in progress (WO number + description)

Work orders are **not entered here** — they are created in the Work Orders/Payment module and linked to the vendor. This section is read-only.

> Currently uses mock data. Will be replaced with live API data when the Work Order backend is built.

---

## Vendor Card (List View)

Each vendor in the main list shows:

| Info | Source |
|---|---|
| Vendor Name | `vendorName` |
| Entity Type | `entityType` |
| Service Type chip | `vendorType` |
| GST verification status | `gstVerified` + `gstNumber` |
| PAN verification status | `panVerified` + `panNumber` |
| Contact Person | `contactPerson` |
| Phone | `phone` |
| Email | `email` |
| Bank Name (if entered) | `bankName` |

Actions available from the card: **View Details**, **Edit**.

---

## Expected Outcomes

| Action | Expected Result |
|---|---|
| Selecting a vendor from dropdown | All known fields auto-fill — operator only fills what is missing |
| Saving a vendor record | Data saved to backend via `PUT /vendors/:id` |
| Viewing vendor details | Full record shown — all entered fields, PAN highlighted, work orders summary |
| Deleting a vendor | Confirmation prompt → `DELETE /vendors/:id` → removed from list |
| Filtering by service type | Only vendors of that type appear in the name dropdown |

---

## Files in This Module

| File | Purpose |
|---|---|
| `VendorManagementPage.jsx` | Main page — list, search, filter, stat card |
| `VendorCard.jsx` | Individual vendor card in the grid |
| `VendorModal.jsx` | Add / Edit vendor — search + data entry form |
| `VendorDetailView.jsx` | Full read-only view with work orders + delete |
| `VendorBulkModal.jsx` | Bulk data entry for multiple vendors at once |
| `vendorConstants.js` | Shared constants — demo data, sort options, status colors |

---

## Demo Data

When the backend returns an empty vendor list (e.g. during development), 12 demo vendors are loaded automatically from `vendorConstants.js`:

- **4 Photography** — mix of Individual and company types
- **4 REP** — mix of Individual and company types
- **4 Printing** — mix of Individual and company types

This allows the UI and search flow to be tested without needing backend data.

---

*Last updated: 2026-03-11*
