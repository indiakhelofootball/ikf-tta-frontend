# Pass 3.1 — Partial-update wipes

**Date:** 2026-08-03 · **Mode:** read-only · **CORE pass**

**Question:** how many fields can be silently wiped by a partial update, and which?

## Answer

**95 writable serializer fields carry a `default=`.** Every one is a latent wipe.

But first, a correction to the plan's premise, because it changes what the fix
must be:

> **The wipe fires on `PUT`, not on `PATCH`.**

DRF's `Field.validate_empty_values` raises `SkipField` when `self.root.partial` is
true. So on a **PATCH**, an omitted field is genuinely omitted and the stored value
survives — defaults are not applied. On a **PUT** (`partial=False`), the default
*is* applied, and the omitted field is written as `''` / `False` / `'Pending'`
over whatever was stored.

This matters because **almost every "Save" button in this app issues a PUT**:
`vendorsAPI.update`, `repAPI.update`, `workOrdersAPI.update`, `trialsAPI.update`,
`paymentRequestsAPI.update`, `trialCitiesAPI.update` and all seven `csrCrud`
resources. 12 PUT call sites vs 7 PATCH in `src/services/api.js`.

The code itself already knows this — `vendors/serializers.py:22–29` says *"A
default turns an omitted field **on a PUT** into a blank that overwrites the
stored image."* The plan's PATCH framing would send you looking in the wrong place.

**Count: 95 fields with a wipe-capable default · 0 firing through the current UI
· 5 already fixed · 6 not sent by any frontend code.**

---

## The honest status: this bug is masked, not fixed

The two incidents you already lived through — REP logos and vendor PAN cards —
were fixed **at the field level, for five fields**, by removing `default=''`:

| Field | Serializer | Status |
|---|---|---|
| `mouDocumentName`, `mouDocumentUrl` | `reps/serializers.py:181–186` | ✅ default removed |
| `repLogoName`, `repLogoUrl` | `reps/serializers.py:187–192` | ✅ default removed |
| `panCardImageName`, `panCardImageUrl` | `vendors/serializers.py:30–35` | ✅ default removed |

Both fixes carry a comment explaining the mechanism, and `REPModal.jsx:508–512`
was correctly changed to *omit* the logo/MOU fields unless a new file is chosen —
serializer and caller fixed together. That is the right way to fix one instance.

**The pattern was not fixed.** 95 fields still have the shape, including
`repLogoLink` — *the third logo field, in the same block, six lines below the two
that were fixed*:

```python
repLogoName = serializers.CharField(source='rep_logo_name', required=False, allow_blank=True)          # fixed
repLogoUrl  = serializers.CharField(source='rep_logo_url',  required=False, allow_blank=True)          # fixed
repLogoLink = serializers.CharField(source='rep_logo_link', required=False, allow_blank=True, default='')  # ← still exposed
```

**This is the exact thing your plan warns about: fixing members while the family
survives.** The family has 95 members.

**Why nothing is firing today:** the current forms send every field on every save
(`VendorModal.jsx:199` spreads all of `formData`; `CSRBrandingPage.jsx:71` spreads
all of `form`; `WorkOrderModal.jsx` builds a complete object). The masking is
accidental — it is a property of the forms, not a guarantee. Any of these breaks
it: a new bulk-edit screen, a mobile client, a script, an integration, someone
"tidying up" a payload to reduce request size — which is *precisely* the
optimisation the REP logo comment says was made, and which caused the incident.

---

## The 95, by app and by what gets destroyed

### The dangerous ones — non-string defaults that reset *state*, not text

These are worse than the blank-out cases, because a blank looks obviously wrong
while `False` and `'Pending'` look like legitimate values.

| Field | File:line | Default | What an omitting PUT does |
|---|---|---|---|
| `status` (Vendor) | `vendors/serializers.py:79` | `'Pending'` | **Reverts an approved vendor to Pending.** No `required=False`, so DRF makes it optional purely because a default exists |
| `panVerified` | `vendors/serializers.py:37` | `False` | **Un-verifies a verified PAN** |
| `gstVerified` | `vendors/serializers.py:36` | `False` | Un-verifies a verified GST |
| `mouStatus` (REP) | `reps/serializers.py:174` | `'Pending'` | **Reverts a signed MOU to Pending** |
| `groundVerified` | `trialcities/serializers.py:15` | `False` | Un-verifies a ground |
| `visibleToClient` (CSR report) | `csr/serializers.py:79` | `False` | **Unpublishes a report from the funder portal** — the funder's document silently vanishes |
| `isActive` (CSR branding) | `csr/serializers.py:169` | `True` | **Re-activates a deliberately disabled white-label brand**, putting a retired funder's login page back online |
| `isMaster` (activity type) | `csr/serializers.py:24` | `False` | Demotes a master catalog entry |
| `isActive` (config option) | `config/serializers.py:13` | `True` | Resurrects a retired dropdown option |
| `websiteNA`/`facebookNA`/`instagramNA`/`telegramNA` | `reps/serializers.py:153–171` | `False` | Flips "not applicable" back to "missing" — silently re-opens compliance gaps on REP social accounts |
| `tdsRate` (WO + PR) | `workorders:52`, `payments:27` | `0` | **Zeroes the TDS rate.** Guarded on PR update (`update()` pops `tds_rate`); *not* guarded on Work Order |
| `numberOfPeriods` | `workorders/serializers.py:61` | `1` | Collapses a periodic WO to one period — partly caught by `validate()`'s `< max_paid_period` check |

`visibleToClient` and `isActive` (branding) are the two most likely to produce a
report you can't explain: a funder emails to say a document disappeared, or a
retired client's branded login is live again.

### The blank-out ones — 74 `default=''` string fields

| App | Count | Notable |
|---|---|---|
| `vendors` | 17 | **all bank details**: `bankName`, `accountNumber`, `ifscCode`, `accountHolderName`, `accountType`, `bankPinCode`, `branchAddress` — plus `gstNumber`, `email`, `address`, `state`, `city` |
| `reps` | 25 | the entire courier address block (`courierAddress`, `courierPinCode`, `courierDistrict`, `courierState`, `courierSubArea`, `courierAcceptingName/Phone`), `groundLocation`, `googleMapLink`, `groundContactName/Phone`, `backupContactName/Phone/Email`, **`repLogoLink`** |
| `courier` | 12 | the `snap*` dispatch-snapshot block |
| `csr` | 6 | `fileName`, `fileUrl` (report link), `logoUrl`, `loginImageUrl`, brand colours |
| `workorders` | 6 | `projectRef`, `projectCity`, `serviceDescription`, **`invoiceDriveLink`**, `tdsComment`, `periodType` |
| `trialcities` | 5 | `region`, `assignedRep`, `groundLocation`, `trialType`, `monthOnly` |
| `config` | 2 | `serviceType`, `entityType` |
| `payments` | 1 | `periodLabel` |

**The single worst blast radius is the vendor bank block.** A PUT that omits
`accountNumber` blanks it — and per Pass 1.3 the bank-file builder writes
`r.accountNumber || ''` with no validation, so the next export ships a row with
an empty beneficiary account. **3.1 and 1.3 chain into one another.**

### The 6 fields no frontend code references at all

Highest latent risk, because nothing masks them and nothing would notice:

`courier.snapDistrict` · `courier.snapCourierState` · `courier.snapSubArea` ·
`courier.snapTrialName` · `trials.assigned_cities` (`ListField(default=list)`) ·
`workorders.isPaid`

Two mitigations, verified: courier updates go through **PATCH** and a hand-written
field loop (`courier/views.py:84–88` only touches `notes` and `items`), so the
`snap*` defaults are unreachable today. `WorkOrderPeriodSerializer` is nested
`read_only=True` at `workorders/serializers.py:90`, so `isPaid` cannot be written
through the WO endpoint — **this is the one that would have been catastrophic**
(it would reset every period's paid flag and let each period be paid again), and
it is closed.

---

## What the user experiences

Nothing. That is the whole problem. There is no error, no toast, no changed
status. A field that had a value has no value, or a flag that was `True` is
`False`. It surfaces days later as *"the vendor's bank details are gone"* or
*"the funder says the report disappeared"*, with no event to correlate it to —
which is exactly how the REP logo bug presented.

---

## ✓ Pass complete

- **Do I have a number?** 95 writable fields with a wipe-capable default; 74
  string blanks, 21 state resets; 5 already fixed; 6 unreferenced by any frontend.
- **Have I seen one with my own eyes?** Yes — `reps/serializers.py:176–194` read
  directly: two fields fixed, one (`repLogoLink`) left with its default, in the
  same block.
- **Do I know what the user experiences?** Yes — silence, then missing data.

**The fix must be the pattern, not the field.** Two shapes worth considering in
Phase E:

1. Make the write endpoints **PATCH-only** (`http_method_names` without `'put'`)
   and change the 12 `PUT` call sites in `api.js`. One change closes all 95 at
   once, because DRF skips defaults on partial updates.
2. Or strip `default=` from every optional field and let absence mean absence —
   which is what the five already-fixed fields do, and what their comments
   recommend.

Option 1 is smaller, reversible, and testable in an afternoon. Whichever you pick,
**do it as one pass across all 95** or the count regenerates.

**Query to find damage that has already happened (read-only):**

```sql
SELECT id, vendor_name, status, pan_verified
FROM vendors_vendor
WHERE account_number = '' OR ifsc_code = '' OR bank_name = '';

SELECT id, file_name, visible_to_client FROM csr_csrreport WHERE visible_to_client = 0;
SELECT id, rep_name FROM reps_rep WHERE rep_logo_link = '' AND rep_logo_url <> '';
```

The third one is the tell: a REP that has a stored logo image but a blank logo
*link* is a row where `repLogoLink` was defaulted away.
