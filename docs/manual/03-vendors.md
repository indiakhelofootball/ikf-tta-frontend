# Vendors

## What this module is

A vendor is anyone the organisation pays — a printing company, a venue owner, a freelancer, a logistics service. The Vendors module is where every one of those parties is registered. Once a vendor exists here, you can raise a work order against them, send them payments, deduct TDS, and pull their full payment history later.

Think of it as the address book that everything money-related is built on top of. If a vendor is not in this module, you cannot pay them.

## Who uses it

- Super Admin and Admin can add, edit, view and delete vendors.
- A REP user can only view vendor information; they cannot change anything.

## Where to find it

From the main sidebar, click "Vendors". The page that opens is the Vendor Management page.

## What you see when you open it

The page is organised top to bottom like this.

- At the top, a header that says "Vendor Management" with two buttons on the right: "Bulk Add" and "Add Vendor".
- Below that, a search bar, a "Filter" button, and a "Sort" button.
- If any filter or search is active, the active filters appear as small chips just below, with a "Clear All" button.
- The main area shows every vendor as a card, three across on a wide screen, one per row on a phone.

Each card shows:

- The vendor's name in bold at the top.
- A blue outlined tag showing the vendor type (for example, Printing, Venue, Logistics).
- The entity name, if one was entered (the legal business name).
- The PAN number, with a small green tick next to "PAN" if the PAN has been marked verified.
- The GST number, with a green tick next to "GST" if the GST has been marked verified.
- The contact person's name and phone number.
- The email address.
- The bank name.
- Four buttons at the bottom of the card: View, Edit, Statement, Delete.

If there are no vendors yet, the page shows an empty state with a single button asking you to add the first one.

## Features at a glance

- Add a single vendor through a guided form.
- Add many vendors at once through the bulk entry table.
- Edit any vendor's details.
- Delete a vendor (with a confirmation prompt).
- Search across vendor name, contact person, email, GST number, PAN number, entity name, city and state in one box.
- Filter the list by vendor type.
- Sort the list by newest first, oldest first, name A to Z, or name Z to A.
- See a full payment statement for any vendor: every payment raised, every bounce, every TDS deduction.
- Mark a vendor's PAN and GST as verified once you have checked the documents.
- Upload a photo or scan of the vendor's PAN card.

## How to add a single vendor

1. Click the "Add Vendor" button at the top right of the page.
2. A form opens. The top of the form is a small search panel. Use it to pick the kind of vendor you are adding:
   - Choose the service type (for example, Printing or Venue).
   - Choose the entity type (Proprietorship, Pvt Ltd, etc.).
   - Choose the state and city.
3. After the filters, pick the vendor's name from the dropdown. The list only shows names the admin team has pre-approved for that combination. If the name you want is not in the list, the admin needs to add it first under Admin and Configuration.
4. Once the name is confirmed, the rest of the form unlocks.
5. Fill in the identity section:
   - GST number, and tick "Verified" if you have checked the certificate.
   - PAN number, and tick "Verified" if you have checked the card.
   - Choose the TDS section that applies to this vendor (for example, 194C for contractors). Leave as None if no TDS applies.
6. Fill in the contact section:
   - Contact person's name, phone number, email address.
   - Full address, pin code, state and city. The state and city dropdowns are aware of pin codes, so entering the pin first speeds this up.
7. Fill in the bank section. This is the most important block to get right — these details are what the bank export will send money to:
   - Bank name.
   - Account holder name (this is the name as it appears on the bank's records, which may not be the same as the vendor name).
   - Account number, account type (Savings or Current), IFSC code.
   - Branch pin code and branch address.
8. If you have a photo of the PAN card, upload it in the upload box.
9. Click Save. The vendor appears in the list immediately.

If something is missing, the form highlights the field in red and shows a message under it. Fix the field and save again.

## How to add many vendors at once

Use Bulk Add when you have a list of new vendors to onboard in one go — for example, after a season's worth of new venues have been signed up.

1. Click "Bulk Add" at the top of the page.
2. A table opens with one empty row. Fill in the minimum fields for the first vendor: vendor name, vendor type, company type, entity name, contact person, phone, email and PAN.
3. Click the small "+" button to add another row. Repeat for every vendor.
4. If a vendor needs the full details filled in (bank, address, GST), click the small edit icon on that row. The same single-vendor form opens, but already attached to that row. Fill in the rest and save back to the table.
5. Use the trash icon on a row to remove it if you change your mind.
6. When the table looks right, click "Submit All" at the bottom.
7. The system tries to create each vendor one by one. Each row is shown with a green tick if it succeeded or a red cross with the reason if it failed.
8. Fix any failed rows and click Submit again. Successful rows are skipped on the second pass.

## How to edit a vendor

1. Find the vendor on the list using search or filters.
2. Click "Edit" on the vendor's card.
3. The same form used for Add opens, but already filled in.
4. Change what needs changing.
5. Click Save.

If you change a vendor's bank details and there are payments already in flight, the next payment uses the new bank details. Payments that have already been sent to the bank are not affected — they keep the details that were used at the time.

## How to delete a vendor

1. Find the vendor on the list.
2. Click "Delete" on the card.
3. A confirmation popup asks you to confirm.
4. Click OK to delete.

A vendor cannot be deleted if there is a work order or payment request attached to them. The system will refuse and show an error. If the vendor really needs to go, the work orders and payment requests must be cleared first — usually by completing or removing them.

## How to view a vendor's payment statement

The statement is the single most useful screen for finance work. It shows everything the organisation has ever paid this vendor, plus what is pending.

1. Find the vendor on the list.
2. Click "Statement" on the card.
3. A dialog opens with four summary boxes at the top:
   - Total Gross Paid: the total before TDS, across all completed payments.
   - TDS Deducted: the total TDS booked against this vendor.
   - Net Paid: what actually went out of the bank account to the vendor.
   - Pending: amounts raised but not yet paid out.
4. Below the summary, every payment request raised against this vendor is listed in date order, with its status (Issued, Sent to Accounts, Payment Done, Payment Bounced), the work order it belongs to, the gross amount, the TDS, and the net.
5. The TDS records section shows every TDS deduction as a separate row, with the section (for example, 194C) and the month it was booked under. This is the source for the vendor's TDS certificate.

If a payment bounced and was re-raised, the bounced payment stays in the list as a record. The TDS for that disbursement is shown only once, not twice, because TDS is paid to the government only once even when the bank transfer was retried.

## How to use search, filter and sort

- The search box matches as you type. It searches across the vendor name, contact person, email, GST, PAN, entity name, city and state. So typing "Delhi" will surface every vendor based in Delhi, and typing "ABC" will surface a vendor whose contact person is Abc or whose name starts with ABC.
- The Filter button opens a menu showing every vendor type currently in use. Clicking one filters the list to that type. Clicking the same one again clears it.
- The Sort button toggles the order between newest first, oldest first, A to Z, and Z to A.
- Active filters and searches appear as small grey chips below the search bar. Click the small "x" on a chip to remove just that one filter, or click "Clear All" to reset everything.

## Important rules and behaviour

- The vendor name list in the Add form is not free text. The admin team controls which names can be added and under what categories. This is to keep the data clean across the system.
- Account Holder Name and Vendor Name are intentionally separate. The bank cares only about the account holder name. If they do not match, the bank export will fail. Always copy the account holder name exactly from the bank document, not from the vendor's business card.
- PAN and GST verified ticks are visual only. They are a note that someone has checked the documents. The system does not call any government service to verify.
- Deleting a vendor is permanent. The system does not keep an archive of deleted vendors.
- A vendor that has any work order or payment cannot be deleted until those are cleared.

## Common questions

How do I add a vendor type that is not in the dropdown?

The dropdowns are managed under Admin and Configuration. An admin needs to add the new vendor type there first. Once added, it appears for selection here.

The vendor I want is not in the name dropdown. Why?

The same answer: the name list is admin-controlled. Ask the admin to add the vendor name under the right category. Once they do, you can come back and pick it.

I added a vendor but the bank details look wrong on the payment export.

Open the vendor, double-check the account holder name and account number, and re-save. If a payment has already been raised against this vendor, it will still carry the old details. New payments will pick up the corrected ones.

A vendor name appears twice in the list with slightly different spellings. Which one do I use?

Talk to the admin. Two near-duplicate vendor records will cause TDS and payment history to be split between them. The fix is to keep one, move all work orders and payments to it, and delete the other.
