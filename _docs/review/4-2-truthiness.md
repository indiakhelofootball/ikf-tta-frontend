# Pass 4.2 — Truthiness traps

**Date:** 2026-08-03 · **Mode:** read-only

**Question:** how many truthiness-fragile fallbacks exist?

## Answer

**1,415 `||` fallbacks across the frontend** — but that raw number is not the
finding. Most are `x || ''` for display and are harmless. The subsets that can
actually misfire:

| Trap | Count | Why it misfires |
|---|---|---|
| **A. `|| []` / `|| {}` — the default *never fires*** because `[]` and `{}` are truthy | **163** across 44 files | Only fires on `null`/`undefined`, never on an empty-but-present value. This is the exact shape of the config-cache bug |
| **B. `parseFloat(x) || 0` and friends — the default *wrongly fires*** on a legitimate `0` | **97** across ~20 files | A real zero is indistinguishable from a missing value |
| C. `x || <non-falsy default>` where `0`/`''`/`false` is legitimate | 6 | Enumerated below |
| D. `.length` used as a proxy for "loaded" | 7 | Enumerated below |

**Countable answer: 273 truthiness-fragile fallbacks, of which ~15 can produce a
visibly wrong result today.**

**Nullish coalescing (`??`) — the operator that fixes all of this — is used 25
times in the entire codebase.** Against 1,415 `||`. That ratio *is* the finding.

> Counts corrected during the verification pass; the first draft used a narrower
> regex and reported 710 / 124 / 22.

---

## The original bug — and where it now stands

The config-cache bug you already lived through: `[]` was cached on failure, and
`[] || DEFAULTS` never fell through to defaults because `[]` is truthy, so the
dropdown rendered blank forever.

**That specific bug is fixed, and fixed properly.** `src/utils/adminStorage.js`
now uses a tri-state instead of a truthiness check:

```js
function getFromCache(key) {
  // Trust the cache only after a successful load, so a server-confirmed empty
  // list renders as empty while a failed or pending load still shows seeds.
  if (_status[key] === 'loaded') return _cache[key];
  return DEFAULTS[key].map((name, i) => ({ id: `seed-${key}-${i}`, name, comment: '' }));
}
```

and `fetchCategory` refuses to downgrade good data on failure:

```js
// A key that already holds a good value keeps it — a transient failure must
// never downgrade real data to seeds.
_status[cacheKey] = _cache[cacheKey] ? 'loaded' : 'error';
```

**This is the correct fix and it should be the template for the other 272 sites.**

### T-0 · One residue of the original bug survives, in the fix itself — **LOW**

That last line is a truthiness check on a value that can be `[]`:

```js
_status[cacheKey] = _cache[cacheKey] ? 'loaded' : 'error';
```

`_cache[key]` starts as `null` (→ `'error'`, correct). But after **one successful
load that returned an empty list**, `_cache[key] === []`, which is **truthy** — so
every subsequent failure marks the key `'loaded'` and `getFromCache` returns `[]`
rather than seeds.

Narrow, and arguably intended (*"a server-confirmed empty list … must not be
overwritten with seeds"*). But the outcome is the old symptom exactly: a
permanently blank dropdown with no error, for a category that legitimately
returned empty once. `_status[cacheKey] = _cache[cacheKey] !== null ? …` makes the
intent explicit either way.

---

## Trap A — `|| []`: the default that can never fire (163 sites)

```js
setPayments(res.paymentRequests || []);
setSentBatches(res.batches || []);
setVendors(res.vendors || []);
const list = res.workOrders || [];
```

The `|| []` only helps when the property is missing entirely. It does **not**
distinguish "server returned `[]`" from "we never called" from "the call failed" —
and the surrounding `.catch` (Pass 4.1) sets `[]` too, so all three collapse into
one indistinguishable state.

Every one of these should be `?? []` **plus** a status flag. Substituting `??`
alone changes nothing here — the value genuinely is `undefined` in the failure
case. **Trap A is only fixable together with Pass 4.1**; they are one problem seen
from two angles.

Highest-consequence instances: `PaymentManagementPage.jsx:237,250,260` ·
`BankManagementPage.jsx:163,166` · `WorkOrderManagementPage.jsx:251,259` ·
`PaymentRequestModal.jsx:334`.

---

## Trap B — `parseFloat(x) || 0`: the default that fires when it shouldn't (97 sites)

```js
totalGross: filtered.reduce((s, r) => s + (parseFloat(r.grossAmount) || 0), 0)
```

`parseFloat('0') || 0` → `0`. Same answer, no harm — which is why **all 97 money
sites are benign**. `parseFloat(undefined) || 0` → `0` is also the desired
behaviour for a sum.

The exception is where the fallback is **not** the identity value:

**`PaymentRequestModal.jsx:134`**

```js
width: `${Math.min(100, (paidGross / (parseFloat(wo.amount) || 1)) * 100)}%`
```

A deliberate divide-by-zero guard, and correct — but it means a Work Order with
`amount = 0` renders its progress bar as `paidGross × 100%`, i.e. instantly full.
Cosmetic. Listed because it is the one place in the money paths where `|| 0` was
correctly avoided and the substitute has its own edge.

**The real cost of Trap B is not correctness, it is masking.** `parseFloat(r.netAmount) || 0`
in `blkpayExcel.js:81` and `iciciExcel.js:87` turns a *missing amount* into a
**valid ₹0.00 row in a bank file** (Pass 1.3, E-2). The pattern is benign 96 times
and dangerous once — and the 96 are what make the one invisible.

---

## Trap C — falsy-legitimate values collapsed (6 sites)

| Site | Code | Misfires when |
|---|---|---|
| `vendors/VendorModal.jsx:89` | `gstVerified: v.gstVerified \|\| false` | never (already boolean) — but see below |
| `vendors/VendorModal.jsx:90` | `panVerified: v.panVerified \|\| false` | never |
| `trialCities/CityModal.jsx:110` | `groundVerified: editingCity.groundVerified \|\| false` | never |
| `trials/ProjectDashboard.jsx:343` | `confirmed: city.confirmed \|\| false` | never |
| `payments/PaymentDetailDialog.jsx:42` | `setEditStatus(payment.status \|\| 'Draft')` | **a PR with an empty status string silently becomes editable as `Draft`** |
| `vendors/VendorModal.jsx:89` | `tdsType: v.tdsType \|\| 'None'` | a vendor whose `tds_type` is `''` is shown as `'None'`, and saved back as `'None'` — quietly rewriting blank to a value |

The four boolean ones are harmless *today* but they are the pattern that becomes
harmful the moment the API sends `null` for "not yet assessed" — `null || false`
loses the distinction between "checked, not verified" and "never checked". Given
Pass 3.1 found these same fields carry `default=False` server-side, the
false-collapse exists on both ends of the wire.

`PaymentDetailDialog.jsx:42` is the one to look at: it is the dialog that can PATCH
a payment request's status (Pass 1.4, SM-2), and it opens defaulting to `Draft`.

---

## Trap D — `.length` as a proxy for "loaded" (7 sites)

**`workorders/WorkOrderModal.jsx:101`**

```js
const allVendors = freshVendors.length > 0 ? freshVendors : propVendors;
```

Paired with the silent catch two lines below (`.catch(() => {})` at `:110`), the
logic is: *if the fresh fetch produced nothing, fall back to the vendors passed in
as props.* That is actually a **good** instinct — a real fallback rather than a
blank. But it means a genuinely empty vendor list is indistinguishable from a
failed fetch, and the user is shown stale prop data with no indication.

The other six are `list.length === 0 ? <empty state> : <rows>` — those are the
**correct** use of `.length` and are listed only so you don't re-audit them
(`AdminPage.jsx:126,313` · `VendorManagementPage.jsx:384` ·
`VendorAuditReport.jsx:650,676` · `WorkOrderManagementPage.jsx:597`).

Note `VendorManagementPage.jsx:384` does the nicer thing —
`vendors.length === 0 ? 'No vendors yet' : 'No vendors match your filters'` —
distinguishing *empty source* from *empty filter*. That is the level of care the
other screens need, extended one step further to *empty because it failed*.

---

## ✓ Pass complete

- **Do I have a number?** 273 truthiness-fragile fallbacks (163 Trap A + 97 Trap
  B + 6 Trap C + 7 Trap D), out of 1,415 `||` total. 25 uses of `??` codebase-wide.
- **Have I seen one with my own eyes?** Yes — `adminStorage.js:135–186` read in
  full, confirming both that the original bug is fixed and that T-0 survives in
  the fix.
- **Do I know what the user experiences?** Yes — for Trap A, a blank list that
  looks identical whether the server said "none" or never answered.

**This pass and Pass 4.1 are the same bug.** Do not schedule them separately:
`res.x || []` and `.catch(() => setX([]))` are two halves of one line, and fixing
either alone changes nothing. The unit of repair is *"how does this screen
represent not-yet-known?"* — and `adminStorage.js` already answers it.
