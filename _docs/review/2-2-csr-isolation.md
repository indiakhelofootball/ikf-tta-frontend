# Pass 2.2 — CSR client isolation

**Date:** 2026-08-03 · **Mode:** read-only

**Question:** can one CSR client reach another client's data?

## Answer

**No — not for any CSR data.** The isolation is implemented with the strongest of
the available patterns (queryset scoping, not post-hoc object checks) and it is
applied consistently to all three client viewsets.

The gap the plan predicted — *"list/report endpoints that apply the role check but
forget the object-level project filter"* — **does not exist here.** Every client
queryset is filtered by `project_id` at the source.

**Count: 3 findings, none of them cross-client CSR data. 1 medium, 2 low.**

---

## The client surface, endpoint by endpoint

| Endpoint | Permission | Queryset scope | Verdict |
|---|---|---|---|
| `GET /api/client/project/` | `IsAuthenticated + IsCSRClient` | `CSRProject.objects.filter(id=pid)` else `.none()` | ✅ scoped |
| `GET /api/client/project/<id>/` | same | same queryset → other IDs 404 | ✅ scoped |
| `GET /api/client/activities/` | same | `filter(project_id=pid, reports__visible_to_client=True)` else `.none()` | ✅ scoped **+ publication filter** |
| `GET /api/client/reports/` | same | `filter(project_id=pid, visible_to_client=True)` else `.none()` | ✅ scoped **+ publication filter** |
| `GET /api/client/my-branding/` | same | `filter(project_id=pid, is_active=True)` | ✅ scoped |
| `GET /api/client/branding/<slug>/` | `AllowAny`, no auth | any active branding row | ⚠️ public by design — see C-3 |

**Why the scoping pattern matters.** These are `ReadOnlyModelViewSet`s whose
`get_queryset()` is already narrowed to one project, so DRF's `get_object()`
looks the requested ID up *inside the scoped queryset*. Guessing or incrementing
a project ID returns **404, not 403** — it does not even leak the existence of
the other project. That is the correct behaviour and it is stronger than an
object-permission check bolted on afterwards.

`IsCSRClient` is belt *and* braces: it also implements `has_object_permission`
comparing `obj.project_id` (or `obj.id`) against `profile.project_id`. Either
layer alone would hold; both are present.

**Fail-closed is real:**

```python
# client_permissions.py:17–18
# Fail closed: no client->project link means no access at all.
return getattr(user, 'csr_client_profile', None) is not None
```

A `CSR_CLIENT` user with no `CSRClientUser` row gets 403 on everything, and every
`get_queryset` independently returns `.none()` for the same case. Two independent
guards for one condition.

**Allowlist serializers, not exclusion lists.** `client_serializers.py` opts fields
**in** explicitly, with the reasoning written at the top:

> *"Fields are opted IN explicitly; anything not listed (work order, expense tags,
> payments, contacts, internal trial links) can never reach the external funder.
> Never reuse the org serializers here."*

Confirmed by reading: `ClientProjectSerializer` exposes 8 fields and no work-order
FK; `ClientActivitySerializer` 8 fields, no cost data; `ClientReportSerializer` 4
fields. No PAN, no bank details, no payment amounts, no vendor names.

**Role separation is enforced from both ends.** `IsCSRClient` requires
`role == 'CSR_CLIENT'`; `enforcement.EXTERNAL_ROLES` denies `CSR_CLIENT` on every
internal module *before any grant lookup*. An internal user cannot reach
`/api/client/`, and a funder cannot reach `/api/csr/` or any operational module —
even if a grant row were created for them by hand in the database.

---

## Findings

### C-1 · A funder can reach four internal, non-CSR endpoints — **MEDIUM**

`EXTERNAL_ROLES` is checked inside `ModulePermission` and
`ReadOpenModulePermission`. Endpoints gated by **bare `IsAuthenticated`** never
consult it. A `CSR_CLIENT` token is a valid authenticated token, so these are
reachable with it:

| Endpoint | Returns | Why it matters |
|---|---|---|
| `GET /api/permissions/modules/` | The **entire module registry**, `SEPARATION_OF_DUTIES_PAIRS`, and `MODULE_DEPENDENCIES` | Hands an external party a complete map of your internal authorisation model and module structure |
| `GET /api/banks/` | `INDIAN_BANKS` list | Static reference data — harmless |
| `GET /api/company-types/` | Vendor company-type choices | Harmless |
| `GET /api/categories/` | Config category choices | Harmless |
| `GET /api/permissions/my-permissions/` | `{isSuperAdmin: false, grants: {}}` for a funder | Harmless |
| `GET /api/auth/me/`, `/api/auth/profile/` | Their own user record | Correct |

**No customer data leaks through any of these.** `ModulesView` is the only one
worth acting on, and the fix is one line — add
`if is_external_client(request.user): return 403` — because it is pure internal
architecture disclosure to a third party who has no business seeing it.

This is precisely the *edge* the plan asked this pass to look for: the isolation
model has one boundary (`ModulePermission`) and four endpoints that sit outside it.

---

### C-2 · Report confidentiality depends on an unguessable external link — **MEDIUM**

`ClientReportSerializer` exposes `fileUrl` (`CSRReport.file_url`). Following the
same pattern as `WorkOrder.invoice_drive_link` and `REP.rep_logo_link`, these are
**external links (e.g. Google Drive), not server-served files.** Nothing in this
application authenticates a request for the report contents.

So funder A cannot *discover* funder B's report URL through the API — the
queryset scoping holds — but if a URL leaks by any other route (a forwarded
email, a Drive sharing setting of "anyone with the link", a browser extension,
an access log), the file is readable by anyone, with no audit trail and no
revocation path inside this app.

`visible_to_client` correctly controls *listing*, but it cannot control *access*
to a file the app does not serve. Worth confirming the Drive sharing model for
these files is "restricted", not "anyone with the link".

---

### C-3 · Pre-auth branding endpoint enumerates your funder list — **LOW**

Documented in full as A-4 in Pass 2.1. Restating the isolation angle only: it is
the single unauthenticated endpoint that returns per-client data (display name,
logo, login image, brand colours). Slugs are short and human-chosen. Mitigated by
a 60/min throttle and a tight allowlist serializer, both deliberate.

---

## One thing to watch that is not a finding today

The org-side CSR viewsets (`_CSRViewSet`, `permission_module = 'csr'`) are **not**
project-scoped — any internal user with the `csr` grant sees every project. That
is correct: they are your staff, delivering across all funders.

But `_filter_by_project(qs, request)` applies a project filter **only when the
caller passes `?project=`** — it is a convenience filter, not a boundary. If a
future requirement is "this account manager handles only Acme", that filter is
where someone will reach first, and it will not hold. Worth a comment in the code
saying so before that day.

---

## ✓ Pass complete

- **Do I have a number?** 3 findings; 5 client endpoints checked, 5 correctly
  scoped, 0 cross-client CSR leaks.
- **Have I seen one with my own eyes?** Yes — `client_views.py`,
  `client_permissions.py`, and `client_serializers.py` read in full.
- **Do I know what the user experiences?** For C-1, nothing visible — it is a
  disclosure only reachable with a crafted request.

**Pass 2.4 tests this directly.** Probe items 1 and 3 exist to turn this page from
*"the code says isolated"* into *"I tried it and got a 404."* Do not mark this
pass verified until you have run them.
