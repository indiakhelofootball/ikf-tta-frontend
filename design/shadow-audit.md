# CSR shadow audit — "no shadows, lines like the reference"

Audit only. Nothing was changed. Scope: `src/components/csr/**` + `src/styles/ttaTheme.js`.
Verified against rendered computed styles (Playwright/chromium, 1440x900, authenticated as
`csr.manager@demo.com`) across `/csr`, `/csr/projects`, `/csr/activities`, `/csr/reports`,
`/csr/utilisation`, `/csr/contracts`, `/csr/clients`, `/csr/9` (project detail, all six tabs),
plus an open modal, an open Select menu, an open Autocomplete popup, an open Snackbar and a
visible Tooltip.

---

## Headline

**The module already complies almost everywhere. The owner is not asking for a new rule —
he is restating the rule `ttaTheme.js` already writes down.** The theme header says depth
comes from "the three-tier bone/card/sunk spread and the hairlines, not from dark chrome",
and the code honours that: **five of the seven CSR pages render zero box-shadows at rest.**

There is exactly **one place that drifted**, and it drifted deliberately and in writing:
the `CSRDashboard` tile. Its own comment argues the opposite of the theme —

> `CSRDashboard.jsx:69-71` — "No border. The references separate a card from its ground with
> tone and a soft shadow, never a hairline outline — an outlined tile on a tinted ground
> reads as a table cell."

That is the single contradiction in the module, and it is the only thing on screen that the
owner's instruction visibly targets.

---

## Every rendered shadow

| # | Where | Source | Rendered box-shadow | Class |
|---|---|---|---|---|
| 1 | Dashboard tiles (3), **at rest** | `CSRDashboard.jsx:74` | `0 1px 2px rgba(20,28,24,.04), 0 6px 16px rgba(20,28,24,.05)` | structural card edge |
| 2 | Dashboard tiles, **hover** (clickable ones) | `CSRDashboard.jsx:81` | `0 2px 4px rgba(20,28,24,.06), 0 10px 24px rgba(20,28,24,.09)` | interaction affordance (decorative) |
| 3 | `MuiCard` **hover** (project / contract / client cards) | `ttaTheme.js:300` | `0 1px 2px rgba(20,28,24,.05)` (`SHADOW_SOFT`) | interaction affordance (decorative) |
| 4 | Utilisation project row, **hover** | `CSRUtilisationPage.jsx:222` | `0 2px 4px rgba(20,28,24,.06)` | interaction affordance (decorative) |
| 5 | Dialog paper (all 7 CSR modals) | `ttaTheme.js:316` | `0 12px 32px rgba(20,28,24,.12)` (`SHADOW_OVERLAY`) | **overlay — carve-out** |
| 6 | Select / Menu popover paper | `ttaTheme.js:360` | `0 4px 12px rgba(20,28,24,.08)` (`SHADOW_RAISED`) | **overlay — carve-out** |
| 7 | Autocomplete popup paper | MUI default `elevation1` → `shadows[1]` | `0 1px 2px rgba(20,28,24,.05)` | **overlay — but UNDER-separated (defect)** |
| 8 | Text field focus ring | `ttaTheme.js:275` | `0 0 0 3px #E1EBE4` (MOSS_T) | **focus ring — DO NOT REMOVE** |
| 9 | CSR login field focus ring | `CSRLogin.jsx:217` | `0 0 0 3px rgba(20,70,58,.10)` | **focus ring — DO NOT REMOVE** |

### Rendered with NO shadow — already compliant, nothing to do

- Every page ground and page-level panel on `/csr/projects`, `/csr/activities`, `/csr/reports`,
  `/csr/utilisation`, `/csr/contracts`, `/csr/clients`, `/csr/9` — **0 shadowed elements at rest.**
- Sidebar, header, header avatar — explicitly zeroed in `CSRThemeProvider.jsx:53,114,143`,
  with a comment that already makes the owner's argument ("a 2px grey shadow is the strongest
  ageing signal in current software").
- `MuiButton` — `disableElevation` + `boxShadow: 'none'` on root, hover and contained variants.
- `MuiCard` at rest — hairline border, `boxShadow: 'none'`.
- Snackbar / Alert toasts — verified live, `none` (Alert renders `elevation0`).
- Tooltip — verified live on "Open project", `none`.
- The CSR login card itself — already `border: 1px solid rgba(255,255,255,.55)`, `boxShadow: none`.

---

## What the theme's `shadows` array is doing

`ttaTheme.js:198-201` replaces MUI's full 25-step ramp:

```
[0]     none
[1..2]  SHADOW_SOFT     0 1px 2px  rgba(20,28,24,.05)
[3..4]  SHADOW_RAISED   0 4px 12px rgba(20,28,24,.08)
[5..6]  SHADOW_OVERLAY  0 12px 32px rgba(20,28,24,.12)
[7..24] SHADOW_RAISED
```

**It is already suppressing most elevation.** MUI's stock `elevation24` (what a Dialog uses) is a
three-layer shadow reaching ~38px of blur; here index 24 resolves to a 12px/8% shadow, and the
Dialog override replaces even that with the 32px/12% overlay. So no MUI component in CSR can
accidentally cast a stock Material shadow — the ramp is flat, tinted toward the ground, and
capped. **The array is not the problem; the two hand-written `sx` shadows are.**

One consequence worth flagging: because indexes 7-24 all collapse to `SHADOW_RAISED`, any MUI
surface asking for high elevation gets the same 4px/12px treatment. That is also why the
Autocomplete popup (row 7) looks wrong — it asks for `elevation1`, gets the *softest* step, and
unlike Menu it has no hairline override to compensate.

---

## Classification and recommendation

### A. Structural card edge — the actual drift. Change these.

**1. Dashboard tiles at rest (`CSRDashboard.jsx:74`).**
Recommendation: replace with `border: '1px solid ' + surfaces.hairline` and `boxShadow: 'none'`.
Visual consequence: none negative. The tile ground is `CARD #FAFBF8` on a `BONE #EFF1EC` page —
a tonal step that already separates the tile, plus the hairline. This is precisely the condition
the theme header describes as sufficient. The tile's own comment worries an outlined tile "reads
as a table cell", but that concern was written against a *bordered tile with no tonal step*;
here the tone step is present, so the tile reads as a card, and this is the same treatment
`MuiCard` already uses on every other CSR page — so the dashboard would stop being the one
screen that looks different from the rest of the module.
**This is the only at-rest shadow in the module. Fixing it alone satisfies the instruction for
every static screen.**

### B. Interaction affordance, decorative — safe to change, low priority.

**2, 3, 4. Hover shadows** on dashboard tiles, `MuiCard`, and the utilisation row.
These are *not* accessibility features — they are mouse-only, never fire for keyboard or touch,
and every one of them already ships alongside a `borderColor` change (`MuiCard` → `#C7CCC3`;
utilisation row → `surfaces.hairline`). Recommendation: drop the `boxShadow` and keep the
border-colour darkening, which is the line-based equivalent and works on every input method.
Visual consequence: hover becomes a crisper edge rather than a lift. Note the tile (row 2) has
*no* border to darken today, so if row 1 is fixed the hover fix comes free.

### C. Overlay / floating surface — **the owner's rule should NOT be applied here without a ruling.**

**5. Dialog paper.** A modal sits over live page content, not over an empty ground. It already
carries a hairline *and* a `rgba(20,28,24,0.40)` backdrop scrim (verified rendered). Removing
the shadow would probably survive, because the scrim does the separating — but the shadow is
what keeps the modal's 14px rounded corner from looking pasted onto the darkened page.
**Keep, or change only with the owner looking at it.** This is the case where the instruction
most plausibly did not mean what it literally says.

**6. Menu / Select popover.** Floats directly over undimmed page content — **no scrim at all.**
It has a hairline, but a 1px `#DBDED6` line over a `#FAFBF8` card is nearly invisible; the
`SHADOW_RAISED` is currently the only thing telling you the list is above the form rather than
part of it. **Keep.** Removing this is the one change with a real usability cost.

**7. Autocomplete popup — genuine defect, opposite direction.** It renders MUI's default
`elevation1` with **no border at all** (`border: 0px none` — verified). So the CSR module's two
dropdown types are inconsistent: Menu gets hairline + `SHADOW_RAISED`, Autocomplete gets no line
and the faintest shadow in the system. Recommendation regardless of which way the owner rules:
add `MuiAutocomplete: { styleOverrides: { paper: { border: '1px solid ' + HAIRLINE, boxShadow:
SHADOW_RAISED } } }` so the two match. If the owner extends "lines not shadows" to overlays,
both should become hairline-only together — never one and not the other.

### D. Focus ring — **must not be removed under any reading of the instruction.**

**8, 9.** `0 0 0 3px` rings on focused inputs. These are `box-shadow` only as an implementation
technique — semantically they are focus indicators, and `ttaTheme.js:272-275` explains the
choice (a ring instead of a border-width change, because widening the border reflows the field's
contents by a pixel on every focus). Removing them would leave keyboard users with a 1px moss
border as the sole focus cue and would fail WCAG 2.4.11 / 2.4.13. **Exclude from any sweep**, and
if a lint rule is written for this, exempt the `0 0 0 Npx` ring form explicitly.

---

## Summary of scope

- **1 change** makes every static CSR screen literally shadow-free (`CSRDashboard.jsx:74`).
- **3 more** (hover states) make it shadow-free in every mouse state too — cheap, no cost.
- **3 overlays** need an explicit owner ruling; the Menu popover is the one where removal has a
  real cost, and the Autocomplete popup should be fixed either way for consistency.
- **2 focus rings** are out of scope and must survive.

If the owner rules "overlays too", the `SHADOW_SOFT` / `SHADOW_RAISED` / `SHADOW_OVERLAY`
constants and the `shadows` array can then be reduced to `'none'` throughout and the tokens
retired — which would make the theme's stated principle and its code finally say the same thing.

---

## Method note

Every row above was read off `getComputedStyle(el).boxShadow` in a real browser session, not
inferred from source. Components that MUI elevates by default were checked in their open state:
Dialog (`elevation24`), Select/Menu popover (`elevation8`), Autocomplete popper (`elevation1`),
Snackbar + Alert (`elevation0`, confirmed `none`), Tooltip (confirmed `none`). No `elevation`
prop appears anywhere in `src/components/csr/` — the whole module relies on theme defaults.
