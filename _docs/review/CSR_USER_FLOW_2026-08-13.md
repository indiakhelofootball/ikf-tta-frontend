# CSR — user flow and information continuity

Not visual design. This traces **what a person actually does, in order**, and **where each piece of
information goes after it is entered** — whether it carries forward, has to be re-typed, or is
dropped at a boundary.

Two journeys: the operator who runs a CSR project, and the funder who receives it.

---

## 1. The operator journey, step by step

The intended flow, from the lifecycle every planning document describes:

> contract signed → project → work order → contacts → activity → report → publish → tag expenses → certificate

Here is what actually happens at each step.

| # | Step | Where | What breaks |
|---|---|---|---|
| 1 | Create the project | `/csr` → modal | ✅ works |
| 2 | Link the work order | same modal, Autocomplete | Loads `workOrdersAPI.getAll()` — **403 for a csr-only operator**, caught silently → empty picker, no error. Same failure as the expense picker. |
| 3 | Open the new project | — | **You are not taken there.** After save you're returned to the list; you must find the project you just made and click it. |
| 4 | Add contacts | tab 1 | ✅ works |
| 5 | Add an activity | tab 2 → modal | **Hard stop — see §2.** |
| 6 | Link a trial to it | same modal | `trialsAPI.getAll()` — 403 for a csr-only operator, silent, empty picker |
| 7 | Add a report | tab 3 → modal | ✅ works (URL is required — the one form that guards its link) |
| 8 | Publish it | switch in the same modal | ✅ works |
| 9 | Tag an expense | tab 4 → modal | **Hard stop — 403, empty picker, no message** |
| 10 | Generate the certificate | tab 4 → button | Downloads a PDF to the operator's machine. Nothing is recorded, and it does not reach the funder. |

**Four of the ten steps depend on a picker that silently returns nothing** for the operator the
grant model was designed to create. Three of those four are the same defect repeated: work orders,
trials, payments. Each is a `.catch()` that turns a 403 into an empty array.

---

## 2. The hard stop: the flow points at a door the operator cannot open

Step 5 is the sharpest single break in the product, and it is a *flow* break rather than a bug.

An operator opens **New Activity**. If no activity types exist, the modal does the right thing —
disables the select, disables Save, and says:

> *"No activity types defined yet — add them in the catalog first."*

That is the best-written empty state in the module. It names the blocker and it names the fix.

**The operator cannot perform the fix.**

- `/csr/activity-types` is guarded by `RoleBasedRoute allowedRoles={[SUPER_ADMIN, ADMIN]}`.
- It is not in their sidebar; it is reached from **Admin → Setup**, which needs the `config` edit grant.
- And `PermissionsManagementPage` can only create **REP** or **SUPER_ADMIN** accounts — there is no
  way to make an ADMIN through the UI at all. So the CSR operator is a REP with a `csr` grant, and
  is permanently on the wrong side of that route.

So the journey reads: *do this thing* → *you can't* → *ask someone with a different account*. The
message doesn't say who, and there is no request-access affordance on that screen.

The same shape repeats twice more: funder onboarding (`/csr/clients`) and portal branding
(`/csr/branding`) are both ADMIN-only, and both are steps in the CSR lifecycle. **Three of the
lifecycle's steps sit outside the CSR operator's reach**, and nothing in the CSR module says so
until you hit the wall.

---

## 3. Information entered more than once

The funder's identity is typed **three separate times**, in three screens, with no link between them:

| Where | Field | Screen |
|---|---|---|
| `CSRProject.client_name` | "Acme Foundation" | project modal |
| `CSRClientUser` → the user's name/email | "acme@…" | `/csr/clients` onboarding |
| `CSRClientBranding.display_name` | "Acme Foundation" | `/csr/branding` |

Nothing validates that these agree. A project can say *Acme Foundation*, the portal header can say
*ACME Trust*, and the login can be `contact@acme-fdn.org` — three different names for one
organisation, shown to that organisation. The branding row is keyed to the **project**, and the
login is keyed to the **user**, so there is no single record of "who this funder is."

Smaller repeats: the project's `description` and its work order's description are unconnected;
dates exist on the project, on the activity (`date`), and again on the activity as
`start_date`/`end_date` with **no rule about which applies**.

---

## 4. Information that exists and is dropped at the boundary

This is the core of "how the info follows." In each case the relationship is present in the
database and disappears before it reaches the person who needs it.

### 4a. The funder cannot tell which report belongs to which activity

`CSRReport.activity` is a real foreign key. The report modal even asks for it — *"Attach this report
to a specific activity."*

The funder's serializer:

```python
class ClientReportSerializer:
    fields = ['id', 'fileName', 'fileUrl', 'createdAt']
```

No activity. And `ClientActivitySerializer` carries no report reference either. So the portal's two
tabs are **two disconnected lists**: *Activities* says what happened, *Reports* is a pile of
filenames. An executive reading *"May Progress Report"* cannot tell which camp, city or programme
it covers without opening every document.

The irony: the funder only sees activities that **have** a published report (the Q2 fix). So every
row in their activity list has a document behind it — and the product declines to say which.

This is one field on an allowlist. The relationship was captured, then withheld.

### 4b. The funder is shown the sanction and never the spend

`ClientProjectSerializer` exposes `sanctionedAmount`. There is no utilised total, no progress
figure, and **no certificate endpoint under `/api/client/` at all**.

So the funder's money story is: *"you gave ₹10,00,000"* — full stop. The one number they exist to
receive is computed server-side, gated behind `csr_certificate`, rendered to a PDF in the
operator's browser, and delivered by whatever means that operator chooses. It never travels through
the product.

Gating the certificate internally is **correct** against the recording — the client was explicit
that tagging stays under your control until close. What is missing is the last step: no issuance
record, no delivery path, no way for the funder to see even a summary.

### 4c. The work order carries the contract, and the contract goes nowhere

`CSRProjectDetailView` renders the work order as plain text: `#12`. Not a link. So the contract and
its attachments — the reason a work order is attached to a CSR project at all — are **unreachable
from anywhere inside CSR**. The operator must leave for the Work Orders module, which is a separate
grant they may not hold.

Information entered in step 2 of the lifecycle cannot be read at any later step.

---

## 5. Information flows one way, by design — with a cost nobody priced

I checked both directions. Across `trials/`, `payments/`, `workorders/` and `vendors/` — components
and serializers alike — there are **zero** references to CSR. Not one back-reference.

That is deliberate: `INV-DEP` says core must never import `csr`, and it is enforced by a test. But
the rule is about **code dependency**, and it has been applied to **information** as well. The
consequences are operational:

- The **payments** operator sees no indication that a payment is tagged to a funder's certificate.
  They can edit it, and if they try to delete it they get an unhandled 500 (the `PROTECT` FK),
  with no explanation of what is holding it.
- The **work orders** operator has no idea a work order is a CSR project's contract. Same 500 on delete.
- The **trials** operator cannot see that a trial is part of a CSR engagement, so nobody knows a
  funder is watching that trial.

The one-way rule can be kept in code while still surfacing the relationship in the UI — a
read-only badge on the payment row costs nothing architecturally. As it stands, the module that
holds the compliance obligation is invisible to the three modules whose data it depends on.

---

## 6. The funder's journey, end to end

1. Receives a link — `/client/acme/login` — by some channel outside the product.
2. Signs in. If the slug is wrong or stale, the branding lookup fails silently and they get a
   generic screen with no explanation.
3. Lands on the portal. Three tabs.
4. **My Project** — name, funder, sanctioned amount, dates, status, description.
5. **Activities** — a list of what happened.
6. **Reports** — a list of filenames, unconnected to §5.
7. …and that is the whole journey. There is no next action, nothing to acknowledge, nothing to
   download beyond the individual links, no contact address, no notification when something new
   is published, and no way back in if they forget the password.

**The funder's flow has no ending.** Every planning document's journey diagram terminates at *"client
views the published report."* Nothing describes what they do next, and the product reflects that
exactly.

---

## 7. Context that is lost as you move

- **Tab state lives in `useState`, not the URL.** You cannot link anyone to "the Utilisation tab of
  project 5." Leaving and returning always lands on Overview.
- **The back button goes to `/csr`**, discarding any list search you had typed.
- **No breadcrumb identifies where you are** — every CSR page's header reads *"Dashboard"*, because
  `pageTitles` never got these routes.
- **After creating anything, you stay where you were.** New project → back to the list. This is
  consistent, but it means every creation is followed by a manual find-and-click.
- **A `csr`-grant user's home page is blank.** They land on `/dashboard`, whose stat cards and
  quick-actions are built only from trials/reps/vendors/workorders/payments. No CSR entry exists,
  so they get a welcome banner and empty space — every login, before any of the above begins.

---

## 8. What the flow gets right

- **Activities are logged after the fact**, with no scheduling gate — which matches the recording
  exactly (*"Before it is done, we should not plan it"*). The flow is genuinely reactive.
- **Publishing is a deliberate, reversible act** in the same modal where the report is written —
  the editorial gate sits exactly where the decision is made.
- **The Utilisation tab explains its own arithmetic**: excluded tags are listed with their payment
  status and a count, rather than the total silently shrinking. That is the best information design
  in the module.
- **The funder cannot see an activity with nothing behind it** — the visibility precondition means
  their list is never a set of empty promises.

---

## 9. The pattern

The operator flow breaks wherever it crosses a **permission boundary** — four silent empty pickers
and three lifecycle steps behind an ADMIN wall the operator can never pass.

The information flow breaks wherever it crosses an **audience boundary** — the report→activity link,
the spend figure, and the contract are all captured and then not carried across to the person they
were captured for.

Both are the same shape as everything else found in this module: each side of the boundary is built
correctly, and nothing owns the crossing.
