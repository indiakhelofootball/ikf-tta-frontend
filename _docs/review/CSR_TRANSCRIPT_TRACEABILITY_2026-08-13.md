# All six transcripts — what was said, and does it stand?

Every requirement statement in the six recordings, traced to the code. Verdicts are marked:

- **STANDS** — verified in the code this pass, with the file cited
- **BROKEN** — built, but does not do what was asked
- **CONTRADICTS** — the code does the opposite of the instruction
- **MISSING** — not built
- **UNVERIFIED** — I did not check it; listed so it is not mistaken for cleared

The four CSR recordings were covered in `CSR_INTENT_VS_BUILD_2026-08-13.md`; they are summarised at
§3. The two TTA recordings — **which contain far more concrete requirements than the CSR ones** —
had never been traced before this pass.

---

## 1. `2026-03-06` — vendor → work order → payment → TDS

The README calls this *"the fullest single spec in existence."* That is accurate: it contains ~26
discrete, checkable instructions, more than all four CSR recordings combined.

### Vendor

| # | What was said | Verdict | Evidence |
|---|---|---|---|
| 1 | *"Remove the PAN from the REP management, because we are giving the PAN in the vendor"* | **STANDS** | no `pan` field anywhere in `reps/models.py` |
| 2 | *"If it is not an individual, then you will ask for the entity name instead of the company name"* | **STANDS** | `entity_name` + `company_type` (`vendors/models.py:32-33`) |
| 3 | *"you will ask for GST number, PAN number, PAN number is mandatory"* | **STANDS** | `gst_number` blank-able; `pan_number = CharField(max_length=10)` — **no `blank=True`, so required** |
| 4 | *"write choose file and put mandatory"* (PAN document) | **STANDS** (as a link) | `pan_card_image_name` + `pan_card_image_url` — external link, per the app-wide convention |
| 5 | *"branch pin, branch address… account type is important, account number, IFSC code"* | **STANDS** | all five present, `vendors/models.py:52-58` |
| 6 | *"while filling the bank details, write in the bracket in front, PAN card is this one"* | **UNVERIFIED** | a form-layout instruction; I did not open `VendorModal` |

### Work order

| # | What was said | Verdict | Evidence |
|---|---|---|---|
| 7 | *"The type in the work order will be one time or periodic"* | **STANDS** | `TYPE_CHOICES = [('Fixed'…), ('Periodic'…)]` |
| 8 | *"if you put the amount in the periodic, then you will write the duration… 90,000 with 15 INTOs"* | **STANDS**, and better than asked | `number_of_periods`, `amount_per_period`, plus a `WorkOrderPeriod` row per period with `is_paid` |
| 9 | *"the contract is fixed at one time… the total value is 1 lakh"* | **STANDS** | `amount` |
| 10 | *"you are putting the description because the service has been typed in it"* | **STANDS** | `service_description` |
| 11 | *"his work order will be put in it. There will be an attachment, a contract"* | **STANDS** | `contract_drive_link`, `invoice_drive_link` |
| 12 | *"you are putting A to Z details in the work order… you are showing the same data here, you are confirming it"* | **UNVERIFIED** | pre-fill-and-confirm is a modal behaviour; not checked |

### **The one that does not stand — TDS type**

He raised this twice, changed his mind mid-sentence, and then settled it explicitly:

> *"TDS type, which you are putting now, I am coming in double mind, but put it now, **not in the
> vendor**… If you want, we can put it in the work type, because **the work type will define again**…
> **But not here. It's better if you do it in the work order.** Yes, that's what I was saying, in the
> work order. **And here TDS type will create confusion.**"*

| # | Instruction | Verdict | Evidence |
|---|---|---|---|
| 13 | Move TDS **type** off the vendor and onto the work order | **CONTRADICTS** | `Vendor.tds_type` still exists (`vendors/models.py:40`) and is still the source of truth |
| 14 | The work order defines the TDS classification | **PARTIAL** | `WorkOrder` got `tds_rate` + `tds_comment` — a **rate**, never a **type** |

And the consequence is live, in the statutory record:

```python
# payments/serializers.py:170
section = pr.vendor.tds_type if pr.vendor.tds_type and pr.vendor.tds_type != 'None' else 'Unknown'
```

`TDSRecord.section` — the legal classification that decides which 194-section row the money is
deposited under — is read **from the vendor**, with a fallback to the literal string `'Unknown'`.

The rate is per-payment (flexible, correct). The **section is per-vendor** — exactly what he said
would "create confusion," for exactly the reason he gave: *the work type defines it*. A vendor who
does contractor work (194C, 1–2%) **and** professional work (194J, 10%) has one vendor-level type,
so every payment to them is classified by whichever was set last. He anticipated this in March and
asked for the fix in the same breath.

Later in the same call he explains why the classification matters:

> *"What happens in Excel sheet is that it is TDS type. Service is different. Contractor is
> different. Different TDS are cut. **Each TDS has to be filled separately.**"*

So the field that groups the monthly deposit sheet is the field that was left in the wrong place.

### Payment request

| # | What was said | Verdict | Evidence |
|---|---|---|---|
| 15 | *"you will not raise the invoice… you will raise the payment request"* | **STANDS** | model is `PaymentRequest`, numbered `PR-2026-nnn` |
| 16 | *"if your name does not have a work order… click here to create a work order"* | **UNVERIFIED** | an affordance in `PaymentRequestModal`; not checked |
| 17 | *"work order amount issued 1 lakh, paid 60,000, 40 remaining to be paid"* | **STANDS** | `WorkOrder.paid_gross_amount`; remainder derived |
| 18 | *"if it is periodic… automatically you will see 10,000, 15,000"* | **STANDS** | `period_number` + `period_label` on the request, `WorkOrderPeriod.amount` |
| 19 | *"Suppose you have 40 left, I will give 30… still pending is 10,000"* (partial with running remainder) | **STANDS** | partial amounts against `paid_gross_amount` |
| 20 | *"payment ID… work order… service provider… vendor name… amount requested… invoice date"* | **STANDS** | all present on `PaymentRequest` |
| 21 | *"there is no meaning of due date here"* / *"there is no need to download here"* | **UNVERIFIED** | absence in a preview UI; not checked |
| 22 | *"the amount to be paid is 27,000 and 3,000 is the TDS amount"* | **STANDS** | `gross_amount`, `tds_rate`, `tds_amount`, `net_amount` |
| 23 | *"save and send to account"* → the bank module | **STANDS** | `PaymentBatch` + `Sent to Accounts` status |
| 24 | *"if the payment is bounced… the option of editing… edit the account and after editing it will match"* | **STANDS**, and extended | `bounce_resolved`, `bounce_resolution`, `bounce_resolved_note/_at/_by` |
| 25 | *"the TDS amount has to be paid once a month… deposit within 1 to 7 days of the next month"* | **BROKEN** | implemented, but the audit verified the due-date banner is **a month late** (`FINDINGS.md`, re-executed against a live date) |
| 26 | *"when the payment is done, TDS will be written deducted in it… in its account statement"* | **STANDS** | `TDSRecord` per payment, `voided` on bounce so a retry books its own |

---

## 2. `2026-05-16` — the payment report and the dashboard

| # | What was said | Verdict | Evidence |
|---|---|---|---|
| 27 | *"primary, then second filter, then third filter… work order wise, vendor wise"* | **STANDS** | vendor search + status + issue + date-range filters, `PaymentAuditReport.jsx:82-186` |
| 28 | *"we will show the date newest and then it will come to the top"* | **STANDS** | `useState('date-desc')` — newest-first is the default |
| 29 | *"This is vendor A to Z"* | **STANDS** | `vendor-asc` / `vendor-desc` column sort |
| 30 | *"If I click on A1 graphics, can you filter in A1 Graphics?"* — *"we will put the filters in it"* | **STANDS** | `searchVendor` |
| 31 | *"If you want to download it from Excel or PDF"* — *"I have given the option to export to CSV"* | **STANDS** | CSV blob export, `:270` |
| 32 | *"But your sum is not coming in total"* | **UNVERIFIED** | I saw no total-row code in the grep, but did not read the render block |
| 33 | *"Month wise, day wise… month wise, project wise"* grouping | **UNVERIFIED** | date-range filtering exists; grouping not confirmed |
| 34 | *"if there are two payments in one day"* / *"Vikram Gore has passed away twice in a day"* | **STANDS** | this sighting became the duplicate-payment flag engine (`flagEngine.js`) — a requirement that was *inferred* from an observation and built |

### The dashboard tiles — **MISSING**

He was specific and repeated it:

> *"Now make a dashboard… you have made a quick action… After that, the reports… make such a
> button… the project report, the finance report, the payment report… If you write so much in the
> report, **it will be a payment audit**… **If you make 6-8 tiles, you will get 8 reports, right?**"*

What is built (`DashboardHome.jsx:317-350`): a "Reports & Assets" panel containing **exactly one
tile — REP Report** — while five report screens exist (`report_social_media`,
`report_payment_audit`, `report_vendor_audit`, `report_trial_spend`, `report_trials`).

**Payment audit — the one he named — has no tile.**

And there is a bug on top of the gap: the panel's outer gate is
`REPORT_KEYS.some((k) => canView(k))`, but the only tile inside is gated on `report_social_media`.
So a user granted **only** the payment-audit report sees the "Reports & Assets" heading render over
**an empty box**.

---

## 3. The four CSR recordings — carried forward

Detailed in `CSR_INTENT_VS_BUILD_2026-08-13.md`. In this scoreboard's terms:

| What was said | Verdict |
|---|---|
| *"Don't make a parallel system — change the routing"* | **STANDS** |
| *"TTA slash CSR, TTA slash client… everything will be routed"* | **STANDS** |
| *"The payment will not be in the CSR"* (separation of duties) | **STANDS** in the grants, **BROKEN** in practice — the certificate operator's payment picker returns 403 and renders empty |
| *"One person will always be unique"* (audit rule) | **STANDS** at the database, **BROKEN** at the API — a duplicate tag is a 500, not a message; no test exercises it |
| *"Until that project is over, there is no need to give them certificates"* | **STANDS** — internal-only, correctly |
| Certificate *"generated at project end"* | **BROKEN** — a live recompute, never frozen, no issuance record |
| *"He doesn't want to show the financials"* / *"RETF partners"* | **MISSING** — no partner role, no partner category, no FK to scope one on |
| Separate funder build (G3) | **MISSING in production** — built, never served |

---

## 4. Scoreboard

| | 03-06 | 05-16 | CSR ×4 | Total |
|---|---|---|---|---|
| **STANDS** | 16 | 6 | 3 | **25** |
| **BROKEN** | 1 | 0 | 3 | **4** |
| **CONTRADICTS / PARTIAL** | 2 | 0 | 0 | **2** |
| **MISSING** | 0 | 1 | 2 | **3** |
| **UNVERIFIED** | 4 | 2 | 0 | **6** |

The large majority of what was asked for **does** stand — and the 03-06 chain in particular was
built faithfully and in places beyond what was asked (period rows, bounce-resolution audit trail,
TDS voiding on bounce). That call was heard properly.

---

## 5. The three that matter

**1. TDS type is on the vendor, and he told you twice to move it.** It is the only outright
*contradiction* in six recordings, it sits in a statutory record, it silently writes `'Unknown'`
when unset, and the reason he gave for moving it — that the work type defines it — is precisely the
failure mode a multi-service vendor produces. Of everything in this document, this is the one with
a legal consequence outside the product.

**2. The payment-audit tile he asked for by name does not exist**, and the panel that should hold
it renders empty for anyone granted only that report.

**3. The two CSR rules he stated as absolute are enforced by crashes**, not by the product speaking:
duplicate tagging is a 500, and the operator who is supposed to do the tagging cannot see a single
payment.

Everything else is either built, built better than specified, or honestly unverified above.
