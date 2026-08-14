# The CSR documents — read in full, and checked against the build

All nine planning documents read end to end this pass: the three Generation-1 readings, the
Generation-2 merge, the Generation-3 redesign, the three live Generation-4 documents, and the
shell plan. Plus `OPEN_ITEMS_AND_DECISIONS.md`.

These documents are the bridge between the recordings and the code. **The headline is that the
documents are good** — better than I expected, and in three places they specified something
correctly that the implementation then got wrong. The drift is not in the writing.

---

## 1. The document the code contradicts — and the plan was right

`CSR_CLIENT_PORTAL.md` §3 contains the runtime-theming function as a code sample:

```jsx
function clientThemeFrom(brand) {
  return createTheme({
    ...muiTheme,
    palette: {
      ...muiTheme.palette,
      primary:   { main: brand.primary_color },      // ← bare object, only `main`
      secondary: { main: brand.secondary_color },
    },
  });
}
```

What shipped (`src/components/client/clientTheme.js`):

```js
primary: { ...muiTheme.palette.primary, main: brand.primaryColor }
```

**The spread was added during implementation, and it is the entire bug.** A palette entry with only
`main` makes MUI run `augmentColor` and compute a legible `contrastText`. Spreading the base
palette entry carries the *amber theme's* near-black `contrastText` across to every funder's colour
— which is why the branding form's own placeholder `#0B5FFF` renders at 3.46:1 and a corporate navy
at 1.30:1.

I reported this earlier as a design oversight. It is not. **The plan specified the correct form and
the implementation undid it.** One spread operator, added by hand, against a written sample.

---

## 2. The blank dashboard is a dropped spec item, not an omission

The live-run session found that a `csr`-grant user lands on an empty `/dashboard`. Three separate
documents specify a CSR dashboard:

- `CSR_PRODUCT_DESIGN.md` §4 — *"`Dashboard` — counts: active projects, sanctioned vs tagged spend,
  pending reports."*
- `CSR_VISUAL_FLOW.md` §2 — "Dashboard" is the **first item** in the CSR sidebar
- `CSR_IMPLEMENTATION.md` §3.4 — `Dashboard → /csr`

It was specified with its three metrics, twice sketched into the sidebar, and never built. The user
who has no home page has one in the plan.

---

## 3. "Deliverables" — a concept that reaches the client and does not exist

It enters at Generation 1 and never leaves:

| Document | What it says |
|---|---|
| `CSR_MODULE_SPEC.md` §2 | *"The WO carries **deliverables** that the spend is measured against."* |
| `CSR_MODULE_SPEC.md` §5.4 | client journey: *"Views published reports + activity progress + **deliverable status**"* |
| `CSR_BRIEF.md` §3 | *"attachment, and **deliverables** the spend is measured against"* |
| `CSR_COMPLETE_REFERENCE.md` §11 | reused-from-TTA: *"Work Order (contract, attachments, **deliverables**)"* |
| `CSR_Module_Design_Review.docx` §9 | glossary: *"Work Order — TTA record holding the contract, attachments, and **deliverables**"* |

`workorders.WorkOrder` has no deliverables field. Not in the model, not in the serializer, nowhere.

So a concept invented in the first reading survived four generations, reached the **client-facing**
document, and is described there as the thing the CSR spend is measured against. It has never
existed. And the spend is measured against nothing — the certificate compares tagged expenses to
`sanctioned_amount`, with no deliverable in the loop.

Neither 05-22 recording uses the word.

---

## 4. Why the partner question stayed open for three months

`CSR_BRIEF.md` — one document — holds **both** readings of "partner" and never notices:

- Line 102, describing the catalog: *"'partners' = vendors flagged with a partner category, e.g.
  financial/health"*
- §2.1 and §8 Q5, at the same time: partner is an **unidentified third audience** whose access
  model is *"an open question."*

`CSR_VISUAL_FLOW.md` §3 is equally concrete: *"Workshop — linked to a **Vendor** in the 'partner'
category (financial, health, …)."*

So the term was **defined in the catalog sections and treated as unknown in the access sections**,
inside the same file. Generation 4 carried forward only the "unknown audience" half. That is the
mechanism by which a question that had a candidate answer in June was still blocking in August.

It does not settle what "RETF" is. It does mean the answer was half-written from the start.

---

## 5. Specified links that were never built — and they are the partner blocker

`CSR_VISUAL_FLOW.md` §3 defines all three activity types by **what they link to**:

- Trial → **linked to a REP**
- Workshop → **linked to a Vendor** in the partner category
- Training → a multi-month item

`CSRActivity` has `linked_trial` and nothing else. No REP link, no vendor link.

This is the concrete reason a partner tier has no edge to scope on — and it traces to a dropped
spec line, not to an unasked question. Two of the three activity types cannot record who delivered
them.

---

## 6. The third upload surface was dropped

`CSR_VISUAL_FLOW.md` names three distinct upload locations with different meanings — a genuinely
sharp piece of IA:

| Location | Uploaded content | Built? |
|---|---|---|
| Work Order | contract + attachments | ✅ (`contract_drive_link`) |
| **Project (top level)** | **description supporting documents** | ❌ nowhere |
| Each activity | one report per activity | ✅ (`CSRReport`) |

`CSRProject` has a `description` text field and no document field. The middle row does not exist.

---

## 7. The portal plan did not have the deep-link problem

`CSR_CLIENT_PORTAL.md` §5, step 5:

> *"AuthContext sees role CSR_CLIENT → routes to **`/client/acme/dashboard`**"*

The plan kept the slug in the **post-login** URL. The build routes to bare `/client`, dropping the
funder's identity the moment they authenticate — which is precisely what forced the later
`localStorage` stored-slug workaround so an expired session could find its way back to a branded
login.

That workaround exists because the implementation dropped a path segment the plan had.

---

## 8. Planned pieces that were never built

From `CSR_CLIENT_PORTAL.md` §7 and `CSR_PRODUCT_DESIGN.md` §4:

| Planned | Status |
|---|---|
| `ClientBrandProvider` + `useClientBrand()` — fetch brand once, hold in context | ❌ each component fetches its own |
| `ClientLayout` + `ClientSidebar` | ❌ one page, three tabs |
| `CSRSidebar` + `DashboardLayout` `sidebar` prop | ❌ two items in the TTA sidebar |
| Extract a shared `<LoginForm />` from `Login.jsx` (phase C3) | ❌ `ClientLogin` duplicates the form |
| CSR Dashboard with three counts | ❌ see §2 |

Every one is a *simplification*, and for a portal with three short lists some are defensible. But
none was recorded as a decision — they were dropped in the writing of the code, and the plan still
says otherwise.

---

## 9. What the documents got right

Worth being explicit, because the corpus takes criticism elsewhere in these reviews:

- **The `CSR_OPS` correction.** `CSR_BRIEF.md` invented a role; `CSR_PRODUCT_DESIGN.md` §1 caught it
  against the actual code — *"internal CSR staff need a grant, not a role"* — and every superseded
  file carries a banner. The one substantive contradiction in the corpus was found and killed by
  the corpus itself.
- **`CSR_ARCHITECTURE.md` §2** reverses its own earlier framing — *"that is wrong, and dangerous
  here"* — and derives G1–G4 from the actual behaviour of `ModulePermission`. The client surface is
  safe because of that document.
- **Allowlist over strip-list.** `CSR_CLIENT_PORTAL.md` §6 said *"fields stripped"*; the
  architecture doc corrected it to an explicit allowlist, and that is what shipped. A real
  improvement made in the documents.
- **The sidebar-absence spec** (`CSR_IMPLEMENTATION.md` §3.4 — *"Notably absent on purpose"*) with
  the qualifier that trials/vendors/WOs/payments stay **reachable from inside a project**. Still the
  sharpest IA decision in the project.
- **Every superseded document is banner-marked** at line 1, and `CSR_PRODUCT_DESIGN.md` names its
  own error so a reader who lands there by search does not carry it forward.

---

## 10. `OPEN_ITEMS_AND_DECISIONS.md` — not part of this chain

Dated **2026-06-22**, TTA-wide, and never updated since. It predates the CSR build and contains no
CSR items. Two of its blocked decisions are still open and unrelated to CSR: **D-1** (project
rename — lock vs cascade, where an already-coded lock contradicts what the client asked on the
Dhingsara call) and **#14** (the work-order ↔ project/city linkage rule). It also carries an inline
handwritten decision in Hindi on D-1.

If a "what is still open" list is wanted, this file is two months stale and does not cover CSR.

---

## 11. The pattern in the documents

The corpus is stronger than the code it produced. Where the two disagree, **the document is right
four times out of five**: the theme function, the dashboard, the activity links, the post-login
slug, the third upload surface.

What is missing is not planning. It is the step where someone reads the plan back against the
diff — the same seam this whole review keeps finding. The documents describe the layers correctly;
nothing checked that the code crossing them matched.

The one place the documents themselves failed is **"deliverables"** — a concept invented in the
first reading, never traced back to the recordings, carried through four generations, and printed
in the document the client was given.
