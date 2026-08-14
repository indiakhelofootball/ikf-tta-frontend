# Pass 4.6 — Date & time assumptions

**Date:** 2026-08-03 · **Mode:** read-only

**Question:** which date logic breaks at a boundary?

## Answer

**The whole system runs on UTC while every user is in IST (UTC+05:30)** — so there
is a **5½-hour window every night, 00:00–05:30 IST, in which the application's
"today" is yesterday.** That is 23 % of every day.

Layered on top: the frontend computes bank-file dates in **local** time while
computing payment dates in **UTC**, so the two disagree during exactly that
window. And the TDS due-date banner is wrong by a whole month, always.

**Count: 6 findings (1 high, 2 medium, 3 low). 75 date/time expressions reviewed.**

---

### D-1 · `TIME_ZONE = 'UTC'` with IST users — a 5½-hour "yesterday" window every night — **HIGH**

`settings.py:138–140`:

```python
TIME_ZONE = 'UTC'
USE_TZ = True
```

`USE_TZ = True` is correct — timestamps are stored aware. The problem is every
call to `date.today()`, which resolves against `TIME_ZONE`:

| Site | Code | What goes wrong between 00:00 and 05:30 IST |
|---|---|---|
| `payments/serializers.py:203` | `validated_data['payment_date'] = date.today()` | **A payment marked Done at 02:00 IST on 4 Aug is stamped 3 Aug** |
| `payments/views.py` `mark_deposited` | `deposited_date=date.today()` | **TDS deposited on the 7th at 03:00 IST is recorded as the 6th** |
| `payments/serializers.py:111` | `year = date.today().year` (PR number) | On **1 Jan before 05:30 IST**, new payment requests are numbered `PR-<lastyear>-…` |
| `payments/serializers.py:369` | `year = date.today().year` (batch number) | Same, for `BATCH-<lastyear>-…` |
| `courier/models.py:11` | `year = timezone.now().year` | Same, for shipment numbers |

`date.today()` should be `django.utils.timezone.localdate()`, and `TIME_ZONE`
should be `'Asia/Kolkata'`. Either change alone fixes most of this; both together
is the correct answer.

**The TDS deposit date is the one with an external consequence** — it is the date
you would cite to the tax department, and it can be a day early.

---

### D-2 · The frontend mixes UTC dates and local dates in the same flow — **MEDIUM**

**UTC** (`new Date().toISOString().slice(0, 10)`) — 12 sites, including every
payment date:

| Site | Purpose |
|---|---|
| `bank/BankManagementPage.jsx:183` | `paymentDate` on "Mark Done" |
| `bank/BankManagementPage.jsx:231` | `today` for the TDS deposit |
| `bank/BankManagementPage.jsx:259` | `paymentDate` on status correction |
| `payments/PaymentDetailDialog.jsx:58` | `paymentDate` on save |
| `payments/PaymentRequestModal.jsx:263` | **default `invoiceDate` on a new payment request** |
| `payments/PaymentManagementPage.jsx:97` | `today` for export filenames |
| 6 report/CSV filenames | |

**Local** (`getDate()` / `getMonth()` / `getFullYear()`) — the bank files:

| Site | Purpose |
|---|---|
| `utils/blkpayExcel.js:14` | IDFC `Transaction Date`, `DD/MM/YYYY` |
| `utils/iciciExcel.js:45` | ICICI filename `NPAB_FMT_<DDMMYY>.xlsx` |
| `utils/iciciExcel.js:50` | ICICI `PYMT_DATE`, `DD-MM-YYYY` |

**Between 00:00 and 05:30 IST these disagree by one day.** A batch exported at
03:00 IST on 5 August writes `05/08/2026` into the bank file and stores
`paymentDate = 2026-08-04` in the database. The bank's record and yours differ by
a day, permanently, with no way to tell which is right from the data.

The local-time choice is arguably *correct* for the bank file — IDFC's own
instruction row says *"Should be today's date or future date"*, and IST is ahead
of UTC, so local never goes backwards relative to the bank. **It is the UTC side
that is wrong.** But they must not disagree.

`PaymentRequestModal.jsx:263` deserves separate mention: the default invoice date
on a new payment request is the UTC date, and `invoice_date` is what drives
`TDSRecord.month` (D-4). An early-morning payment request can be filed into the
previous month's TDS.

---

### D-3 · The TDS due-date banner is always one month late — **MEDIUM**

`bank/BankManagementPage.jsx:282–286`:

```js
// TDS due date — 7th of next month
const now = new Date();
const due = new Date(now.getFullYear(), now.getMonth() + 1, 7);
const daysUntilDue = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
```

The comment states the rule correctly — TDS deducted in a month is due by the 7th
of the **following** month. The code computes the 7th of the month following
**today**, not the month following **the pending TDS**.

Worked through, on today's date (3 August 2026):

- Pending TDS is for **July**, due **7 August** — **4 days away.**
- The screen computes `due = 7 September 2026` and displays **35 days**.

The banner is out by a full filing cycle, and it errs toward *less* urgency —
the direction that causes a missed deposit. It will be right only when the
pending TDS happens to be for the current month.

The rollover arithmetic itself is fine — `new Date(2026, 12, 7)` correctly becomes
7 January 2027, so December does not break. The bug is which month it starts from.
It should derive from the pending records' `month` value, which is right there in
`pendingMonths`.

---

### D-4 · TDS month is a formatted string, not a date — **MEDIUM**

`payments/serializers.py:169`:

```python
month_str = pr.invoice_date.strftime('%b %Y')     # "Aug 2026"
```

stored in `TDSRecord.month = CharField(max_length=20)`, and `mark_deposited`
filters on **string equality**: `TDSRecord.objects.filter(month=month, status='Pending')`.

Four consequences:

1. **Months sort alphabetically, not chronologically.** `pendingMonths` at
   `BankManagementPage.jsx:280` is `[...new Set(...)]` in API order with no sort;
   any sort applied later gives *Apr, Aug, Dec, Feb, Jan, Jul, Jun, Mar, May, Nov,
   Oct, Sep*.
2. **The format is locale-dependent.** `%b` is affected by the server locale; a
   locale change would produce values that never match the existing rows, orphaning
   every historical TDS record from its month bucket.
3. **Editing `invoice_date` after creation does not update `month`.** `update()`
   permits `invoiceDate` edits (Pass 1.4) and never touches the `TDSRecord`, so the
   PR and its TDS record silently drift into different months.
4. **There is no financial-year concept.** Indian TDS is filed by FY quarters
   (Apr–Mar). A calendar-month string cannot express Q1 FY2026-27 without
   client-side parsing that does not exist anywhere in this codebase.

A `DateField` for the first of the month, formatted for display only, removes all
four.

---

### D-5 · Every displayed date is `en-IN`-formatted from a UTC value — **LOW**

`toLocaleDateString('en-IN', …)` appears throughout (`BankManagementPage.jsx:32`,
`PaymentManagementPage.jsx:136`, and others). This renders in the **browser's**
timezone, so a `DateField` string like `2026-08-04` parsed via `new Date(d)` is
interpreted as **UTC midnight** and displayed as **05:30 IST on 4 August** —
correct by luck, because IST is ahead. For any user in a timezone behind UTC it
would render as 3 August.

Not a live bug for Indian users. Listed because it is the same UTC/local seam as
D-2, and because it silently breaks if anyone ever uses the app from a
negative-offset timezone.

---

### D-6 · Session and OTP timers are duration-based — mostly fine — **LOW**

- `AuthContext.jsx:92` — `Date.now() - parseInt(loginTime)`, a pure duration.
  Immune to timezone; vulnerable to a user changing the system clock (they can
  extend their own session, which is not a security control anyway — see Pass 4.5,
  S-4).
- `otp/views.py:53,61,80,119` — `timezone.now() ± timedelta`, all aware, all
  correct. **The OTP expiry and cooldown logic is the cleanest date handling in the
  codebase.**
- `setTimeout` for a 7-day "remember me" is within the ~24.8-day `setTimeout`
  ceiling, so it does not silently fire immediately. But timers do not survive
  laptop sleep reliably, so the actual logout time drifts.

---

## ✓ Pass complete

- **Do I have a number?** 6 findings across 75 date/time expressions; 12 UTC-date
  sites vs 3 local-date sites in the same payment flow; a 5.5-hour daily
  divergence window.
- **Have I seen one with my own eyes?** Yes — `settings.py:138–140`,
  `payments/serializers.py:169,203`, `blkpayExcel.js:14` and
  `BankManagementPage.jsx:282–286` read directly.
- **Do I know what the user experiences?** Yes — for D-1/D-2, payments dated a day
  early if entered before 05:30 IST; for D-3, a TDS deadline shown as 35 days away
  when it is 4.

**Cheapest fix with the widest effect:** set `TIME_ZONE = 'Asia/Kolkata'` and
replace `date.today()` with `timezone.localdate()` in the four payment sites. That
closes the nightly window on the server side. Then pick **one** convention for the
frontend — local, to match the bank files — and change the 12 UTC sites to match.

**D-3 is a five-line fix and it is about a statutory deadline.** Do it first.
