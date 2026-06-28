# Project-name rename — hardening plan (post-cascade-feature)

Context for whoever (human or CLI agent) executes this: the project-rename-cascade
feature (backend `1958952` + `1bf4892`, frontend `0c87337`) is built, tested (18/18
green), and committed but **not pushed**. Before pushing, this plan closes four gaps
found during a deep-dive review of how "project name" actually flows through the
codebase. Read this whole file before touching code — it contains the full context,
file paths, current code, and target code. Do not re-derive the analysis; it's done.

**Hard constraints carried over from `CLAUDE.md` — do not violate:**
- Confirm intent before coding (this doc IS that confirmation — proceed).
- Don't propose changes to code you haven't read — every file below has been read;
  re-read it yourself before editing, don't trust this doc blindly for line numbers.
- Two separate repos (`D:\tta_frontend-main` and `D:\tta_frontend-main\tta_backend`)
  sharing a folder. Never combine commits across them.
- Never `git push` unless explicitly asked in that turn.
- No DB migration in this plan — every fix reuses existing schema (see Fix 1).

**User's steering decisions (locked):**
1. Fix 1 (trial-code prefix): use the **cheap, no-migration** approach — must not
   change current behavior for existing projects, must not risk breaking anything.
2. Include all 4 fixes below.
3. Don't remove any user-facing capability — CSV import in trial-cities stays
   free-text (warn, never block).

**STATUS: executed.** All fixes below are implemented and tested (backend: 19/19
config+trials tests pass, including a new comment-survives-rename test; frontend
edits applied; backfill command run and verified against a scratch sqlite DB).
Not committed yet — pending explicit go-ahead per CLAUDE.md ("never push without
asking that turn" / confirm before committing).

**Closed during execution (folded into Fix 1, not optional):** a parallel review
caught that `AdminPage.jsx`'s `OptionPanel.handleAdd` never set `comment` for a
newly added project — meaning only the two projects backfilled by the one-time
command would ever have a code that survives a rename; every project added after
deploy would still drift. Fixed by adding an `autoCode` prop to `OptionPanel`,
enabled only on the Project Names panel, that sets `comment` to the same
first-3-letters fallback at creation time. Zero behavior change today (matches
what `trialCodeGenerator.js`'s fallback already computes) — the only difference is
the value is now persisted instead of recomputed, so a future rename has something
to preserve.

**Also done as cleanup (not a risk fix, just removing a trap):** deleted
`trialConstants.js`'s `PROJECT_CODES` export — confirmed unused anywhere in the
codebase, a second, unsynced copy of the same map living in `trialCodeGenerator.js`.
Left as a leftover, it was a landmine for a future dev who might "fix" one map and
not know the other existed.

---

## Background — what's broken and why (read this before coding)

`Trial.trial_type` (backend `trials/models.py:38`) is the one place that genuinely
stores the literal project name ("IKF", "Project Nari Shakti", etc.), written by
`TrialWizard.jsx` (`trialType: formData.projectName`). The rename endpoint
(`config/views.py: cascade_project_rename`) updates this correctly.

Two **separate** problems exist around it:

**Problem A — trial-code prefix drift (Fix 1, the only one with real forward risk).**
`src/utils/trialCodeGenerator.js` builds codes like `IKF-S5-001` using a hardcoded map:

```js
// src/utils/trialCodeGenerator.js (current)
const PROJECT_CODES_MAP = {
  'IKF': 'IKF',
  'Project Nari Shakti': 'PNS',
};
export const generateProjectCode = (projectName, season, existingTrials = []) => {
  const projectCode = PROJECT_CODES_MAP[projectName] || projectName.substring(0, 3).toUpperCase();
  ...
};
```

There's also a near-identical, **independent** fallback on the backend
(`trials/models.py:28-33, 73-88`, `Trial._generate_trial_code`, `TYPE_CODE_MAP`) that
only fires if the frontend ever fails to send a `trialCode` (comment in the code says
"frontend always sends one" — so this rarely runs, but it exists and has the same
flaw). Lower priority than the frontend fix, included for completeness.

Neither map is touched by the rename endpoint. Rename "Project Nari Shakti" to
anything not starting with "Pro" (e.g. "Nari Shakti Trials") and the next trial
created under that project gets a different code prefix than every historical trial
for the same project — i.e., the rename feature would *reintroduce*, at the trial-code
level, the exact fragmentation problem it exists to fix at the report level.

**Problem B — trialCities / workOrders cascade targets are structurally inert
(Fixes 2 & 3, cosmetic/honesty fixes, not data-integrity risks).**
- `TrialCityLocation.trial_type` (the "Trial Cities" ground-verification master list)
  is, in normal use, a 5-option category dropdown (`CityModal.jsx:339-345`:
  `'IKF Season Trial' | 'Exclusive IKF Season Trial' | 'CSR Project Trial' | 'Zonals' | 'Other'`),
  not the bare project name. The cascade's `filter(trial_type=old_value)` will
  almost always match zero rows in real data. The CSV bulk-import path
  (`TrialCitiesPage.jsx:279-310`, `parseCSV`) writes this same field as
  unconstrained free text, so it's *possible* but not guaranteed for a row to
  literally hold a project name — purely by data-entry accident, not design.
- `WorkOrder.project_ref` (`workorders/models.py:26`) is, per explicit comments in
  `TrialSpendReport.jsx:4-5` and `flagEngine.js:142-150`, meant to hold a **trial
  code** (e.g. `IKF-S5-001`), not a project name, used to flag "orphan WOs". No UI
  anywhere writes this field (`WorkOrderModal.jsx` has no such input) — it defaults
  to `''` for every WO created through the app. The cascade's
  `filter(project_ref=old_value)` (old_value = a project *name*) will essentially
  never match real WO rows, because the field's real content is a different kind of
  string entirely (or blank).
- The 18 passing tests (`config/test_project_rename.py`, `config/test_rename_hardening.py`)
  construct fixtures with `TrialCityLocation.objects.create(trial_type=name, ...)`
  and similar for WorkOrder — i.e., they manufacture the literal-project-name
  scenario the cascade expects. That proves the SQL/transaction/orphan-sweep logic
  is correct; it does **not** prove the cascade does anything material to real
  `TrialCityLocation`/`WorkOrder` rows in production.

None of this is dangerous (no corruption risk — exact-match filters either hit the
intended row or hit nothing), but the success message overstates what happened
("Updated N trials, M city records, K work orders" will usually read "...0 city
records, 0 work orders" even on a fully successful, fully-cascaded rename), which is
confusing for whoever clicks rename. Fix 4 corrects the message; per the user's
"don't remove capability" steering, Fixes 2/3 do **not** remove the existing cascade
calls (they're harmless) — they just stop CSV import from silently feeding the
cascade bad data, and they make the UI honest about what was actually touched.

---

## Fix 1 — trial-code prefix survives a rename (no migration)

**Design:** `ConfigOption` (backend `config/models.py:16`) already has an unused
`comment` field for the `project_name` category (verified: `AdminPage.jsx`'s
`OptionPanel` never renders `comment` for any category — zero UI exposure risk).
`adminStorage.js` already round-trips `comment` end-to-end
(`apiToLocal`/`localToApi`, `adminStorage.js:50-68`) — `getProjectNames()` already
returns `{ id, name, comment }` objects, no new plumbing needed.

Repurpose `comment` on `project_name` rows to hold the 3-letter code abbreviation.
Because rename is an **UPDATE** of the existing row (`config/views.py:94`,
`row.value = new_value; row.save(...)`), not a delete+recreate, the `comment` field
automatically survives a rename for free — no cascade code changes needed for this
part.

**Step 1.1 — one-time backfill (no migration, just data).** Add a tiny one-off
management command (or do it via the Django shell — either is fine, it runs once):

```python
# tta_backend/backend/config/management/commands/backfill_project_codes.py
from django.core.management.base import BaseCommand
from config.models import ConfigOption

# Mirrors the CURRENT frontend PROJECT_CODES_MAP exactly — preserves existing
# behavior for every project that already exists. New projects added after this
# get no comment and fall back to first-3-letters (same as today's behavior).
KNOWN_CODES = {
    'IKF': 'IKF',
    'Project Nari Shakti': 'PNS',
}

class Command(BaseCommand):
    help = 'One-time backfill: set ConfigOption.comment = code abbreviation for existing project_name rows.'

    def handle(self, *args, **kwargs):
        for value, code in KNOWN_CODES.items():
            updated = ConfigOption.objects.filter(
                category='project_name', value=value, comment=''
            ).update(comment=code)
            self.stdout.write(f'{value}: {"set to " + code if updated else "skipped (already set or not found)"}')
```

Run once after deploy: `python manage.py backfill_project_codes`.

**Step 1.2 — frontend reads the code from the admin row, not a hardcoded map.**

`src/utils/trialCodeGenerator.js` — change `generateProjectCode` to accept the admin
project list (which already carries `comment`) and prefer it:

```js
// target
export const generateProjectCode = (projectName, season, existingTrials = [], adminProjects = []) => {
  const match = adminProjects.find(p => p.name === projectName);
  const projectCode = (match && match.comment) || PROJECT_CODES_MAP[projectName] || projectName.substring(0, 3).toUpperCase();
  ...
};
```

Keep `PROJECT_CODES_MAP` as a secondary fallback (not primary) — belt-and-suspenders
for any row where the backfill didn't run; zero behavior change for today's two
projects since the backfilled `comment` will equal the map's existing values anyway.

Update both call sites in `src/components/trials/TrialWizard.jsx` (`adminProjects` is
**already** in scope at both — see lines ~67-68, ~94-95, ~118):
```js
// line ~94-95
const autoProjectCode = (formData.projectName && formData.season)
  ? generateProjectCode(formData.projectName, formData.season, existingTrials, adminProjects)
  : '';
// line ~118
const code = generateProjectCode(formData.projectName, formData.season, existingTrials, adminProjects);
```

**Step 1.3 (lower priority, do if time allows) — backend fallback, same idea.**
`trials/models.py`, `Trial._generate_trial_code` currently does:
```python
type_code = self.TYPE_CODE_MAP.get(self.trial_type, self.trial_type[:3].upper() or 'TRL')
```
Change to look up `ConfigOption` first:
```python
from config.models import ConfigOption
cfg = ConfigOption.objects.filter(category='project_name', value=self.trial_type).first()
type_code = (cfg and cfg.comment) or self.TYPE_CODE_MAP.get(self.trial_type) or (self.trial_type[:3].upper() or 'TRL')
```
This path only runs if the frontend ever omits `trialCode` — low traffic, low risk,
but keeps the two generators in sync conceptually.

**Why this is safe:** no schema change, no migration, no change to existing stored
trial codes, no change to today's output for "IKF" / "Project Nari Shakti" (backfill
mirrors current map exactly). The only behavior change is forward-looking: a renamed
project's *next* trial code keeps the old abbreviation instead of silently switching
to a new one.

**Step 1.4 — DONE — new projects get a code at creation, not just at rename time.**
`AdminPage.jsx`'s `OptionPanel.handleAdd` now takes an `autoCode` prop (enabled only
on the Project Names panel) and sets `comment: name.substring(0, 3).toUpperCase()`
on every new project the moment it's added — the same value the old fallback would
have computed anyway, just persisted instead of recomputed each time. Without this,
Step 1.1's backfill only protects "IKF" and "Project Nari Shakti"; every project
added after deploy would still have a blank `comment` and would still drift on its
first rename. This was raised by a parallel review and verified independently
before folding it in as required, not optional.

**Admin UX nicety (optional, not required, not done):** a manual "Code" text input
in the Project Names panel so admins can override the auto-generated 3-letter code
(e.g. if two projects start with the same 3 letters). Not required — collisions are
no worse than today's behavior, where two such projects would already collide on
their code prefix.

---

## Fix 2 — CSV import for Trial Cities warns instead of silently accepting garbage

`src/components/trialCities/TrialCitiesPage.jsx`, `parseCSV` (~line 279-310)
currently accepts any string for `trialType`/`row.trialtype` with zero validation.
Per the user's "don't remove capability" steering: **do not** reject unrecognized
values — keep every import that works today working. Add a non-blocking warning
surfaced in the existing import-results UI (reuse whatever toast/results-summary
mechanism `handleBulkMenuOpen`'s flow already shows after import — read the rest of
the import handler past line 310 before adding this, it likely already returns
`{ data, errors }` that's rendered somewhere) when a row's `trialType` doesn't match
either the 5 known category options or any current `getProjectNames()` value:

```js
const KNOWN_TRIAL_TYPES = ['IKF Season Trial', 'Exclusive IKF Season Trial', 'CSR Project Trial', 'Zonals', 'Other'];
// inside the row-build loop, after pushing to `data`:
if (row.trialtype && !KNOWN_TRIAL_TYPES.includes(row.trialtype)) {
  warnings.push(`Row ${i + 1}: "${row.trialtype}" is not a standard trial type — imported as-is.`);
}
```//
Surface `warnings` alongside `errors` in whatever the import confirmation UI already
is. This doesn't block anything; it just stops silent accidental project-name leakage
into this field from going unnoticed.

---

## Fix 3 — stop crediting the cascade for fields it doesn't really touch

No code removal (per steering: don't reduce capability — the existing
`TrialCityLocation`/`WorkOrder` filters in `cascade_project_rename` are harmless and
stay as a defensive no-op for the rare row that does match). Just correct what the
UI claims happened.

`tta_backend/backend/config/views.py`, the `rename` action already returns
`cascade = {'trials': N, 'trialCities': M, 'workOrders': K}` — no change needed here,
the numbers are already accurate (they're just usually 0 for the latter two, which is
correct and fine).

---

## Fix 4 — honest success message in Admin

`src/components/admin/AdminPage.jsx`, `handleProjectRename` (~line 505-523) currently:

```js
setRenameInfo(
  `Renamed "${oldName}" to "${newName}". Updated ${c.trials || 0} trial(s), ` +
  `${c.trialCities || 0} city record(s), ${c.workOrders || 0} work order(s).`
);
```

Change to lead with what actually matters and only mention the others if nonzero,
so a normal rename (cities/WOs = 0) doesn't read as if something failed to update:

```js
const parts = [`${c.trials || 0} trial(s)`];
if (c.trialCities) parts.push(`${c.trialCities} city record(s)`);
if (c.workOrders) parts.push(`${c.workOrders} work order(s)`);
setRenameInfo(`Renamed "${oldName}" to "${newName}". Updated ${parts.join(', ')}.`);
```

---

## Execution order — DONE through step 7, step 8 pending approval

1. ✅ Backend: added + ran `backfill_project_codes` management command (Fix 1.1) —
   verified against a scratch sqlite DB: sets `comment` for rows where it's blank,
   leaves already-set rows untouched.
2. ✅ Backend: `trials/models.py` fallback lookup (Fix 1.3) — looks up
   `ConfigOption.comment` before `TYPE_CODE_MAP`/first-3-letters.
3. ✅ Frontend: `trialCodeGenerator.js` + both `TrialWizard.jsx` call sites (Fix 1.2).
4. ✅ Frontend: `AdminPage.jsx` — message change (Fix 4) AND the `autoCode`
   create-time fix (Fix 1.4, folded in from the parallel review).
5. ✅ Frontend: `TrialCitiesPage.jsx` CSV warning (Fix 2) — added a separate,
   non-blocking `bulkWarnings` state alongside the existing `bulkErrors`; only
   `bulkErrors.length` gates the disabled state on the import button, so an
   unrecognized `trialType` still imports, just with a visible heads-up.
6. ✅ Frontend cleanup: deleted dead `trialConstants.js` `PROJECT_CODES` export
   (confirmed zero importers before deleting).
7. ✅ Backend tests: added `test_comment_code_survives_rename` to
   `config/test_project_rename.py`. Full `config` + `trials` suite:
   **19/19 passing** (18 pre-existing + 1 new). Full project-wide `manage.py test`:
   208 tests, 3 failures — all three are in `payments/tests.py` / unrelated to this
   work (confirmed via `git diff` that `payments/tests.py` was already modified
   before this session, by the line-ending normalization noise identified earlier;
   none of the 3 failing tests touch `trial_type`, `project_ref`, `project_name`,
   or `ConfigOption`). Not fixed here — out of scope for this change, flagging for
   separate attention.
8. ⏳ Not done: commit backend fixes as one commit, frontend fixes as one commit
   (separate repos — do not mix), and manual click-through in a real browser
   session. **Waiting on explicit go-ahead before committing or pushing**, per
   CLAUDE.md.

## Out of scope / explicitly not doing

- No migration, no new `ConfigOption` field, no FK normalization of "Project" into
  its own model (the durable long-term fix, previously flagged, still backlogged).
- No removal of CSV free-text import or of the `trialCities`/`workOrders` cascade
  filters — both stay exactly as-is per the "don't break what users can already do"
  constraint.
- No audit-log/rename-history table (explicitly declined earlier — superadmin-only
  feature, low risk).
