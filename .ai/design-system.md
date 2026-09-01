# Design system — three scopes, one discipline

**Precedence, so this file cannot rot into a second opinion:**
the `.js` theme files are the source of truth for every hex value. This file
explains *what each token means and why it has that value*. On any conflict,
**the code wins and this file is wrong** — fix it here rather than arguing.

> **Resolved by scoping, 20 Aug 2026.** `DESIGN.md` at the repo root describes
> an **amber-primary** system, and used to read as a rival account of the whole
> product. It no longer claims that territory: its frontmatter now carries
> `governs: [tta-internal]` and `superseded_for: [csr]`, plus a `# SCOPE` block
> naming all three theme files. `design/decisions.md` records the same
> resolution from its side. So the split is: `DESIGN.md` governs `muiTheme.js`
> (TTA internal, where amber survives), `design/decisions.md` governs CSR
> colour and type, `clientTheme.js` governs the funder white-label, and this
> file enumerates the tokens for all three.
>
> One residue: `design/decisions.md` still closes with the bullet *"`DESIGN.md`
> has not been edited"*, which its own status box contradicts — the SCOPE block
> **is** an edit to `DESIGN.md`. That bullet is stale, not the box.

## The discipline that applies everywhere

Every colour in this product carries a **measured contrast ratio in a comment
next to it**. That is not decoration — it is the reason the palettes survived
review. The rule:

- **4.5:1 minimum** for normal text, **3:1** for UI boundaries that carry
  meaning (checked states, progress, hover borders).
- A colour must clear its bar on **every ground it can land on**, not just
  white. `#6B7280` measures 4.83 on white and **4.44 on `#F5F5F7`** — that is a
  fail, not a rounding error.
- A fill that fails as text gets a **darkened text variant**. Never collapse the
  text variant back into the fill.

## Scope 1 — CSR: the Ledger system

`src/styles/ttaTheme.js`, imported **only** by `CSRThemeProvider`, mounted only
on `/csr/login` and the `/csr` route group.

Chosen by the owner 18 Aug 2026 from three directions, with the amendment
*"green needs to change its shades a little bit and incorporate more color to
break monotonity"* — which moved moss `#1F5F4B` → `#2C6A4F`. Re-pitched
coral-led on 26 Aug 2026, then **reversed 1 Sep 2026 by explicit product
direction: the module is green-led again.** Moss `#2C6A4F` holds the
primary-action / "money utilised" / success seat, the ground is a cool
green-white, and the type moves to Fontshare. No ink, tint, surface or text
value is coral any more; two coral-era leftovers do survive in the shell and
are named in *Provenance* below rather than hidden.

**Six inks, each with exactly one job.** (`design/decisions.md` D-002 asked for
this enumeration; this is it.)

| Ink | Fill | Text | Accent | Tint | Means |
|---|---|---|---|---|---|
| Moss | `#2C6A4F` | same | `#3E9A6E` | `#E1EBE4` | money utilised · primary action · success |
| Indigo | `#385DB2` | same | `#527BDA` | `#D8E0F1` | contracts & deliverables |
| Ochre | `#815903` | same | `#AA7400` | `#EDDEC0` | waiting on you · not started |
| Steel | `#1B678D` | same | `#1586BE` | `#CDE3ED` | funders & partners |
| Plum | `#A33969` | same | `#D54B89` | `#F0DAE4` | closed · frozen certificate |
| Clay | `#914F27` | same | `#CD5E19` | `#EEDCD0` | overspend · needs a decision |

**All six now have `text` equal to `fill`, and that is the point of the set.**
Each fill sits at relative luminance 0.114–0.119 — one shared step — which is
dark enough to be read as text on every ground it can land on and dark enough
to hold white as a ground. Measured as text: 5.76–5.93 on bone, 6.22–6.40 on
card, 5.45–5.61 on sunk, and 4.69–5.24 on its own tint. Measured as a ground
under white: 6.22–6.40. There is no darkened text variant anywhere in this set
because none is needed; the escape hatch described in *The discipline* above
stays available but is currently unused in CSR. If a future ink cannot do both
jobs at one value, split it — do not push the whole family lighter.

The selected nav pill is a **filled tint pill** — `#E1EBE4` ground, moss label,
never a left border and never a weight change, because either would re-flow the
label on every navigation. Its hover is one step darker, `#D2E1D8`, which still
holds moss at 4.72:1. That hover was pink (`#EFCFC8`) during the coral era and
is green again; it is the only tint-family value the reversal moved.

`inks.moss` is the canonical key. `inks.coral` and `inks.teal` still exist in
`ttaTheme.js` as **deprecated aliases** pointing at `moss` and `steel` so the
rename could land without breaking call sites. They are not distinct inks. Do
not reach for either in new code.

**Read the accent column before touching any of them.** `fill` is a solid
ground under WHITE — badges, the active nav pill, buttons. `accent` carries no
text at all — spines, bars, progress tracks, washes, focus rings — and exists
because a lightness dark enough to buy AA under white spends the page's chroma
doing it. Accents are measured against `sunk`, the darkest ground each can land
on, and clear the 3:1 a meaning-bearing boundary needs: 3.53–3.55 for the five,
and **3.04 for `#3E9A6E`**, which is the tightest value in the system. Moss's
accent runs lighter than the rest (luminance 0.253 against ≈0.210) because it
is now the leading ink and appears at gauge and bar scale on every screen; at
3.04 on sunk it has almost no headroom, so it must never be re-lightened and
must never carry text. Every accent FAILS white at AA (3.47–4.05); if one
starts passing, the fill/accent split has collapsed and the dullness comes
back.

**Ochre remains a valid button fill** — white on it measures 6.24:1, same
family as the other five. It did not move in this pass; neither did indigo,
steel, plum or clay. The 1 Sep reversal changed one ink and the ground.

Surfaces: bone `#F4F7F4` (page floor, relative luminance 0.923) · card
`#FFFFFF` · sunk `#EDF1ED` (table headers, wells, insets, luminance 0.870) ·
hairline `#DCE3DD` · hairline-soft `#EAEFEA`. The ground is a cool green-white
again, in the same hue family as moss, which is what lets one ink lead without
the page fighting it. Card is now pure white rather than an off-white, so the
card/bone step does the work the old two-off-whites pair did badly.

**The hairlines are the weakest part of this pass and the doc is not going to
pretend otherwise.** `#DCE3DD` measures **1.21:1 against bone and 1.31:1
against card** — that is a division you have to be told about, and it is
*weaker* than the coral era's warm hairline, which reached 1.41 / 1.52. The
owner's "well divided" brief from 26 Aug was never withdrawn, so this is a
regression carried in on the ground change and not yet addressed. `#EAEFEA`
(1.08 on bone) is the soft divider and hover wash and is meant to be near
invisible; the strong one is not meant to be.

Text: `#1A2620` primary (14.50 bone / 15.65 card / 13.72 sunk) · `#4A5750`
secondary (7.02 / 7.58 / 6.64) · `#70665C` muted (5.20 / 5.61 / 4.92). All
three now clear 4.5:1 on all three surfaces, including muted on sunk, which the
warm-ground era could not do. `#ABA39C` is the neutral for a status with no
fixed ink and measures **2.49 on white** — it fails AA as text, so it is never
a glyph or a label; a status with no ink gets a tinted chip carrying its own
dark text instead.

**Standing constraints — do not relitigate:**
- **No dark anchor.** There is no `surfaces.inverse`, and a test enforces it.
- **One ink may lead a screen; the rest appear only where their meaning
  applies.** Four accents means four kinds of thing are genuinely present.
- **Grant identity cycles moss → indigo → steel only.** Ochre, clay and plum
  are reserved for status, so no ink ever means two things on one axis.
  Assignment must be stable per grant **id**, not list position.
  (`CSRProjectCard.jsx` builds this cycle from `inks.teal`, the deprecated
  alias for steel — same value, wrong name.)
- Amber is **retired from CSR**. It survives in `muiTheme.js` for TTA.
- **Green leads CSR** (1 Sep 2026, explicit product direction). Moss `#2C6A4F`
  is the primary action, the money ink and the success ink; the ground is a
  cool green-white in the same hue family. This **reverses** the 26 Aug 2026
  owner verdict *"it really feels cheap and the color green remove it make it
  something others like light coral. make it look good and well divided"*,
  which is kept here as provenance so the history stays legible — it is no
  longer in force. The rest of that brief is: "well divided" still stands and
  the hairlines currently fail it, and coral is gone from every live value.
- No spring or bounce motion. `prefers-reduced-motion` disables animation.

**Provenance — why the coral era existed and why it is gone.** On 26 Aug 2026
the owner rejected the green-led pitch outright and named light coral as the
replacement. The system was re-pitched around a coral fill on a warm cream
ground, and that pass is where two mechanisms in this doc came from: the
separate darkened `text` variant (coral could not be both a genuine coral and
dark enough to read) and the strengthened warm hairline. On 1 Sep 2026 that
call was reversed by explicit product direction. The text-variant mechanism
went with it — moss needs no second value — but the "well divided" half of the
brief did not, which is why the hairline regression above is called out rather
than quietly inherited.

One artefact of the reversal is still in the tree: the shell rail in
`CSRThemeProvider.jsx` (`RAIL_HEAD #E7E1D9` → `RAIL_FOOT #DCD3C8`, edge
`RAIL_EDGE #D2C7B8`) is still the coral era's **warm cream-taupe** and has not
been re-hued to the cool green ground. It measures 1.20:1 at the head and
1.37:1 at the foot against bone, and its edge 1.54:1, so it still reads as its
own surface and still clears the no-dark-anchor floor. What it no longer does
is match the page. Its ink is already correct: the pill takes `inks.moss.fill`
under white, hover takes `inks.moss.accent` at 14% and 50% alpha, and the brand
mark takes `inks.moss.text` pinned flat to `RAIL_HEAD` — which is load-bearing,
because moss measures **4.93 on the head and 4.33 on the foot**, so unpinned it
would fail AA at the deep end. The pinning rule survives the colour change
intact.

**Type — Fontshare, three faces with three jobs.** Loaded from
`api.fontshare.com` in `public/index.html`, not self-hosted.

- **Zodiak** (serif) — titles, and anything a human wrote or decided: page
  headings h1–h4, dialog titles, project descriptions. Weight 400. A serif at
  400 and 44px carries more authority than a sans at 600 and 40px, and money
  and dates set in a serif read as a record, which is what a utilisation ledger
  is. Georgia and Times fall back behind it.
- **Switzer** (UI) — every piece of interface text: body, form labels, buttons,
  table headers, section labels. h5/h6 stay here too, because below about 20px
  the serif stops reading as a choice and starts reading as a mistake.
- **Cabinet Grotesk** (figures) — every number that matters, and **always
  tabular**. A rupee value that changes width mid-render shoves the layout
  beside it, which in a financial table is a correctness problem, not a
  cosmetic one. Money sets ~3× its unit label.

Source Serif 4 and Manrope are still self-hosted in `src/styles/fonts.css` and
still named in the fallback stacks, so a Fontshare outage degrades to a face
with true tabular figures rather than to the system stack.

**Saturation fix — built 21 Aug 2026, still the governing rule.** The dashboard
once measured 2.8% mean saturation with zero pixels above 40%. `CSRDashboard.jsx`
has since been rebuilt onto `csrDesign.css` (scope `.csrx`), but the rule it
encodes survived the rebuild: figures carry their ink at full strength, the
glass panels are **clean white with no ink in them**
(`rgba(255,255,255,.75) → .55`), and colour arrives as an object on the page —
a gauge arc, a donut segment, a bar — rather than as atmosphere. The neutral
`#ABA39C` is never a glyph, per its 2.49 on white.

**Known drift:** `src/index.js` imports `globals.css` globally, and that file
still paints the superseded ground `#F9FAFB` (`--gray-50`, line 28, applied to
`body` at line 63) along with the retired amber `::selection` and scrollbar
thumbs. While CSR is mounted this no longer shows: `CSRThemeProvider` injects
document-wide `GlobalStyles` that repaint `body`, `.dashboard-layout`,
`::selection` and both scrollbar thumbs onto Ledger tokens, and unmount with
the route. The stale values in `globals.css` are still the fallback the moment
that provider is not on screen, so the file is worth cleaning — but the
"bone only appears where a `background.default` Box covers it" symptom this
note used to describe is fixed.

## Scope 2 — TTA internal

`src/styles/muiTheme.js`. Amber-primary, and the amber is the whole lesson:
`#FBBF24` is fine **as a fill** (10.63:1 behind `#111827`) and unusable **as
text** (1.67:1 on white). `AMBER_TEXT` is `#A35905` — `#D97706`
darkened 25% along its own hue, because `#D97706` passes on white (3.19) and
fails on the tinted grounds (2.89–2.93).

Greys were chosen the same way: `#94A3B8` and `#9CA3AF` both fail at ~2.4, so
the system uses `GREY_SLATE #5A6B82` and `GREY_MUTED #5F6672`, which hold above
5 on every ground in use.

## Scope 3 — Funder white-label

`src/components/client/clientTheme.js`. Ink `#111827` on paper `#FFFFFF`, with
the funder's **own brand colour** injected at runtime.

The hard part is that a real brand colour is an **untrusted input**. A real
funder's `#486AFF` tops out at 4.39:1 on white, and even plain grey `#808080`
only reaches 3.95 — both fail normal text on paper. So the
theme cannot assume the brand colour is legible and must fall back rather than
trust it.

## Related

`design/decisions.md` (the decision log, including the ⚠ REASON MISSING gaps) ·
`DESIGN.md` (older, now scoped to TTA internal only — see the box at the top) ·
`csr_design/csr-system.css` (the mockups' token set: the Fontshare roles, the
green/glass direction and the gradient ground this pass implements) ·
memory: `csr-design-direction`, `csr-ui-2026-08-19`
