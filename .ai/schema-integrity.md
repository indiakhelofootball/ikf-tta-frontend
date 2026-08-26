# Schema integrity — how tables refer to each other, and where that fails

**Written 2026-08-21.** Every claim below was read out of the files named. Where a
number came from a production measurement rather than from code, the source is
named. Re-verify before acting; this is a census, not a live monitor.

**Engine: MySQL 8.4, InnoDB, native on the host** (`_docs/deployment/DEPLOYMENT.md`,
rewritten 2026-08-15). Not MariaDB 10.1.48 — that was the box decommissioned on
24 Jul 2026. This matters here: InnoDB enforces foreign keys properly, so nothing
below is unenforced for engine reasons. It is unenforced because nobody declared it.

**The drawn version of this file** — all 20 tables, all 29 relationships, colour-coded
by constraint type — is `E:\TTA_Study\TTA-Schema-and-Architecture-2026-08-21.pdf`
(source HTML beside it). Scope there is TTA only; CSR is excluded.

This file exists because the same diagnosis has now been derived three separate
times — in the 19 Aug session transcript, in one line of `.ai/current.md`, and in
`E:\TTA_Study\TTA-Study-Orphaned-Assignments-2026-08-19.pdf` — and none of those
is a place anyone looks first.

---

## The one-sentence version

**Where the schema does not say which column is authoritative, each screen
invents its own answer.** Nothing fails loudly: a missing foreign key returns no
row, a dead column returns `''`. So somebody adds a fallback to make the screen
look populated, the fallback reads a semantically adjacent field, and the output
becomes confidently wrong instead of visibly empty.

That is not one bug. It is a generator of bugs, one per screen that has to guess.

---

## 1. How tables actually refer to each other

Three mechanisms are in use. Which one a relation got depends on **when it was
built**, not on what it needed.

### Enforced by the database

| Relation | Where |
|---|---|
| `WorkOrder -> Vendor` | `workorders/models.py:22` (`on_delete=PROTECT`) |
| `PaymentRequest -> WorkOrder`, `-> Vendor`, `-> PaymentBatch` | `payments/models.py:31,34,37` |
| `TDSEntry -> PaymentRequest` | `payments/models.py:98` (OneToOne) |
| `Shipment -> REPCityAssignment` | `courier/models.py:52` |
| `TrialCity -> Trial` | `trials/models.py:103` |
| `REPCityAssignment -> REP`, `-> Trial` | `reps/models.py:70,71` |
| all 10 CSR models, incl. `CSRProject.project -> ConfigOption` | `csr/models.py:36,57,139,142,145,167,177,188,200,205,216,262,301,318,323,330,349` |

### NOT enforced — entity references held as free text

| Relation | Held as | Joined by |
|---|---|---|
| `REPCityAssignment -> TrialCity` | `city` CharField (`reps/models.py:73`) | JS `norm()` on `(trialId, cityName)`, `TrialsReport.jsx` |
| `TrialCity -> TrialCityLocation` | `city_code` CharField (`trials/models.py:104`) | nothing — never joined at all |
| `WorkOrder -> Trial` | `project_ref` CharField (`workorders/models.py:26`) | string compare; orphans detected at report time by `flagEngine.js:147` |
| `WorkOrder -> TrialCity` | `project_city` CharField (`workorders/models.py:29`) | string compare |
| `Trial.trial_type -> ConfigOption` | value string | `config/views.py:28` on rename only |
| `Vendor.vendor_type`, `Vendor.tds_type -> ConfigOption` | value strings | `config/views.py` cascades |
| `TrialCityLocation.trial_type -> ConfigOption` | value string | `config/views.py:29` |
| `TrialCityLocation.assigned_rep -> REP` | name string (`trialcities/models.py:18`) | nothing |
| `TDSRecord.work_order_number -> WorkOrder` | copied string (`payments/models.py:107`) | nothing — the FK to `PaymentRequest` is real, this column is a duplicate label |
| `OTPCode.phone -> User.phone` | phone string (`otp/models.py:5`) | string compare; low risk because `User.phone` is `unique`, but a number change orphans outstanding codes |
| `Trial.created_by`, `TrialCity.assigned_by` | email strings | audit only, never joined |

Deliberate exception, not a defect: `Shipment.snap_*` (`courier/models.py:60-72`)
are **frozen snapshots** — a historical record of where a parcel was actually
sent. They are supposed to be copies. See `courier-address-one-truth` memory.

---

## 2. Unique keys — we have them, which is what makes this avoidable

| Table | Key |
|---|---|
| `TrialCityLocation` | `code` **unique=True** (`trialcities/models.py:13`) |
| `Trial` | `trial_name` unique, `trial_code` unique (`trials/models.py:35,36`) |
| `TrialCity` | `unique_together ('trial', 'city_code')` (`:118`) |
| `REP` | `rep_name` unique (`reps/models.py:12`) |
| `REPCityAssignment` | `unique_together ('rep', 'trial', 'city')` (`:102`) |
| `WorkOrder` | `work_order_number` unique; `unique_together ('work_order','period_number')` |
| `PaymentRequest` / `PaymentBatch` | `request_number` / `batch_number` unique |
| `Shipment` | `ref_number` unique |
| `ConfigOption` | `unique_together ('category','value')` |
| `ModulePermission` | `UniqueConstraint ('user','module')` |

**`TrialCity.city_code` already points at a `unique=True` column.** That relation
could become a real FK today with no data cleanup at all. It is the cheapest one
on this page and nobody has to answer a question first.

### The gap

**`Vendor` has no unique constraint of any kind** (`vendors/models.py:70-77` —
four plain indexes, nothing unique). Not on `vendor_name`, not on `pan_number`.
PAN is the legal identity used for TDS filing, and two rows may carry the same
one. Not known to have happened; nothing prevents it.

---

## 3. Why the foreign keys are missing

Two different answers. Only the second is a decision.

### It was never decided — it is spreadsheet residue

`reps/migrations/0001_initial.py:20,57` — the original REP table:

    ('city', models.CharField(max_length=100)),
    unique_together={('rep_name', 'city')}

A REP *was* one row per city. City was a text attribute of a person, exactly as
in a spreadsheet column. There was no city entity to point at.

`reps/migrations/0014_create_repcityassignment.py:35,36` extracted the assignment
table and added FKs for `rep` and `trial` — **because REP and Trial already
existed as Django models** — while `city` was carried across unchanged at line 18
and given a plain index at line 41.

So: FK presence correlates with *"did this entity already exist as a model"*,
not with any judgment about what needed enforcing.

### The denormalisation that made it dangerous

`trials/migrations/0001_initial.py` created `TrialCity` as a clean link row —
`trial` FK plus `city_code`, nothing else. Correct shape.

`trials/migrations/0003_add_per_trial_city_fields.py` then copied `city_name`,
`state`, `region` and `ground_location` onto it, commented in the model as
"Per-trial city data — independent for each project" (`trials/models.py:107`).

**That migration is where the city master stopped being the source of truth.**
Once the name lives on `TrialCity` as well, it can drift from
`TrialCityLocation.city`, and nothing objects. It is what makes the rename path
possible: `city_code` stays, `city_name` moves, every assignment holding the old
spelling orphans instantly with nothing deleted.

`REPCityAssignment` then re-declares `state` a third time (`reps/models.py:72`).

### Where it WAS decided, the reasoning is recorded — and it says FK

`csr/models.py:16-31`, verbatim:

> "`project` is a REFERENCE, not a copy. The project catalog is already a table —
> ConfigOption rows with category='project_name' — so storing the name again here
> would put one string in two places. Keeping those two in step is exactly what
> `config.views.RENAME_CASCADES` exists to paper over for the older tables that do
> copy it (`Trial.trial_type`, `WorkOrder.project_ref`, `Vendor.vendor_type`).
> Referencing the row instead means a rename is simply a rename: nothing to
> cascade, nothing to drift... **The older tables are not worth migrating for this;
> a new column has no such excuse.**"

CSR was built to that rule throughout and has had none of these failures.

### The cost is already being paid, in Python

`config/views.py:11-31` — `cascade_project_rename`, whose own docstring states:

> "A project name is stored as plain text on each record at creation (no FK), so
> a rename must update each table."

It walks `Trial.trial_type`, `TrialCityLocation.trial_type` and
`WorkOrder.project_ref`. Three more cascades exist for `service_type`,
`entity_type` and `partner_category` (`config/views.py:86-91`).

**That is a foreign key reimplemented by hand, which only fires when someone
renames through the one endpoint that calls it.** Django admin, `manage.py
shell`, a data import or any endpoint written next year bypasses it entirely.
And there is no cascade for cities at all — which is precisely why renaming a
city orphans assignments silently.

### The recent decision was to defer, not to omit

19 Aug, in session `6d425ca5`: "we can't do anything, the ongoing logic we need
to keep it as it is" (15:36) and "solve this issue asap without changing any
logic or data flow" (15:41). Guards shipped instead of the FK. That remains the
standing instruction.

---

## 4. Duplicate and dead columns

Same disease, one level down: more than one column can answer one question, and
nothing says which wins.

| Question | Columns that could answer it | Filled on production |
|---|---|---|
| Where is the ground? | `REPCityAssignment.physical_address` · `REPCityAssignment.ground_location` · `TrialCity.ground_location` · `TrialCityLocation.ground_location` | **55 · 0 · 0 · 0** |
| What is the ground PIN? | `REPCityAssignment.pin_code` · `.ground_pin_code` | **51 · 0** |
| What state is this city in? | `TrialCityLocation.state` · `TrialCity.state` · `REPCityAssignment.state` | all three writable, none authoritative |

Fill rates measured 2026-08-19 against production — see
`project_address_truth_2026_08_19` memory for the method.

Two live consequences:

- `REPCityAssignment.pin_code` and `.ground_pin_code` sit under the same
  `# Ground / Trial Location` comment (`reps/models.py:87-93`), and the form
  renders only `pin_code`, inside a section headed **"Trial Ground Location"**
  (`REPModal.jsx:1185,1196`). `ground_pin_code` has no rendered input anywhere.
  Any code treating `pin_code` as "the REP's personal PIN" is wrong — there is no
  such field; the two other PIN inputs are both `courierPinCode`.
- `trials/views.py:129` hardcodes `ground_location=''` on the add-single-city
  endpoint, while `trials/serializers.py:207,261,283` accept and persist it and
  `CityModal.jsx:647` renders a real input for it. One write path silently
  discards what the other three save.

---

## 5. Open finding — `project_ref` means two different things

Not yet confirmed against the running app. Flagged, not fixed.

- `WorkOrderModal.jsx:171` filters trials by `t.trialType === form.projectRef`
  → `project_ref` holds a **project name**.
- `config/views.py:30` agrees, matching `project_ref=old_value` against project
  names during a rename cascade.
- `flagEngine.js:129` builds `trialCodes` from `t.trialCode` (`TRL-S6-IKF-001`)
  and `:147` raises `WO_ORPHAN_TRIAL` for any WO whose `projectRef` is not in
  that set.

A name can never equal a code, so on the face of it **every work order carrying a
project tag should be raising `WO_ORPHAN_TRIAL`**. Two modules, two readings of
one untyped string, and no schema to arbitrate.

Also: `WorkOrderModal.jsx:850` uses `onInputChange`, so `projectRef` accepts
arbitrary typed text, not only catalogue values.

`flagEngine.js` is itself the evidence this pattern is systemic — somebody hit
the identical failure in the payments chain and built a report-time detector
rather than a constraint.

---

## 6. What to do, in the only order that works

1. **`TrialCity.city_code -> TrialCityLocation.code`** — target is already unique,
   no data question to answer, no team input needed. Cheapest real FK available.
2. **Resolve the four orphans** (#21 Kota, #22 Bikaner, #23 Chittaurgarh,
   #75 Thiruvananthapuram). Blocked on one team answer: *should those trials run
   in those cities?* `audit_orphan_assignments --repoint <id>` handles three;
   #22 is genuinely ambiguous and the command refuses to guess.
3. **`REPCityAssignment.city -> TrialCity`** — the FK this whole thread is about.
   **Physically cannot run before step 2**: a non-null FK migration will not
   complete while four rows point at cities that do not exist. Measured blast
   radius ~10 backend read sites and ~65 frontend across 8 files, but if the
   serializer keeps emitting `city` as a plain string (`source=` or a method
   field), the wire format is unchanged and **the frontend needs zero edits.**
   Drags in dropping the now-redundant `REPCityAssignment.trial` and the
   `state`/`region` duplication.
4. **Confirm or dismiss the `project_ref` finding** (§5), then decide whether
   `WorkOrder -> Trial` becomes an FK or `project_ref` gets a documented meaning.
5. **A unique key on `Vendor`** — `pan_number`, most likely. Needs a duplicate
   check on production first.

Application-level guards are not a substitute for any of this. They live in
serializers and views, so the admin, the shell, a queryset `.delete()` and any
future endpoint bypass them. Only a foreign key makes the invalid state
unrepresentable.

---

## Related

`.ai/current.md` (what is in flight) · `.ai/design.md` (architecture) ·
`E:\TTA_Study\TTA-Study-Orphaned-Assignments-2026-08-19.pdf` (the same failure
written for a non-technical reader) · memories `schema-integrity-census`,
`orphaned-rep-assignments`, `address-truth-2026-08-19`,
`courier-address-one-truth`.
