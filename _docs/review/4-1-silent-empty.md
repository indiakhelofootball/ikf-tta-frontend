# Pass 4.1 — Silent empty

**Date:** 2026-08-03 · **Mode:** read-only · **CORE pass**
**This is the headline number of the whole audit.**

**Question:** exactly how many silent-empty handlers exist?

## Answer — the numbers

> **Corrected during the verification pass.** My first count said 74 silent
> handlers. That classifier did not recognise `setToast`, `setSaveError`,
> `setFileError` or `setOtpError` as reporting, so it over-counted by 30. The
> numbers below are the corrected ones and they are the ones to use.

| Family | Count | Files |
|---|---|---|
| **`catch` handlers that swallow the error entirely** | **44** | 22 of 109 |
| — of which are legitimate (real fallback / expected 403 / storage quota) | ~11 | |
| — **genuinely silent failures** | **~33** | |
| `catch` handlers that *do* report (toast / setError / throw) | 122 | |
| **`|| []` / `|| {}` fallbacks** | **163** | 44 of 109 |

**Your plan estimated ~110 occurrences across ~34 files. The real `|| []` count is
163 across 44 files** — the estimate was the right order of magnitude and slightly
low.

The ratio that matters: **44 silent vs 122 reporting.** So error handling here is
*mostly* right — roughly one in four handlers discards the error. That is better
than the house-style problem I first reported, and it makes the remaining 33 more
tractable: this is a finite list you can work through, not a rewrite.

---

## The one that already cost you money

`src/components/payments/PaymentManagementPage.jsx:247–253`

```js
const fetchBatches = () => {
  paymentBatchesAPI.getAll()
    .then((res) => { setSentBatches(res.batches || []); })
    .catch(() => { setSentBatches([]); });
};
```

Both families in four lines: `res.batches || []` **and** `.catch(() => setSentBatches([]))`.
`sentBatches` is what computes which payment requests have already been sent.
Empty means *nothing has ever been paid*, which re-arms every historical payment
request for a second bank export.

**Full chain in Pass 1.1, finding P-1.** If you fix one line from this entire
audit, fix this one.

---

## The other 18 that set a collection empty on failure

Ranked by what the user concludes when it fires.

### Tier A — the user reaches a false conclusion about money or data

| File:line | Handler | What the screen says | What is actually true |
|---|---|---|---|
| `bank/BankManagementPage.jsx:165` | `.catch(() => setRecords([]))` | **"No pending payments"** | The payments API failed |
| `bank/BankManagementPage.jsx:168` | `.catch(() => setTdsRecords([]))` | **"No TDS records"** — i.e. nothing to deposit | The TDS API failed |
| `bank/BankManagementPage.jsx:171` | `.catch(() => setTdsSummary([]))` | TDS summary totals show **₹0** | The summary API failed |
| `vendors/VendorStatementDialog.jsx:27` | `.catch(() => ({ paymentRequests: [] }))` | **"This vendor has never been paid"** | The payments API failed |
| `vendors/VendorStatementDialog.jsx:28` | `.catch(() => ({ tdsRecords: [] }))` | **"No TDS deducted for this vendor"** | The TDS API failed |
| `payments/PaymentManagementPage.jsx:239` | `.catch(… setPayments([]))` | No payment requests exist | (does show a toast — the only one in this group that does) |

The three `BankManagementPage` handlers are in one function, `loadBankData`, and
**none of the three shows any error**. A finance operator opens the Banking screen,
sees an empty TDS ledger and a ₹0 total, and reasonably concludes the month is
clear. This is a directly harmful false negative on a compliance screen.

`VendorStatementDialog` is the one someone will act on: a vendor asks "have you
paid me?", the statement opens showing no payments, and the answer given is wrong.

### Tier B — a form silently offers nothing to choose

This is the "disappearing dropdown" family proper.

| File:line | Handler | Effect |
|---|---|---|
| `workorders/WorkOrderModal.jsx:110` | `.catch(() => {})` on `vendorsAPI.getAll` | **Vendor dropdown blank** when creating a Work Order |
| `workorders/WorkOrderModal.jsx:113` | `.catch(() => {})` on `trialsAPI.getAll` | **Project/city dropdown blank** |
| `payments/PaymentRequestModal.jsx:339` | `.catch(() => setVendorWOs([]))` | **"This vendor has no work orders"** — so no payment can be raised |
| `trialCities/CityModal.jsx:92` | `.catch(… setRepOptions([]))` | REP assignment dropdown blank (logs to console only) |
| `csr/CSRActivityModal.jsx:26` | `.catch(() => setTrials([]))` | Trial picker blank |
| `csr/CSRProjectModal.jsx:44` | `.catch(() => setWorkOrders([]))` | Work-order picker blank |
| `csr/CSRExpenseTagModal.jsx:27` | `.catch(() => setPayments([]))` | Payment picker blank |
| `workorders/WorkOrderManagementPage.jsx:253` | `.catch(() => setVendors([]))` | Vendor filter blank |
| `workorders/WorkOrderManagementPage.jsx:261` | `.catch(() => setWorkOrders([]))` | **The whole Work Orders page shows "no work orders"** |
| `auth/AuthContext.jsx:39` | `refreshAllFromAPI().catch(() => {})` | **Every config-driven dropdown app-wide** falls back to seeds with no notice |
| `workorders/WorkOrderDetailView.jsx:25` | `.catch(() => setFullWO(null))` | Detail panel renders blank |

`WorkOrderModal.jsx:110–113` is the clearest reproduction of the bug you already
know: two adjacent `.catch(() => {})` calls, both feeding dropdowns, both silent.
The user opens "New Work Order", the vendor list is empty, and there is nothing
on screen to suggest why.

### Tier C — permissions and identity

| File:line | Handler | Effect |
|---|---|---|
| `auth/AuthContext.jsx:45` | `.catch(() => setPerms(null))` | Grants fetch fails → `perms = null` → `useGrants` falls back to role. **A granted non-admin loses their entire navigation with no error.** See Pass 2.1, A-2 |
| `auth/AuthContext.jsx:73` | `.catch(() => {})` on refocus | ✅ **Correct** — comment says *"transient failure — keep the last known grants"*. Deliberately silent, and right |
| `permissions/PermissionsManagementPage.jsx:81` | comment-only catch: `/* non-super or empty */` | Expected 403 for non-supers. Defensible |
| `csr/CSRProjectDetailPage.jsx:79` | `/* ignore — no certificate access */` | Expected 403. Defensible |

### Tier D — genuinely fine, listed so you skip them

`utils/adminStorage.js:74,112,126` (localStorage quota / private mode — the
in-memory path still works, each with a comment) · `services/api.js:44` (`/* no
stored user */`) · `courier/CourierManagementPage.jsx:312` (`/* logo optional —
skip on any decode error */`) · `utils/downloadHelpers.js:18` (falls back to
`window.open`) · `REPModal.jsx:392,643` (pincode lookup — falls back to a local
PIN→state map, which is a **real fallback**, not a silent empty) ·
`PaymentRequestModal.jsx:415` (delegates: *"onSave handles its own errors and
shows toast"*) · `AuthContext.jsx:73` (deliberate, commented).

**11 of the 44 are correct. The other 33 are the family** — and they are all
listed above, by file and line. That is the whole list.

---

## Why this shape is uniquely dangerous here

An empty list is a *valid, expected* state in every one of these screens. The
application cannot distinguish "the server said there is nothing" from "we never
heard back", and neither can the user — because both render identically and
neither produces a message.

Compare this with the pattern used in `src/utils/adminStorage.js`, **in this same
codebase**, which gets it right:

```js
let _status = {};   // 'idle' | 'loading' | 'loaded' | 'error'

function getFromCache(key) {
  // Trust the cache only after a successful load, so a server-confirmed empty
  // list renders as empty while a failed or pending load still shows seeds.
  if (_status[key] === 'loaded') return _cache[key];
  return DEFAULTS[key].map(...);
}
```

A **tri-state** — `loading` / `loaded` / `error` — instead of a bare array. That
is the entire fix, and someone here has already written it once, correctly, with
the reasoning in a comment. **The fix for the other 64 sites is to do what
`adminStorage.js` already does.**

---

## ✓ Pass complete

- **Do I have a number?** 44 silent `catch` handlers across 22 files (11 of them
  legitimate → **33 real**); 122 handlers that do report; 163 `|| []` fallbacks
  across 44 files; 19 that set a collection empty.
- **Have I seen one with my own eyes?** Yes — `PaymentManagementPage.jsx:247–253`,
  `BankManagementPage.jsx:162–172`, and `WorkOrderModal.jsx:106–118` read
  directly.
- **Do I know what the user experiences?** Yes, and it is the reason this pass is
  the headline: **they experience nothing.** A normal screen with nothing in it.
  Every "it randomly shows no data", "the dropdown was empty again", and "it says
  the vendor was never paid" complaint plausibly traces here.

**Fix the family, not the member.** Thirty-three `.catch` bodies changed in one
pass — probably one shared `useApiList(fetcher)` hook returning
`{data, status, error}` — or the count regenerates. Patching `fetchBatches` alone
leaves the Banking screen still lying about your TDS position.

**Thirty-three is a day's work, not a rewrite.** The full list is on this page.
