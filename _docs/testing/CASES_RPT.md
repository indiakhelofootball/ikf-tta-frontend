# Reports module — TC-RPT-03, 05, 06, 07

Code-only verification against the working tree (uncommitted changes included),
plus read-only queries against the local dev API. No writes. 2026-08-21.

Live payload used as evidence: `GET /api/reports/trials/` on localhost:8000,
2 REPs / 4 trials in the dev DB.

---

## TC-RPT-03 — "Trials Report shows the reporting time" — CONFIRMED (not built)

`reportingTime` is **absent from both** the on-screen table and both export
builders. It is not merely unrendered — it is never carried onto the row object.

- Row shape: `TrialsReport.jsx:231-272`. The object pushed per (trial, city)
  carries `location`, `physicalAddress`, `googleMapLink`, `groundPinCode`,
  `month`, `date`, `confirmed`, `reps`, `assigned`. No time field.
- Join map: `TrialsReport.jsx:162-189`. `repsByTrialCity` copies
  `physicalAddress`, `googleMapLink`, `groundLocation`, `groundPinCode` off the
  assignment. `reportingTime` is not read.
- On-screen header: `TrialsReport.jsx:552` —
  `['Project','Season','State','City','Address','Date','Map','REP','Status']`.
  No time column. (Also no Venue column — that is TC-RPT-01/02, already
  confirmed live.)
- Excel columns: `TrialsReport.jsx:356-368` — 11 columns, no time.
- CSV header: `TrialsReport.jsx:377` — same 11, no time.
- Grep for `reportingTime` across `src/`: only `REPModal.jsx:1211`
  (the input), `REPDetailView.jsx:209`, `SocialMediaReport.jsx:237`. Zero hits
  in `TrialsReport.jsx`.

The data is available and reaching the browser — it is simply unused:
- `reps/models.py:94` `reporting_time = CharField(max_length=20, blank=True)`
- `reps/serializers.py:52-53, 73` exposes it as `reportingTime` on the
  assignment.
- `reports/views.py:116-124` `trials_report` returns `_reps(ctx)`, the same
  serializer.
- Measured on the live endpoint: the Kota assignment comes back as
  `{'city': 'Kota', 'reportingTime': '', ...}` — key present, value empty.

Adding the column is a display change only; no migration, no new input.

---

## TC-RPT-05 — "A town appears once per project" — CONFIRMED (known defect)

The report render path does **no dedup at any of its four stages**.

- Rows: `TrialsReport.jsx:228` — `(t.assignedCities || []).forEach(...)` pushes
  one row per array element. No `Set`, no key collapse, no name grouping.
- Table render: `TrialsReport.jsx:565-566` — `filteredRows.map((r, i))` with
  `key={`${r.trialId}-${r.city}-${i}`}`. The array index in the key is what
  keeps React from complaining about the duplicate, so two identical town rows
  render side by side without warning.
- Month matrix: `TrialsReport.jsx:325-327` — `counts[projectName][month] += 1`
  per row, so a duplicated town counts twice in the matrix and in
  `colTotals`/`grandTotal`.
- Stat cards: `TrialsReport.jsx:339` — `cities: rows.length`, i.e. the raw row
  count. A duplicated town inflates TRIAL CITIES by one.

Source of the duplicate confirmed at the backend: `trials/views.py:119-120`,
`add_city` rejects only on `city_code`:
`if trial.cities.filter(city_code=city_code).exists()`. There is no uniqueness
test on `city_name`, so two rows with the same town name under different codes
are accepted — the TC-PRJ-04 mechanism.

Secondary effect worth knowing: `repsByTrialCity` is keyed on
`` `${trialId}||${norm(city)}` `` (`TrialsReport.jsx:165`), i.e. on the town
*name*, not the code. So duplicate town rows both resolve to the **same**
assignment entry — the same REP, address and map link print twice, which is why
the duplicate reads as a rendering bug rather than as two distinct records.

Not live-reproduced: the dev DB currently holds no duplicate-name city on any
of its 4 trials (checked every `assignedCities` list on the live payload).
Creating one would mean writing trials/cities, which this session is barred
from. The verdict above is from the code path, which is unambiguous.

---

## TC-RPT-06 — "Export columns line up with headers" — CONFIRMED with one exception

Both guards are real and both throw.

- `src/utils/csv.js:31-36`. Width is taken from row 0 (the header);
  `rows.findIndex((r) => !Array.isArray(r) || r.length !== width)` and a
  `throw new Error(...)` on any hit. Runs inside `buildCSV`, which `csvBlob`
  (`csv.js:40-42`) is the only wrapper for — no caller builds its own blob.
- `src/utils/reportExcel.js:196-202`. Same test against `cols.length`, thrown
  before the workbook is created, so a mismatched export produces nothing
  rather than a shifted sheet.

All call sites, header width vs row width, counted by hand:

| Call site | Path | Header | Row | Guarded |
|---|---|---|---|---|
| Trials — Excel | `TrialsReport.jsx:356-373` | 11 | 11 | yes |
| Trials — CSV | `TrialsReport.jsx:377-383` | 11 | 11 | yes |
| Vendor Audit — Excel | `VendorAuditReport.jsx:250-278` | 13 | 13 | yes |
| Vendor Audit — CSV | `VendorAuditReport.jsx:281-299` | 13 | 13 | yes |
| Trial Spend — Excel | `TrialSpendReport.jsx:201-225` | 13 | 13 | yes |
| Trial Spend — CSV | `TrialSpendReport.jsx:228-236` | 13 | 13 | yes |
| Payment Audit — CSV | `PaymentAuditReport.jsx:302-308` | 11 (`EXPORT_HEADERS`, `:45-48`) | 11 | yes |
| TDS summary — CSV | `BankManagementPage.jsx:132-141` | 11 | 11 | yes |
| **Payment Audit — Excel** | `PaymentAuditReport.jsx:316-372` | 11 | 11 | **NO** |

**The exception:** `PaymentAuditReport`'s `exportExcel` does not use
`buildReportWorkbook` at all. It instantiates `new ExcelJS.Workbook()` directly
(`:322`) and hand-writes rows with `ws.addRow([...])` (`:338-352`), so the
`reportExcel.js` shape guard never runs on it. Its widths do currently match —
11 `EXPORT_HEADERS`, 11 values per row, and the totals row at `:367-371` is also
11 — so the export is correct today, but it is correct by hand-count and nothing
would catch a future edit that added a header without a value. The comment in
`reportExcel.js:1-10` says the writer was "extracted from PaymentAuditReport's
exportExcel"; the extraction happened but the original was never repointed at it.

Verdict for the case as written (columns line up, no shifted cells): **passes on
every export.** The guard covers 8 of the 9 paths; the ninth is aligned but
unprotected.

Also note the `csvBlob` BOM (`csv.js:12, 41`) is what keeps rupee symbols and
accented town names readable when Excel opens the .csv on a non-UTF-8 Windows
locale — relevant to the same case's "no garbled cells" reading.

---

## TC-RPT-07 — "Venue and Address differ on the export" — CONFIRMED, and the PIN regression is CONFIRMED

Two separate answers, as asked.

### Venue vs Address: they now differ. The case passes.

The uncommitted hunk at `TrialsReport.jsx:260` reduces the Venue source to:

```js
location: (assignment && assignment.groundLocation) || c.groundLocation || '',
```

The committed version (`git diff`, same block) had a third fallback,
`|| (assignment ? assignment.physicalAddress : '')`. Since `Address` is
`addressOf(r)` built from that same `physicalAddress` (`:72-110`, `:264`,
`:278`), the old fallback made Venue and Address print the same text on every
row whose `groundLocation` was blank. Removing it is what fixes the case.

Measured on the live Kota assignment
(`groundLocation: 'Nehru Stadium'`, `physicalAddress: 'Nehru Stadium Road, Kota'`):
Venue renders `Nehru Stadium`, Address renders the physical address plus the
state — genuinely different strings. Under the committed code they would have
been identical on any row without a `groundLocation`.

Side correction: the long comment at `:246-259` claims both `groundLocation`
sources are unwritable — "add_city hardcodes it to ''" and "REPModal renders no
input bound to it". **Both halves are now stale.** `trials/views.py:133` reads
`ground_location=data.get('groundLocation', '') or ''`, and
`REPModal.jsx:1236-1237` renders a `groundLocation` input on the ground section.
The live Kota row carries `groundLocation: 'Nehru Stadium'`, which is the proof.
The Venue column is not permanently empty as the comment asserts. The comment
should be corrected, not the code.

### The PIN: the hunk blanks it. The main session's flag is correct.

`TrialsReport.jsx:185`, uncommitted:

```js
if (!entry.groundPinCode && a.groundPinCode) entry.groundPinCode = a.groundPinCode;
```

replacing the committed:

```js
if (!entry.groundPinCode && (a.groundPinCode || a.pinCode)) {
  entry.groundPinCode = a.groundPinCode || a.pinCode;
}
```

`groundPinCode` is the only remaining source. `addressOf` appends the PIN at
`:107-108` — with the source empty, no PIN is ever appended, so the Address
column loses its final component on every row whose assignment has only a
personal `pinCode`.

Measured, dev DB, 2 assignments:
- Kota — `groundPinCode: ''`, `pinCode: '324001'`. Under the committed code the
  address ends `- 324001`; under the uncommitted code it ends at the state. PIN
  lost.
- Thane — both empty. No change.

So 1 of the 2 live assignments regresses, which matches the shape of the main
session's production figure (51 assignments with a `pinCode` and no
`groundPinCode`). Not verified against production data from here — dev DB only.

The reasoning in the replacement comment (`:178-185`) is sound on its own terms:
`pinCode` is the REP's personal PIN and pasting it onto a ground address in a
different state produces a confident wrong answer. But the fix as written trades
a sometimes-wrong PIN for an always-absent one, and `groundPinCode` has no
populated rows to replace it with. `REPModal.jsx:1211`-adjacent ground section
does bind `groundPinCode` (it appears in the assignment defaults at `:92`,
`:231`, `:570`), so the field is reachable — it is simply unpopulated on the
existing data, which no code change fixes.

**Verdict: TC-RPT-07 as stated passes. The same hunk introduces a separate,
unrelated regression in the PIN column that the case does not cover.**

---

## Not covered here

TC-RPT-01/02 and TC-RPT-04 were live-verified in `LIVE_RUN_2026-08-21.md` and
are not re-examined.
