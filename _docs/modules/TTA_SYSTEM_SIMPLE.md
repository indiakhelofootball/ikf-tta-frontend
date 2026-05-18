# TTA System — Simple Overview

**For:** India Khelo Football
**Date:** March 2026

---

## The Big Picture

IKF runs football trials across India every season. To run these trials, IKF needs to:

1. Plan which cities to go to
2. Hire local people (REPs) to manage each city
3. Hire vendors (videographers, event managers, printers, etc.)
4. Give vendors contracts (work orders)
5. Pay vendors properly (with TDS tax deducted)
6. Keep records of everything for compliance

**TTA handles all of this in one place.**

---

## How It All Works — A Real Example

Let's say IKF is starting **Season 7**. Here's what happens step by step:

---

### Step 1: "Let's create a Season 7 project"

Someone from the team opens the system and says "I want to create a new IKF project for Season 7."

The system asks two questions:
- Which project? → **IKF**
- Which season? → **Season 7**

That's it. The system automatically creates a code: **IKF-S7-001**. No manual naming. No confusion. Everyone refers to this project by its code going forward.

*If tomorrow IKF wants to add "Season 8" as an option, the Admin goes to Settings and adds it. Now everyone can select Season 8.*

---

### Step 2: "Which cities are we going to?"

The project is created. Now the team opens it and starts adding cities.

- Delhi — January — Confirmed
- Mumbai — February — Tentative (not confirmed yet)
- Bangalore — March — Tentative

They can add one city at a time, or add 10 cities at once using "Bulk Add."

When a city gets confirmed, they just click a toggle — done, it's marked as Confirmed. No forms to fill.

---

### Step 3: "Who's managing each city?"

IKF has local field partners called **REPs** — these are people on the ground who organize the trial in each city.

The team goes to REP Management and:
- Adds REP profiles (name, phone, city, email)
- Assigns each REP to a specific trial city
- If they have a list of 20 REPs in Excel, they can upload the whole list at once

Now everyone knows: "Ravi is handling Delhi, Priya is handling Mumbai."

---

### Step 4: "We need to hire a videographer for Delhi"

Before IKF can hire anyone, the vendor needs to be registered in the system.

**Registering a Vendor:**

The team clicks "Add Vendor." But the system doesn't just open a form. It first asks:

> "Search first — does this vendor already exist?"

This prevents duplicate entries. The team can search by:
- **Service type** — Click "Videographer" and see all registered videographers
- **Name** — Type the person's name
- **Company name** — Type the company/entity name

If the vendor is already there → great, use the existing record.
If not → click "Add New Vendor" and fill in:
- Name, company type, entity name
- PAN number (mandatory), GST number
- PAN card photo upload
- Bank details (account number, IFSC code, etc.)
- The system shows the PAN number right next to the bank details so you can verify "yes, this bank account belongs to this PAN"

After saving, the vendor starts as "Pending." Someone reviews their documents and clicks "Verify" → now they're "Verified" and ready to receive work orders.

---

### Step 5: "Let's give the videographer a contract"

Now the team creates a **Work Order** for the vendor.

Two types of contracts:

**Fixed (one-time):**
> "We're paying Ravi Kumar ₹50,000 for complete video coverage of Delhi trials."
> Total value: ₹50,000. That's it.

**Periodic (recurring):**
> "We're paying Ravi Kumar ₹15,000 every month for 6 months for social media reels."
> The system calculates: ₹15,000 x 6 = ₹90,000 total.

When creating the work order, the system shows ALL of the vendor's details below — name, bank account, PAN, phone, address — because later, when IKF generates the official work order document, all this data needs to be correct.

---

### Step 6: "Time to pay the videographer"

The team goes to Payments and raises a **Payment Request**.

**Here's how it works:**

1. **Find the vendor** — Click "Videographer" → search by name → found Ravi Kumar

2. **See their work orders** — The system shows:
   > "WO-S7-001 — Fixed — ₹50,000 total — ₹0 paid — ₹50,000 remaining"

   Three things can happen:
   - **No work order exists** → System says "No Work Order Found. Create one first."
   - **All work orders fully paid** → System says "All cleared. Create a new work order if needed."
   - **Money still pending** → Shows the balance. This is the normal case.

3. **Enter the amount** — Let's say the team wants to pay ₹30,000 now (not the full ₹50,000).

   The system automatically calculates:
   - Gross: ₹30,000 (what you're paying)
   - TDS: ₹600 (2% tax deducted at source)
   - Net: ₹29,400 (what the vendor actually gets in their bank)

   And it shows: **"After this payment, ₹20,000 still pending."**

   If someone accidentally types ₹60,000 (more than the ₹50,000 balance), the system blocks it: "You can't pay more than what's remaining."

4. **Review and send** — Preview shows everything. Two options:
   - Save as Draft (for later)
   - **Send to Accounts** (goes to the accounts team for actual bank transfer)

---

### Step 7: "Accounts team processes the payment"

The payment request lands in the **Bank & TDS** module. This is where the accounts person works.

They see: "Pay ₹29,400 to Ravi Kumar — HDFC Bank — Account 501001234 — IFSC HDFC0001234"

**If everything goes well:**
- Accounts transfers the money
- Clicks "Payment Done"
- Record gets locked. Nobody can change it. It's final.
- TDS record (₹600) automatically gets tracked

**If the payment bounces (wrong bank details):**
- Accounts clicks "Payment Bounced"
- Enters the reason ("Wrong IFSC code")
- Fixes the bank details in the system
- Re-submits the payment
- Tries again

---

### Step 8: "TDS compliance"

Every time a payment is made, TDS (tax) is deducted. The government requires IKF to deposit this TDS by the 7th of next month.

The system tracks:
- How much TDS was deducted from each vendor
- Broken down by tax section (different types of work have different TDS rates)
- What's still pending to be deposited

The accounts person:
1. Sees total TDS to deposit (e.g., ₹45,000 this month)
2. Uses this data to fill their government filing
3. Deposits the TDS
4. Updates the system: "TDS Deposited"

Now if anyone opens a vendor's statement, they can see: "₹600 TDS was deducted and has been deposited."

---

### At any time: "Show me Ravi Kumar's complete history"

Click on any vendor → View Statement.

It shows everything:
- Total gross paid: ₹1,50,000
- Total TDS deducted: ₹3,000
- Total net paid: ₹1,47,000
- Pending payments: ₹20,000
- Every single payment listed with dates, amounts, and TDS breakdown

---

## What Each Screen Does (Quick Reference)

**Dashboard** — First thing you see after login. Shows counts: how many projects, vendors, payments. Quick links to jump anywhere.

**Admin Settings** — The place where you add new Season options or Project Name options. Like a master control panel for dropdown menus.

**Project Setup** — Create a new project. Pick a name and season. Get an auto-generated code.

**Projects** — See all projects. Click into one to manage its cities, add regions, confirm dates.

**REP Management** — Add and manage field people. Assign them to cities. Bulk upload from Excel.

**Vendors** — Register service providers. PAN, bank details, verification. Must search before adding to prevent duplicates.

**Work Orders** — Give contracts to vendors. Fixed amount or recurring monthly. System shows vendor's full details for confirmation.

**Payments** — Raise payment requests. System calculates TDS automatically. Shows remaining balance. Sends to accounts team.

**Bank & TDS** — Accounts team processes payments here. Marks done or handles bounced payments. Tracks TDS deposits for government compliance.

**Profile** — Update your own name, phone, photo.

---

## What's Ready vs What's Coming

**Fully working (data saves to server):**
- Admin Settings, Project Setup, Projects, REP Management, Vendor Management

**Screen is ready, server part coming soon:**
- Work Orders, Payments, Bank & TDS
- (The screens work and look complete — they just use sample data until the server is built)

**Future additions discussed:**
- Auto-generate official Work Order PDF documents
- Download payment data as Excel
- Participant management within trials
