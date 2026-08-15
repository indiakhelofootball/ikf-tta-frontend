# Independent verification of the CSR fixes

**Method:** not a code read. The backend was extracted into a clean container and its **real test
suite executed**; the shipped client bundle and its source map were **opened and searched**; the new
contrast function was **extracted and run numerically** against realistic brand colours.

**Verdict: the substantive fixes are real and well made. Two new defects were found by running
things — one of them defeats the security guarantee the work was done for.**

---

## 1. Verified fixed — with evidence

| Claim | Verified how | Result |
|---|---|---|
| TDS classification moved to the work order | `workorders/migrations/0007_workorder_tds_type.py` exists; `resolve_tds_section(work_order, vendor)` — **WO wins, vendor is fallback for legacy WOs, `'None'` treated as unset** | ✅ correct, and the docstring gives the client's own reason |
| …and it is tested | `payments/tests.py` — `test_wo_tds_type_drives_section`, `test_vendor_tds_type_is_fallback_when_wo_blank`, `test_wo_tds_type_none_falls_back_to_vendor`, plus an `Unknown` case | ✅ 4 dedicated tests |
| INV-AUDIT enforced at the API | `CSRExpenseTagSerializer._validate_payment_not_already_tagged` — 400 naming the holding project, **with `exclude(pk=self.instance.pk)`** so editing a tag doesn't clash with itself | ✅ correct |
| …and the proof test the architecture doc specified | `csr/tests.py` — `test_same_payment_to_a_second_project_is_rejected_with_400`, `test_only_one_tag_row_survives_the_duplicate_attempt` | ✅ exists now |
| Whole backend suite | extracted to a container, `manage.py test` on SQLite | ✅ **359 tests, 0 failures** (was 319) |
| Migration drift | `makemigrations --check --dry-run` | ✅ "No changes detected" |
| G3 — funder gets its own bundle | `Dockerfile` runs `npm run build` **and** `npm run build:client`, copies `build-client → /usr/share/nginx/html/client`; `nginx.conf` has `location = /client` and `location ^~ /client/` | ✅ genuinely wired |
| …and the internal app is out of it | searched the real `build-client` output | ✅ **26 MB → 3.6 MB, 5 chunks → 1**. No `VendorManagement`, `PaymentManagement`, `PaymentRequestModal`, `BankManagement`, `CSRProjectDetailPage`, `PermissionsManagement`, `TrialCitiesPage` |
| Theme no longer inherits stale `contrastText` | `clientTheme.js` — the `...muiTheme.palette.primary` spread is gone; `contrastText` is computed per colour | ✅ the spread bug is fixed (but see §2) |

**On "three front doors — as intended?"** Yes. `loginDoor.js` and `CSRLogin.jsx` both state and honour
*"three login SCREENS, one auth engine"*; `CSRLogin` calls the same `useAuth().login()` against the
same endpoint. The documents' rule was *"login never forks — one endpoint, one JWT, one
AuthContext"*, and that still holds. Three doors onto one engine is the pattern
`CSR_CLIENT_PORTAL.md` §4 already endorsed (*"same engine, two skins"*), extended to three. **Not a
deviation.**

---

## 2. NEW — the contrast threshold is wrong, and the form's own placeholder still fails

`clientTheme.js`:

```js
return L > 0.42 ? '#111827' : '#FFFFFF';
```

The crossover where white and near-black text give equal contrast is around **L ≈ 0.18**, not 0.42.
So every brand colour with luminance between roughly **0.18 and 0.42** is given **white** text when
**black** would be dramatically better. Measured against realistic brand colours:

| Brand colour | L | shipped pick | ratio | better pick | ratio | |
|---|---|---|---|---|---|---|
| `#22C55E` — **the branding form's own secondary placeholder** | 0.411 | white | **2.28 : 1** | black | 7.79 : 1 | **FAIL** |
| `#EF6C00` orange | 0.291 | white | **3.08 : 1** | black | 5.76 : 1 | **FAIL** |
| `#1976D2` Material blue | 0.178 | white | 4.60 : 1 | white | 4.60 : 1 | scrapes AA by 0.1 |
| `#1A2B5C` corporate navy | 0.027 | white | 13.60 : 1 | white | — | ✅ (was **1.30 : 1**) |
| `#0B5FFF` primary placeholder | 0.155 | white | 5.13 : 1 | white | — | ✅ (was **3.46 : 1**) |

So the fix is a **large** improvement — navy went from invisible to 13.6:1 — but it swapped a
universal failure for a mid-luminance band failure, and the branding form's own secondary
placeholder is inside that band.

**Fix is one line:** don't threshold the luminance, compare the two actual ratios and take the
winner —
`return contrast(hex,'#111827') >= contrast(hex,'#FFFFFF') ? '#111827' : '#FFFFFF'`.
That is exactly what MUI's own `augmentColor` does.

---

## 3. NEW — the funder's **source map** ships your entire internal API surface

This is the one that matters, because it defeats the guarantee the G3 work exists to provide.

`build-client/static/js/` contains:

```
main.a00b52d2.js         594 KB   ← the bundle (clean)
main.a00b52d2.js.map   3,048 KB   ← shipped alongside it
```

The Dockerfile copies the whole directory, and nginx serves it. The map has `sourcesContent`
populated, so it carries **readable original source**, not just mappings. Inside it:

- `src/services/api.js` — **32,789 characters of plain, readable source**
- containing **60 internal API endpoints**, including
  `/auth/register/` · `/auth/change-password/` · `/permissions/…` · `/banks/` ·
  `/config/bulk/` · `/config/rename/` · `/courier/shipments/` · `/csr/branding` ·
  `/csr/client-users` · `/csr/activity-types` · `/csr/activities`

`CSR_ARCHITECTURE.md` G3 states the risk in these words:

> *"the corporate client's browser downloads the compiled JS of your entire internal TTA + CSR-org
> app — component logic, **internal API shapes**, business rules."*

The component logic is genuinely gone. **The internal API shapes are not** — they are republished in
plain text one file over.

`_docs/deployment/CLIENT_BUILD.md` supplies its own acceptance test:

```bash
grep -rl "VendorManagement\|PaymentManagement\|workOrdersAPI" build-client/static/js   # must return nothing
```

Run against the real output it **returns a match** (`workOrdersAPI`, in the map). The documented
acceptance criterion for G3 currently fails.

**Fix:** `GENERATE_SOURCEMAP=false` on the `build:client` script. Two minutes.

**Secondary:** even the minified runtime bundle contains `/csr/projects` and `/csr/expense-tags`,
because `services/api.js` is a single module — importing `clientAPI` drags `csrAPI` along. Splitting
the client's API calls into their own module would close that too, and is the better long-term fix.

---

## 4. Smaller observations

- **`CSRLogin.jsx` is a third copy of the login form.** `CSR_CLIENT_PORTAL.md` phase C3 called for
  extracting a shared `<LoginForm />` so all three doors render one component. That was not done, so
  a login change now has to be made in three files.
- **`expiredSessionLoginPath` tests the path before the role.** The comment argues this is safe
  because *"a funder never browses /csr"* — true today, since the funder's bundle has no `/csr`
  route at all. Worth keeping in mind if the bundles are ever merged again.

## 5. Not verified

- **The frontend Jest suite did not complete** inside the sandbox's time limits. Backend: run and
  green. Frontend: unrun — treat as unknown, not as passing.
- I left a temporary tarball while extracting the backend; it has been moved to `_to_delete/`
  (`_be_test.tgz`) since the bridge cannot delete. Remove it with the other two files already there.

---

## 6. Net

Your skepticism was warranted on **one** of the two claims, and only one.

*"Three platforms, three front doors"* is done as intended — same engine, three skins, and the
session-expiry routing is genuinely better than before.

*"Both trees clean"* is true of the source, and the backend is provably green at 359 tests. But
**"verified live" did not include opening the artefact that gets served to the funder.** When you do,
the security fix that motivated the whole exercise is 90% complete: the pages are gone, the API map
is still shipping, and the project's own written acceptance test for it fails.
