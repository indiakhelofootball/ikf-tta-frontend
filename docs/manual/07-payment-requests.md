# Payment Requests

## What this module is

A payment request is the document that says "send this much money to this vendor against this work order on this date". It is the unit of payment in the system. Every actual bank transfer in the organisation starts as a payment request raised here.

The module sits between Work Orders (which capture the commitment) and the Bank module (which tracks what actually moved). On this page you raise new payment requests, you bundle several together and send them to the bank as a batch, and you keep a record of every batch that has gone out.

## Who uses it

Super Admin and Admin can raise payments and send batches. REPs can only view payment status of work orders they are assigned to.

## Where to find it

Click "Raise Payment" in the sidebar.

## What you see when you open it

The page has three logical zones, top to bottom:

- A row of summary cards at the very top showing total gross of active (not yet sent) payments and total net.
- The Active payments table — payment requests that have been created but not yet sent to the bank as a batch. This is where the day-to-day work happens.
- A "Past Batches" section, collapsible, listing every batch that has been sent, with date, file name, totals and a click-to-expand list of what was in it.

At the top right of the page sit two buttons: "Raise New Payment" and "Send to Payment" (the second one activates once the active table has rows).

## Features at a glance

- Raise a new payment request against any work order in a multi-step modal.
- See TDS computed automatically based on the work order's TDS rate.
- See running totals of how much is queued.
- Send queued payments to the bank as a single batch, in either IDFC BLKPAY format or ICICI format.
- Receive an Excel file ready to upload to the bank's bulk-payment portal.
- Receive a parallel "full details" Excel for internal records, plus a PDF receipt of the batch.
- See every past batch with its contents, totals and the date it was sent.
- Edit or delete an active payment request before it has been sent.
- Re-raise a payment for a bounced work order without double-deducting TDS, with a clear visual cue in the modal.

## How to raise a new payment

1. Click "Raise New Payment".
2. The modal opens. It is a three-step flow: details, preview, confirm.

Step 1 — details:

3. The first picker is the vendor. Pick the vendor from the dropdown. Only vendors with at least one open work order appear here.
4. The next picker shows work orders for that vendor. Pick the one you are paying against. The work order's basic info (number, service description, project reference, total amount, amount remaining) is shown for sanity-check.
5. If the work order is Periodic, a "Period" picker appears. Pick the period you are paying. Periods that have already been paid are hidden.
6. Enter the gross amount you are paying in this request. For a Periodic work order, the amount auto-fills with the period's amount. For Fixed, you type it.
7. Enter the invoice date.
8. The "TDS Breakdown" panel below updates live:
   - Gross amount.
   - TDS deduction (rate from the work order × gross).
   - Amount to be paid to vendor (net).
9. A balance line says how much will still be owing after this payment, in green if it fully clears the work order, in amber if anything is still pending.
10. Add notes or remarks if relevant.

If the work order has a bounced payment from a prior attempt for the same period or amount, a blue information banner appears at the top of this step explaining that TDS has already been deducted on the earlier bounced payment and will not be recorded again. The TDS row is shown for record continuity, but no new TDS record is created in the books. Confirm and proceed.

11. Click "Next".

Step 2 — preview:

12. The system shows you the full request with vendor bank details, work order info, financial summary (gross / TDS / net), and the balance impact on the work order.
13. Read it carefully. Once sent to accounts, the request is locked.
14. Click "Submit Payment Request" to save.

The new payment request now appears in the Active payments table on the main page.

## How to edit an active payment request

1. Find the request in the Active table.
2. Click the Edit icon at the end of its row.
3. The same modal opens, pre-filled.
4. Make changes.
5. Save.

Editing is only possible until the request is sent to the bank as part of a batch. After that, edits are blocked.

## How to delete an active payment request

1. Find the request in the Active table.
2. Click the Delete icon at the end of its row.
3. Confirm.

Like edit, delete is only possible while the request is still Active.

## How to send queued payments to the bank

This is the step where the bank actually gets told to move money. It happens in batches because banks expect bulk-payment files, not one transfer at a time.

1. Make sure every payment request in the Active table is correct. Once a batch is sent, it cannot be undone from inside the system.
2. Click "Send to Payment" at the top right.
3. A "Pick a bank" dialog opens with two options: IDFC FIRST (BLKPAY format) and ICICI.
4. Pick the bank that the organisation will use to make these transfers.
5. The system generates two files:
   - The bank format file (IDFC BLKPAY or ICICI), formatted exactly to the bank's expected layout. This is the file you upload to the bank's portal.
   - A "Payment Details" Excel for internal use, with all the supporting information (vendor name, work order number, gross, TDS, net, invoice date, notes).
6. Both files download to your machine.
7. A new past-batch entry appears at the bottom of the page, dated today, with the file name and totals.
8. Every payment request that was in the batch is removed from the Active table and now shows in the Bank module as "Sent to Accounts".

## How to view past batches

1. Scroll to the bottom of the page.
2. Click the chevron next to "Past Batches" to expand the section.
3. Each batch is shown as a row with date, file name, total payments, total gross, total TDS and total net.
4. Click any batch row to expand it. The full list of payment requests inside that batch is shown.
5. The Download icon on the batch row generates a PDF receipt of the batch (useful for filing or sharing).

## What happens after sending

Once a payment is sent in a batch, the next chapter (Bank module) takes over. The bank module is where someone marks payments as Done after the bank confirms them, or marks them Bounced if the transfer failed.

## Important rules and behaviour

- TDS is calculated from the work order's TDS rate at the time the payment request is raised. The rate is locked into the request and does not change later, even if the work order's TDS rate is edited afterwards.
- A payment request cannot have a gross amount greater than the work order's remaining balance.
- A payment request cannot be raised on a period of a periodic work order that is already paid.
- The bank format files (IDFC BLKPAY and ICICI) are generated to a strict layout. Do not edit them before uploading to the bank — the bank's portal will reject any column shift.
- The PDF receipt is for internal use. It is not a bank document.

## Common questions

The dropdown for work orders is empty for the vendor I picked.

Either the vendor has no work orders, or all their work orders are fully paid. Open the Work Orders module to confirm.

I made a mistake on a payment, but it is already in a batch.

Open the Bank module. If the payment has not yet been marked Done, you can correct its status via the status correction action. If it has been marked Done, you cannot edit it — the only way to correct a wrong Done payment is via the bank statement reconciliation process offline.

I do not see the IDFC option when sending.

The bank picker shows whichever banks the organisation has set up to use. If only one is configured, that one is auto-selected.

Why is TDS shown in the modal even when the banner says "already deducted"?

The TDS row stays visible because the payment request is a record of what is being attempted, mirroring the original bounced attempt. The system suppresses creation of a duplicate TDS record in the books but keeps the gross/TDS/net display so the document is internally consistent with the original.
