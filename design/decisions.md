# Design decisions — CSR / Ledger

The record of what was chosen, what was rejected, and why. Read this before
proposing anything. Nothing here is deleted — decisions are superseded and
kept.

> **Store status — read this first.**
> `DESIGN.md` at the repo root (17 Aug 2026) describes an **amber-primary**
> system and is **partially superseded** by the Ledger direction below.
> Until the entries marked `⚠ REASON MISSING` are filled in, this file is the
> authority on colour and type; `DESIGN.md` remains the authority on
> everything it covers that Ledger has not overturned.
> Two records that disagree is the exact failure this file exists to prevent.
> Resolving it is the highest-value thing on this page.

---

## D-001 · The working ground is bone, not grey

**Decided** ~18 Aug 2026 · **Status** active
**Supersedes** `DESIGN.md` "canvas: slate-50 `#F9FAFB`"

**Because** ⚠ REASON MISSING — stated as settled during the Ledger direction,
but the reasoning was never written down. Someone should add it; a decision
whose reason is unrecorded gets overturned by the next confident opinion.

**We rejected** ⚠ NOT RECORDED — if a dark-ground variant was considered and
killed, say so here, otherwise it will be proposed again.

**Known drift — not yet fixed:**
`src/index.js:11` imports `globals.css` globally, and it still paints the
superseded ground: `body { background-color: var(--gray-50) }` → `#F9FAFB`
(measured `rgb(249,250,251)`). Bone only appears because `CSRLogin` paints a
`background.default` Box over the top. **Anywhere that Box doesn't cover, the
old ground shows through.**

---

## D-002 · The palette is six meaning-bearing inks

**Decided** ~18 Aug 2026 · **Status** active
**Supersedes** `DESIGN.md` §Colour (amber-50 → amber-900 ramp + slate scale)

**Because** ⚠ REASON MISSING.

**We rejected** ⚠ NOT RECORDED.

> Six inks are asserted but not enumerated anywhere readable. **List the six
> hexes and what each one means.** Until then no reviewer and no linter can
> tell a system colour from drift, which makes this decision unenforceable.

---

## D-003 · The display face is a serif

**Decided** ~18 Aug 2026 · **Status** active — **not implemented**

**Because** ⚠ REASON MISSING. Recorded elsewhere as the choice that
distinguishes this system from any other green theme.

**We rejected** ⚠ NOT RECORDED.

**Known drift — not yet fixed:**
The serif has never rendered on `/csr/login`. The heading is an `h6`,
computed **Segoe UI 15px/600**. The theme deliberately maps `h5`/`h6` to sans,
and no `h1`–`h4` exists on the screen — so the serif *cannot* appear on the
first screen anyone sees. The defining decision of the system is invisible in
production.

---

## D-004 · No dark anchor

**Decided** ~18 Aug 2026 · **Status** active
**Supersedes** `DESIGN.md` §Depth, which specifies a `surface-inverse`
(`ink-950`) tier and a dark nav rail.

**Because** ⚠ REASON MISSING.

**We rejected** ⚠ NOT RECORDED — note that `DESIGN.md` argues *for* a dark
rail. Since this reverses an earlier written decision, the reason matters more
than usual.

---

## D-005 · Amber is retired from CSR

**Decided** ~18 Aug 2026 · **Status** active — **not implemented**
**Supersedes** `DESIGN.md` §Colour, in which amber is the brand and the
primary action.

**Because** ⚠ PARTIAL — the retirement itself is stated; its reason is not
recorded. Related measured evidence from `DESIGN.md`'s own notes: the previous
system had `warning.dark === primary.main`, so brand and warning spoke with
one voice.

**We rejected** ⚠ NOT RECORDED.

**Known drift — live in production, not a design opinion:**
`src/styles/globals.css` still carries the amber system, and it is imported
globally:

| Line | Rule | Value | Effect |
|---|---|---|---|
| 63 | `body background-color` | `var(--gray-50)` `#F9FAFB` | old ground paints under everything |
| 68 | `::selection` | `#FDE68A` on `#78350F` | **selecting text on any CSR page highlights amber** |
| 88 | `::-webkit-scrollbar-thumb` | `#FCD34D` | **every scrollbar in CSR is amber** |
| 92 | `::-webkit-scrollbar-thumb:hover` | `#F59E0B` | amber on hover |

Three of these are visible to real users right now. "Amber retired" is
currently aspirational, not true.

---

## Open — decided but unrecorded, or found but not decided

Not decisions. Listed so they don't get lost, and so nothing here is mistaken
for settled.

- **The six inks are not enumerated.** Blocks D-002 from being enforceable.
- **Type scale on `/csr/login` is flat to within one pixel** — two visible
  sizes, 15px and 14px; the heading is 1px larger than the labels beneath it.
  A reviewer proposed ~26px for the heading. **Not decided.**
- **`Sign in here` is 73×19px** — fails WCAG 2.2 SC 2.5.8 (24×24 CSS px).
  Not Apple's 44pt, not Material's 48dp. This one is not a preference: the
  accessibility floor outranks taste, including ours.
- **Inputs are 336×42** — pass WCAG 2.2, fail Apple HIG 44pt and MD3 48dp.
  Defensible for a desktop-first operator tool; **worth an explicit decision**
  so it stops being re-raised, especially at the 360px breakpoint.
- **`MuiFormLabel` animates `max-width`** — a layout property, and on the
  project's own NEVER_ANIMATE list in `ttaTheme.js`. Inherited from MUI's
  stock floating-label behaviour rather than chosen. **Decide: accept the
  inheritance, or override it.**
- **No error state, no button loading state** on the login. Chrome autofill
  paints both fields blue, overriding the theme — visible only in a live
  browser, never in a clean-load screenshot.
- **Composition rebuild** (asymmetric split, illustration panel) — explicitly
  deferred by the reviewer to be done once, together with the dashboard layout
  pass. **Deferred, not rejected.**

---

## Measured and clean — recorded so it isn't re-litigated

From the `/csr/login` audit, so a future reviewer doesn't spend attention here:
axe **0 violations** · CLS **0** · no console errors · one shadow · three radii
(7px ×5, 10px ×1, 50% ×1) · no horizontal overflow at 360px. Token discipline
in `ttaTheme.js` is holding — **the drift is in the global stylesheet, not the
theme.**

---

## Notes on this record

- Entries D-001 … D-005 were stated as settled by the person, not inferred.
  Their **reasons** were not stated, and have not been invented — hence the
  `⚠` markers. Filling those in is what makes them durable.
- Every `We rejected` field is empty. That field is the one that stops an idea
  being re-proposed each quarter, and it is the most common thing to skip.
- `DESIGN.md` has not been edited. Superseded sections are marked here rather
  than deleted there, so the history of what was tried survives.
