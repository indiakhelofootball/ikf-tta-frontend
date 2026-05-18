# TTA System Manual

A complete operational guide to the TTA system. Written for non-technical users who need to operate the system day to day. Read top to bottom on first use, then keep it as a reference.

The manual follows the same template for every module, in this order:

1. What this module is
2. Who can use it
3. Where to find it
4. Features at a glance
5. How to do things
6. What you will see on screen
7. Important rules and behaviour
8. Common issues and what to do

---

# Chapter 1 — Logging in and roles

## 1. What this module is

The login page is the front door of the system. Every screen sits behind a login. There is no public area apart from the login page itself. Once you log in, the system remembers who you are and what you are allowed to see. Close the browser and come back the next day — you may still be logged in if "Remember Me" was ticked.

The same module decides what you can do once you are in. The system has three kinds of users, and which kind you are decides which menus appear and which buttons work.

## 2. Who can use it

Every user. The login page is the only page that does not require you to already be logged in.

The three user kinds are:

- Super Admin. The top of the pile. Can do everything: create and delete users, add and remove vendors, create work orders, approve payments, run reports, manage every dropdown. This role is meant for one or two trusted people only.
- Admin. The day-to-day operator. Can do most things: create vendors, raise work orders, raise payments, run reports, manage REPs. Cannot create or delete other accounts, and cannot approve their own payments at the highest level.
- REP. A field user. Can view trials, work orders, payment status and vendor documents that relate to their assignments. Cannot change anything.

Whenever this manual says "you can do X", assume Super Admin or Admin unless it says otherwise.

## 3. Where to find it

Open the system URL in any modern browser. If you are not already logged in, you are taken to the login page automatically.

## 4. Features at a glance

- Log in with email and password.
- Log in with a one-time password (OTP) sent to your registered mobile.
- Stay logged in across browser sessions with "Remember Me".
- Auto-refresh of the session so short idle periods do not log you out.
- Forced redirect to the login page if the session has fully expired.
- Log out from the profile menu in the top right.

## 5. How to do things

### How to log in with email and password

1. Open the system URL in your browser.
2. On the login page, type your email address in the Email field. The system is not case-sensitive on email.
3. Type your password in the Password field. Click the eye icon on the right of the box if you want to see what you are typing.
4. Tick "Remember Me" if you are on a personal device. Leave it off on a shared computer.
5. Click "Sign In".
6. If the email and password match, you are taken to the dashboard. If they do not, a red banner appears under the form. Try again.

### How to log in with OTP

1. On the login page, click the "Login with OTP" link.
2. Type your 10-digit mobile number. No country code, no spaces, no dashes.
3. Click "Send OTP".
4. The system sends a six-digit code to your phone over SMS.
5. Wait up to a minute for the message. A countdown on screen tells you when you can request a new one.
6. Type the six-digit code into the box.
7. Click "Verify". If the code matches, you are taken to the dashboard.

### How to log out

1. In the top right corner of any page, click your profile circle.
2. Click "Logout" in the small menu that opens.
3. You are returned to the login page.

## 6. What you will see on screen

The login page is a single card centred on a yellow-tinted background. The card has the system logo, an Email field, a Password field with a show-or-hide eye icon, a "Remember Me" checkbox, a "Sign In" button and a "Login with OTP" link.

If you take the OTP route, the same card transforms: the email and password fields are replaced by a phone field, then a six-digit code field. A small countdown appears once an OTP has been sent.

Error messages appear at the top of the card as a red banner.

The sidebar that you see after logging in adapts to your role:

- Super Admin sees every menu item: Dashboard, Vendors, Work Orders, Raise Payment, Bank and TDS, REP, Trials, Courier, Reports, Admin.
- Admin sees the same minus the User Management area inside Admin.
- REP sees a reduced list with only the screens they are allowed in.

## 7. Important rules and behaviour

- The session is refreshed silently in the background while you are using the system. If both the session and its refresh have expired, the next action you take sends you back to the login page and any unsaved work is lost. Save often.
- Email is unique per account. Two users cannot share an email.
- Passwords are not self-resettable from the login page. If you forget yours, ask the Super Admin to set a new one for you.
- OTP login requires that your registered mobile number is correct. If you cannot get an OTP, check with the Super Admin that your phone number is up to date.

## 8. Common issues and what to do

I cannot log in even with the right password.

Caps lock is the most common reason. Click the eye icon to see your password and try again. If that still does not work, ask the Super Admin to reset your password.

The OTP did not arrive.

Wait at least one minute. SMS can be slow on weak networks. If still nothing, click "Resend OTP" after the countdown ends. If it never arrives, confirm your mobile number is correct in your user profile.

I see "Unauthorized" instead of the screen I expected.

Your role does not have access to that screen. Talk to the Super Admin if you think this is wrong.

---

# Chapter 2 — Admin and Configuration

## 1. What this module is

The Admin section is where the dropdowns and master lists used everywhere else in the system are controlled. If a vendor form asks you to pick a Service Type and the option you need is not there, this is where someone goes to add it. The same applies to project names, seasons, vendor names, bank names, entity types and account types.

Whatever lives here is the single source of truth. Once a new item is added, every form across the system sees it the next time it loads.

The Admin section also contains User Management, where new accounts are created and roles are assigned. Only Super Admin can use User Management. Admin cannot create or delete other accounts.

## 2. Who can use it

Super Admin and Admin can open the Admin section and edit the master lists. Only Super Admin can use User Management. REP users cannot see the Admin section at all.

## 3. Where to find it

Click "Admin" in the sidebar.

## 4. Features at a glance

- Maintain the Project Names list (used by the Trials module).
- Maintain the Seasons list.
- Maintain Service Types (the categories vendors fall under).
- Maintain Entity Types (the corporate forms a vendor can take).
- Maintain Vendor Names, optionally tagged by Service Type and Entity Type so they only appear under the right filter.
- Maintain Bank Names (used by the vendor bank dropdown).
- Maintain Account Types (Savings, Current, etc.).
- Add a new item, rename an existing item, or delete one.
- Block duplicates inside any list.
- Create new user accounts, edit roles, disable or delete accounts (Super Admin only).

## 5. How to do things

### How to add an item to any master list

1. Click "Admin" in the sidebar.
2. Scroll to the panel for the list you want to extend.
3. Type the new value into the input box at the bottom of that panel.
4. Click the "Add" button next to the input.
5. The new value appears in the list and is now live across the system.

### How to edit an existing item

1. Find the item in its panel.
2. Click the pencil icon next to it.
3. The row turns into an editable field.
4. Type the new name.
5. Click the tick icon to save, or the cross icon to cancel.

A renamed item is updated everywhere across the system from that moment on. Existing records that already referenced the old name show the new name automatically.

### How to delete an item

1. Find the item in its panel.
2. Click the trash icon next to it.
3. The item disappears.

### How to add a vendor name with service and entity tags

1. Open the Vendor Names panel.
2. Type the vendor's business name in the input.
3. Optionally pick a Service Type from the small dropdown next to the name.
4. Optionally pick an Entity Type as well.
5. Click "Add".

Names that have both tags only appear when someone is adding a new vendor under that combination. Names with no tags appear everywhere.

### How to create a new user (Super Admin only)

1. Open the User Management area inside Admin.
2. Click "Add User".
3. Enter name, email, phone number.
4. Pick a role: Super Admin, Admin or REP.
5. Set a starter password.
6. Save.

The new user can log in immediately. Tell them to change the password on first login.

## 6. What you will see on screen

The Admin page is laid out as several stacked panels, one per master list. Each panel has the same shape:

- A title and one-line description at the top.
- The existing items shown one per row, with pencil and trash icons.
- An input box at the bottom for adding a new item.
- An "Add" button next to the input.

Panels you will see, in order:

- Project Names
- Seasons
- Service Types
- Entity Types
- Vendor Names (this one has extra tag dropdowns)
- Bank Names
- Account Types

User Management appears as its own area, visible only to Super Admin.

## 7. Important rules and behaviour

- Duplicates are blocked. If you try to add a name that already exists in that list, you get an error and the item is not added. The check is case-insensitive.
- Renaming is safe. Deleting is risky. If you are not sure whether a value is in use somewhere, rename it rather than delete.
- Dropdown lists are cached on each user's browser when they log in. A new value added while another user is logged in may need a page refresh on their end to appear.
- A deleted master value is gone permanently. Existing records keep their old value as plain text but nothing new can pick it.

## 8. Common issues and what to do

A Service Type I just added is not showing up in the Vendor form.

Refresh the Vendor page. The dropdown values are cached on login, and a refresh forces a re-fetch.

Can I have two items with the same name?

No. The system rejects duplicates inside the same list. Different lists can have the same name — for example, you can have "Other" in Service Types and "Other" in Entity Types.

I deleted a Vendor Name by accident.

Add it back with the same spelling. Old vendors that were using that name keep working unchanged.

---

# Chapter 3 — Vendors

## 1. What this module is

A vendor is anyone the organisation pays — a printing company, a venue owner, a freelancer, a logistics service. The Vendors module is where every one of those parties is registered. Once a vendor exists here, you can raise a work order against them, send them payments, deduct TDS and pull their full payment history later.

Think of it as the address book that everything money-related is built on top of. If a vendor is not in this module, you cannot pay them.

## 2. Who can use it

Super Admin and Admin can add, edit, view and delete vendors. REP users can only view vendor information.

## 3. Where to find it

Click "Vendors" in the sidebar.

## 4. Features at a glance

- Add a single vendor through a guided form.
- Add many vendors at once through the bulk entry table.
- Edit any vendor's details.
- Delete a vendor (with a confirmation prompt; blocked if work orders are attached).
- Search across vendor name, contact person, email, GST, PAN, entity name, city and state in one box.
- Filter the list by vendor type.
- Sort by newest first, oldest first, name A to Z, or name Z to A.
- See a full payment statement for any vendor with totals, every payment request and every TDS deduction.
- Mark a vendor's PAN and GST as verified once you have checked the documents.
- Upload a photo or scan of the vendor's PAN card.

## 5. How to do things

### How to add a single vendor

1. Click "Add Vendor" at the top right.
2. The form opens with a search panel at the top.
3. Filter the search panel down: pick the Service Type, Entity Type, State and City of the vendor you are adding.
4. Pick the vendor name from the dropdown that appears. Only names pre-approved under that combination in Admin and Configuration appear. If the name you want is missing, ask the admin to add it first.
5. Once the name is confirmed, the rest of the form unlocks.
6. Fill the Identity section: GST number with the Verified tick, PAN number with the Verified tick, TDS section (for example 194C, or None if no TDS applies).
7. Fill the Contact section: contact person, phone, email, address, pin code, state, city. Entering the pin first speeds the state and city pickers up.
8. Fill the Bank section: bank name, account holder name, account number, account type, IFSC code, branch pin code, branch address. This block is critical — the bank export uses these exact values.
9. If you have a photo of the PAN card, upload it.
10. Click Save.

### How to add many vendors at once

1. Click "Bulk Add" at the top right.
2. A table opens with one empty row. Fill the minimum fields for the first vendor: name, vendor type, company type, entity name, contact person, phone, email and PAN.
3. Click the "+" button to add another row. Repeat for every vendor.
4. To fill the full details for a row (bank, address, GST), click the edit icon on that row. The single-vendor form opens attached to that row. Fill and save back.
5. Use the trash icon on a row to remove it.
6. When the table is ready, click "Submit All".
7. The system creates each vendor in turn. Each row gets a green tick if it succeeded or a red message if it failed.
8. Fix any failed rows and click Submit again. Successful rows are skipped on the second pass.

### How to edit a vendor

1. Find the vendor on the list.
2. Click "Edit" on the card.
3. The same form used for Add opens, pre-filled.
4. Change what needs changing.
5. Click Save.

### How to edit a vendor's bank details

1. Open the vendor as above.
2. Scroll to the Bank section.
3. Update the bank name, account holder name, account number, IFSC code, or branch address.
4. Save.

Payments already sent to the bank keep the details that were used at the time. Only future payments use the new details.

### How to delete a vendor

1. Find the vendor on the list.
2. Click "Delete" on the card.
3. Confirm in the popup.

If the vendor has any work order or payment request attached, deletion is blocked. Clear those first or mark the work orders as Cancelled.

### How to view a vendor's payment statement

1. Find the vendor on the list.
2. Click "Statement" on the card.
3. A dialog opens with four summary boxes at the top: Total Gross Paid, TDS Deducted, Net Paid, Pending.
4. Below the summary, every payment request raised against this vendor is listed in date order with its status, work order, gross, TDS and net.
5. A TDS Records section lists every TDS deduction with section, rate and month.
6. If the vendor has been part of a bounce-and-retry, the bounced payment appears in the list as a record, but its TDS is shown only once. The system never double-counts TDS even when a bank transfer was retried.

### How to use search, filter and sort

1. Type in the Search box. The list narrows as you type. The search covers vendor name, contact person, email, GST, PAN, entity name, city and state.
2. Click "Filter" to filter by vendor type. Click the same type again to clear that filter.
3. Click "Sort" to change the order: newest, oldest, A to Z, Z to A.
4. Active filters and searches appear as small chips below the bar. Click the cross on a chip to drop just that filter. Click "Clear All" to reset everything.

## 6. What you will see on screen

The Vendors page is laid out top to bottom like this:

- A header with "Vendor Management" and two buttons on the right: "Bulk Add" and "Add Vendor".
- A search bar, a Filter button and a Sort button.
- Active filters shown as small chips.
- A grid of vendor cards. Three across on a wide screen, one per row on a phone.

Each card shows:

- The vendor's name in bold.
- A blue outlined chip with the vendor type.
- The entity name if entered.
- PAN with a green tick if marked verified.
- GST with a green tick if marked verified.
- Contact person and phone.
- Email and bank name.
- Four buttons at the bottom: View, Edit, Statement, Delete.

Clicking View opens a detail dialog with every field of the vendor in read-only form. Clicking Edit opens the same form used for Add but pre-filled. Clicking Statement opens the payment statement described above. Clicking Delete prompts for confirmation.

The Add and Bulk Add modals open as overlays on top of the page.

## 7. Important rules and behaviour

- The vendor name list in Add is not free text. The admin team controls which names can be added under which categories, to keep the data clean.
- Account Holder Name and Vendor Name are intentionally separate. The bank cares only about the account holder name. Copy it exactly from the bank document, not from the business card.
- PAN and GST Verified ticks are visual only. They are a note that someone has checked the documents. The system does not call any government service to verify.
- Deleting a vendor is permanent. The system does not keep an archive.
- A vendor with any work order or payment cannot be deleted. The system blocks it.
- TDS is recorded once per payment, even if the payment bounced and was retried. The statement reflects this by showing the bounced payment as a record but only one TDS row for that disbursement.

## 8. Common issues and what to do

The vendor I want is not in the name dropdown.

The Vendor Names list is admin-controlled. Ask the admin to add it under the right Service Type and Entity Type.

I added a vendor but the bank export sent money to the wrong account.

Open the vendor, fix the account number or IFSC, save. Future payments use the corrected details. Payments already in flight keep the old details. To stop a wrong in-flight payment, see the Bank chapter for the bounce-and-fix procedure.

A vendor's name appears twice with slightly different spellings.

Two near-duplicate records split TDS and payment history between them. Pick one to keep, move active work orders and payments to it, and delete the other.

The system blocks me from deleting a vendor.

The vendor has work orders or payment requests attached. Cancel or complete those first, or just leave the vendor in place — there is no harm in keeping an old vendor record.

---

# Chapter 4 — REP Module

## 1. What this module is

A REP is a field representative — the person on the ground in a city who runs trials and coordinates with venues and volunteers. The REP module is where these people are registered, assigned to projects and cities, and where their on-ground details are stored: PIN code, district, courier sub-area, phone, ID proof.

The data here drives two things. First, every trial has at least one REP attached to it. Second, the Courier module uses the REP's address fields to figure out where shipments are going.

## 2. Who can use it

Super Admin and Admin can add, edit and delete REPs. REPs themselves can log in but cannot edit their own profile from here — they see only their assigned work.

## 3. Where to find it

Click "REP Management" in the sidebar.

## 4. Features at a glance

- Add a single REP with full personal, location and assignment details.
- Bulk-upload REPs from an Excel file using a template.
- Edit any REP's profile, assignments, courier info or ID proof.
- Delete a REP (blocked if attached to active trials or work orders).
- Search by name, phone, city, state or assigned project.
- Filter by city or by assigned trial.
- Sort by name, by creation date, by city.
- Assign one REP to multiple projects and cities at once.
- Store ID proof images on the server.

## 5. How to do things

### How to add a single REP

1. Click "Add REP".
2. The form opens.
3. Personal section: full name as on the ID proof, phone (10 digits), email.
4. Address section: full address, PIN code (typing the PIN auto-fills the state for many cases), state, city.
5. Courier section: courier district, courier state, courier sub-area. These are what the Courier module uses for addressing parcels.
6. ID proof section: type of ID (Aadhaar, PAN, Driving Licence, etc.), the ID number, and an optional photo upload.
7. Project and city assignment: click "Add Assignment", pick a project, pick a city, pick a season. Repeat for every assignment this REP is responsible for.
8. Click Save.

### How to bulk-upload REPs

1. Click "Bulk Upload".
2. A dialog opens with two buttons: "Download Template" and "Upload File".
3. Click "Download Template" if you do not already have a file. An Excel template downloads.
4. Fill the template in Excel — one row per REP. Required columns are name, phone, state and city. Other columns are optional.
5. Save the file.
6. Click "Upload File" and pick your saved file.
7. The system reads each row and shows a preview. Rows with errors are highlighted in red with a reason.
8. Fix any errors or close the dialog, fix the spreadsheet, and re-upload.
9. When all rows are valid, click "Confirm Upload".
10. A progress bar shows how many REPs have been processed.

### How to edit a REP

1. Find the REP on the list.
2. Click "Edit" on the card.
3. The form opens pre-filled.
4. Change what is needed.
5. Save.

### How to delete a REP

1. Find the REP on the list.
2. Click "Delete".
3. Confirm.

### How to change a REP's assignment

1. Open the REP for edit.
2. Scroll to the Assignments table.
3. To remove an assignment, click the delete icon on that row.
4. To add a new assignment, click "Add Assignment" and fill project, city, season.
5. Save.

The change takes effect immediately. Trials already in progress in the old city keep the original REP, but new trials in the new city can now pick this REP.

## 6. What you will see on screen

The REP Management page shows one card per REP in a grid. Each card has:

- Name and a short code.
- City and state.
- Phone.
- Tags for assigned projects and cities.
- Buttons: View details, Edit, Delete.

The top of the page has the search bar, filter and sort buttons, an "Add REP" button and a "Bulk Upload" button.

The detail view opens as a dialog and shows every field of the REP plus the full Assignments table.

## 7. Important rules and behaviour

- Phone numbers must be unique. Two REPs cannot share a number.
- Renaming a REP is safe. The system links by internal ID.
- A REP with no assignments is allowed but unusable for trials and shipments.
- ID proof images are visible to anyone with Admin access. Treat them like physical photocopies.
- Deleting a REP attached to an active trial or work order is blocked. Move them off those records first.

## 8. Common issues and what to do

The REP I added is not showing up in the trial creation form.

The trial form only shows REPs with an assignment row for that project and city. Open the REP, add an assignment for that combination, save.

How do I move a REP from one city to another?

Open the REP, remove the old assignment row, add a new one with the new city, save.

A REP cannot see their work after logging in.

Confirm their login email and password. Then confirm they have at least one active assignment. An assignment-less REP sees an empty dashboard.

---

# Chapter 5 — Trials and Cities

## 1. What this module is

A trial is a single on-ground event run by the organisation in a specific city under a specific project. The Trials module is where every trial is set up, scheduled, monitored and closed. Cities are not managed as a separate page anymore — they are built into the trial creation flow itself.

A trial usually pulls in several other parts of the system: a project name (from Admin), a season, one or more cities, one or more REPs, and downstream it triggers work orders (for venues, printing, logistics) and courier shipments. The Trials module is the operational anchor that ties everything together.

## 2. Who can use it

Super Admin and Admin can create, edit and close trials. REPs see trials they are assigned to but cannot create or edit them.

## 3. Where to find it

Click "Trials" in the sidebar.

## 4. Features at a glance

- Create a new trial through a guided wizard.
- Auto-generate a unique trial code from the project name and season.
- Attach one or more cities to a single trial, each with its own state, region and ground.
- Attach a REP to each city.
- Edit a trial's basic fields, status, cities and REPs at any time.
- Open the Project Dashboard view to see all related activity (work orders, payments, courier) for a trial.
- Delete a trial (blocked if work orders are attached).
- Search across trial name, code, season, project type, comments and assigned cities.
- Filter by project type and season.
- Sort by newest, oldest, name or code.

## 5. How to do things

### How to create a new trial

1. Click "Create New Trial".
2. Step one — identity:
   - Pick the Project Name from the dropdown. If the project is missing, ask an admin to add it first in Admin and Configuration.
   - Pick the Season.
   - A trial code is auto-generated and shown below the field.
   - If a trial with the same project and season already exists, a warning appears so you do not duplicate.
3. Step two — schedule:
   - Pick the trial date.
   - Optionally set the next trial date if known.
   - Add a comment if relevant.
4. Step three — cities:
   - Add each city the trial will run in. For each city: city name, state, region, ground location.
   - Mark a ground as Verified once it has been physically inspected.
5. Step four — REPs:
   - For each city, pick the REP who will run it. Only REPs already assigned to that project and city in the REP module appear here.
6. Click "Create Trial".
7. A confirmation popup shows the generated trial code. Click "Open Trial" or "Done".

### How to edit a trial

1. Open the trial's detail view.
2. Click "Edit" at the top right.
3. The wizard opens pre-filled.
4. Make changes.
5. Save.

### How to change a trial's status

1. Open the trial's detail view.
2. The status chip is at the top. Click it.
3. Pick the new status: Draft, Active, Completed, Cancelled.
4. Save.

A trial in Draft is hidden from REP dashboards. It becomes visible to the assigned REP only when its status is Active.

### How to delete a trial

1. Open the detail view.
2. Click "Delete".
3. Confirm.

The system blocks deletion if work orders, payments or shipments are attached. Either clear them or mark the trial as Cancelled.

## 6. What you will see on screen

The Trials list is a grid of cards. Each card shows the trial name, project type, season, an assigned-city summary and the status chip.

The top of the page has the usual search, filter, sort and "Create New Trial" controls.

Clicking a card opens the detail view: basic info, cities table, linked work orders, linked shipments, comments, history. The wizard for create and edit opens as a four-step modal.

## 7. Important rules and behaviour

- The trial code is unique. The combination of project's short code and the season cannot repeat.
- The trial code is fixed once created. Renaming the project or season later does not change the code, so existing work orders and shipments stay linked.
- Trial dates are not enforced — past or future dates are accepted.
- Cities live inside the trial record. The same city across two trials is two separate entries, each with its own ground and REP.

## 8. Common issues and what to do

The REP I want is not in the trial form's dropdown.

The trial form only shows REPs assigned in the REP module to that project and city. Add the REP assignment first.

The Project Dashboard says no payments, but I raised one.

A payment is linked to a trial only if the work order's project field matches the trial code. Open the work order and confirm the project label.

How many cities can one trial have?

No hard limit. Three to five is typical.

---

# Chapter 6 — Work Orders

## 1. What this module is

A work order is a commitment to pay a vendor a specific amount for specific work. Nothing leaves the bank account until a payment request is raised against a work order, but the work order itself is the contract that records the obligation.

Every payment in the system traces back to a work order. The work order tells the system how much was promised, to whom, for what, in how many instalments, with what TDS rate. Once it exists, payments can be raised against it one or many times until the full amount has been paid.

Work orders come in two shapes:

- Fixed: one total amount, paid out across one or many payment requests until cleared.
- Periodic: a recurring amount per period (monthly, quarterly, half-yearly or yearly) over a fixed number of periods. Each period is paid as its own payment request.

## 2. Who can use it

Super Admin and Admin can create, edit and delete work orders. REPs can view work orders that belong to their assigned trials but cannot change anything.

## 3. Where to find it

Click "Work Orders" in the sidebar.

## 4. Features at a glance

- Create a Fixed or Periodic work order with full audit detail.
- Auto-generate the work order number from the vendor's service type and name.
- See all of a vendor's existing work orders while creating a new one (to avoid duplicates).
- Lock or unlock the amount intelligently based on payment progress.
- Maintain a change log: every meaningful edit is recorded with who made it and when.
- Raise a payment directly from a work order's card.
- See the period breakdown for periodic work orders, including which periods are paid.
- Filter by type, service, payment progress and status. Sort by date or amount.
- Export work orders to PDF.

## 5. How to do things

### How to create a new work order

1. Click "Add Work Order".
2. Use the Service Type and Entity Type filters in the vendor search panel, then pick the vendor.
3. If the vendor already has work orders, they are shown in a panel with their payment status. Decide: re-use one, or create a new one anyway. Click "Create New Anyway" to proceed.
4. The work order number is auto-generated.
5. Choose the type:
   - Fixed: enter the total amount.
   - Periodic: pick a period (Monthly, Quarterly, Half-Yearly, Yearly), enter the amount per period and the number of periods. Confirm the auto-computed total by ticking the checkbox before save.
6. Enter the service description.
7. Confirm the TDS rate (pre-filled from the vendor's tdsType). Add a TDS comment if useful.
8. Click Save.

The system checks the vendor has complete bank details before saving. If not, save is blocked with a message asking to fix the vendor first.

### How to edit a work order

1. Find the work order. Click "Edit" on its card.
2. The same form opens, pre-filled.
3. Change what is needed.

Amount editability:

- Unlocked when no payments have been raised yet.
- Partially locked once payments have been raised but not sent to the bank. Use the small "Unlock Amount" button. The new amount must be at least equal to what has already been raised.
- Permanently locked once any payment has been sent to the bank. To correct, mark the WO Cancelled and create a new one.

4. Save.

Every change is logged.

### How to raise a payment from a work order

1. Find the work order.
2. Click "Raise Payment" on the card.
3. The Payment Request modal opens with the vendor and work order pre-selected.
4. Continue in the Payment Requests chapter.

The button is disabled when the work order is fully paid.

### How to handle a bounced work order

1. The work order appears in the "Bounced — Needs Resolution" section.
2. Either:
   - Open the Bank module and use Fix Bank Details on the bounced payment. The same payment is patched and re-submitted. The work order returns to Active.
   - Or click "Remove Bounced" on the card here to delete the work order and the bounced payment together.

The Raise Payment button still works on a bounced work order. The system knows TDS was already booked on the bounced attempt and will not double-deduct.

### How to delete a work order

1. Find it on the list.
2. Click "Delete".
3. Confirm.

Blocked if any payment request is attached.

## 6. What you will see on screen

The page is split into three sections:

- Active. Work orders with money still owing and no problems.
- Bounced — Needs Resolution. Work orders where a payment was sent and bounced.
- Past. Fully paid or cancelled, hidden behind a "Show Past" toggle.

Each section is a grid of cards. Each card shows: work order number, vendor name, type chip (Fixed or Periodic), total amount, paid amount, status chip, a Bounced chip if applicable, and action buttons (View, Edit, Delete, Raise Payment, and Remove Bounced for bounced rows).

The top has a search bar, filters for type, service, payment progress and status, plus a sort dropdown and the "Add Work Order" button.

The detail view shows full info including the periods table (for Periodic) and the change log.

## 7. Important rules and behaviour

- Work order numbers are auto-generated and cannot be hand-edited.
- A vendor cannot have a work order until their bank details are complete.
- TDS rate is captured at work order creation. If the vendor's TDS rate changes later, existing work orders keep the original rate.
- The change log is append-only.
- Once a payment is sent to the bank, the work order's amount is permanently locked.
- A bounced work order does not allow editing the amount until it is resolved.
- TDS is recorded once per disbursement. A re-raise on a bounced work order does not create a second TDS record.

## 8. Common issues and what to do

The Raise Payment button does nothing.

It is disabled because the work order is fully paid. Open the detail view to confirm.

I need to change the total but it is locked.

A payment has been sent to the bank. The amount is permanently locked. Mark the WO Cancelled and create a new one with the right amount. The historical payments stay on the cancelled WO as a record.

The periodic work order shows the wrong number of periods.

If no periods are paid, edit freely. If some are paid, the new number of periods must be at least equal to the paid count, and the new total cannot be less than what is already paid.

---

# Chapter 7 — Payment Requests

## 1. What this module is

A payment request is the document that says "send this much money to this vendor against this work order on this date". It is the unit of payment in the system. Every actual bank transfer starts as a payment request raised here.

The module sits between Work Orders (which capture the commitment) and the Bank module (which tracks what actually moved). Here you raise new payment requests, you bundle several together and send them to the bank as a batch, and you keep a record of every batch that has gone out.

## 2. Who can use it

Super Admin and Admin can raise payments and send batches. REPs can only see the payment status of work orders they are assigned to.

## 3. Where to find it

Click "Raise Payment" in the sidebar.

## 4. Features at a glance

- Raise a new payment request against any open work order via a three-step modal.
- See TDS computed automatically from the work order's TDS rate.
- See running totals of how much is queued.
- Send queued payments to the bank as a single batch — IDFC BLKPAY or ICICI format.
- Download the bank-format Excel ready for upload to the bank's bulk-payment portal.
- Download a parallel internal "full details" Excel and a PDF receipt.
- See every past batch with its contents, totals and the date it was sent.
- Edit or delete an active payment request before it has been sent.
- Re-raise a payment for a bounced work order without double-deducting TDS, with a clear visual cue in the modal.

## 5. How to do things

### How to raise a new payment

1. Click "Raise New Payment".
2. Step one — details:
   - Pick the vendor.
   - Pick the work order. Only the vendor's open work orders appear.
   - For a Periodic work order, pick which period this payment is for.
   - Enter the gross amount. Auto-fills with the period's amount for Periodic.
   - Enter the invoice date.
   - Add notes if needed.
   - The TDS breakdown panel updates live: Gross, TDS deduction, Amount to be paid (net).
   - A balance line shows whether this payment clears the work order or how much will still be pending.
3. If this is a re-raise of a bounced attempt, a blue banner appears explaining that TDS was already booked on the earlier bounced payment. No new TDS record will be created.
4. Click "Next".
5. Step two — preview: read the full request, with vendor, bank, work order and financial summary.
6. Click "Submit Payment Request".
7. The new payment request appears in the Active table on the main page.

### How to edit an active payment request

1. Find it in the Active table.
2. Click the Edit icon at the end of its row.
3. The modal reopens, pre-filled.
4. Make changes.
5. Save.

Possible only while the request is still Active. Once it is in a sent batch, edit is blocked.

### How to delete an active payment request

1. Find it in the Active table.
2. Click the Delete icon at the end of its row.
3. Confirm.

Possible only while Active.

### How to send queued payments to the bank

1. Confirm every row in the Active table is correct.
2. Click "Send to Payment" at the top right.
3. A "Pick a bank" dialog opens with IDFC FIRST (BLKPAY format) and ICICI.
4. Pick the bank.
5. Two files download to your machine:
   - The bank format file, ready to upload to the bank's portal.
   - A Payment Details Excel for internal records.
6. A new past-batch entry appears at the bottom of the page.
7. The payments that were in the batch move out of the Active table and into the Bank module as "Sent to Accounts".

### How to view a past batch

1. Scroll to "Past Batches" at the bottom.
2. Click the chevron to expand the section.
3. Each batch is a row with date, file name, total payments and totals.
4. Click a batch row to expand it and see the full list of payments inside.
5. Click the Download icon to generate a PDF receipt of the batch.

## 6. What you will see on screen

The page has three logical zones:

- Summary cards at the top showing total gross and total net of active payments.
- The Active payments table, with each request as a row.
- Past Batches at the bottom, collapsible, with each batch as an expandable row.

Buttons at the top right: "Raise New Payment" and "Send to Payment".

The Payment Request modal opens as a three-step overlay: input, preview, submit. The bank picker opens as a small dialog with two big buttons.

## 7. Important rules and behaviour

- TDS is calculated from the work order's TDS rate at the time the request is raised. It is locked into the request and does not change later.
- A payment request cannot have a gross greater than the work order's remaining balance.
- A payment request cannot be raised on a period that is already paid.
- The bank format files are generated to a strict layout. Do not edit them before upload — the bank's portal will reject any column shift.
- The internal Payment Details Excel is for reference; it is not a bank document.
- A re-raise on a bounced work order does not create a second TDS record. The system detects the match and suppresses the duplicate.

## 8. Common issues and what to do

The work order dropdown is empty for the vendor I picked.

Either the vendor has no work orders or they are all fully paid. Open the Work Orders module to confirm.

I made a mistake on a payment, but it is already in a batch.

If the payment has not yet been marked Done in the Bank module, use the status-correction action there. If Done, manual reconciliation with the bank statement is required offline.

I see a TDS row in the modal even though the banner says "already deducted".

The TDS row stays visible so the document is internally consistent with the original. The system suppresses creation of a duplicate TDS record in the books but keeps the display.

---

# Chapter 8 — Bank and TDS

## 1. What this module is

The Bank module is the operational ledger that closes the loop between "we sent it" and "it arrived". It tracks every payment sent to the bank: did the transfer go through, did it bounce, what was the reason. It is also where TDS is marked as deposited.

TDS deducted from a vendor's payment must be deposited with the government by the 7th of the following month. This module shows the pending TDS for each month and lets the finance team mark it as deposited once the government payment is done.

## 2. Who can use it

Super Admin and Admin. REPs do not see this module.

## 3. Where to find it

Click "Bank and TDS" in the sidebar.

## 4. Features at a glance

- See all payments sent to the bank in one table with their current status.
- Mark a sent payment as Done after the bank confirms.
- Mark a sent payment as Bounced when the transfer fails.
- Open the Fix Bank Details dialog for a bounced payment, correct the account number, IFSC or bank name, and re-submit.
- Correct a mistakenly-marked status with an audit trail.
- See TDS owed to the government grouped by month.
- Mark a month's TDS as deposited once the government payment is made.
- Export TDS records to CSV for filing TDS returns.

## 5. How to do things

### How to mark a payment as Done

1. Open the Payment Tracking tab.
2. Find the payment in the table.
3. After the bank statement confirms the transfer, click the green tick icon on the row.
4. The status changes to "Payment Done". Payment date is recorded as today.

### How to mark a payment as Bounced

1. Find the payment in the table.
2. Click the red bounce icon on the row.
3. The status changes to "Payment Bounced". The work order moves to the "Bounced — Needs Resolution" section in the Work Orders module.

### How to fix a bounced payment

1. Find the bounced payment in the table.
2. Click the Edit icon (visible because status is Bounced).
3. The Fix Bank Details dialog opens with the current bank name, account number and IFSC pre-filled.
4. A red banner shows the bounce reason if recorded.
5. Correct the wrong fields.
6. Click "Re-submit to Accounts".
7. The payment's bank details are updated and the status moves back to "Sent to Accounts". The work order leaves the Bounced section and returns to Active.

The original TDS record is preserved and not duplicated.

### How to correct a wrong status

1. Find the payment in the table.
2. Click the small status-correction icon (visible for Done and Bounced rows).
3. Pick the correct status.
4. Confirm.

Use sparingly — this is for genuine corrections.

### How to mark a month's TDS as deposited

1. Open the TDS Deposits tab.
2. Find the month you have just deposited at the government portal.
3. Look at the summary row: it shows how many records and how much total TDS will be marked.
4. Click "Mark as Deposited".
5. A confirmation dialog appears. Read carefully.
6. Click "Confirm Deposit".
7. The status changes immediately. Vendor statements now show those TDS rows as Deposited with the date.

This is one-way. The system does not allow un-depositing TDS.

### How to export TDS records

1. On the TDS Deposits tab, click the Export button at the top of the records list.
2. A CSV file downloads with TDS ID, vendor name, PAN, section, rate, work order, month, gross, TDS amount, status and deposited date.
3. Use this file for filing TDS returns or share with the auditor.

## 6. What you will see on screen

The page has two tabs at the top: Payment Tracking and TDS Deposits.

Above the tabs sit three summary cards: Awaiting Confirmation, Payments Done, Bounced.

The Payment Tracking tab shows one row per payment with payment number, vendor and bank details, amount, status chip and action buttons. Buttons differ by status: green tick and red bounce icon for Sent rows, status-correction icon for Done and Bounced rows, an Edit icon for Bounced rows that opens the fix dialog.

The TDS Deposits tab shows a summary list of months at the top, then a full row-by-row record table below. A red or amber notice at the top reminds you of days remaining until the next 7th-of-month deposit due date.

## 7. Important rules and behaviour

- A payment cannot be marked Done before it has been sent in a batch. The system enforces this — Done only appears on rows with status "Sent to Accounts".
- TDS records are created when a payment request is created, not when the payment is marked Done. This matches Indian tax rules where TDS liability arises on the date of invoice or payment, whichever is earlier.
- TDS is grouped by month based on the invoice date of the payment request. Wrong invoice date puts the TDS in the wrong deposit cycle.
- The TDS due date is the 7th of next month. After this date, late deposit may attract interest with the tax department — outside the system, but the organisation's responsibility.
- A bounce-and-retry keeps a single TDS record. The retry does not create a duplicate.
- The system does not allow un-depositing TDS. Mistakes must be corrected in the database by the technical team.

## 8. Common issues and what to do

I marked a payment Done by mistake.

Use the status-correction action to set it back to "Sent to Accounts".

The bank statement shows two payments for one of our requests.

A bounce-and-retry where the first attempt actually did succeed but was marked bounced. Reconciliation has to be done offline with the bank. Once confirmed, set the right payment to Done.

TDS for last month was marked Deposited but it was wrong.

The system does not allow un-depositing. The fix is offline — the technical team has to reset the records in the database.

I see no rows on the Payment Tracking tab.

Either no batches have been sent yet, or all sent payments have been confirmed Done. Check the Past Batches section in Raise Payment.

---

# Chapter 9 — Courier

## 1. What this module is

A trial usually needs physical items delivered to the ground a few weeks before the event — t-shirts for volunteers, banners, scout dockets, numbered bibs, the matchsheet. The Courier module tracks these shipments from "we are getting it printed" through to "REP confirms delivered".

Each shipment is a record of what is going, where, when it left, which courier company is carrying it, what the tracking number is, and what the status is right now. The module also flags shipments at risk of arriving late.

## 2. Who can use it

Super Admin and Admin can create and manage shipments. REPs can see shipments addressed to them but cannot edit them.

## 3. Where to find it

Click "Courier" in the sidebar.

## 4. Features at a glance

- Create a shipment with a predefined or custom set of items.
- Track production status of each item (Pending, Sent for Printing, Received from Printer).
- Assign a courier company from a curated list, or pick "Other".
- Enter the airway bill number and get a click-through tracking link for the major couriers.
- Move shipment through Draft, Dispatched, In Transit, Delivered (or Returned, Lost).
- See automatic warning flags as the trial date approaches.
- Export a shipment list as a PDF for the warehouse or vendor.
- Quick WhatsApp and call buttons to the receiving REP.

## 5. How to do things

### How to create a new shipment

1. Click "Create Shipment".
2. Pick the trial. Only currently-active trials appear.
3. The REP and destination address auto-fill from the trial's city and assigned REP. Confirm them.
4. The items list pre-fills with six predefined items: Volunteer T-shirts, Banners, Matchsheet, Scout Dockets, Numbered Bibs Orange, Numbered Bibs Green.
5. For each predefined item, set the quantity and any remarks. Remove rows you do not need.
6. Click "Add Custom Item" for anything not in the standard list. Give it a name and a quantity. Custom items track their own production status (Pending, Sent for Printing, Received from Printer).
7. Click Save. The shipment is in Draft status.

### How to dispatch a shipment

1. Open the shipment row.
2. Click "Mark Dispatched".
3. Fill the small form: courier company, airway bill, date dispatched (defaults to today).
4. Save.

The status changes to Dispatched. For supported couriers, the airway bill is now a click-through tracking link.

### How to update a shipment in transit

1. Open the row.
2. Click "Update Status".
3. Pick: In Transit, Delivered, Returned, or Lost.
4. For Delivered, the date received defaults to today.
5. Save.

The REP themselves can confirm receipt from their own dashboard.

### How to track a shipment

1. In the row, click the airway bill number.
2. The courier's tracking page opens in a new tab with the AWB pre-filled (for supported couriers).
3. For "Other", you will need to paste the AWB into the courier's site manually.

### How to call or message the receiving REP

1. In the shipment row, click the phone icon next to the REP's name to start a call.
2. Click the WhatsApp icon to open WhatsApp with the REP.

These are convenience links; the system itself does not send anything.

### How to export a shipment list

1. Filter the list to what you want to export.
2. Click "Export PDF" at the top.
3. A PDF generates with the visible rows.

## 6. What you will see on screen

The Courier page shows a table of shipments, one row per parcel, with trial code, destination city and REP, items, courier and AWB, status chip and warning flags.

A summary strip at the top shows counts by status. The top right has the "Create Shipment" button and export.

The detail view opens as a dialog showing every item, every status change and notes.

## 7. Important rules and behaviour

- The supported courier list is fixed in the code: Blue Dart, DTDC, Delhivery, FedEx, India Post, Ekart, Professional Couriers, XpressBees, plus "Other".
- A shipment cannot be created against a trial that does not have a REP assigned to its city.
- Production status of custom items is updated manually. The system has no link to the print vendor.
- Once Delivered, the row becomes read-only. Use Returned or Lost only if something goes wrong afterwards.
- Warning flags are visual only: red if custom items are not ready within 60 days of the trial, or shipment is still Draft within 30 days. Amber at 75 and 45 days respectively. They prompt attention but do not block anything.

## 8. Common issues and what to do

The tracking link does not open the right page.

Confirm the AWB is correct and has no extra spaces. Some couriers (India Post in particular) do not accept the AWB in the URL, so paste it manually on the page that opens.

The REP says they have not received the parcel even though the courier shows Delivered.

Talk to the courier first. Update to Lost or Returned only after operational confirmation.

We use a courier that is not in the dropdown.

Pick "Other" and enter the AWB. The link will not be auto-generated. Pasting the courier's public tracking URL in remarks helps the REP track manually.

---

# Chapter 10 — Reports and Exports

## 1. What this module is

The system does not have a single dedicated Reports page. Instead, exports live inside the modules where the data is generated. This chapter lists every export the system can produce, what it is for, and where it lives.

The exports fall into two groups: financial (the bank-format files and internal payment details) and operational (TDS, shipment list, work order PDFs, batch receipts).

## 2. Who can use it

Super Admin and Admin can use every export. REPs can only see (not export) data they have read access to.

## 3. Where to find them

Inside each module:

- Raise Payment page → IDFC BLKPAY Excel, ICICI Excel, Payment Details Excel, Batch PDF.
- Bank and TDS page → TDS CSV.
- REP Management → REP bulk-upload template, REP list export.
- Trials → Per-trial PDF summary (from the Project Dashboard).
- Courier → Shipment list PDF.
- Work Orders → Work order PDF.

## 4. Features at a glance

- Bank bulk-payment Excel files in two bank-specific formats (IDFC BLKPAY, ICICI).
- Internal "Payment Details" Excel that mirrors every batch with full detail.
- PDF receipts for every past payment batch.
- Monthly TDS CSV for filing returns.
- REP bulk-upload template (download to fill, then re-upload).
- Shipment list PDF.
- Per-work-order PDF including amount, vendor, period breakdown, and change log.

## 5. How to do things

### How to download the IDFC BLKPAY Excel for a batch

1. Open the Raise Payment page.
2. Add the payment requests you want to send.
3. Click "Send to Payment".
4. Pick "IDFC FIRST" in the bank picker.
5. Two files download — the BLKPAY Excel and the Payment Details Excel.

### How to download the ICICI bulk-payment Excel

1. Open the Raise Payment page.
2. Add the payment requests you want to send.
3. Click "Send to Payment".
4. Pick "ICICI" in the bank picker.
5. Two files download — the ICICI NPAB file and the Payment Details Excel.

### How to generate a batch PDF receipt

1. Open the Raise Payment page.
2. Scroll to Past Batches and expand it.
3. Click the Download icon on the batch row.
4. A PDF receipt downloads with the batch's contents and totals.

### How to export the TDS records to CSV

1. Open the Bank and TDS page.
2. Switch to the TDS Deposits tab.
3. Click "Export" at the top of the records table.
4. A CSV file downloads with every record across all months.

### How to download the REP bulk-upload template

1. Open the REP Management page.
2. Click "Bulk Upload".
3. Click "Download Template" inside the dialog.
4. An Excel template downloads, ready to fill.

### How to export a shipment list

1. Open the Courier page.
2. Filter to the rows you want.
3. Click "Export PDF" at the top.
4. A PDF downloads of the visible rows.

### How to download a work order PDF

1. Open the Work Orders page.
2. Click the PDF icon on a work order card, or open the detail view and click Download PDF.
3. A PDF downloads with the work order's full info and change log.

## 6. What you will see on screen

Each export sits where the data is, not in a separate Reports menu. Look for a Download icon, a Print icon or an explicit Export button at the top of the table or on the row itself. The button always tells you what file type to expect.

The bank-format Excel files have the exact column layout the bank's bulk-payment portal expects. Do not open and re-save them with edits — the bank's parser is strict.

## 7. Important rules and behaviour

- The IDFC BLKPAY file matches a fixed 16-column layout. Column E (debit account) is filled by the system or left blank depending on the configured source.
- The ICICI file follows a different layout and is named NPAB_FMT_YYYYMMDD.xlsx.
- The Payment Details Excel is for internal records, with all the supporting context (vendor name, work order number, gross, TDS, net, invoice date, notes).
- The TDS CSV is for filing returns. The columns match what most TDS-return software expects.
- The REP bulk template's column order matters. Do not reorder columns when filling.
- PDF receipts are landscape A4 and include the organisation header.

## 8. Common issues and what to do

The bank's portal rejected the BLKPAY file.

Confirm you did not open and re-save the file in Excel. Some Excel versions reformat numbers and dates on save, which the bank parser rejects. Always upload the file as downloaded.

The Payment Details Excel and the BLKPAY Excel have different totals.

They should be identical for the same batch. If they differ, something failed during generation — re-send the batch.

The TDS CSV is missing some rows.

The export includes every TDS record regardless of status. If rows are missing, either they belong to a different month or the corresponding payment request was deleted. Check the Vendor Statement to confirm.

The REP bulk upload says my file has errors.

Open the template that was just downloaded and compare column headings. If the spreadsheet has been re-arranged or renamed columns, the parser will fail.

---

# Glossary

A short reference for terms used across the manual.

- Admin. A user role with most operational permissions. Can manage vendors, work orders, payments and most master lists. Cannot manage other user accounts.

- AWB. Airway bill number. The tracking number assigned by a courier company when a shipment is dispatched.

- Batch. A group of payment requests sent to the bank together as a single bulk-payment file. The unit at which payments actually leave the system.

- BLKPAY. The bulk-payment file format used by IDFC FIRST Bank for processing multiple payments in one upload.

- Bounce. A bank transfer that failed and returned the money. Usually due to wrong account number, wrong IFSC, name mismatch or a closed account. In this system, a bounced payment stays as a record and can be re-submitted after fixing the bank details, or the work order can be removed entirely.

- Change log. The append-only history of edits on a work order. Each entry records the field name, old value, new value, who made the change and when.

- Entity Type. The legal form of a vendor — Proprietorship, Partnership, Private Limited, Public Limited, LLP, etc. Used inside the Vendor module.

- Fixed work order. A work order with a single total amount, paid out across one or more payment requests until cleared.

- Gross amount. The full amount before TDS is deducted. What the work order commits to.

- ICICI NPAB. The bulk-payment file format used by ICICI Bank for processing multiple payments in one upload.

- Net amount. The amount actually transferred to the vendor, after TDS is deducted from the gross.

- OTP. One-time password. A six-digit code sent to a registered mobile number used to log in without a password.

- Payment request. A document raising a specific payment against a specific work order. The unit of payment in the system. Often abbreviated PR.

- Payment Bounced. The status of a payment request whose bank transfer failed.

- Payment Done. The status of a payment request whose transfer the bank has confirmed.

- Period. One instalment of a Periodic work order. Each period is paid as its own payment request.

- Periodic work order. A work order paid in a fixed number of equal instalments over time (monthly, quarterly, half-yearly or yearly).

- Project. A named initiative under which trials are run. Maintained in Admin and Configuration.

- REP. A field representative working on the ground in a specific city.

- Season. The cycle a trial belongs to (for example 2025-26). Maintained in Admin and Configuration.

- Sent to Accounts. The status of a payment request that has been included in a batch and sent to the bank but not yet confirmed Done or Bounced.

- Service Type. The category a vendor belongs to (Printing, Venue, Logistics, etc.). Used inside the Vendor module.

- Super Admin. The highest user role. Can do everything in the system including user management.

- TDS. Tax Deducted at Source. A portion of the gross payment that the organisation withholds from the vendor and deposits with the government on the vendor's behalf. Deducted once per disbursement; never duplicated on bounce-and-retry.

- TDS section. The category of the Indian Income Tax Act under which the TDS is deducted (for example 194C for contractors, 194J for professional services).

- Trial. A single on-ground event run by the organisation in a specific city under a specific project.

- Trial code. The unique short identifier auto-generated for a trial from its project and season. Fixed once created.

- Vendor. Any party the organisation pays. The unit at the centre of every payment chain.

- Work order. A commitment to pay a vendor a specific amount for specific work. The contract that every payment traces back to. Often abbreviated WO.
