# Work Orders

## What this module is

A work order is a commitment to pay a vendor a specific amount for specific work. Nothing leaves the bank account until a payment request is raised against a work order, but the work order itself is the contract that records the obligation.

Every payment in the system traces back to a work order. The work order tells the system how much was promised, what for, to whom, in how many instalments, with what TDS rate. Once it exists, payments can be raised against it one or many times until the full amount has been paid.

Work orders come in two shapes:

- Fixed: one total amount, paid out across one or many payment requests until cleared.
- Periodic: a recurring amount per period (monthly, quarterly, half-yearly or yearly) over a fixed number of periods. Each period is paid as its own payment request.

## Who uses it

Super Admin and Admin can create, edit and delete work orders. REPs can view work orders that belong to their assigned trials but cannot change anything.

## Where to find it

Click "Work Orders" in the sidebar.

## What you see when you open it

The Work Orders page is organised into three sections that appear in order:

- Active. Work orders that still have money owing and no problems.
- Bounced — Needs Resolution. Work orders where a payment was sent to the bank and bounced. These need attention before anything else can be raised against them.
- Past. Work orders that are fully paid or cancelled. Hidden by default behind a "Show Past" toggle so the active list stays clean.

Each section is laid out as a grid of cards. Each card shows the work order number, vendor name, type (Fixed or Periodic), total amount, amount already paid, status chip, and a Bounced chip if applicable. The card also has action buttons: View, Edit, Delete, Raise Payment, and (for bounced WOs) Remove Bounced.

The top of the page has a search bar (matches vendor name or work order number), filters for type (Fixed/Periodic), service type, payment progress (Unpaid/Partial/Paid) and status, plus a sort dropdown.

## Features at a glance

- Create a Fixed or Periodic work order with full audit detail.
- Auto-generate the work order number based on the vendor's service type and name.
- See all of a vendor's existing work orders while creating a new one (to avoid duplicates).
- Edit work order amounts only as long as no payments have been issued. Once a payment is sent to accounts, the amount becomes permanently locked.
- Edit description, period count and other fields with a controlled unlock when payments have been made but not yet batched.
- Maintain a change log: every meaningful edit is recorded with who made it and when.
- Raise a payment directly from a work order's card.
- See the period breakdown for periodic work orders, including which periods have been paid.
- Filter, sort and export work orders to PDF.

## How to create a new work order

1. Click "Add Work Order".
2. The form opens with a vendor search panel at the top.
3. Use the Service Type and Entity Type filters to narrow the list, then pick the vendor from the dropdown.
4. If this vendor already has other work orders, those are shown in a panel below the picker, with their payment status. This is a deliberate prompt to ask yourself: is this a new piece of work, or should an existing work order be re-used? Click any existing work order to open it. Click "Create New Anyway" to proceed.
5. Once a vendor is locked in, the work order number is auto-generated. You can see it but not edit it.
6. Choose the type:
   - Fixed: enter a single total amount.
   - Periodic: pick a period (Monthly, Quarterly, Half-Yearly, Yearly), enter the amount per period and the number of periods. The system computes the total and asks you to tick a checkbox confirming the total before save.
7. Enter the service description (mandatory, a one or two-line description of what the vendor is doing).
8. Confirm the TDS rate. This pre-fills from the vendor's tdsType field. Add a TDS comment if there is anything to explain (for example "194C — printing services").
9. Click Save.

Before saving, the system checks that the vendor's bank details (bank name, account number, IFSC) are complete. If they are not, save is blocked with a message asking you to fix the vendor first.

## How to edit a work order

1. Find the work order in the list.
2. Click "Edit" on its card.
3. The same form opens, pre-filled.
4. Change what you need to.

Amount editability follows three states:

- Unlocked: no payments yet → amount can be edited freely.
- Partially locked: some payments have been raised but not yet sent to the bank. The amount is locked by default but can be unlocked via a small "Unlock Amount" button. The new amount must be at least equal to what has already been raised.
- Permanently locked: at least one payment has been sent to the bank (status moved to Partially Paid or Fully Paid). The amount cannot be changed under any circumstance. To correct a wrong amount, you would need to cancel and re-create.

This protection exists to keep the books consistent — once money has been moved on the basis of a work order amount, changing that amount retroactively would break reconciliation.

5. Save.

Every change is appended to the work order's change log, with the field name, old value, new value, the user who made the change, and the timestamp.

## How to delete a work order

1. Find it in the list.
2. Click "Delete" on the card.
3. Confirm.

A work order with any payment request attached cannot be deleted. Cancel the payment requests first, or mark the work order as Cancelled instead of deleting.

## How to raise a payment from a work order

1. Find the work order in the list.
2. Click "Raise Payment" on the card.
3. The Payment Request modal opens with this vendor and work order pre-selected. From here you are in the Payment Requests flow — see that chapter for the rest.

The Raise Payment button is disabled when the work order is fully paid.

## How periodic work orders track periods

A periodic work order keeps a list of periods (period 1, period 2, etc.) and marks each as paid or not. The detail view shows this clearly:

- A row per period, with its label (for example "January 2026") and amount.
- A green tick for paid periods.
- An empty circle for unpaid periods.

When raising a payment against a periodic work order, you must pick which period the payment is for. The system prevents picking a period that has already been paid.

## What the bounced section means

A payment that has been sent to the bank and returned (wrong account number, IFSC, name mismatch, etc.) is marked as bounced from the Bank module. The work order it belonged to then appears in the "Bounced — Needs Resolution" section here.

A bounced work order can be resolved in two ways:

- Fix the bank details and re-submit. This happens from the Bank module, not from here. The same payment request is patched with corrected bank details and sent back to accounts. The work order returns to Active automatically.
- Remove. If the work order needs to be abandoned entirely, the "Remove Bounced" button on the card deletes the work order and the bounced payment together. Use with care — this is permanent.

While a work order is in the bounced section, the Raise Payment button still works, but the system knows TDS has already been booked on the bounced payment and does not double-deduct. The Payment Request modal shows a clear note explaining that TDS is already recorded on the earlier attempt.

## Important rules and behaviour

- Work order numbers are auto-generated using a code derived from the vendor's service type and name. They cannot be edited by hand.
- A vendor cannot have a work order raised against them until their bank details are complete.
- TDS rate is read from the vendor at the time the work order is created. If the vendor's TDS rate changes later, existing work orders keep the rate they were created with.
- The change log is append-only. It cannot be edited or cleared.

## Common questions

I clicked Raise Payment but nothing happened.

The button is disabled when the work order is fully paid. The total amount paid equals the work order total, so there is nothing left to raise. Verify by opening the detail view.

I need to change the total amount on a work order but it is locked.

The work order has had at least one payment sent to the bank. The amount is permanently locked. You will need to mark the work order as Cancelled and create a new one with the corrected amount. Any payments already made against the cancelled one remain in the records.

The periodic work order shows the wrong number of periods.

If no period has been paid yet, you can edit it freely. If some periods are already paid, the new number of periods must be at least equal to the count of paid ones. The new total cannot be less than what has already been paid.

The change log is empty.

Either no edits have been made since the work order was created, or the log has not loaded yet. Refresh the detail view.
