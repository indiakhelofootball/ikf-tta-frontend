# Code verification — 7 bug-fix claims (read-only, 2026-09-08)

Branch `deploy/courier-fix`. No files modified.

---

## Claim 1 — add-city writes nothing to the REP org row — **TRUE**

`tta_backend/backend/reps/serializers.py:270-293`

```
270  if existing:
...   # long comment: "ADD-CITY DOES NOT WRITE THE ORG. Not one field."
293      rep = existing
294  else:
295      rep = super().create(validated_data)
```

The `existing` branch contains exactly one statement, `rep = existing`. No `setattr`, no
`.save()`, no `super().create`. The only writes after that are to `REPCityAssignment`
(`serializers.py:319-336`) — the city layer, which is correct.

Other write paths to REP org fields (backend):
- `REPSerializer.create()` new-org branch — `serializers.py:295`
- `REPSerializer.update()` — `serializers.py:340-361`, with the `_submitted_attrs()` filter at
  `356-359` dropping keys the caller never sent.
- `REPViewSet` (`reps/views.py`) has no other write action; `add_assignment` (172) and
  `manage_assignment` (198) both write only `REPCityAssignment`.
- `reps/admin.py:11-17` — `REPAdmin` declares no `fields`/`readonly_fields` beyond timestamps,
  so a Django-admin superuser edits every org field directly, bypassing the serializer. Expected
  for admin, but it *is* a second door.
- Management commands write assignments only: `audit_orphan_assignments.py:106`
  (`save(update_fields=['trial'])`), `backfill_courier_location.py:92`
  (`save(update_fields=['courier_district','courier_state'])`).
- **`config/views.py:84`** — `REP.objects.filter(season=old_value).update(season=new_value)`.
  A bulk ORM write to an org field (`season`) that never passes through `REPSerializer`.
  Not one of the fields named in the brief, but it is a genuine second door on the org layer.

No management command, import, or viewset action writes `rep_logo_url`, `rep_logo_link`,
`mou_document_url`, `mou_document_name`, `contact_name`, `phone`, or `email`
(grep over `--include=*.py`, non-test, non-migration hits are only `reps/models.py:37-43`).

---

## Claim 2 — add-city form sends no org fields — **TRUE**

`src/components/rep/repMergePayload.js:37-47`

```
37  const IDENTITY = ['repName'];
39  export const buildAddModePayload = (orgData, existingRep) => {
42    if (existingRep) {
44      return Object.fromEntries(IDENTITY.filter((k) => k in data).map(...));
```

Only `repName` survives. `REPModal.jsx:576-580` calls it and gates the file fields:

```
576  const repData = buildAddModePayload(orgData, existingRep);
577  if (!existingRep) {
578    if (mouDocument) { repData.mouDocumentName = ...; repData.mouDocumentUrl = ...; }
579    if (repLogo)     { repData.repLogoName = ...;     repData.repLogoUrl = ...; }
580  }
```

The three org-layer inputs are disabled on the add-city path:
- MoU upload button — `REPModal.jsx:1377` `disabled={saving || !canFillForm || (!isEditMode && !!existingRep)}`
- REP logo upload button — `REPModal.jsx:1400` (same expression)
- "Original logo link (optional)" TextField — `REPModal.jsx:1419` (same expression)

Same guard also on contact/social/mouStatus fields at 1324, 1331, 1338, 1350, 1357, 1364, 1436, 1459.

**Note (not a defect):** if the name lookup has not resolved, `existingRep` is `null`
(`REPModal.jsx:133`, set from the search at `:309`) and the full org payload goes on the wire.
The backend still protects it — `serializers.py:270` matches by name and ignores the body.
Defence in depth holds.

---

## Claim 3 — edit screen PUTs the org only when an org field changed — **TRUE**

`src/components/rep/repEditPayload.js:58-69`

```
63  const touched = orgDiffers(orgData, baseline)
64    || !!mouDocument || !!repLogo || mouCleared || logoCleared;
69  if (!touched) return null;
```

`orgDiffers` (`:40-48`) compares the form against the baseline snapshot.
`REPModal.jsx:554-558` supplies `orgBaselineRef.current`, seeded on open at `REPModal.jsx:226-245`
(non-null only in edit mode; `null` in add mode at `:245`).

`REPManagementPage.jsx:201-218` handles the null:

```
209  if (repData) {
210    await repAPI.update(editingREP.id, repData);
211    showToast('REP updated successfully');
212  } else {
213    showToast('Saved');
214  }
```

No PUT is issued for a null payload. The "Assign New Trial" panel saves separately through
`repAPI.addAssignment` at `REPModal.jsx:534` *before* the payload is built.

---

## Claim 4 — trash icons actually remove the stored file — **TRUE**

Handlers:
- MoU — `REPModal.jsx:1387` `onClick={() => { setMouDocument(null); setMouDocumentPreview(null); setMouCleared(true); }}`
- Logo — `REPModal.jsx:1408` `onClick={() => { setRepLogo(null); setRepLogoPreview(null); setLogoCleared(true); }}`

Reaches the payload builder — `REPModal.jsx:554-558` passes `{ mou: mouCleared, logo: logoCleared }`.
`repEditPayload.js:60-61, 78-88`:

```
60  const mouCleared = !!cleared.mou && !mouDocument;
78  } else if (mouCleared) { payload.mouDocumentName = ''; payload.mouDocumentUrl = ''; }
86  } else if (logoCleared) { payload.repLogoName = '';    payload.repLogoUrl = ''; }
```

Server honours the explicit blank: `mouDocumentUrl`/`repLogoUrl` are declared
`allow_blank=True` with **no** `default` (`serializers.py:181-192`), so a present key clears and
an absent key is preserved by `_submitted_attrs()` (`:356-359`).

Flag-reset checked (this was the obvious second door): both flags are reset on every open —
`REPModal.jsx:205-207`:

```
205  if (!open) return;
206  setMouCleared(false);
207  setLogoCleared(false);
```

The modal is mounted permanently (`REPManagementPage.jsx:677-682`, `open={modalOpen}`), so
without that reset a clear would have leaked into the next REP. It does not.

**Minor, non-data bug found while checking:** `REPModal.jsx:242-243` sets the preview only when
the record has one —

```
242  if (editingREP.mouDocumentUrl) setMouDocumentPreview(editingREP.mouDocumentUrl);
243  if (editingREP.repLogoUrl) setRepLogoPreview(editingREP.repLogoUrl);
```

— with no `else` clearing them (the reset at `:255-256` is inside the **add-mode** branch only).
Opening REP A (has a logo) then REP B (has none) shows A's logo in B's form. It cannot write:
`repLogo` is null and `logoCleared` false, so the fields are omitted. Cosmetic, but it is a
stale-preview door, and if the operator presses trash on that phantom preview the payload sends
`repLogoUrl: ''` for REP B — a harmless no-op today (B has none) but the wrong mental model.

---

## Claim 5 — Trials Report per-state REP, no blanking on ordinary data — **TRUE**

`src/components/reports/trialsReportJoin.js:129-133`

```
129  export function resolveAssignment(index, trialId, city, state) {
130    const lk = looseKey(trialId, city);
131    if (!index.ambiguous.has(lk)) return index.byLoose.get(lk);
132    return index.byExact.get(exactKey(trialId, city, state));
133  }
```

`ambiguous` is built **only** from duplicate city names within a trial
(`:84-98`: `trialNameCounts` incremented per `assignedCities` entry; `count > 1` → ambiguous).
State is not part of the ambiguity test. So when a project lists a city name once, line 131
returns `byLoose`, which merges **every** assignment for that `(trialId, city)` regardless of
state (`:104-110` — every assignment is absorbed into both buckets). Behaviour is byte-identical
to the old name-only join for that case, blank or misspelt state included. Verified.

`absorb` (`:48-62`) also keeps the `groundPinCode || pinCode` fallback at `:59-61`, so PINs are
not blanked.

Exports use the same rows as the table:
- Table — `TrialsReport.jsx:542, 549` (`filteredRows`)
- Excel — `TrialsReport.jsx:329-346` (`rows: filteredRows.map(...)`, `summary` at `:332`)
- CSV — `TrialsReport.jsx:353-355` (`filteredRows.map(...)`)
- Stats/matrix — `:297-319`, all off `filteredRows`

Join is called at `TrialsReport.jsx:212` with `(cityIndex, t.id, c.cityName, c.state)`; the index
is built at `:171`.

---

## Claim 6 — slip never prints an untyped item name — **TRUE**

`src/components/courier/courierSlipRows.js:53-71`

```
58  CONTENT_ROWS.forEach((r) => {
59    const it = list.find((i) => !claimed.has(i) && nameLower(i.name).trim() === r.exact);
60    if (it) { claimed.add(it); claims.set(r.tile, it); }
61  });
...
69    ...list.filter((i) => !claimed.has(i))
70      .map((i) => ({ text: String(i.name || '').trim(), qty: Number(i.quantity) })),
```

Strict `===` against the canonical string. No second pass, no substring match. Unclaimed items are
drawn as text under their own name — nothing vanishes and nothing steals a tile.

`courierSlipPdf.js:113` consumes it (`const present = assignSlipRows(items);`) and branches on
`r.tile` at `:126` / text otherwise. Grep for `includes(` across the three slip files:
- `courierSlipRows.js:19` — inside the comment describing the removed pass
- `courierSlipText.js:95, 105` — address-part dropping, unrelated to item naming

No live keyword matching remains.

---

## Claim 7 — bounced TDS not counted on Trial Spend — **TRUE**

`src/components/reports/trialSpendTotals.js:27, 40-45`

```
27  export const isPaid = (p) => p.status === 'Payment Done' || p.status === 'Sent to Accounts';
40  const paid = requests.filter(isPaid);
43  const paidGross = sum(paid, 'grossAmount');
44  const paidNet   = sum(paid, 'netAmount');
45  const tdsTotal  = sum(paid, 'tdsAmount');
```

All three money totals go through the same `paid` array. `TrialSpendReport.jsx:99-101` is the sole
consumer:

```
 99  const { committed, paidGross, paidNet, tdsTotal, pending, bounces } = computeTrialSpend(wos, prs);
```

No second TDS computation in that file — grep for `tdsAmount` in `TrialSpendReport.jsx` returns
zero hits; every `tdsTotal` reference (`:100, 105, 170, 223, 233, 484, 522`) reads the value
returned above, including the summary accumulator at `:170`, the two export builders at `:223/233`
and the detail drawer at `:484/522`.

Note: `isPaid` treats `'Sent to Accounts'` as paid. That is the pre-existing rule shared with
`paidGross`, so TDS is now consistent with the rest of the report rather than newly wrong.

---

## SECOND DOORS FOUND

### 1. Bulk CSV upload can silently do nothing and report success — REAL
`REPManagementPage.jsx:333-353`

```
337  const alreadyExists = reps.some(
338    r => r.repName?.toLowerCase() === repData.repName.toLowerCase()
339  );
...
352  await repAPI.create(repData);
353  results.push({ ...repData, status: 'success' });
```

`reps` is the **loaded page only** — `REPManagementPage.jsx:107` `repAPI.getAll({ limit: 100 })`,
and the backend hard-caps `limit` at 100 (`reps/views.py:114`). A CSV row naming a REP that exists
beyond row 100 passes the duplicate check, `repAPI.create` fires, and `serializers.py:270` takes
the `existing` branch.

- **Good news:** it writes nothing to the org — the layer rule holds on this path too.
  It carries no `trialIds`/`cityAssignment`, so `serializers.py:298` is false and no assignment is
  created either.
- **Bad news:** the server returns `201 "REP created successfully"` (`views.py:137-140`) and the
  UI records `status: 'success'` at `:353` for an operation that created nothing. That is the
  same defect shape as the payment statuses that reported success and saved nothing.
  Today ~66 REPs exist so it does not fire; it fires at 101.

The CSV path only carries `repName / phone / email / contactName` (`parseCSV`, `:281-306`), so it
could not have blanked logos or MoU even before the fix.

### 2. Django admin — `reps/admin.py:11-17`
`REPAdmin` declares no field restriction, so a superuser editing a REP in `/admin/` writes every
org field directly, with none of the `_submitted_attrs` protection. Expected of admin, but if the
team uses it for data repair it is an unguarded door onto the same fields.

### 3. `config/views.py:84` — bulk season rewrite
`REP.objects.filter(season=old_value).update(season=new_value)` — an ORM bulk update on an org
field that never passes through `REPSerializer` (and therefore does not bump `updated_at`, which
the attachment cache-busting at `views.py:64-68` depends on). Only touches `season`, so it cannot
blank a logo, but it is outside the "create() and update() only" claim as literally stated.

### 4. Stale attachment preview across records — `REPModal.jsx:242-243`
Described under claim 4. Display-only; cannot write.

---

## Verdict

| # | Claim | Verdict |
|---|-------|---------|
| 1 | add-city writes nothing to org row | TRUE |
| 2 | add-city form sends no org fields, three inputs disabled | TRUE |
| 3 | edit PUTs only on real org change | TRUE |
| 4 | trash icons remove the stored file | TRUE |
| 5 | per-state REP/address, no blanking, exports match table | TRUE |
| 6 | slip prints no untyped item name | TRUE |
| 7 | bounced TDS excluded from Trial Spend | TRUE |

All seven hold against the code on disk. The residual risks are the bulk-CSV false success at
>100 REPs, the unrestricted Django admin, the `config` bulk season update, and a cosmetic stale
preview in REPModal.
