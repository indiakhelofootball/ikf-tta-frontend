# CSR claims — independently verified at source

Every claim from `CSR_LIVE_RUN_ASSESSMENT_2026-08-15.md`, `CSR_DOCS_VS_BUILD_2026-08-13.md`,
`CSR_TRANSCRIPT_TRACEABILITY_2026-08-13.md` and `CSR_INTENT_VS_BUILD_2026-08-13.md` §F1, re-checked
against code on 2026-08-15 by a session that had **not** made them. Nothing accepted on report.

## Confirmed — exact, no qualification

| # | Claim | Evidence |
|---|---|---|
| 1 | Blank dashboard is structural, not a load accident | `DashboardHome.jsx` `getStatCards()` filters `canView(stat.module)` over exactly `trials, reps, vendors, workorders, payments` — **no `csr` entry** |
| 2 | `pageTitles` gap is 12+ routes, not 5 | `DashboardLayout.jsx:11-20` maps **8** paths; missing `/vendors`, `/work-orders`, `/bank-tds`, `/reports`, `/courier`, `/user-management`, `/admin`, `/request-access` **and** all `/csr*` |
| 3 | White-label contrast bug is an implementation deviation | `clientTheme.js:17` — `{ ...muiTheme.palette.primary, main: brand.primaryColor }`. `CSR_CLIENT_PORTAL.md` §3 specified a bare `{ main }`. The spread is the bug |
| 4 | `CSRActivity` cannot record who delivered an activity | Fields are `project, activity_type, linked_trial, title, date, start_date, end_date, location, status, created_at`. **No vendor FK, no REP FK** |
| 5 | Third upload surface absent | `CSRProject` has `description` (TextField) and no document field |
| 6 | "Deliverables" never existed | `grep -rin deliverable` over the whole backend → **zero hits** |
| 7 | ADMIN does not bypass `ModulePermission` | `enforcement.py` — only `is_super_admin(user)` returns `True` |
| 8 | TDS *type* is on the wrong model | `vendors/models.py:40` `tds_type`; `workorders/models.py:39` `tds_rate`. `payments/serializers.py:170` sets `TDSRecord.section = pr.vendor.tds_type … else 'Unknown'` |
| 9 | E2 was met in E2E authoring and written off | `csr-operator.spec.js:2` actor is `role ADMIN, grants csr + csr_certificate`; `:149-150` comment *"Modal defaults to 'Link a payment'; switch to manual so the Amount field renders."* |
| 10 | D1 mechanism | `csr/serializers.py:108` declares `paymentId` explicitly → drops DRF's `UniqueValidator` on the `OneToOneField` at `csr/models.py:106`. IntegrityError surfaces as 500 |
| 11 | 85 seconds of unheard audio | `CSR_INTENT_VS_BUILD` §F1 — ffprobe 543.3 s vs 458.3 s at identical 131 kbps; tail peaks −5.4 dB / −9.1 dB |

## Confirmed and UPGRADED — the open question is now closed

**The "REP chip" IS a product defect.** `CSR_LIVE_RUN_ASSESSMENT` §1 correctly refused to classify it
without checking User Management, and listed that check as action #5. **Check done:**

- `PermissionsManagementPage.jsx:31` — `emptyUserForm = { …, role: 'REP' }`
- `:501-502` — the only role control is a `Switch`: `checked={createForm.role === 'SUPER_ADMIN'}`,
  `onChange → 'SUPER_ADMIN' : 'REP'`

**Binary. There is no way to create an `ADMIN` through the product at all.** So every CSR operator
onboarded via the UI is a `REP` and will see "REP" on screen, and anyone needing more than REP is
given `SUPER_ADMIN` — who bypasses `ModulePermission` entirely. That is the mechanism by which a
delete button 403-ing for every real user goes unnoticed by the person most likely to click it.

## NEW — falls out of joining claims 7, 9 and the check above

**The E2E suite's actor is a user type the product cannot create.** `csr-operator.spec.js` runs as
`role ADMIN`. User Management can only produce `REP` or `SUPER_ADMIN`. So the suite's 9 operator
scenarios are executed by an account that no admin could onboard — sitting in the one gap between
"bypasses everything" and "the role real operators actually get."

The two throwaway accounts used in the 08-15 live run (`csronly@demo.com`, `csrcert@demo.com`, both
`role REP`) were, unintentionally, the **realistic** actors. That is why they surfaced E1/E2 as
failures where the committed suite had absorbed E2 as a UI quirk.

## Confirmed but IMPRECISE as stated — corrected here

**"Across 51 unit tests and 17 E2E scenarios, not one test ever links a real `PaymentRequest`."**

Counts are 54 `def test_` in `csr/tests.py` and 15 `test(` across the two spec files. More
importantly one test *does* link a real payment — `csr/tests.py:524`,
`CSRExpenseTag.objects.create(project=…, payment=pr, …)` — added in the 2026-08-13
`certificate_rules` work.

But it goes through the **ORM**, bypassing the serializer. The accurate statement is stronger and
narrower:

> `paymentId` appears **exactly once** in 54 CSR tests — `csr/tests.py:174`, and only as a field
> name inside a *forbidden-fields* leak assertion. **No test ever POSTs a payment-linked expense tag
> through the API.** The serializer's payment path — which is precisely where D1 lives — has zero
> coverage.

So the conclusion holds and the reason is sharper: it is not that payments are untested, it is that
the *write path the audit rule guards* is untested.

## Method note — why the 85-second claim was wrong twice

Both the original README and the 2026-08-15 session "verified" the 06-27 re-send claim by diffing
**transcripts** and finding a hallucinated tail. That proves the *transcription* failed; it says
nothing about the *audio*. Only `ffprobe` on the waveform settled it. **When the artefact under test
is derived, checking the artefact is not checking the claim.** Both `_docs/requirements/README.md`
and the `primary-requirements-source` memory have been corrected.
