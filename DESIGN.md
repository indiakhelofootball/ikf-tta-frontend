---
version: v1-draft
name: IKF-TTA-design-system
description: >
  Operations and grant-accountability platform for India Khelo Football. Two surfaces
  sharing one token layer — a dense internal workspace used daily by staff, and a
  white-labelled funder portal visited quarterly by corporate CSR officers. Amber is
  the brand voltage, restricted to action and identity; the working chassis is cool
  neutral. Money is the subject of every screen, so numerals are tabular and the
  primary action is always the heaviest object in its region.

# ---------------------------------------------------------------------------
# TIER 1 — PRIMITIVES.  Raw values. Never referenced by a component directly.
# ---------------------------------------------------------------------------
primitives:
  amber-50:  "#FFFBEB"
  amber-100: "#FEF3C7"
  amber-200: "#FDE68A"
  amber-300: "#FCD34D"
  amber-400: "#FBBF24"   # the brand hex
  amber-500: "#F59E0B"
  amber-600: "#D97706"
  amber-700: "#B45309"
  amber-900: "#78350F"

  ink-950: "#0E0B07"     # warm near-black — the anchor the app currently lacks
  ink-900: "#171310"
  ink-800: "#292420"

  slate-900: "#0F172A"
  slate-800: "#1E293B"
  slate-700: "#334155"
  slate-600: "#475569"
  slate-500: "#64748B"
  slate-400: "#94A3B8"
  slate-300: "#CBD5E1"
  slate-200: "#E2E8F0"
  slate-100: "#F1F5F9"
  slate-50:  "#F8FAFC"
  white:     "#FFFFFF"

  green-600: "#16A34A"
  green-500: "#22C55E"
  red-600:   "#DC2626"
  red-500:   "#EF4444"
  blue-600:  "#2563EB"
  blue-500:  "#3B82F6"

# ---------------------------------------------------------------------------
# TIER 2 — SEMANTIC.  What components reference. Rename freely; values move under.
# ---------------------------------------------------------------------------
colors:
  # Surfaces — four tiers. The current app has two, one percent apart, which is
  # why every screen reads flat. This is the single most important change here.
  canvas:            "{primitives.slate-50}"    # page floor
  surface:           "{primitives.white}"       # cards, panels
  surface-sunken:    "{primitives.slate-100}"   # wells, table headers, insets
  surface-inverse:   "{primitives.ink-950}"     # the dark anchor — nav, hero, login

  # Text
  text-primary:      "#12100C"
  text-secondary:    "{primitives.slate-600}"
  text-muted:        "{primitives.slate-500}"
  text-on-inverse:   "#FFFDF7"
  text-on-amber:     "#231603"   # ALWAYS dark on amber. Never white. Non-negotiable.

  # Borders
  hairline:          "{primitives.slate-200}"
  hairline-strong:   "{primitives.slate-300}"

  # Brand / action — one job each
  action:            "{primitives.amber-500}"   # primary button fill
  action-hover:      "{primitives.amber-600}"
  action-subtle:     "{primitives.amber-100}"   # active nav pill, selected row
  brand-mark:        "{primitives.amber-400}"   # logo, on dark only
  focus-ring:        "{primitives.amber-600}"

  # Semantics — MUST NOT share a hex with action. The current theme has
  # warning.dark === primary.main === #A35905, so brand and caution are the same
  # voice and neither can mean anything. Warning moves to orange-red, away from brand.
  success:           "{primitives.green-600}"
  success-subtle:    "#DCFCE7"
  warning:           "#C2410C"
  warning-subtle:    "#FFEDD5"
  danger:            "{primitives.red-600}"
  danger-subtle:     "#FEE2E2"
  info:              "{primitives.blue-600}"
  info-subtle":      "#DBEAFE"

  # Money — financial figures get their own role so they can be styled once
  money:             "{primitives.slate-900}"
  money-positive:    "{primitives.green-600}"
  money-negative:    "{primitives.red-600}"

typography:
  family-ui:     "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif"
  family-number: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif"

  display:      { size: 32px, weight: 800, lineHeight: 1.15, tracking: "-0.03em" }
  title-lg:     { size: 24px, weight: 700, lineHeight: 1.25, tracking: "-0.02em" }
  title:        { size: 18px, weight: 700, lineHeight: 1.35, tracking: "-0.02em" }
  title-sm:     { size: 15px, weight: 650, lineHeight: 1.4,  tracking: "-0.01em" }
  body:         { size: 15px, weight: 400, lineHeight: 1.55 }
  body-sm:      { size: 13px, weight: 400, lineHeight: 1.5 }
  label:        { size: 12px, weight: 600, lineHeight: 1.4,  tracking: "0.06em", transform: uppercase }
  button:       { size: 14.5px, weight: 650, lineHeight: 1, tracking: "-0.01em" }

  # Every figure on screen. tabular-nums is mandatory — a rupee value that changes
  # in proportional digits jitters and shoves the layout beside it.
  stat-hero:    { size: 32px, weight: 800, lineHeight: 1.1, tracking: "-0.02em", numeric: tabular-nums }
  stat:         { size: 24px, weight: 750, lineHeight: 1.15, numeric: tabular-nums }
  number:       { size: 15px, weight: 500, lineHeight: 1.4, numeric: tabular-nums }

rounded:
  sm:   4px    # chips inside cards, tiny badges
  md:   8px    # buttons, inputs, nav items
  lg:   12px   # cards, tiles
  xl:   16px   # modals, sheets, page-level panels
  pill: 9999px # status chips, avatars

spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px

motion:
  feedback:  { duration: 120ms, easing: "ease-out" }   # hover, press, focus
  entrance:  { duration: 200ms, easing: "ease-out" }   # menus, panels, rows
  overlay:   { duration: 220ms, easing: "ease-out" }   # modals, drawers
  # Never animate: font-weight, letter-spacing, width, margin, or `all`.
  # Animate transform and opacity only.
---

## 1. Visual theme and atmosphere

A working record for money that was given for a public purpose. It should feel **accountable, calm and current** — closer to a ledger than a dashboard, closer to Stripe than to a sports brand.

Two surfaces, one token layer:

| Surface | Who | How often | Density | Tone |
|---|---|---|---|---|
| **Workspace** (`/`, `/csr`, ops) | Staff, CSR managers | Many times a day | Dense | Quiet, fast, unobtrusive |
| **Funder portal** (`/client`) | Corporate CSR officers | Once a quarter | Airy | Composed, credible, evidential |

The workspace earns its keep by getting out of the way. The portal earns its keep by making a funder feel the money was well spent. Same tokens, different density and different type scale — never different colour logic.

## 2. Colour

### The rule that governs amber

Amber is the brand and it stays. What changes is **where it is allowed to appear.**

> **Amber owns: the logo, the primary button, the active navigation state, and the single hero figure on a page. Nothing else.**

This is not a compromise — it is how every successful yellow-primary system works. ClickHouse and Binance both reserve yellow for primary CTAs, brand mark, and stat numbers, and both explicitly forbid a second brand colour or yellow used as body text.

**Three hard rules, in order of how much damage breaking them does:**

1. **Amber is never text on a light surface.** Yellow carries too much luminance; forcing it to pass contrast as body text means darkening it into brown, at which point it is no longer the brand. If amber must carry words, put it on a dark ground or use it as a fill with dark text on top.
2. **Text on amber is always `{colors.text-on-amber}` — dark. Never white.** White on amber fails contrast and, more importantly, breaks recognition.
3. **Amber must never share a hex with a semantic colour.** The current theme sets `warning.dark` and `primary.main` to the same value, so a yellow element cannot be read as either brand or caution. Warning has been moved to a red-orange (`#C2410C`) specifically to get out of amber's way.

### Four surface tiers

The app currently paints `#F9FAFB` page under `#FFFFFF` cards — a one-percent step. Squint at any screen and it collapses into one grey. That is the whole reason it reads flat, and no palette fixes it without this:

```
surface-inverse  ██  ink-950     nav, login hero, page header
canvas           ░░  slate-50    page floor
surface          ▓▓  white       cards, panels
surface-sunken   ▒▒  slate-100   table headers, wells, insets
```

Any screen should use at least three. A screen using only `canvas` + `surface` has no value structure.

### White-label (funder portal only)

A funder's brand hex replaces `action`, `action-subtle` and `brand-mark` — nothing else. Semantics, surfaces and text roles never rebrand. Because the only tokens that move are three, a funder's colour cannot break legibility anywhere it wasn't already checked.

Derive the funder's ramp in a perceptual space (OKLCH) by holding hue and chroma and moving lightness, rather than multiplying sRGB channels. Channel arithmetic is why the current implementation needs a twenty-step loop to find a legible variant.

## 3. Typography

One family. Hierarchy comes from **size, weight and colour together** — never size alone.

| Role | Use |
|---|---|
| `display` | Page title, one per screen |
| `title-lg` / `title` | Section and card headings |
| `label` | Column heads, stat-card labels, section eyebrows |
| `body` / `body-sm` | Running text; `body-sm` for dense tables only |
| `stat-hero` | The one figure a screen exists to communicate |
| `number` | Every other figure |

**The hero-number rule.** On any screen whose job is to report a value, that value is the largest thing on the screen. Not the page title, not the user's avatar. If the page title is bigger than the money, the hierarchy is inverted.

**Every rupee figure uses `tabular-nums`** and `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`. Lakh/crore grouping is not optional; a plain `toLocaleString()` is a defect.

Cap distinct sizes on a screen at five. Sizes like `16.8px` or `11.25px` are rem-rounding artefacts, not decisions — their presence means no scale is governing.

## 4. Components

**Buttons.** One filled button per region — if there are two, there are none. Primary is `action` fill with `text-on-amber`. Secondary is `surface` with a `hairline-strong` border. Tertiary is text only. Height 44px workspace, 48px portal and all forms.

**Inputs.** Label above the field, never placeholder-as-label. Height 44–48px, `rounded.md`, `hairline` border, `focus-ring` on focus using box-shadow rather than outline. Font size never below 16px on any mobile surface or iOS zooms the viewport.

**Cards.** `surface` on `canvas`, `rounded.lg`, `hairline` border, padding `lg`. **One border or one shadow, never both.** Inner elements take `rounded.md` — an inner radius equal to its container's reads wrong.

**Stat tiles.** `label` → `stat-hero` → `body-sm` context line. If the number isn't visually dominant the tile is decoration. Every stat tile is clickable and leads to the rows behind it; a number you cannot drill into is a dead end.

**Tables and rows.** Row height 44px workspace, 52px portal. Numeric columns right-aligned and tabular. Header row in `label` on `surface-sunken`, sticky. Whole row clickable — never a 16px trailing icon as the only target. Empty cell is an em dash, never blank.

**Navigation.** Active item is a filled pill using `action-subtle` with `rounded.md`, inset from the panel edge. **Not a left border, and never a font-weight change** — changing weight on state re-flows the label every time you navigate.

**Modals.** `rounded.xl`, scrim at 40%, focus trapped and returned. **Never `window.confirm()`** — it cannot be styled or branded, and inside a white-labelled portal it exposes the browser instead of the funder's product. Destructive actions offer Undo in preference to a confirmation prompt.

**Status.** Pill, `pill` radius, `*-subtle` background with the matching solid as text. Always carries a word — colour alone excludes the ~8% of men with red-green deficiency and, in a financial context, that is a correctness problem rather than a nicety.

## 5. Layout

Base unit 4px; all spacing from the scale. Related items closer than unrelated ones — if the gap inside a group equals the gap between groups, grouping is broken and no styling repairs it.

Workspace content caps at 1280px; portal content at 880px. Outer margins always exceed internal gaps, or the layout looks like it is escaping the screen.

Everything hangs off a shared left axis. More than two or three unrelated alignment axes on a screen reads ragged even when each element is individually correct.

## 6. Depth

Depth comes from **tone, not shadow.** Four surface tiers plus a hairline do the work that drop shadows used to. Shadow is reserved for things that genuinely float — modals, menus, drawers — and never appears on a card, a header or a nav.

A permanent shadow under a static header is the single strongest signal that an interface was built before about 2020.

## 7. Do's and don'ts

**Do**
- Give every screen at least three surface tiers.
- Make the primary action the heaviest object in its region — darkest or most saturated.
- Reserve amber for identity and action; let the workspace be neutral.
- Put the money in the largest type on the screen.
- Use tabular numerals for every figure.
- Design the empty state — it is where new users and new funders land first.

**Don't**
- Don't use amber as text on a light ground.
- Don't put white text on amber.
- Don't let a semantic colour share a hex with the brand.
- Don't use `transition: all`, or animate any layout property.
- Don't change `font-weight` on hover or active state.
- Don't ship a second filled button in one region.
- Don't show a funder a filename, a database id, or a raw status enum.
- Don't add a colour outside this file. If a value is needed, it becomes a token first.

## 8. Responsive

Test at 360 / 768 / 1280 / 1920 — most layouts fail at exactly one of these. Below 768 the side panel becomes a drawer, tables become cards, toolbars stack. Touch targets grow to 48px rather than shrinking. Any horizontal scroll below 400px is a defect.

## 9. Agent prompt guide

> Build using `DESIGN.md`. Surfaces: `canvas` floor, `surface` cards, `surface-sunken` insets, `surface-inverse` for nav and hero — use at least three per screen. Amber (`action`) only on the primary button, the active nav pill, the logo, and the single hero figure; never as text on light, always dark text on top. Semantics never share a hex with `action`. All figures use `tabular-nums` and en-IN currency formatting, and the most important figure is the largest thing on screen. One filled button per region. Depth from surface tone, not shadow. Nav active state is a filled pill, never a font-weight change.

---

### Open questions for v2 — answer these and I will revise

1. **Workspace chrome: dark or light?** This draft keeps a light workspace with a dark anchor confined to nav and hero. Fully dark chrome is defensible for a tool staff live in all day — it is also a bigger change.
2. **Is `#FBBF24` fixed, or is the whole amber ramp adjustable?** Shifting slightly warmer or deeper buys real legibility headroom.
3. **Portal type scale.** Should the funder portal share the workspace scale at lower density, or step up a size across the board?
4. **Photography.** If real trial photographs exist, they change the portal substantially and outperform any illustration.
