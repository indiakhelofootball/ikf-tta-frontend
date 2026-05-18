# Features Extracted from Stakeholder Conversation

**Source**: `features_list.txt` (Hindi conversation transcript between stakeholder and Abhishek)
**Extracted**: 2026-03-15

---

## Module 1: VENDOR

### V1. Naming consistency
- Replace "Service Provider", "Partner" etc. with **"Vendor"** everywhere across all modules.

### V2. Search before add
- Before adding a new vendor, **search first** to check if vendor already exists.
- Multiple search filters: Service Type, Vendor Name, Entity Name (company name).

### V3. Vendor fields
- Service Type (Videographer, Photographer, Event Manager, etc.)
- Vendor Name
- Company Type (Individual, Sole Proprietorship, Pvt Ltd, LLP, etc.)
- Entity Name (company/business name — label should say "Entity Name" not "Company Name")
- GST Number
- **PAN Number (mandatory)**
- PAN document upload (mandatory)
- TDS Type — keep in vendor for now, but stakeholder noted it may move to Work Order later
- Contact details (phone, email, address, pin code)
- Bank Details:
  - Show PAN number in bracket next to bank details header ("Bank Details — linked to PAN XXXXX")
  - Bank Name, Account Type, Account Number, IFSC Code
  - Branch Pin Code, Branch Address

### V4. Remove PAN from Rep Management
- PAN is now a vendor-level field, remove it from Rep Management module.

---

## Module 2: WORK ORDER

### WO1. Separate module
- Work Orders is its own separate module/page.

### WO2. Search vendor first
- To create a WO, first **search and select** an existing vendor (not free text entry).
- Use multiple filters to find vendor: Service Type, Vendor Name, Entity Name.
- User must **pick** from existing vendors — data is already saved from vendor module.

### WO3. Work Order Type
- Two types: **One Time (Fixed)** or **Periodic (Recurring)**.

### WO4. Amount — Fixed
- For One Time/Fixed: Enter **total contract amount** (e.g., "1 lakh ka contract").
- Total value = the amount entered.

### WO5. Amount — Periodic
- For Periodic: Enter **amount per period** + **number of periods** (duration).
- Example: Rs 15,000 × 6 periods.

### WO6. Calculate & Confirm (Periodic)
- System shows calculation: "15 × 6 = 90"
- User must **actively confirm** this total (checkbox/button).
- Save blocked until confirmed.

### WO7. Description
- Free text description specific to this work order.
- Service Type is already known from vendor, so description is for **specific work details**.

### WO8. Vendor Confirmation (A-to-Z details)
- After filling WO details, show **all vendor details below** for confirmation:
  - Vendor Name
  - Account Number
  - Phone Number
  - All other vendor data (A to Z — "neeche sab uska ye confirm kar rahe ho")
- This data is **pulled from vendor record** — nothing re-entered.
- Purpose: "Work order jab template banega kal ko toh yahi sab data jayega" (this data goes into future WO template/document).

### WO9. Save as Draft
- WO is saved with **Draft status** initially.
- Can be **Issued** later.
- Data must persist for future template generation.

### WO10. Issue Work Order
- Draft WOs can be issued (status: Draft → Issued).
- Issued WO shows: Work Order number, Vendor Name, Amount, Status.

---

## Module 3: PAYMENT REQUEST (formerly "Raise Invoice")

### PR1. Rename
- "Raise Invoice" → **"Payment Request"**
- "Payment ID" → **"Request ID"**
- "Service Provider" → **"Vendor Name"**

### PR2. Search vendor first
- Same multi-filter search as WO to find vendor.
- Filters: Service Type, Vendor Name, Entity Name.

### PR3. Check for Work Order
- After finding vendor, check if they have a **Work Order Issued**.
- **If no WO exists**: Show "No Work Order Found — Click here to create a Work Order".
- **If WO exists but all payments cleared**: Show "All Payment Clear — Create a New Work Order".
- **If WO exists with pending amount**: Show WO details (Total amount, Paid amount, Remaining).

### PR4. Payment against WO — Periodic
- If WO is Periodic: User **selects the period** to pay.
- Amount **auto-fills** from amountPerPeriod.
- System shows which periods are paid/unpaid.

### PR5. Payment against WO — Fixed
- If WO is Fixed: Shows pending amount (e.g., "Remaining: Rs 40,000").
- User can enter **any amount** up to remaining (partial payment allowed).
- After entering: Show "Still Pending: Rs X" (e.g., paid 30K of 40K remaining → "Still Pending: Rs 10,000").

### PR6. TDS Deduction Display
- When paying Rs 30,000: Show "Amount to be paid: Rs 27,000" and "TDS Amount: Rs 3,000".
- TDS is deducted at source based on vendor's TDS Type.
- TDS deducted info must be recorded and visible in vendor's account statement.

### PR7. Save payment request
- Save creates the payment request record.
- No extra details needed at this point — just save.

### PR8. Grid/List view
- Show: Request ID, Vendor Name, Amount Requested, Invoice Date.
- Remove: Due Date (not relevant), Download button (not needed here).
- Actions: **View** and **Edit** only.
- **Total Amount must be visible** in the grid/below grid — "Total amount dikhao tabhi toh change karne ka sochunga".

### PR9. Send to Account
- "Save & Send to Account" button.
- Sends the payment request to the **Bank module**.

---

## Module 4: BANK / ACCOUNTS (Future — not building now)

### BK1. Receive payment requests
- Bank module receives payment requests sent from Payment module.
- Shows: Request received at [date].

### BK2. Download Excel
- Option to **download Excel** of payment requests.
- Accountant uploads this to bank for processing.

### BK3. Payment confirmation
- After bank processes payment:
  - If **payment successful**: Update status → "Payment Done". All data gets locked (no more edits). Saved A-to-Z in system.
  - If **payment bounced**: Flag the account issue. Edit option **closes** on payment side. Bank/accounts person can edit from their side to fix account details. Re-match the amount.

### BK4. TDS Tracking
- Show **"TDS Pending for this month"** in bank module.
- TDS rule: All TDS deducted between 1st-30th of month must be deposited by 1st-7th of next month.
- TDS pending amount stays visible until deposited.
- Accountant handles TDS via Excel sheet (no system needed for TDS filing now).
- TDS breakdown by type (different TDS sections filed separately).
- When TDS is paid: Status update → "TDS Done / Payment Done".
- This update flows back to **vendor's account statement** showing "TDS Deducted" against each payment.

---

## Cross-Module Notes

| Decision | Detail |
|----------|--------|
| TDS Type location | Keep in Vendor module for now. May move to Work Order in future. |
| Template generation | WO data (vendor details, amounts, description) must support future document/template generation. Not building templates now. |
| Bank module system | TDS filing stays in Excel for now — no system integration needed. |
| Edit restrictions | Once payment is marked "Done" in bank module, editing is locked everywhere. |
| Vendor statement | Every payment + TDS deduction must appear in vendor's account history/statement. |
