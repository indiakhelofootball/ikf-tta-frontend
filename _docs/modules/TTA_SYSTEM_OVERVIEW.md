# TTA System — Module Overview & Features Document

**Prepared for:** India Khelo Football Management
**System:** Trial & Tournament Administration (TTA)
**Date:** March 2026

---

## What is TTA?

TTA is an internal management system for India Khelo Football that handles the complete lifecycle of trial projects — from creating trial events across Indian cities to managing vendors, issuing work orders, processing payments, and tracking tax compliance (TDS).

**Who uses it:**
- **Super Admin / Admin** — Full access to all modules
- **REP (Regional Executive Partner)** — Field-level access to view assigned trials

---

## System Navigation

| Module | Purpose |
|---|---|
| Dashboard | Overview stats and quick actions |
| Admin Settings | Configure dropdown options (Seasons, Project Names) |
| Project Setup | Create new trial projects |
| Projects | View and manage all trial projects |
| REP Management | Manage field partners assigned to cities |
| Vendors | Register and verify service providers |
| Work Orders | Issue contracts to vendors |
| Payments | Raise payment requests against work orders |
| Bank & TDS | Process actual bank payments and track TDS compliance |

---

## MODULE 1: DASHBOARD

### What it does
The first screen after login. Shows a quick summary of everything happening in the system.

### What the user sees

**Admin/Super Admin view:**
- Total Users count
- Active Trials count
- Work Orders count
- Total Revenue figure
- Quick action buttons: "View Work Orders", "Manage REPs"

**REP view:**
- My Trials count
- Total Players count
- This Week's trials count
- Attendance rate
- Quick action buttons: "View My Trials", "My Schedule", "Submit Report"

### User Story
> *"As an Admin, when I log in, I immediately see how many trials are running, how many work orders are active, and what the revenue looks like — so I can decide where to focus my day."*

---

## MODULE 2: ADMIN SETTINGS

### What it does
Controls the dropdown options that appear in other modules. Think of it as the "master configuration" page.

### What the user can configure

**1. Project Names**
- The names that appear when someone creates a new project (e.g., "IKF", "Project Nari Shakti")
- Admin can add new project names, edit existing ones, or delete ones no longer needed
- Each entry can have an optional comment/note

**2. Seasons**
- The season options that appear in project creation (e.g., Season 5, Season 6, Season 7)
- Same add/edit/delete functionality
- Controls which seasons are available across the entire system

### User Stories
> *"As an Admin, I want to add 'Season 8' to the system before the new season starts — so that when anyone creates a project, they can select Season 8."*

> *"As an Admin, I want to add a new project name 'Grassroots League' — so that it becomes available in the Project Setup dropdown for creating new projects."*

### Flow
1. Open Admin Settings
2. See two panels: Project Names and Seasons
3. Click "Add New" under either panel
4. Type the name, optionally add a comment
5. Click Save — it's now available system-wide

---

## MODULE 3: PROJECT SETUP (Trial Wizard)

### What it does
Creates a new trial/tournament project. This is a step-by-step guided form (wizard) that generates a unique project code automatically.

### Features
- Select Project Name from admin-configured dropdown
- Select Season from admin-configured dropdown
- System auto-generates a unique project code (e.g., **IKF-S7-001**)
  - Format: `[Project Short Code]-[Season Number]-[Sequence Number]`
  - IKF = India Khelo Football, S7 = Season 7, 001 = first project of that season
- Confirmation step before final creation
- Success screen with option to go directly to the project dashboard

### User Stories
> *"As an Admin, I want to create a new IKF Season 7 project — the system should automatically give it the code IKF-S7-001 so I don't have to think about naming conventions."*

> *"As an Admin, after creating a project, I want to immediately go to its dashboard to start adding cities and regions."*

### Flow
1. Click "Project Setup" in sidebar
2. Select Project Name (e.g., "IKF")
3. Select Season (e.g., "Season 7")
4. System shows generated code: IKF-S7-001
5. Confirm → Project created
6. Option: "Go to Project Dashboard" or "Create Another"

---

## MODULE 4: PROJECTS (Trial Management)

### What it does
The main hub for viewing all created projects. Each project is shown as a card. Clicking a card opens the full Project Dashboard.

### Features

**Project List Page:**
- All projects shown as visual cards
- Search by project name, code, season, or city
- Filter by Season or Project Type
- Sort: Latest First, Oldest First, Name A-Z, Name Z-A
- Each card shows: Project Name, Code, Season, Type, Number of Regions assigned
- Actions: Edit project details, Delete project

**Edit Project:**
- Change Tier Type (Not Any / Basic / Standard / Premium)
- Add/edit notes/comments
- Cannot change project name or code after creation (locked)

### Project Dashboard (click into any project)

When you click on a project card, you enter its full dashboard with:

**Region/City Management:**
- View all cities assigned to this project in a table
- Add a new region: select State → City → optional Sub City → Month → Date
- Bulk Add multiple regions at once
- Inline editing of any region row
- Mark regions as "Confirmed" with a toggle (immediately saves)
- Search, sort, and filter regions
- Sort options: Recently Added, City A-Z, State A-Z, Month order, Confirmed First

### User Stories
> *"As an Admin, I want to see all my Season 7 projects at a glance — filter by season, and click into any one to manage its cities."*

> *"As an Admin, I want to add 5 cities to the Delhi trial project in one go using bulk add — instead of adding them one by one."*

> *"As an Admin, when a city is confirmed for the trial, I want to toggle it to 'Confirmed' right there in the table — without opening a separate form."*

### Flow: Adding a Region
1. Open Project Dashboard → City Management tab
2. Click "Add Region"
3. Select State → City auto-populates options → Select month and date
4. Save → City appears in the table as "Tentative"
5. When finalized, click the Confirmed toggle → saves immediately

---

## MODULE 5: REP MANAGEMENT

### What it does
Manages Regional Executive Partners — the field people who execute trials in different cities. Each REP is assigned to specific trial cities.

### Features
- View all REPs as cards showing: Name, City, State, Assigned Trials count, Status
- Search REPs by name, city, or trial name
- Filter by: Trial Name, Period, City, Status
- Sort by: Name, City, Number of Trials, Status
- Add individual REP with full details
- Bulk import via CSV upload (with template download)
- Edit/Delete REPs
- Each REP shows their assigned trials and schedule

**REP Profile Fields:**
- REP Name, State, City
- Phone, Email, Contact Person
- Pin Code, Physical Address
- Status: Active / Inactive
- Assigned Trial Cities

### User Stories
> *"As an Admin, I want to see which REPs are assigned to Delhi trials this week — so I can coordinate with them."*

> *"As an Admin, I have a list of 20 new REPs in an Excel sheet. I want to upload them all at once using CSV import — instead of entering each one manually."*

> *"As an Admin, I want to assign a REP to a specific trial city — linking them to 'IKF-S7-001 Delhi' so they know their assignment."*

### Flow: Adding a REP
1. Click "Add REP"
2. Fill in: Name, State, City, Phone, Email, Address, Pin Code
3. Assign to trial city (select from project's city list)
4. Save → REP appears in the grid as Active

### Flow: Bulk Import
1. Click "Download Template" → CSV file downloads
2. Fill in the CSV with REP data
3. Click "Upload CSV" → preview table shows
4. Review data → Click "Import" → progress bar → done

---

## MODULE 6: VENDOR MANAGEMENT

### What it does
Registers and manages all external service providers (vendors) who work with IKF — videographers, photographers, event managers, printers, etc. This is the master record for every vendor including their banking and tax details.

### Features

**Vendor Registration:**
- Vendor Name (required)
- Service Type (e.g., Videographer, Photographer, Printing, Event Manager)
- Company Type (Individual, Sole Proprietorship, Private Limited, LLP, etc.)
- Entity Name (legal company name — only shown if not Individual)
- GST Number + Verification status
- PAN Number (mandatory) + Verification status
- PAN Card image/PDF upload
- Contact: Person name, Phone, Email, Address, Pin Code
- Bank Details: Bank Name, Account Type, Account Number, IFSC Code, Branch Address, Branch Pin Code
- PAN number displayed in Bank Details header ("linked to PAN XXXXX") for cross-verification

**Search & Discovery:**
- Service Type chips as **primary filter** — click "Videographer" to see only videographers
- Text search across: vendor name, entity name, PAN, GST, email, contact person
- Status filter: Verified, Pending, Active, etc.
- Sort: Latest, Oldest, Name A-Z, Name Z-A

**Mandatory Search Before Adding:**
- When clicking "Add Vendor", a search dialog opens FIRST
- Must search by service type or name to check if vendor already exists
- If match found → shows existing vendor with a "View" button
- Only after confirming no duplicate → can proceed to "Add New Vendor"

**Vendor Statement:**
- View complete payment history for any vendor
- Shows: Total Gross paid, TDS deducted, Net paid, Pending amounts
- Table of all payment requests linked to that vendor

**Bulk Add:**
- Add multiple vendors at once through a form-based interface
- Each row can be expanded to full detail via "Edit" button

### User Stories
> *"As an Admin, before adding a new videographer, the system forces me to search first — so I don't accidentally create duplicate vendor records."*

> *"As an Admin, I only know the vendor's service type (Videographer) but not their name. I want to click 'Videographer' and see all videographers to find who I'm looking for."*

> *"As an Admin, I want to see a vendor's complete payment statement — how much was paid, how much TDS was deducted, what's still pending — all in one view."*

> *"As an Admin, when entering bank details, I want to see the PAN number right there — to confirm I'm entering the bank details for the correct PAN."*

> *"As an Admin, I want to verify a vendor's documents (GST and PAN) and mark them as 'Verified' — so only verified vendors get work orders."*

### Flow: Registering a New Vendor
1. Click "Add Vendor" → Search dialog opens
2. Select service type chip (e.g., "Photographer") OR type vendor name
3. System shows any matching vendors → "No match found"
4. Click "Add New Vendor" → Full registration form opens
5. Fill in: Name, Service Type, Company Type
6. If not Individual → Entity Name field appears
7. Enter GST, PAN (mandatory), upload PAN card image
8. Enter contact details and address
9. Enter bank details (PAN number shown in header for reference)
10. Save → Vendor created with status "Pending"
11. Later: Admin verifies documents → clicks "Verify" → status becomes "Verified"

---

## MODULE 7: WORK ORDERS

### What it does
Issues formal work contracts to vendors. A work order defines what work a vendor will do, for how long, and how much they will be paid.

### Features

**Work Order Types:**
1. **Fixed (One-time)** — A single contract for a fixed amount
   - Example: ₹1,00,000 for complete video coverage of Delhi trial
2. **Periodic (Recurring)** — Regular payments over multiple periods
   - Example: ₹15,000/month for 6 months = ₹90,000 total
   - Period types: Monthly, Quarterly, Bi-monthly, Half-yearly

**Work Order Fields:**
- Select vendor (search from registered vendors)
- Work Order Type: Fixed or Periodic
- Amount (for Fixed) or Amount per Period + Number of Periods (for Periodic)
- Service Description
- Project Reference (which trial project)
- Location (city, state)
- Service dates (from-to)
- TDS Rate and calculation
- Vendor's full details auto-populated from their profile (name, bank, PAN, etc.)

**Work Order Status:**
- Issued → Active work order
- Completed → All payments done
- Cancelled → Work order cancelled

**Key Behavior:**
- When creating a work order, all vendor details (name, bank account, PAN, phone, etc.) are shown for confirmation — because these details will go into the official work order document
- Total value calculated automatically: for Periodic, shows "₹15,000 x 6 = ₹90,000"

### User Stories
> *"As an Admin, I want to create a work order for a videographer for Delhi trials — ₹50,000 fixed amount. I select the vendor, and the system shows me their bank details and PAN for confirmation before I issue the work order."*

> *"As an Admin, I want to create a monthly recurring work order — ₹15,000/month for 6 months. The system calculates the total as ₹90,000 and confirms."*

> *"As an Admin, when I create a work order, I want the vendor's bank details, PAN, address, and contact info displayed below — because this same data will go into the official work order template later."*

### Flow: Creating a Work Order
1. Click "Create Work Order"
2. Search and select vendor
3. Choose type: Fixed or Periodic
4. Enter amount details
   - Fixed: Enter total amount (e.g., ₹1,00,000)
   - Periodic: Enter per-period amount (e.g., ₹15,000) and periods (e.g., 6 months) → system shows total (₹90,000)
5. Add description and project reference
6. Review: All vendor details shown for confirmation (bank, PAN, contact, etc.)
7. Issue Work Order → Status: Issued

---

## MODULE 8: PAYMENTS

### What it does
Raises payment requests against existing work orders. This is where you tell the accounts team "please pay this vendor X amount against this work order."

### Features

**Payment Request Grid:**
- Columns: Request ID, Work Order, Vendor, Gross Amount, TDS, Net Amount, Invoice Date, Status, Actions
- Total amounts shown at the top (Total Gross, Total Net Paid, Pending with Accounts)
- Search by: Request ID, Work Order number, Vendor name
- View/Edit individual payment requests

**3-Step Payment Request Wizard:**

**Step 1 — Select Vendor & Work Order:**
- Filter vendors by service type (chips: All, Videographer, Photographer, etc.)
- Search vendors by name, entity, PAN
- Select a vendor → System shows their work orders
- Three scenarios:
  - **No work order exists** → "No Work Order Found — Click here to create one"
  - **Work orders exist but all fully paid** → "All Payments Cleared — Create New Work Order"
  - **Work orders with pending balance** → Shows each WO with: number, type, total amount, paid, remaining balance
- Select which work order to pay against

**Step 2 — Enter Payment Amount:**
- Shows work order summary: Total Amount, Already Paid, Remaining Balance
- For Periodic WO: select which period to pay for → amount auto-fills
- For Fixed WO: enter how much to pay (any amount up to remaining balance)
- System automatically calculates:
  - Gross Amount (what you entered)
  - TDS Amount (auto-calculated based on TDS rate)
  - Net Amount (Gross - TDS = what vendor actually receives)
- Shows "Still Pending After This Payment" — so you know what's left
- If amount exceeds remaining balance → error shown, can't proceed
- Enter Invoice Date and optional Notes

**Step 3 — Preview & Submit:**
- Full summary of everything: vendor details, work order, amounts, TDS breakdown
- Two options:
  - **Save as Draft** — saves but doesn't send to accounts
  - **Send to Accounts** — sends the request to Bank & TDS module for processing

**Payment Request Status Flow:**
```
Draft → Sent to Accounts → Payment Done
                         → Payment Bounced (if bank details wrong)
```

### User Stories
> *"As an Admin, I want to pay a vendor ₹30,000 out of their ₹1,00,000 work order. The system shows me that ₹70,000 will still be pending after this payment."*

> *"As an Admin, for a monthly vendor, I select 'Month 3' and the system auto-fills ₹15,000. It shows ₹1,500 TDS (10%) will be deducted, so vendor gets ₹13,500 net."*

> *"As an Admin, I accidentally try to pay ₹50,000 on a work order that only has ₹40,000 remaining. The system blocks me and shows an error — preventing overpayment."*

> *"As an Admin, when I search for a vendor to pay, I first click 'Videographer' to see only videographers, then type their name to narrow it down."*

### Flow: Raising a Payment Request
1. Click "Payment Request" button
2. **Step 1:** Click service type → select vendor → see their work orders → select WO
3. **Step 2:** Enter amount (or select period for recurring WO)
   - System shows: Gross ₹30,000 | TDS ₹600 (2%) | Net ₹29,400
   - Shows: After this payment, ₹70,000 still pending
4. **Step 3:** Review everything → Click "Send to Accounts"
5. Payment request appears in grid with status "Sent to Accounts"
6. → Now moves to Bank & TDS module for processing

---

## MODULE 9: BANK & TDS MANAGEMENT

### What it does
This is where the accounts team processes actual bank payments and tracks TDS (Tax Deducted at Source) compliance. Payment requests "arrive" here after being sent from the Payments module.

### Features

**Two Tabs:**

### Tab 1: Payment Processing

**What the accounts person sees:**
- All payment requests with status "Sent to Accounts" appear here
- Table shows: Request ID, Work Order, Vendor, Account Details (Bank, Account No, IFSC), Gross, TDS, Net, Invoice Date, Status

**Actions:**
1. **Mark Payment Done** — After transferring money, accounts person clicks this
   - Record gets locked — no more edits
   - Everything saved permanently in the system
   - TDS record automatically created

2. **Mark as Bounced** — If bank details were wrong and payment failed
   - Opens "Bounce Edit" dialog
   - Shows bounce reason
   - Lets accounts person correct bank details (Account Number, IFSC, etc.)
   - Re-submit after fixing details
   - Amount must match original request

**After Payment Done:**
- Payment status updates everywhere in the system
- Vendor's statement automatically reflects the payment
- TDS records are created for the month

### Tab 2: TDS Tracking

**What it shows:**
- TDS Due Alert: "TDS due by 7th of next month" — reminds accounts to deposit TDS
- TDS Summary by Section:
  - 194C (Contractor — Individual) @ 1%
  - 194C (Contractor — Company) @ 2%
  - 194I (Rent) @ 2%
  - 194J (Professional Services) @ 10%
  - 194H (Commission) @ 10%
  - Each row shows: Number of vendors, Total Gross, Total TDS
  - Grand Total TDS to deposit

- TDS Register (detailed):
  - Every individual TDS deduction: Vendor, PAN, Section, Work Order, Month, Gross, TDS Amount, Status
  - Status: Pending (not yet deposited to government) or Deposited

**TDS Workflow (as discussed):**
- System shows how much TDS was deducted from each vendor
- Accounts person downloads this data / uses it to fill their own Excel sheet
- They deposit TDS by section (each TDS section is filed separately)
- After depositing, they update status to "Deposited" in the system
- This reflects in the vendor's statement — vendor can see "TDS deposited"

### User Stories
> *"As an Accounts person, I receive payment requests from the operations team. I see the vendor's bank details right in the table. After I transfer the money, I click 'Payment Done' and the record is locked."*

> *"As an Accounts person, a payment bounced because the IFSC code was wrong. I mark it as 'Bounced', fix the IFSC code in the edit dialog, and re-submit."*

> *"As an Accounts person, at the end of the month, I see total TDS pending is ₹45,000. It's broken down by section — ₹12,000 under 194C, ₹33,000 under 194J. I deposit each separately and mark each as 'Deposited'."*

> *"As an Admin, when I open a vendor's statement, I can see that TDS was deducted on each payment — this proves our compliance."*

### Flow: Processing a Payment
1. Payment request arrives (status: "Sent to Accounts")
2. Accounts person sees vendor, bank details, and net amount
3. Transfers money via bank
4. Clicks "Payment Done" → record locked, TDS record created
5. TDS shows up in Tab 2 as "Pending"
6. At month end: deposits TDS with government
7. Updates TDS status to "Deposited"

### Flow: Handling a Bounced Payment
1. Payment bounced from bank
2. Accounts clicks "Mark as Bounced" → enters reason
3. Bounce dialog opens → fix bank details
4. Re-submit → goes back to processing queue
5. Transfer money again with correct details
6. Click "Payment Done"

---

## MODULE 10: PROFILE

### What it does
Personal profile page for the logged-in user.

### Features
- View and edit: Full Name, Designation, Phone, Department, Location
- Email shown but not editable (login credential)
- Profile photo upload (max 2MB)
- Role displayed but not changeable (Super Admin / Admin / REP)

### User Story
> *"As a user, I want to update my phone number and add a profile photo — so my team can identify and reach me."*

---

## COMPLETE END-TO-END FLOW

Here is how all modules connect in a real-world scenario:

```
SETUP PHASE
    Admin Settings → Add "Season 7" and "IKF" to dropdowns
         ↓
    Project Setup → Create project → gets code "IKF-S7-001"
         ↓
    Project Dashboard → Add cities: Delhi, Mumbai, Bangalore
                      → Set months, confirm cities
         ↓
    REP Management → Assign field REPs to each city

VENDOR & PAYMENT PHASE
    Vendor Management → Register vendors (Videographer, Event Manager, etc.)
                      → Upload PAN, enter bank details, verify documents
         ↓
    Work Orders → Issue work orders to verified vendors
               → Fixed: "₹1,00,000 for Delhi video coverage"
               → Periodic: "₹15,000/month × 6 months for reels"
         ↓
    Payments → Raise payment request against work order
            → System splits: Gross ₹30,000 | TDS ₹600 | Net ₹29,400
            → Send to Accounts
         ↓
    Bank & TDS → Accounts processes payment
              → Marks "Payment Done" or handles "Bounced"
              → TDS tracked by section (194C, 194J, etc.)
              → TDS deposited monthly with government

TRACKING
    Vendor Statement → Complete ledger for any vendor
                     → All payments, TDS deductions, pending amounts

    TDS Register → Monthly compliance tracker
                 → Deposit status by section
```

---

## STATUS LIFECYCLES

| Entity | Status Flow |
|---|---|
| **Project** | Draft → Active → Completed |
| **City/Region** | Tentative → Confirmed |
| **REP** | Active ↔ Inactive |
| **Vendor** | Pending → Verified / Rejected |
| **Work Order** | Issued → Completed / Cancelled |
| **Payment Request** | Draft → Sent to Accounts → Payment Done / Payment Bounced |
| **TDS** | Pending → Deposited |

---

## WHAT IS LIVE vs WHAT IS UPCOMING

### Live (Backend + Frontend)
- Admin Settings (Seasons, Project Names)
- Project Setup (create projects with auto-generated codes)
- Projects (view, edit, manage cities/regions)
- REP Management (add, edit, bulk import, assign to trials)
- Vendor Management (add, verify, view statements)

### Frontend Ready, Backend Pending
- Work Orders — UI complete, backend models not yet built
- Payments — UI complete with full 3-step wizard, backend not yet built
- Bank & TDS — UI complete with payment processing and TDS tracking, backend not yet built

### Future Enhancements (Discussed)
- Work Order PDF template generation (auto-fill vendor data into official WO document)
- Download Excel from Bank module
- Vendor volume/activity indicator (high-activity vendors highlighted)
- Participant management within projects

---

*This document covers the complete TTA system as currently designed and built. Each module is designed to work as part of the end-to-end flow: from project creation through vendor payment and tax compliance.*
