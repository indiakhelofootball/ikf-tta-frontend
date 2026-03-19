# Work Order Module

## What Is a Work Order?

A Work Order (WO) is the bridge between vendor onboarding and payments. Without this module, you cannot formally engage a vendor for specific work. It defines a financial commitment — who is doing what work, for how much.

A work order must be attached to an existing vendor. This ensures every work order has a valid payee.

---

## Why Is This Module Important?

- No WO = no payment. Every payment traces back to a work order
- WO can be created now and **issued later** — allows planning without immediate execution
- All WO data **persists** in the system for future reference and reuse
- In the future, when a WO template is built, this same data will flow into the issued document
- Work order type (Fixed/Periodic) **drives the entire payment logic** downstream

---

## Work Order Creation Flow

| Step | Action | Why Important |
|---|---|---|
| 1 | Search/Select Vendor | Links to existing vendor — every WO must have a valid payee |
| 2 | Select Type (One Time / Periodic) | Determines payment logic — single vs installments |
| 3 | Enter Amount + Duration (if periodic) | Defines financial commitment — amount is mandatory in both cases |
| 4 | Calculate Total + Confirm | Prevents calculation errors — user must confirm the total value |
| 5 | Add Description | Records specific work details (separate from vendor's general service type) |
| 6 | Review/Confirm Vendor Details | Shows vendor A-to-Z details below (name, account, phone) for confirmation — ensures correct payee |
| 7 | Save Work Order | Persists in system, available for future payment requests |
| 8 | Can be Issued Later | Location-based issuance is a future feature — WO is saved as Draft for now |

---

## Work Order Types

### One Time (Fixed)
- Single fixed amount for the entire contract
- Total value = the amount entered
- Example: ₹1,00,000 contract → total value is ₹1,00,000

### Periodic (Recurring)
- Multiple payments over a defined duration
- Requires: **amount per period** + **number of periods**
- System calculates: amount × periods = total
- Example: ₹15,000 × 6 periods = ₹90,000 total
- User must **confirm the calculated total** before saving

**Amount is mandatory in both cases.** Financial commitment must always be recorded.

---

## Vendor Confirmation in WO

After entering WO details (type, amount, description), the system shows the full vendor details below for confirmation:
- Vendor name
- Account number
- Phone number
- All other saved vendor data (A-to-Z)

This data is **not re-entered** — it was already saved during vendor creation in the Vendor Module. The WO just pulls and displays it.

**Why?** Because when the WO template is generated in the future, all this data flows into the issued document. It must be correct at creation time.

---

## Description Field

- Service type is already known from the vendor record
- Description adds **specific details** about this particular work order
- Separates the vendor's general service type from the specific work being assigned
- Example: Vendor service type = "Photography", WO description = "Event shoot for Mumbai U-17 trials, 2 days, 500 photos"

---

## Location & Future Issuance

- Location can be captured in the WO (city/state)
- The WO will be **issued from that location's initiation point** in the future
- **Not today** — issuance is a future feature
- For now, WO is saved as Draft and can be issued later when needed

---

## Data Fields

| Field | Key | Type | Required | Notes |
|---|---|---|---|---|
| WO Number | `workOrderNumber` | String (auto) | Yes | Auto-generated: `WO-YYYY-NNN` |
| Vendor | `vendorId` | Reference | Yes | Must select from existing vendor list |
| Service Type | `serviceType` | String | Yes | Auto-filled from selected vendor |
| WO Type | `type` | Enum | Yes | `Fixed` or `Periodic` |
| Amount (Fixed) | `amount` | Number | If Fixed | Total contract value |
| Amount Per Period | `amountPerPeriod` | Number | If Periodic | Payment per cycle |
| Number of Periods | `numberOfPeriods` | Number | If Periodic | How many cycles (e.g. 5, 6) |
| Period Type | `periodType` | Enum | If Periodic | Monthly / Bi-monthly / Quarterly / Half-yearly |
| Total Value | `totalValue` | Number (calc) | Yes | Fixed: `amount`. Periodic: `amountPerPeriod × numberOfPeriods` |
| Description | `description` | String | Yes | Specific work details for this WO |
| Location | `city` / `state` | String | No | Where the work happens |
| TDS Type | `tdsType` | Enum | Yes | Determines TDS section at payment time |
| Status | `status` | Enum | Yes | Draft / Issued / Completed / Cancelled |

---

## Key Rules

1. Every WO **must** link to an existing vendor — search vendor first
2. Amount is **mandatory** — both Fixed and Periodic
3. Periodic total must be **calculated and confirmed** by user (e.g. 15 × 6 = 90, confirm)
4. Vendor details shown for **confirmation** — no re-entry, pulled from vendor record
5. WO data **persists** — saved for future reference, templates, and payment requests
6. WO can be **created now, issued later** — Draft status
7. Description is separate from service type — adds specific work details
8. WO becomes a **self-contained document** with all relevant vendor + work details

---

## Connection to Other Modules

| Direction | Module | How |
|---|---|---|
| ← Pulls from | **Vendor** | Vendor search is Step 1. All vendor data auto-populated, shown for confirmation |
| → Feeds into | **Payment Request** | PRs are raised against a work order. No WO = no payment |
| → Feeds into | **TDS** | TDS type defined in WO determines deduction rate at payment time |

---

*Source: Line-by-line analysis of stakeholder conversation (worktype.md)*
*Last updated: 2026-03-11*
