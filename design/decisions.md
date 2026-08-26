# Design decisions — CSR / Ledger

The record of what was chosen, what was rejected, and why. Read this before
proposing anything. Nothing here is deleted — decisions are superseded and
kept.

> **Store status — resolved by scoping, 2026-08-20.**
> `DESIGN.md` now declares its own scope in its frontmatter:
> `governs: [tta-internal]`, `superseded_for: [csr]`. The two records no longer
> claim the same territory — `DESIGN.md` governs `muiTheme.js` (TTA internal,
> where amber survives), this file governs CSR colour and type, and
> `clientTheme.js` governs the funder white-label.
> Enumerated tokens for all three: **`.ai/design-system.md`**.
> Reasons below were filled from `csr-design-direction` memory where one was
> genuinely recorded. Where none was, the marker now states the exact question
> instead — **an invented reason would be worse than a missing one.**

---

## D-001 · The working ground is bone, not grey

**Decided** ~18 Aug 2026 · **Status** active
**Supersedes** `DESIGN.md` "canvas: slate-50 `#F9FAFB`"

**Because** ⚠ STILL UNRECORDED, and deliberately not invented on 2026-08-20 —
searched `csr-design-direction` and the 18 Aug session; bone is asserted
everywhere and argued nowhere.
**The one question that closes this:** *why bone `#EFF1EC` rather than the
slate-50 `#F9FAFB` it replaced — warmth, glare, print association, or simply
that it suited the artwork?* One sentence from the owner is enough.

**We rejected** slate-50 `#F9FAFB` (the `DESIGN.md` canvas). ⚠ Whether a
dark-ground variant was considered is unrecorded — but see **D-004**, which
kills the dark anchor outright, so a dark ground is already excluded by a
separate decision.

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

**Because** the owner's amendment when choosing Ledger, verbatim: *"green
colors need to change its shades a little bit and incorporate more color to
break monotonity of same color."* One ink cannot carry a dashboard that has
several different kinds of thing on it. The system that came out of it binds
each ink to exactly one job so colour answers a question instead of decorating:
**one ink may lead a screen; the rest appear only where their meaning applies.**
Four accents on a screen means four kinds of thing are genuinely present.

**We rejected** the `DESIGN.md` amber ramp + slate scale (one brand hue plus
neutrals — the monotony the owner named), and directions **B Console** and
**C Dispatch**, the two alternatives shown alongside Ledger on 18 Aug.
Also rejected: letting identity and status share a hue. Grant identity cycles
**moss → indigo → teal only**; ochre, clay and plum stay reserved for status,
so no ink ever means two things on the same axis.

**Enumerated** — closed 2026-08-20, this was the gap that made the decision
unenforceable. The six hexes, their text variants, tints and meanings are in
**`.ai/design-system.md`**, derived from `src/styles/ttaTheme.js`, which wins on
any conflict.

---

## D-003 · The display face is a serif

**Decided** ~18 Aug 2026 · **Status** active — **now implemented** (was "not
implemented"; corrected 2026-08-20). `src/assets/fonts/SourceSerif4-var.woff2`
is self-hosted and declared in `src/styles/fonts.css`. Before that, every serif
in the product was Constantia wearing the name. **The drift note below predates
the fix and has not been re-checked** — the font now loads, but whether any
`h1`–`h4` actually appears on `/csr/login` is unverified.

**Because** it is the one choice that distinguishes this from any other green
dashboard theme — recorded as such, though never argued in the owner's own
words. Supporting fact: `ttaTheme.js` had named Source Serif 4 since it was
written, so the serif was the intent from the start and only the *shipping* of
it was outstanding.
**The one question that closes this:** *is the serif carrying seriousness /
ledger-book association, or was it chosen on looks?* That determines whether it
may ever be swapped.

**We rejected** ⚠ Unrecorded. Note the fallback chain that shipped —
Constantia/Georgia — was a consequence, not a choice: no woff2 existed.

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

**Because** the owner's direct instruction on 2026-08-18. That is the reason of
record and no further rationale was given — but it was stated as a constraint,
not a preference, and it is now **enforced by a test**: there is no
`surfaces.inverse` in `ttaTheme.js` and the test fails if one appears.

**We rejected** the `DESIGN.md` `surface-inverse` (`ink-950`) tier and its dark
nav rail. ⚠ The *argument* against them was never recorded. Since this reverses
an earlier written decision, ask the owner for one sentence before anyone
proposes a dark rail again.

---

## D-005 · Amber is retired from CSR

**Decided** ~18 Aug 2026 · **Status** active — **not implemented**
**Supersedes** `DESIGN.md` §Colour, in which amber is the brand and the
primary action.

**Because** amber collapses two meanings into one voice and cannot carry text.
`DESIGN.md`'s own notes record `warning.dark === primary.main` — brand and
warning speaking identically. And `muiTheme.js` measures the rest: `#FBBF24` is
**1.60:1** on the page ground and `#D97706` **3.05:1**, both under the 4.5:1
minimum; `#FBBF24` is under 3:1 even for tabs. A hue that must be darkened to
`#A35905` before it can be read is a poor system colour. In Ledger its job —
*waiting on you* — belongs to ochre, which needed the same treatment
(`#A8791F` fill, `#866119` text) and is therefore never a button fill.

**We rejected** keeping amber as CSR's primary action. It survives in
`muiTheme.js` for TTA, which is why D-005 is a *scoping* decision and not a
deletion.

**Known drift — RE-VERIFIED 2026-08-20, still live in production:**
`src/styles/globals.css` still carries the amber system, and it is imported
globally. Confirmed today: body is `var(--gray-50)`, `::selection` is
`var(--yellow-200)`, and the scrollbar thumb is `var(--yellow-300)` /
`var(--yellow-500)` on hover. Nothing below has been fixed:

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
