# Bank and TDS

## What this module is

This is where the organisation tracks what happened after a payment batch went out to the bank. Did the transfer go through? Did it bounce? Was TDS deposited with the government for the month? The Bank module is the operational ledger that closes the loop between "we sent it" and "it arrived" (or did not).

It is also where TDS is marked as deposited. TDS deducted from a vendor's payment must be deposited with the government by the 7th of the following month. This module shows the pending TDS for each month and lets the finance team mark it as deposited once the government payment is done.

## Who uses it

Super Admin and Admin. REPs do not see this module.

## Where to find it

Click "Bank and TDS" in the sidebar.

## What you see when you open it

The page has two tabs side by side at the top: Payment Tracking and TDS Deposits.

Above the tabs sit three summary cards:

- Awaiting Confirmation: total net value of payments that have been sent to the bank but not yet marked Done.
- Payments Done: total net value of payments confirmed completed.
- Bounced: count of bounced payments needing attention.

### Payment Tracking tab

A table with one row per payment, showing the payment number, the vendor and their bank details, the amount, the status, and action buttons. Statuses include Sent to Accounts, Payment Done, Payment Bounced.

Action buttons depend on the current status:

- Sent to Accounts: Mark Done, Mark Bounced.
- Payment Done: Locked, but a small status-correction icon lets a Super Admin or Admin reverse a wrong "Done" if needed.
- Payment Bounced: Fix Bank Details (opens an edit dialog to correct and re-submit).

### TDS Deposits tab

A summary list grouped by month. For each month it shows:

- The month label (for example "March 2026").
- The number of TDS records pending for that month.
- The total TDS amount pending for that month.
- A "Mark as Deposited" button.

Below the summary, the full list of individual TDS records is shown — one row per record — with vendor name, section (194C, 194J, etc.), rate, work order, gross amount, TDS amount, status (Pending or Deposited) and the deposit date if applicable. There is also an Export button that downloads all TDS records as a CSV file.

A red or amber notice at the top of the tab tells you how many days remain before the next TDS deposit due date (the 7th of next month).

## Features at a glance

- See all payments sent to the bank in one table, with their current status.
- Mark a sent payment as Done after the bank confirms the transfer.
- Mark a sent payment as Bounced when the transfer fails.
- Open the Fix Bank Details dialog for a bounced payment, correct the account number, IFSC or bank name, and re-submit.
- Correct a mistakenly-marked status (Done back to Sent, etc.) with an audit trail.
- See TDS owed to the government grouped by month.
- Mark a month's TDS as deposited once the government payment has been made.
- Export TDS records to CSV for filing TDS returns.

## How to mark a payment as Done

1. Switch to the Payment Tracking tab.
2. Find the payment in the table. New payments appear at the top, with status "Sent to Accounts".
3. After the bank statement confirms that the transfer went through, click the green tick icon on the row.
4. The status changes to "Payment Done" and a payment date is recorded as today.

## How to mark a payment as Bounced

1. Find the payment in the table.
2. Click the red bounce icon on the row.
3. The status changes to "Payment Bounced" and the work order this payment belonged to moves to the "Bounced — Needs Resolution" section in the Work Orders module.

There is no separate reason field at the point of marking bounced. The reason is captured later, in the Fix Bank Details dialog, when you decide what to do about it.

## How to fix a bounced payment

1. Find the bounced payment in the table.
2. Click the Edit icon (now visible because the status is Bounced).
3. The Fix Bank Details dialog opens with the current bank name, account number and IFSC pre-filled.
4. A red banner at the top of the dialog shows the bounce reason if one was recorded.
5. Correct whichever fields were wrong.
6. Click "Re-submit to Accounts".
7. The payment's bank details are updated and the status moves back to "Sent to Accounts". The work order leaves the Bounced section and returns to Active.

The original TDS record for this payment stays attached and is not duplicated. The vendor's TDS books still show a single deduction, exactly as they should.

## How to correct a wrong status

Sometimes a payment is marked Done when it should have been left Sent, or marked Bounced when in fact the transfer did succeed. The system supports a status correction action.

1. Find the payment in the table.
2. Click the small status-correction icon (visible for Done and Bounced rows).
3. A dialog asks you which status to change it to.
4. Pick the correct status.
5. Confirm.

The change is recorded with timestamp. Use this sparingly — it exists for genuine corrections, not for routine work.

## How to mark TDS as deposited

1. Switch to the TDS Deposits tab.
2. Find the month you have just deposited at the government portal.
3. Look at the summary row for that month: it shows how many records and how much total TDS will be marked.
4. Click "Mark as Deposited".
5. A confirmation dialog appears, asking you to confirm the deposit. Read carefully — this action updates every pending TDS record for that month to "Deposited" with today as the deposited date.
6. Click "Confirm Deposit".
7. The status changes immediately. Vendor statements now show those TDS rows as Deposited with the date.

This action is one-way. You cannot un-deposit TDS from the system. If you marked the wrong month by accident, support intervention will be needed to correct it.

## How to export TDS records

1. On the TDS Deposits tab, click the Export button at the top of the records list.
2. A CSV file downloads to your machine, named with today's date.
3. The CSV contains: TDS ID, vendor name, PAN, section, rate, work order, month, gross, TDS amount, status, deposited date.
4. This file is suitable for filing TDS returns (Form 26Q etc.) — use it as input to your TDS return software or share with the auditor.

## Important rules and behaviour

- A payment cannot be marked Done before it has been sent in a batch. The system enforces this — Done is only available on rows with status "Sent to Accounts".
- TDS records are created when a payment request is created, not when the payment is marked Done. This is because under Indian tax rules, TDS liability arises on the date of invoice or payment, whichever is earlier.
- TDS is grouped by month based on the invoice date of the payment request. Make sure invoice dates are correct in payment requests — a date in the wrong month puts the TDS in the wrong deposit cycle.
- The TDS due date shown at the top of the tab is the 7th of next month. After this date, late deposit may attract interest with the tax department, which is the organisation's responsibility outside the system.

## Common questions

I marked a payment Done by mistake. How do I undo it?

Use the status-correction action on the row. Switch it back to "Sent to Accounts" or the correct state.

The bank statement shows two payments for one of our requests. What happened?

A bounce-and-retry where the first attempt actually did succeed at the bank but the bounce was marked anyway. The reconciliation has to happen offline with the bank; the system can be corrected by setting the correct payment to Done.

TDS for last month was marked Deposited but it was wrong.

The system does not allow un-depositing. The fix is offline: contact the technical team to reset the affected records' status to Pending in the database directly.

I do not see any rows on the Payment Tracking tab.

Either there have been no batches sent yet, or all of them have been completed cleanly (no bounces, all Done). Check the Past Batches section in the Raise Payment page to confirm batches have actually gone out.
