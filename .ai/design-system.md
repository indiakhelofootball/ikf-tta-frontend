# Design system — three scopes, one discipline

**Precedence, so this file cannot rot into a second opinion:**
the `.js` theme files are the source of truth for every hex value. This file
explains *what each token means and why it has that value*. On any conflict,
**the code wins and this file is wrong** — fix it here rather than arguing.

> **Unresolved conflict, recorded not decided.** `DESIGN.md` at the repo root
> (17 Aug 2026, 15 KB) describes an **amber-primary** system. `design/decisions.md`
> declares it *partially superseded* by the Ledger direction below. Both files
> are live and they disagree. Ledger governs CSR colour and type; `DESIGN.md`
> still governs everything Ledger has not overturned. **Resolving this is the
> highest-value cleanup on the design side** and has not been done.

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
break monotonity"* — which moved moss `#1F5F4B` → `#2C6A4F`.

**Six inks, each with exactly one job.** (`design/decisions.md` D-002 asked for
this enumeration; this is it.)

| Ink | Fill | Text | Tint | Means |
|---|---|---|---|---|
| Moss | `#2C6A4F` | same | `#E1EBE4` | money utilised · primary action |
| Indigo | `#33517F` | same | `#E3E8F1` | contracts & deliverables |
| Ochre | `#A8791F` | **`#866119`** | `#F2EAD6` | waiting on you · not started |
| Teal | `#1E6E70` | same | `#DEECEB` | funders & partners |
| Plum | `#6E3F5C` | same | `#EEE3EA` | closed · frozen certificate |
| Clay | `#A6512E` | **`#A34F2D`** | `#F2E3DB` | overspend · needs a decision |

Ochre and clay needed darkened text variants — the fills score **3.41** and
**4.37** on their own tints. **Ochre must never be a button fill** (white on it
is 3.87).

Surfaces: bone `#EFF1EC` (page floor) · card `#FAFBF8` · sunk `#E6E9E2`
(table headers, wells) · hairline `#DBDED6`.
Text: `#1A2620` / `#4E5A54` / `#5C6A63`.

**Standing constraints — do not relitigate:**
- **No dark anchor.** There is no `surfaces.inverse`, and a test enforces it.
- **One ink may lead a screen; the rest appear only where their meaning
  applies.** Four accents means four kinds of thing are genuinely present.
- **Grant identity cycles moss → indigo → teal only.** Ochre, clay and plum are
  reserved for status, so no ink ever means two things on one axis. Assignment
  must be stable per grant **id**, not list position.
- Amber is **retired from CSR**. It survives in `muiTheme.js` for TTA.
- No spring or bounce motion. `prefers-reduced-motion` disables animation.

**Type:** display is a **serif at weight 400** — Source Serif 4, self-hosted
with Manrope in `src/styles/fonts.css` (latin subset, variable, 147 KB for
both). UI stays sans; h5/h6 stay sans. Money sets ~3× its unit label, tabular.

**Open, measured, not fixed:** mean saturation across the CSR dashboard is
**2.8%**, with **zero pixels above 40%**. The agreed fix — figures carry their
ink at full strength, badges go solid with a white glyph, tint comes off the
glass — is decided and **not built**.

**Known drift:** `src/index.js` imports `globals.css` globally, which still
paints the superseded ground `#F9FAFB`. Bone only appears where a
`background.default` Box covers it.

## Scope 2 — TTA internal

`src/styles/muiTheme.js`. Amber-primary, and the amber is the whole lesson:
`#FBBF24` is fine **as a fill** (11.75:1 behind `#111827`) and unusable **as
text** (1.60:1 on the page ground). `AMBER_TEXT` is `#A35905` — `#D97706`
darkened 25% along its own hue, because `#D97706` passes on white (3.19) and
fails on the tinted grounds (2.89–2.93).

Greys were chosen the same way: `#94A3B8` and `#9CA3AF` both fail at ~2.4, so
the system uses `GREY_SLATE #5A6B82` and `GREY_MUTED #5F6672`, which hold above
5 on every ground in use.

## Scope 3 — Funder white-label

`src/components/client/clientTheme.js`. Ink `#111827` on paper `#FFFFFF`, with
the funder's **own brand colour** injected at runtime.

The hard part is that a real brand colour is an **untrusted input**. A real
funder's `#486AFF` tops out at 4.39:1; plain grey `#808080` reaches 4.49. So the
theme cannot assume the brand colour is legible and must fall back rather than
trust it.

## Related

`design/decisions.md` (the decision log, including the ⚠ REASON MISSING gaps) ·
`DESIGN.md` (older, conflicting — see the box at the top) ·
memory: `csr-design-direction`, `csr-ui-2026-08-19`
