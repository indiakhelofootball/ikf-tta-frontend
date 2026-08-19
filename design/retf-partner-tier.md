# RETF partner tier — design

Status: **design only, nothing built.** Investigation date 2026-08-19.
Scope: a third external audience — "RETF partners" — who get a read-only view of a CSR
project with the contract and the money withheld.

---

## 0. Where the requirement comes from

Two recordings, read in full.

`D:\CSR\transcrip[t\transcripts_v2\transcripts_v2\CSR_REC_1.txt` (single paragraph, ~1.6 KB;
the back half is ASR garbage — "So, this is how it works" repeated, then a colour-of-text
monologue and "Welcome to our Channel". Only the first ~40% is signal):

> "So that we can restrict the view of the project to someone else. Because you are starting to
> develop the CSR module… But you are giving the full CSR view, right? Yes, I am giving the full
> CSR view. So can you bifurcate the CSR view? Yes, I can… **He doesn't want to show the
> financials to everyone.**"

`CSR_REC_2.txt` (473 bytes, all signal):

> "CSR is one module or multiple module? We are making two modules for CSR. First module will be
> organized by you all. Second module will be organized by CSR. **CSR is a client of ours, who is
> giving money, he has all the access**… But in CSR, **there are many multiple partners, which are
> RETF partners, they want to give a view to it, but in that they don't want to show the
> contract.**"

Owner decision, 2026-08-19, verbatim: **"JUST THE RETF. AND THEIR JUST VIEWS LETS KEEP ANOTHER
SCREEN FOR THEM."**

So the audience is settled (RETF partners only, not a general partner framework), the mode is
settled (read-only), and the placement is settled (a separate screen, not a variant of the
funder portal).

### This requirement reached none of the three specs

It is absent from `CSR_Module_Design_Review.docx`, `CSR_VISUAL_FLOW.pdf`, and
`CSR_VISUAL_FLOW (1).pdf`. It survives in exactly one internal document, as an open question:

- `_docs/planning/CSR_COMPLETE_REFERENCE.md:120-135` — §7 "Partner access — TO CONFIRM
  (low-confidence source)", which asks the two questions this document now answers.
- `_docs/planning/CSR_COMPLETE_REFERENCE.md:281-283` — Q5: "is the contract-hidden 'partner' view
  a **distinct role** (e.g. `CSR_PARTNER`) or a **per-row visibility flag**?"
- `_docs/planning/CSR_ARCHITECTURE.md:149` — "Roles `CSR_CLIENT`/`CSR_PARTNER` deferred — they're
  external and partner-shape is unresolved."
- `_docs/planning/CSR_ARCHITECTURE.md:155` — the client/partner surface row, marked
  "🟡 partner = role vs flag".

**What got built instead is not this.** `CSRReport.visible_to_client`
(`tta_backend/backend/csr/models.py:142`), enforced at `csr/client_views.py:72`, is a per-record
boolean. It answers "is this one report published yet". It cannot answer "this audience sees
everything except the contract", because it carries one bit per row and implies exactly one
external audience. It has been standing in for the requirement because it looks like access
control. Extending it — a second boolean `visible_to_partner` — is explicitly not proposed here;
see §6.

### What already exists and must not be built twice

`ClientDeliverableSerializer` (`csr/client_serializers.py:81-115`) was already written to the
RETF standard. Its docstring at `client_serializers.py:82-101` cites the partner transcript by
name and explains that the contract may not be traversed to. Its guard tests
(`csr/tests.py:1471-1680`) already prove contract-absence at every depth. **The partner's
deliverable view is done — it is the funder's deliverable view, unchanged.** The new work is
the project header, the activity gate, and the boundary plumbing.

---

## 1. How the boundary works today (read, not assumed)

### 1.1 The structural deny — role-based, deliberately

`tta_backend/backend/permissions/enforcement.py:33-46`:

```python
EXTERNAL_ROLES = frozenset({'CSR_CLIENT'})

def is_external_client(user):
    return bool(user and user.is_authenticated
                and getattr(user, 'role', None) in EXTERNAL_ROLES)
```

Consumed at:

- `enforcement.py:66` — `ModulePermission.has_permission` denies **before any grant lookup**.
- `enforcement.py:116` — `ReadOpenModulePermission` denies even open config reference reads.
- `permissions/views.py:119` — external roles excluded from the grant-grid user list.
- `permissions/views.py:157` — grants cannot be written onto an external account (400).
- `permissions/views.py:219` — an external account cannot file an access request (403).
- `permissions/views.py:268` — a legacy access request from an external account cannot be
  approved (400).

The asymmetry named in the brief is real and is documented in the code itself
(`enforcement.py:33-38`): internal RBAC is **grant-driven and role-blind** — `ModulePermission`
never asks what role you are, only what grant row you hold (`enforcement.py:49-54`, `77-92`);
`registry.MODULES` (`permissions/registry.py:30-31`) carries `csr` and `csr_certificate` as
grants, and `CSROpsInternalRoleTests` (`permissions/tests.py:174-200`) exists specifically to
prove `CSR_OPS` gets its access through grants and not through its name. The **external**
boundary is the one place where the role name is load-bearing, on purpose: it is the guarantee
that a stray grant row, a mis-approved request, or a manual DB edit cannot hand an outsider
internal access.

### 1.2 The external gate

`csr/client_permissions.py:8-41` — `IsCSRClient`:

- `client_permissions.py:15` — exact string compare `role != 'CSR_CLIENT'` → deny.
- `client_permissions.py:18` — no `csr_client_profile` → deny (fail closed).
- `client_permissions.py:20-41` — object permission resolves the owning project id and compares
  it to `profile.project_id`. Note the deliberate `isinstance(obj, CSRDeliverable)` branch at
  `:37` and the reasoning at `:26-34` about the `or obj.id` fallback and id-space collision.

### 1.3 The external surface

`csr/urls.py:44-51` registers four read-only viewsets under `/api/client/`, plus two branding
routes at `csr/urls.py:67-74`. `csr/client_views.py:34-35` fixes every one of them to
`ReadOnlyModelViewSet` + `[IsAuthenticated, IsCSRClient]`, and every `get_queryset` hard-scopes
to `_client_project_id(user)` (`client_views.py:29-31`) with a `.none()` fail-closed branch.

`csr/urls.py:35-37` keeps `csr/work-orders` and `csr/deliverables` on the org surface only —
the contract has no external route at all.

### 1.4 The allowlist serializers (the pattern to copy)

`csr/client_serializers.py:12-15` states the rule: fields are opted IN by hand, never
`__all__`, never a subclass of an internal serializer.

| Serializer | file:line | Emitted fields |
|---|---|---|
| `ClientProjectSerializer` | `client_serializers.py:43-53` | `id, name, clientName, sanctionedAmount, startDate, endDate, status, description` |
| `ClientActivitySerializer` | `client_serializers.py:56-63` | `id, title, activityType, date, startDate, endDate, location, status` |
| `ClientReportSerializer` | `client_serializers.py:66-78` | `id, fileName, fileUrl, createdAt` |
| `ClientDeliverableSerializer` | `client_serializers.py:81-115` | `id, title, status, targetCount, completedCount, dueDate` |
| `ClientBrandingSerializer` | `client_serializers.py:18-40` | `slug, displayName, logoUrl, loginImageUrl, primaryColor, secondaryColor` |

### 1.5 The link model

`csr/models.py:264-273`:

```python
class CSRClientUser(models.Model):
    user    = models.OneToOneField(AUTH_USER_MODEL, related_name='csr_client_profile')
    project = models.ForeignKey(CSRProject, related_name='client_users')
```

**One user → exactly one project** (OneToOne on user), **many users → one project** (FK on
project). Provisioned admin-only by `CSRClientOnboardView` (`csr/views.py:254-315`), which
creates the user with `role='CSR_CLIENT'` at `views.py:308` and the link at `:310`, inside one
transaction.

White-labelling: `CSRClientBranding` (`csr/models.py:290-310`) is `OneToOneField(CSRProject)` —
**branding is per project, not per external user.** A partner and a funder on the same project
therefore already share one skin. That is probably correct and costs nothing; it does mean a
partner cannot be given its own logo without changing the cardinality.

### 1.6 The isolation tests — what they actually enforce

`csr/tests.py:1454-1468` defines `_walk_payload(node, keys, values)`: it recurses dicts, lists
and tuples and collects **every key at any depth** and **every non-null scalar at any depth**.
The docstring states why: "Absence has to be proved against what the API actually EMITS, not
against `Meta.fields`: a SerializerMethodField, a nested serializer or a `__str__` can
reintroduce a contract detail that a declared-field check would pass."

`ClientDeliverableProgressTests` (`csr/tests.py:1471-1680`) then asserts, against a fixture
whose contract fields are all seeded with the literal token `Sekrit`/`CSR-WO-`:

- `:1543` — the payload's key set is **exactly** the six allowlisted keys.
- `:1547-1580` — 27 forbidden keys absent from `keys`, 10 forbidden values absent from `values`,
  over both the list and the detail route, and finally a substring sweep of the whole
  key+value blob for `sekrit`, `Sekrit`, `CSR-WO`.
- `:1582-1590` — the contract stays 403 even if its id is guessed.
- `:1592-1606` — cross-project scoping: another funder's rows are absent, 404 by id, and each
  funder sees only its own.
- `:1612` — a client user with no project link is 403.
- `:1618` — an internal `ADMIN` is 403 on the client surface.
- `:1622` — anonymous is 401/403.
- `:1625-1638` — POST/PATCH/DELETE all rejected and the row unchanged.
- `:1640-1655` — `assertFalse(issubclass(ClientDeliverableSerializer, CSRDeliverableSerializer))`
  plus an assertion that the internal serializer really does expose more, so the test cannot
  pass vacuously.

And on the RBAC side, `permissions/tests.py:109-171` (`ExternalClientBoundaryTests`) seeds a
`payments` view+edit grant row onto a `CSR_CLIENT` and proves the deny holds anyway
(`:129-133`), that config reads are denied (`:135-137`), that the grant cannot be written
(`:139-146`), that the account is invisible in the grant grid (`:148-153`), that it cannot file
a request (`:155-160`), and that a legacy request cannot be approved onto it (`:162-171`).

**A new external role must satisfy every one of these, with its own fixtures.** Copying the two
test classes and swapping the role string is the honest minimum.

### 1.7 The frontend

- Roles: `src/auth/roles.js:3-9` (`ROLES`), `:83-195` (`ROLE_PERMISSIONS`). `CSR_CLIENT` has an
  explicit empty entry at `:189-194`, and the comment at `:178-180` spells out the trap:
  "AuthContext falls back to `ROLE_PERMISSIONS.REP` for any role it does not recognise, so
  without this a CSR operator would silently log in with a REP's permissions and nothing would
  report it." The fallback is at `src/auth/AuthContext.jsx:257` and `:311`
  (`ROLE_PERMISSIONS[userFromBackend.role] || ROLE_PERMISSIONS.REP`).
- External detection on the client: `AuthContext.jsx:17` —
  `const isExternalRole = (role) => role === ROLES.CSR_CLIENT;` — a single-value equality, used
  at `:76` (skip the grants + config fetch, which also keeps `/permissions/me/` out of the
  funder bundle) and `:112` (skip the landing redirect) and `:127`.
- Login door: `src/auth/loginDoor.js:18` `CSR_CLIENT_ROLE`, used at `:35` to route an expired
  or signed-out funder back to `/client/<slug>/login`.
- Bundle: `src/client-index.js` mounts `src/ClientApp.jsx` only. `ClientApp.jsx:1-7` states the
  guarantee: "route-gating hides data, this hides the code." `ClientApp.jsx:21` gates the portal
  on `user?.role !== ROLES.CSR_CLIENT`. Routes at `:56-60`: `/client/:slug/login` and `/client`.
- Build: `package.json:52` `build:client` → `craco.config.js:14-16` swaps the webpack entry to
  `src/client-index.js` when `REACT_APP_TARGET=client`, output to `build-client/`, then
  `scripts/sanitiseClientBuild.js` strips `templates/`, `service-worker.js`,
  `asset-manifest.json`, rewrites `manifest.json` scoped to `/client`
  (`sanitiseClientBuild.js:34-64`), then `scripts/verify-client-build.sh` fails closed on source
  maps (`:27-32`), on **any path literal outside the allowlist** (`:53-62`), on internal
  `templates/` (`:67`), on the internal PWA manifest (`:71`), and on internal component names
  (`:75`). The allowlist regex at `verify-client-build.sh:53`:
  `^"/(client(/[a-z:-]+)*/?|auth/(login|change-password|token/refresh)/)"$`.
- Deploy: `_docs/deployment/DEPLOYMENT.md:174-180` — the Dockerfile runs both builds and copies
  `build-client` to `/usr/share/nginx/html/client`, with dedicated `/client` nginx blocks.
- What the funder actually sees on screen: `src/components/client/ClientPortalPage.jsx:124-128`
  — four tabs (My Project / Activities / Reports / Deliverables); `:135` renders
  **`Sanctioned ₹{project.sanctionedAmount}`**, which is precisely the field the owner says must
  not be shown to everyone.

---

## 2. What an RETF partner sees, field by field

The client names two things: **the contract** (explicit, `CSR_REC_2`) and **the financials**
(general, `CSR_REC_1`). The contract is already absent from the whole external surface — no
route (`csr/urls.py:35-37`), no field, no traversable relation (`client_serializers.py:82-101`).
So the contract is not the work. **The work is the money**, which today is on the funder's
project header.

### 2.1 Project header — `ClientProjectSerializer` (`client_serializers.py:43-53`)

| Field | Model source | Funder | RETF | Reasoning |
|---|---|---|---|---|
| `id` | `CSRProject.pk` | ✅ | ✅ | Needed to address the record; it is not a secret. |
| `name` | `models.py:12` | ✅ | ✅ | The project is what they are being shown. |
| `clientName` | `models.py:13` | ✅ | **⚠ ambiguous** | This is the funder's identity, not a financial. See §2.5 Q2. |
| `sanctionedAmount` | `models.py:14` | ✅ | ❌ **withhold** | The grant value. This is "the financials" in one number. |
| `startDate` / `endDate` | `models.py:15-16` | ✅ | ✅ | Programme window, not a contract term. The same argument already justified `dueDate` on the deliverable (`client_serializers.py:105-109`). |
| `status` | `models.py:17` | ✅ | ✅ | Active/Closed. No money in it. |
| `description` | `models.py:18` | ✅ | **⚠ recommend withhold** | Free text an internal user writes. `client_serializers.py:98-100` already dropped `description` from the deliverable for exactly this reason: "free text is where contract terms get pasted." The same risk applies verbatim here. See §2.5 Q3. |

RETF project header, recommended: `id, name, startDate, endDate, status` (+ `clientName` if Q2
resolves that way).

### 2.2 Activities — `ClientActivitySerializer` (`client_serializers.py:56-63`)

`id, title, activityType, date, startDate, endDate, location, status` — **no money, no contract,
reuse as-is.** This is the substance of what a partner is being shown.

**But the queryset is wrong for a partner.** `ClientActivityViewSet.get_queryset`
(`client_views.py:55-61`) filters `reports__visible_to_client=True` — an activity is visible only
once a report has been published to the funder. If RETF does not get reports (§2.3), a naive
copy of this viewset returns **zero activities to every partner, forever**. The partner portal
would be empty by construction and would look like a bug, not a policy. This is the single most
likely way to ship a broken RETF screen.

Options for the partner activity gate:
- **(a)** `status='Completed'` — the activity happened, so it can be shown. Simple, needs no new
  field, and matches "they want to give a view to it".
- **(b)** a new `CSRActivity.visible_to_partner` boolean — an explicit editorial gate, but it is
  a second per-record boolean of the kind §6 argues against, and it puts a manual step between
  an activity happening and a partner seeing it.
- **(c)** all activities on the project, unfiltered. Maximum freshness, zero editorial control;
  a "Planned" activity that is later cancelled has already been shown.

Recommendation: **(a)** for the MVP. It is a rule, not a per-row switch, and it needs no
migration. Flag it for the owner rather than deciding it silently.

### 2.3 Reports — `ClientReportSerializer` (`client_serializers.py:66-78`)

`fileUrl` is an **external link** (`models.py:131-134`, the Drive convention). No serializer can
redact the inside of a PDF. A report written for the funder may quote the sanctioned amount, the
utilisation, or the contract reference in its first paragraph, and the allowlist is powerless
against that.

So reports are not a serializer problem, they are an editorial problem, and `visible_to_client`
is single-axis (§6).

Recommendation: **omit the Reports tab from the RETF MVP entirely.** Stated as a deliberate
omission, not an oversight. If the owner wants partners to receive documents, the honest build
is a `CSRReport.audience` field (`Internal` / `Funder` / `Funder + Partner`) — one field
replacing the boolean, not a second boolean beside it — plus an explicit instruction to the CSR
team that a partner-audience report must not quote grant figures.

### 2.4 Deliverables — `ClientDeliverableSerializer` (`client_serializers.py:81-115`)

`id, title, status, targetCount, completedCount, dueDate`. **Already built to the RETF standard,
already tested to it, reuse unchanged.** Do not write a second serializer for this.

### 2.5 Utilisation certificate

`UtilisationCertificateView` (`csr/urls.py:62-66`) is gated by the `csr_certificate` **grant**
and is not on the `/api/client/` surface at all. It is the funder's statutory evidence and is
entirely made of money. **Withheld from RETF; no work needed, just don't add a route.**

### 2.6 Ambiguities to put to the owner

- **Q1 — what is "RETF"?** Still unidentified (`CSR_COMPLETE_REFERENCE.md:131-132`, `:314-315`,
  `:354`). It may be an organisation, a partner category, or a mistranscription. **Do not name
  any model, role, or route `RETF`.** Name them `partner`; RETF is then a partner, whatever it
  turns out to be. This costs nothing now and avoids a rename migration later.
- **Q2 — does a partner see the funder's name (`clientName`)?** Not addressed in either
  recording. Showing it is arguably the point ("this programme is funded by X"); hiding it is
  the conservative read of "restrict the view". Recommend **show**, because a partner working on
  a grant already knows whose grant it is, and hiding it makes the header nearly contentless.
- **Q3 — `description`:** withhold (consistent with the deliverable precedent) or show? Recommend
  **withhold in the MVP**, and offer a separate `partner_summary` text field later if the owner
  wants prose on that screen.
- **Q4 — "the contract" narrow or broad?** Narrow = `CSRWorkOrder` and its file. Broad =
  contract + all money. `CSR_REC_1`'s "he doesn't want to show the financials to everyone"
  settles it as **broad**, and broad is a superset of narrow, so building broad cannot
  under-deliver.
- **Q5 — one project per partner login, or many?** See §4.

---

## 3. Role, or variant of the existing external client?

**A new role: `CSR_PARTNER`.** Argued from the code, not from preference.

### The case against a flag on `CSRClientUser`

Suppose `CSRClientUser.is_partner = BooleanField(default=False)` and the user keeps
`role='CSR_CLIENT'`. Then:

1. `IsCSRClient.has_permission` (`client_permissions.py:15`) checks `role != 'CSR_CLIENT'` and
   **passes**. Every one of the four existing funder viewsets (`csr/urls.py:45-51`) immediately
   serves a partner the full funder payload, `sanctionedAmount` included, until each viewset is
   individually retro-fitted. The default is **open**.
2. Every future `/api/client/` route inherits that default. Someone adding a fifth funder
   endpoint in six months has to remember the flag exists.
3. `permissions/enforcement.py:39` continues to deny correctly (both audiences are
   `CSR_CLIENT`), so the internal boundary is fine — but the *external field* boundary, which is
   the entire requirement, is fail-open.
4. `ClientApp.jsx:21` gates on the role, so a partner lands on `ClientPortalPage` — the funder
   screen with `Sanctioned ₹…` at `ClientPortalPage.jsx:135`. Directly contradicts "another
   screen for them".

### The case for `CSR_PARTNER`

1. `IsCSRClient`'s exact-string compare at `client_permissions.py:15` now **denies** a partner on
   every existing funder route, on day one, with no edits to any funder viewset. The default is
   **closed** — the same property that makes `EXTERNAL_ROLES` worth having.
2. Adding `'CSR_PARTNER'` to `EXTERNAL_ROLES` (`enforcement.py:39`) is a **one-line change** that
   propagates the full internal deny to six call sites for free: `enforcement.py:66`, `:116`,
   `permissions/views.py:119`, `:157`, `:219`, `:268`. No new logic, no new place to forget.
3. The role-blindness objection does not apply. Internal RBAC is role-blind because internal
   access is *granted per module per person*. A partner holds **no grants at all** and never
   will — `permissions/views.py:157` will refuse to write one. There is nothing for the
   grant system to express here.
4. It is what the codebase already anticipated: `CSR_ARCHITECTURE.md:149` and `:208` name
   `CSR_PARTNER` as the deferred role, and `CSR_COMPLETE_REFERENCE.md:169` says the roles were
   added "via an additive `AlterField`" — the pattern is established.

### The migration

`accounts/models.py:46-52` currently lists five choices. Adding a sixth is an additive
**`AlterField`** on `accounts.User.role`, exactly like
`accounts/migrations/0004_alter_user_role.py`, whose sole operation is:

```python
migrations.AlterField(model_name='user', name='role',
    field=models.CharField(choices=[…five…], default='REP', max_length=20))
```

`max_length=20` already fits `CSR_PARTNER` (11 chars). No data migration, no backfill; existing
rows are untouched because `choices` is not a DB constraint in MySQL/MariaDB.

---

## 4. Linking a partner to a project

`CSRClientUser` (`models.py:264-273`) is `OneToOneField` on `user` → **one login can reach
exactly one project.** The recording says "there are **many multiple partners**" — many partners
per project, which `CSRClientUser` already supports via the FK on `project`. It does **not** say
whether one partner spans several grants.

### Option A — reuse `CSRClientUser` with the new role

Cheapest: `CSRPartnerPermission` reads the same `csr_client_profile`, and
`CSRClientOnboardView` (`csr/views.py:271-315`) gains a `role` parameter. But
`related_name='csr_client_profile'` becomes a lie for a partner, `CSRClientOnboardView.get`
(`views.py:263-269`) now mixes two audiences in one admin list, and a partner working on three
grants needs **three separate logins with three passwords**. Reversing that later is a data
migration plus edits to every guard.

### Option B — a separate `CSRPartnerUser`, non-unique on user (recommended)

```
CSRPartnerUser
  user     FK(AUTH_USER_MODEL, related_name='csr_partner_links')   # FK, not OneToOne
  project  FK(CSRProject,      related_name='partner_users')
  unique_together = (user, project)
```

Why FK rather than OneToOne on `user`, when the funder model chose OneToOne: because the
single-project assumption is baked into **three** places that would all have to change later —
`_client_project_id()` returning one scalar (`client_views.py:29-31`), every `get_queryset`
filtering `id=pid` / `project_id=pid` (`client_views.py:43, 57, 72, 91`), and
`has_object_permission` comparing `owner_project_id == profile.project_id`
(`client_permissions.py:41`). Building the partner side on a **set of project ids** from the
start costs one `values_list` and an `__in` instead of an `=`, and removes the migration
entirely. If it turns out RETF is always one-grant, the set has one element and nothing is lost.

A separate model also keeps the two audiences separately listable in the admin UI, and keeps the
funder's `csr_client_profile` semantics honest.

### Provisioning

Mirror `CSRClientOnboardView` (`csr/views.py:254-315`): admin-only (`views.py:259-261`),
`validate_password` (`:294-297`), one `transaction.atomic` creating the user with
`role='CSR_PARTNER'` and the link row. A partner spanning several grants is then N link rows
against one user, created one at a time.

---

## 5. Which bundle?

This is the biggest question, so state the guarantee precisely first. G3
(`ClientApp.jsx:1-7`, `craco.config.js:3-10`) says: **an external viewer must not receive
internal staff code.** It does not say "an external viewer must receive only the code for their
own screen." Funder and partner are both external. Sharing a bundle between them does not
weaken G3 as written.

### Option 1 — put RETF in `build-client` (recommended)

Add `PartnerPortalPage.jsx` beside `ClientPortalPage.jsx`, a route in `ClientApp.jsx`, and a
`RequirePartner` guard beside `RequireClient`.

For:
- Zero new deploy surface. `DEPLOYMENT.md:174-180` already runs two builds, copies
  `build-client` to `/usr/share/nginx/html/client`, and needs dedicated nginx blocks
  (`DEPLOYMENT.md:202` records what breaks when they are missing). A third build means a third
  set of all of that plus a third sanitiser and a third verify script.
- Keep the partner API under `/api/client/partner/…` and the routes under `/client/partner/…`
  and `verify-client-build.sh:53`'s allowlist — `^"/(client(/[a-z:-]+)*/?|…)"$` — **already
  matches them unchanged.** Any partner path that strays outside `/client/` fails the build
  automatically. That is a guard working for us, not an obstacle.
- The whole isolation apparatus (sanitiser, verify, robots, scoped manifest) applies for free.

Against, stated honestly:
- The partner's bundle then contains the funder's Overview markup, including the string
  `sanctionedAmount` and the `₹` formatter at `ClientPortalPage.jsx:135`. This is **not a data
  leak** — the server never sends that field to a partner (§3, point 1) — but it is a departure
  from "the bundle contains only what this viewer may see". Anyone reading the JS learns that a
  sanctioned amount exists, which they already knew.

### Option 2 — a third bundle `build-partner`

The purist reading of G3. Buys code-level separation between two external audiences.

Cost: a third webpack entry, a third `craco` branch, a third sanitiser, a third verify script, a
third nginx location, a third Docker copy step, a third `PUBLIC_URL`. Roughly a day of deploy
plumbing plus permanent maintenance, in exchange for hiding a field *name* from someone who
cannot fetch its *value*.

Take this only if the owner wants the code-level guarantee restated for partners. It is not
required by anything in the recordings.

### Option 3 — the internal bundle

Rejected. It puts an external audience inside the staff app, contradicts the entire
`EXTERNAL_ROLES` design (`enforcement.py:33-38`), and would drag internal route literals past
nothing at all, since the internal build has no verify script.

### The guard, precisely

`ClientApp.jsx:17-52`'s `RequireClient` gates on `user?.role !== ROLES.CSR_CLIENT`. Do **not**
widen that to `[CSR_CLIENT, CSR_PARTNER].includes(role)` — that single edit would put a partner
on the funder screen. Add a parallel `RequirePartner` with its own exact-match compare, and give
each route its own guard. Two exact compares, never one set membership.

---

## 6. Why the `visible_to_client` toggle cannot be extended

`CSRReport.visible_to_client` (`models.py:142`) is one bit, per record, with one external
audience implied by its name. The RETF rule is the opposite shape: **one audience, all records,
a per-field rule.** No number of per-record booleans expresses "this viewer never sees
`sanctionedAmount`" — the amount lives on `CSRProject`, of which there is exactly one row per
grant, so a boolean there would be a global on/off switch for the funder too.

Adding `visible_to_partner` beside it produces a 2×N boolean matrix that a CSR operator must
maintain by hand on every report, with no default that is safe in both directions. If reports
ever need partner distribution, replace the boolean with a single `audience` choice field
(§2.3), so there is one answer per record rather than two independent ones.

---

## 7. Minimum viable version

The owner said "just views". The smallest honest build:

**Backend**
1. `accounts/models.py:46-52` — add `('CSR_PARTNER', 'CSR Partner')`; one `AlterField` migration
   modelled on `accounts/migrations/0004_alter_user_role.py`.
2. `permissions/enforcement.py:39` — `EXTERNAL_ROLES = frozenset({'CSR_CLIENT', 'CSR_PARTNER'})`.
   One line; six call sites follow.
3. `csr/models.py` — `CSRPartnerUser` (§4 Option B) + migration `0007_csrpartneruser`.
4. `csr/partner_permissions.py` — `IsCSRPartner`, mirroring `client_permissions.py:8-41` but
   resolving a **set** of project ids and comparing with `in`.
5. `csr/partner_serializers.py` — `PartnerProjectSerializer`
   (`id, name, startDate, endDate, status`), and **import** `ClientActivitySerializer` and
   `ClientDeliverableSerializer` unchanged. Do not subclass any of them.
6. `csr/partner_views.py` — three read-only viewsets scoped by `project_id__in`; the activity
   one uses the §2.2(a) gate, not `reports__visible_to_client`.
7. `csr/urls.py` — register under `client/partner/project`, `client/partner/activities`,
   `client/partner/deliverables`. **Under `/client/` deliberately**, so the frontend verify
   allowlist stays untouched.
8. Provisioning: extend `CSRClientOnboardView` or add a sibling, admin-only.

**Frontend**
9. `src/auth/roles.js` — `ROLES.CSR_PARTNER` and an **explicit empty `ROLE_PERMISSIONS` entry**,
   or `AuthContext.jsx:257`/`:311` silently grants REP permissions.
10. `src/auth/AuthContext.jsx:17` — `isExternalRole` becomes a set membership over both external
    roles, or a partner login fires the grants + config fetches (`:85-95`) for 8× 403 and pulls
    `/permissions/me/` into the bundle, defeating the note at `:76-81`.
11. `src/auth/loginDoor.js:18,35` — the funder branch becomes a set, so a partner whose session
    expires returns to a partner door rather than `/login`.
12. `src/ClientApp.jsx` — `RequirePartner` + `/client/partner` route (§5).
13. `src/components/client/PartnerPortalPage.jsx` — three tabs: Project / Activities /
    Deliverables. No Sanctioned field, no Reports tab.
14. Login: reuse `ClientLogin` and `CSRClientBranding` per project (§1.5) — no new branding model.

**Tests** (§8 is where the value is)
15. Copy `ExternalClientBoundaryTests` (`permissions/tests.py:109-171`) for `CSR_PARTNER`.
16. Copy `ClientDeliverableProgressTests` (`csr/tests.py:1471-1680`) for the partner surface,
    reusing `_walk_payload` (`csr/tests.py:1454`), with the sanctioned amount's literal digits
    added to `forbidden_values` and `sanctionedAmount` to `forbidden_keys`.
17. New: **a `CSR_PARTNER` is 403 on every `/api/client/` funder route**, and a `CSR_CLIENT` is
    403 on every `/api/client/partner/` route. Both directions.

**Deliberately omitted, and say so out loud**
- Reports for partners (§2.3) — needs an editorial decision, not code.
- The utilisation certificate — statutory, funder-only, permanently out.
- Any write path of any kind, including a comment or acknowledgement.
- Per-partner branding — the project's skin is reused.
- A partner-facing project switcher, unless Q5 says a partner spans several grants; if it does,
  the FK model already supports it and only the UI is missing.
- Partner self-registration or invitation email — admin-provisioned, like funders.

---

## 8. What could go wrong

| # | Failure | How it happens here | Guard |
|---|---|---|---|
| 1 | Partner becomes an internal user | New role added to `ROLE_CHOICES` but forgotten in `EXTERNAL_ROLES` (`enforcement.py:39`). A stray `UserModulePermission` row — or an approved access request — then grants internal module access, because `ModulePermission` is role-blind by design. | Add to the frozenset **in the same commit** as the role; port `permissions/tests.py:109-171`, which seeds exactly that stray grant row. |
| 2 | Partner silently gets REP permissions in the UI | `AuthContext.jsx:257` / `:311` fall back to `ROLE_PERMISSIONS.REP` for any unrecognised role. Nothing logs it. `roles.js:178-180` documents this trap for `CSR_OPS`. | Explicit empty `CSR_PARTNER` entry in `roles.js`, plus a unit test asserting `ROLE_PERMISSIONS.CSR_PARTNER` exists and its `permissions` array is empty. |
| 3 | Partner served the full funder payload | Someone "simplifies" `IsCSRClient` (`client_permissions.py:15`) to accept both roles, or widens `ClientApp.jsx:21` to a set. Either single edit exposes `sanctionedAmount`. | Keep two exact-match compares. Test: `CSR_PARTNER` → 403 on all four `/api/client/` funder routes. |
| 4 | Field creeps back via inheritance | `PartnerProjectSerializer(ClientProjectSerializer)` with `exclude` or a re-declared `Meta` — a later field added to the parent lands on the partner surface silently. | Mirror `csr/tests.py:1640-1655`: `assertFalse(issubclass(...))` plus the non-vacuity assertion. |
| 5 | Field creeps back via a method/nested serializer/`__str__` | A `SerializerMethodField` or a nested project on an activity re-emits the amount; a declared-field check passes. | `_walk_payload` (`csr/tests.py:1454`) over list **and** detail routes, asserting key absence, value absence, and a substring sweep. Seed the fixture with a distinctive sanctioned amount so the sweep can find it. |
| 6 | **Empty partner portal** | Copying `ClientActivityViewSet` verbatim keeps `reports__visible_to_client=True` (`client_views.py:57-60`). With no partner reports axis, every partner sees zero activities forever. | §2.2 — choose the gate explicitly; add a test that a partner with activities and **no** published reports still sees them. |
| 7 | Cross-project bleed | A multi-project partner needs `project_id__in` and a set compare; a copy-paste of `owner_project_id == profile.project_id` (`client_permissions.py:41`) either denies wrongly or, if someone "fixes" it with a truthiness fallback, compares across id spaces — the exact accident `client_permissions.py:26-34` warns about. | Test with two partners, two projects, and one partner on both: each sees exactly its own set, 404 on anything else. |
| 8 | Report content leak | `fileUrl` is an uncontrolled external document (`models.py:131-134`). A partner-visible report can quote the grant amount in its first line; no serializer can see inside a PDF. | MVP omits reports. If added, an `audience` field plus a written instruction to the CSR team — this guard is procedural and must be labelled as such. |
| 9 | Internal path literals reach the bundle | A partner page importing an internal API helper drags endpoint strings in; `verify-client-build.sh:53-62` fails the build. | Keep partner endpoints under `/client/partner/…` so the existing allowlist covers them, and **never widen the allowlist** to make a build pass — `verify-client-build.sh:41-52` already records that the residue list "must SHRINK, never grow". |
| 10 | Partner installs the portal and lands in the staff app | `sanitiseClientBuild.js:40-58` rewrote `manifest.json` with `start_url: '/client'` for exactly this reason. A third bundle (§5 Option 2) would need its own copy of that fix. | Argument for staying in `build-client`. If a third bundle is chosen, port the sanitiser and the verify script in full, not selectively. |
| 11 | Expired partner session dead-ends | `loginDoor.js:35` only knows `CSR_CLIENT`; a partner falls through to `/login` at `:39` — a route that does not exist in the client bundle. | Extend the branch with the partner role, plus a test on `expiredSessionLoginPath('CSR_PARTNER')`. |
| 12 | Admin onboards a partner into the funder list | Reusing `CSRClientUser` (§4 Option A) mixes audiences in `CSRClientOnboardView.get` (`views.py:263-269`), and an operator picks the wrong row. | Separate `CSRPartnerUser` model and a separate admin screen. |

---

## 9. Open questions for the owner, in one place

1. What is RETF — an organisation, a partner category, or a mistranscription?
   (Blocks naming only; the build can proceed with `partner`.)
2. Does a partner see the funder's name (`clientName`)?
3. Does a partner see the project `description`?
4. Does a partner see any reports at all? (If yes, this is the one item that needs a schema
   decision — `audience` field, not a second boolean.)
5. Does one partner login span several grants, or one grant each?
6. Third bundle, or the funder bundle with a separate screen? (§5 — recommendation is the
   funder bundle; the cost of the alternative is deploy plumbing, not risk.)
