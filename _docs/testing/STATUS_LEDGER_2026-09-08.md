# Status ledger — the single answer to "is it fixed?"

**Built 2026-09-08 against live code: frontend `247747c`, backend `50a5c9f`.**

This file exists because the same question got different answers on different
days. The cause was not new information. It was three separate lists being
answered as if they were one:

1. the **client sheet** (16 items, WhatsApp / `TTA Issues.xlsx`)
2. the **live-test findings** N1-N10 and F1-F11 (found while testing the sheet,
   never on it)
3. the **four-chain audit** (30 findings, `AUDIT_2026-08-26_FOUR_CHAINS.md`)

Answering "everything is fixed" about list 1 while list 2 had open rows is how
"fixed" and "not fixed" both became true in the same session.

**Second cause: one symptom, two root causes.** Season 6 invisible was fixed in
August (a pagination bug) and was still reported in September (the project is
named `Trials`, not `IKF Season 6 Trials`). Same complaint, different defect.
Neither answer was wrong; they were about different things.

## How to read the evidence column

| tag | means |
|---|---|
| **CODE** | I read the named line in the currently-live commit. Highest confidence. |
| **PROD** | measured against the production database or the served bundle, on the stated date |
| **CLAIM** | asserted in an older document, NOT re-verified since. Treat as unproven. |

---

## The client sheet — all 16

| # | issue as the client wrote it | verdict | evidence |
|---|---|---|---|
| 1 | Trial Report: address, map, location, missing entries, Excel | FIXED | CODE `trialsReportStats.js` wired at `TrialsReport.jsx:29` · PROD 2026-09-07 |
| 2 | Super admin delete/retrieve courier | FIXED | CODE `CourierManagementPage.jsx:810` gated by `courierDeletePermission.js` |
| 3 | Address and other edits not saving | FIXED | CODE `reps/views.py:159` `_reread()` — the save always worked, the response was stale |
| 4 | Vendors already in the system can't be seen | NOT REPRODUCIBLE | CODE the 15-row cap is in `VendorSearchDialog.jsx`, which nothing imports · PROD API 128 = DB 128 |
| 5 | Social Media Report -> REP Report | FIXED | CODE one leftover string, in a comment only |
| 6 | Cities appearing twice | FIXED | CODE `trials/views.py:228-231` refuses a duplicate name in the same state · PROD zero true duplicates |
| 7 | Address, MoU, Logo deleted | FIXED | CODE `reps/serializers.py:235` `_submitted_attrs()` — no blanket setattr · PROD every wipe probe returned 0 |
| 8 | Dates missing on Courier | FIXED + BACKFILLED | CODE `courier/models.py` refresh_snapshot · PROD 9 rows backfilled 2026-09-07, 26 -> 35 |
| 9 | Quantity starts with 0 | FIXED | CODE `courierItemQuantity.js` holds '' while typing · PROD traced through the served bundle |
| 10 | Net TDS twice on bounced | FIXED | CODE `paymentAuditTotals.js` at `PaymentAuditReport.jsx:30` · PROD gap Rs 12,410.10 = the 9 voided records exactly |
| 11 | Package slip missing added items | FIXED, WITH ONE OPEN HALF | CODE optimistic lock `courier/views.py:125` · **open:** see O1 below |
| 12 | Season 6 Trials invisible | BROKEN — yours | pagination fixed in Aug; the live cause is the project's NAME. Rename `Trials` -> `IKF Season 6 Trials` in Admin |
| 13 | Module count wrong for Mayur / sauksha | FIXED | CODE `permissions/views.py` `_granted_module_keys` |
| 14 | Courier blank page | FIXED | CODE `courierShipmentFlag.js` fallback · `GrantedRoute.jsx:35` shows a spinner, not null |
| 15 | Trial report upper numbers wrong | FIXED | CODE stats compute from filtered rows · PROD 9/178/103/75 matched independently |
| 16 | Details vanish from projects | FIXED | CODE `trials/views.py:150` — 409 without a version token |

**15 of 16 closed. #12 needs one rename in Admin and is not a code change.**

---

## Open — found while testing the sheet, never on it

| id | what | where | needs |
|---|---|---|---|
| O1 | `CR-2026-0051` prints the wrong item name. "Naari Shakti Banner" falls through a keyword rule and prints as **BANNERS**. Nothing is dropped; it is mislabelled | CODE `courierSlipPdf.js:92` — `match: (n) => n.includes('banner')` | code fix, no decision. Belongs to sheet #11 |
| O2 | Rs 4,300 of TDS deducted with no `TDSRecord`. Audit strip Rs 91,826.70, register Rs 87,526.70 | PROD `PR-2026-082`, `PR-2026-060` | **your call** — backfill two records, or the audit strip is miscounting a deliberate no-TDS case |
| O3 | Bounced TDS counted again on a second screen. `tdsTotal` sums every payment request with no status filter, while the two lines above it filter on status | CODE `TrialSpendReport.jsx:100` | code fix, no decision. Same rule as #10, different door. Inert today only because no affected WO carries a project tag |
| O4 | The REP payload trim is **opt-in**, so only Courier got it | CODE new endpoint `/api/reps/options/` (`reps/views.py:233`). Still on the fat endpoint: `DashboardHome.jsx:45` (no limit), `REPModal.jsx:179` (limit 1000), `REPManagementPage.jsx:107`, `CityModal.jsx:87` | code fix, no decision |
| N4 | No DB unique constraint on vendor PAN. The API refuses duplicates; production duplicates are untouched | CLAIM 2026-08-26 | blocked on `audit_duplicate_pans` output from prod |
| N10 | A dispatched parcel's address keeps changing until delivery | CODE `courier/serializers.py:69-75` | **your call** — deliberate in code, the test plan assumed it froze at dispatch |
| F11 | Stored work-order balances disagree with their payments | CLAIM 2026-08-26, dev only | run `manage.py audit_wo` on prod |
| — | Four orphaned assignments: #21 Kota, #22 Bikaner, #23 Chittaurgarh, #75 Thiruvananthapuram | PROD | **your call** — should those trials run in those cities? Do not dispatch, do not delete |

---

## The rule that stops this recurring

Any future "is X fixed" answer names **which list** X is on and **which tag**
(CODE / PROD / CLAIM) the verdict carries. A row closed on the client's wording
while a defect remains on that same screen gets written as
**FIXED, WITH ONE OPEN HALF** — never as FIXED.

---

## List 3 — four-chain audit, reconciled 2026-09-08

Source: `AUDIT_2026-08-26_FOUR_CHAINS.md`, committed only on
`fix/tracker-issues-2026-08-21`, so it is not on disk in this checkout. Extracted
from commit `38400ae` and every finding re-read against the deployed code.

**Deployment verified first**, so CODE here means *deployed*, not just local:

- `https://tta.indiakhelofootball.com/release.txt` reports frontend `247747c`,
  backend `50a5c9f`, deployed 2026-09-07T17:04Z.
- `git status` + `git diff` against both commits: the working tree's `src/` and
  `backend/` are identical to what is deployed. Only an untracked sqlite backup differs.
- The served bundle `main.ab5424b1.js` was downloaded and probed: `region` present,
  `zone` gone, `snapDistrict`/`snapSubArea` present, `Delete shipment` present,
  `/reps/options` present.
- A local `npm run build` produced a different content hash. Cause found, not
  assumed: the server builds with `REACT_APP_API_URL=/api` (relative), this
  machine's `.env` uses the absolute URL. Sizes differ by 312 bytes and the
  deployed bundle inlines `{REACT_APP_API_URL:"/api"}`. Not drift.

### Closed — 18 of 29

| # | finding | proof in deployed code |
|---|---|---|
| 1.1 | trial PUT wiping every city | `trials/serializers.py:24-34` — the `default` is gone, with the measurement in the comment |
| 1.2 | editing a trial city blanks its region | `trialcities/serializers.py:43` `_submitted_attrs()` |
| 1.3 | "Mark as Reverified" saves nothing | `lastReverified` has zero occurrences anywhere |
| 1.4 | a blank optional field is refused | `e0c772e` |
| 1.5 | duplicate trial code returns 500 | `trials/views.py:100` `except IntegrityError` |
| 1.8 | `region` accepts any string | `trialcities/serializers.py:12` is a `ChoiceField` |
| 2.2 | ADMIN can create accounts | `accounts/views.py` now requires `SUPER_ADMIN` |
| 2.4 | OTP enumerates phone numbers | `otp/views.py:44` — the 404 is retired |
| 3.1 | catalog row moved out of its category | `config/views.py:269` `category_move_blocked_by_reference` |
| 3.2 | soft delete strands a live activity | `csr/serializers.py:240` `_reject_retired_catalog_row` |
| 4.2 | third item write path with no rules | `courier/views.py:377,400` — deleted gate + Draft gate |
| 4.3 | slip silently truncates a long address | `courierSlipText.js:83` `fitAddressBlock` shrinks, never cuts |
| 4.4 | `snapDistrict`/`snapSubArea` never printed | both in the address block, both in the served bundle |
| 4.5 | soft-deleted shipment still dispatchable | `courier/views.py:71,212` |
| 4.6 | `zeroReason` free text defeats the guard | `courier/serializers.py:15` is a `ChoiceField` |
| 4.8 | blank snap fields rejected | `courier/serializers.py:110` `allow_blank=True` |
| 4.9 | 5-digit quantity overprints its badge | `fitBadgeNumber` |
| 4.10 | long token prints across CONTENTS | `courierSlipText.js:12` `breakWord` |

3.5, 3.6, 3.7 were CLEAN at audit time and were not re-tested; nothing since touched them.

### Still open — 10, in severity order

| # | finding | where | needs |
|---|---|---|---|
| 2.1 | Sign-out never calls the logout endpoint that exists and works; the refresh token stays mintable for 30 days | `AuthContext.jsx:375-388` | **deferred by owner 2026-09-07** |
| 1.10 | N+1 on the report endpoint | `reports/views.py:69` no `prefetch_related('cities')` | code fix, perf |
| 1.6 | Client and server generate incompatible trial-code formats (`IKF-S6-001` vs `TRL-S6-IKF-001`), and `count+1` reissues a used number | `trialCodeGenerator.js:37`, `trials/models.py:99` | code fix |
| 2.3 | The config cache survives a forced session end, so the next user warm-starts on the previous user's dropdown labels | `services/api.js:44-48` | code fix, small |
| 3.3 | `merge_project_name` strands `CSRProject.project` on the dead row | `config/management/commands/merge_project_name.py` | code fix, CSR side |
| 4.7 | POST an assignment without `trialId` returns 500, should be 400 | `reps/serializers.py:8` | code fix |
| 1.9 | A trial city's `code` can be renamed via PATCH | `trialcities/serializers.py` — `code` is writable | severity unproven |
| 3.4 | `ConfigOptionAdmin` has no guard, so Django admin can do 3.1 | `config/admin.py` | INFERRED, never exercised |

2.5 (dead `ProtectedComponent.jsx`, unused `IsAdminForWrite`) is unchanged and
remains latent — no call sites, no exploit, a trap for whoever wires them up.

---

## Fixed 2026-09-08 — 4.1 and 4.7's neighbours

**4.1 — a create no longer rewrites an existing org.** `reps/serializers.py`
create(): on the existing-org branch a submitted value is applied only where the
stored field is a gap. A stored value always wins, and a blank never lands.

Why "complete", not "ignore entirely": `repLogoLink` is the one org input
REPModal leaves ENABLED under the "details will be reused" banner
(`REPModal.jsx:1376`), and `searchRepByName` never prefills it — so pasting a
link while adding a city is a real operator action that had to keep working.

**A third route to the logo/MOU wipe was found and closed by the same change.**
`buildAddModePayload` keeps an empty `repLogoLink` on the wire whenever the
matched org has one (it counts as "clearable"), while the name search never
prefills that box. So adding a city to an org that had a logo link submitted a
blank over it. That is sheet #7, "Address and MoU, Logo got deleted again",
arriving by a door nobody had checked. **The frontend half is still there** —
`REPModal.jsx:1376` should either prefill that box from the matched org or
disable it like its neighbours. The server now refuses the blank either way.

Two tests that asserted the old rule were rewritten rather than deleted:
`test_merge_still_applies_what_the_caller_did_send` and
`test_merge_with_explicit_blank_still_clears`. The deliberate-clear intent moved
to the edit path, where the operator can see what they are clearing, and is
pinned there by `test_edit_path_still_honours_a_deliberate_clear`.

**1.7 — the Trials Report no longer binds by city name alone.** New
`src/components/reports/trialsReportJoin.js`, used by both the table and the
orphan list so the two cannot disagree.

State disambiguates rather than keys. An exact (trial, city, state) match wins;
a name-only match is still used wherever the name is unambiguous within the
project; only a genuine collision returns nothing, and that assignment surfaces
in the orphan list instead of printing on the wrong row. The one-line "add state
to the key" version was rejected because an assignment with a blank or
differently-spelt state would have lost its address — addresses vanishing from
that column being the complaint the report already carries.

Suites: **frontend 453** (was 441) · **backend 55 in `reps`**.
Not committed, not pushed, not deployed.
