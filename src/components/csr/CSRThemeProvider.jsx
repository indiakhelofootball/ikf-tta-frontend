import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import GlobalStyles from '@mui/material/GlobalStyles';
import ttaTheme, { surfaces, inks, fonts } from '../../styles/ttaTheme';

// Scopes the Ledger theme to the CSR module ONLY.
//
// A nested ThemeProvider replaces the theme for its subtree, so everything
// rendered inside the CSR route group picks this up and the rest of TTA — the
// trials, vendors, work orders, payments and courier screens — keeps
// muiTheme.js untouched. The funder portal at /client is deliberately NOT
// wrapped: it carries its own white-label theme per client.
//
// WHY THE BLOCK BELOW EXISTS.
//
// A ThemeProvider only reaches MUI components. It cannot reach:
//   · the document body, painted once by CssBaseline against muiTheme
//   · ::selection and the scrollbar, styled in globals.css
//   · the app shell, styled in Sidebar.css and DashboardLayout.css
//
// All three were still painting the retired amber system on every CSR screen.
// The shell was the worst of them: `Sidebar.css` hardcodes #FBBF24, #FEF3C7,
// #FFFBEB and #FDE68A across the brand block, the hover, the active pill and
// the left border, so the loudest colour on a CSR screen was a colour this
// module had retired. None of it shows in a screenshot of the login, which is
// how it survived the theme swap.
//
// These rules are document-wide while CSR is mounted, and that is correct:
// when CSR is on screen, the document IS CSR. They unmount with the route, so
// TTA keeps its own ground and its own brand. The shared CSS files are left
// exactly as they are — those yellows are TTA's identity, not dead code, and
// editing them would restyle screens nobody asked to change.
// ── The rail's own tones ───────────────────────────────────────────────────
// Local to the CSR shell, deliberately NOT added to `surfaces`. Every value is
// measured, and every ratio quoted below is against the ground it lands on.
//
// Re-pitched 26 Aug 2026 off the old green-tinted rail (`#DEE3D9`/`#CFD6C9`,
// hue ~100°) onto the same warm cream family as the re-hued bone (hue ~35°) —
// the owner's brief named green specifically, and the rail was the loudest
// green thing on any CSR screen: a 100vh-tall gradient, not a chip.
//
//   RAIL_HEAD  #E7E1D9  luminance 0.759 — 1.15 against the bone page
//   RAIL_FOOT  #DCD3C8  luminance 0.660 — 1.31 against the bone page
//
// Text on the rail, worst case (the foot) / best case (the head):
//   #251F18  primary ink, hovered labels       11.02 / 12.56   AA
//   #64594F  resting labels, eyebrow, stamp     4.60 /  5.24   AA
//   #B23316  coral TEXT, brand mark only, pinned to the head    4.79   AA
//   coral FILL on the active pill (white text), independent of rail  5.02  AA
//
// Coral's TEXT variant never lands on the deep end: it appears only in the
// brand block, which is pinned flat to RAIL_HEAD, and the active pill uses
// the FILL variant against white, which carries its own ground regardless of
// what the rail is doing underneath. On the foot, CORAL_TEXT would measure
// 4.20 and fail — hence the pinning, same rule as before.
const RAIL_HEAD = '#E7E1D9';
const RAIL_FOOT = '#DCD3C8';
// The rail's divider and its edge against the page. 1.48 on bone, so the rail
// still has a drawn boundary and not only a tonal one.
const RAIL_EDGE = '#D2C7B8';
// Hover is a wash, not a colour: it deepens the gradient by a constant amount
// wherever it is applied, which a fixed hex cannot do over a gradient.
const RAIL_HOVER = 'rgba(37, 31, 24, 0.10)';

const csrDocumentStyles = (
  <GlobalStyles
    styles={{
      body: { backgroundColor: surfaces.canvas },
      '::selection': { backgroundColor: inks.moss.tint, color: '#251F18' },
      '::-webkit-scrollbar-track': { backgroundColor: surfaces.sunken },
      '::-webkit-scrollbar-thumb': { backgroundColor: '#ABA39C' },
      '::-webkit-scrollbar-thumb:hover': { backgroundColor: '#70665C' },

      // ---- Layout ground -------------------------------------------------
      '.dashboard-layout': { backgroundColor: surfaces.canvas },

      // ---- Sidebar -------------------------------------------------------
      // A fourth tonal step, below sunken, that exists only here.
      //
      // Sunken (#EEE8E0) measured 1.10 against the bone page — a step you have
      // to be told about. The rail now runs #E7E1D9 → #DCD3C8 top to bottom,
      // which is 1.15 at the top and 1.31 at the foot: it reads as its own
      // surface without becoming one.
      //
      // IT IS STILL NOT A DARK ANCHOR, and must not become one. The owner
      // rejected dark chrome on 2026-08-18 and ttaTheme.smoke.test.js holds
      // every exported surface above 0.70 relative luminance. Both stops here
      // clear that bar on purpose — top 0.759, foot 0.660 — so the rule this
      // rail obeys is "deeper step, same light family". The values live in
      // this file rather than in `surfaces` precisely because they are the CSR
      // shell's own tones, not a fourth tier for the whole system to reach for.
      //
      // The gradient is not decoration. A 100vh rail filled with one flat
      // mid-tone goes dead over 900px; a 1.13 sweep across its own height
      // gives it a direction without adding a colour.
      // THE COLLAPSE. Sidebar.css animates `width` and DashboardLayout
      // separately animates `margin-left` -- two independently-timed 0.25s
      // eases on two layout properties in two files. They cannot stay in step,
      // so the rail's edge and the content's edge visibly separate mid-way,
      // and every frame of both reflows the whole nav.
      //
      // Width still has to change (the rail genuinely occupies less space
      // collapsed) but it no longer animates: the transition is cut here and
      // the two edges move together in one frame instead of drifting apart
      // over fifteen. Snapping honestly beats tearing smoothly.
      '.sidebar': {
        backgroundColor: RAIL_FOOT,
        backgroundImage: `linear-gradient(180deg, ${RAIL_HEAD} 0%, ${RAIL_FOOT} 100%)`,
        borderRight: `1px solid ${RAIL_EDGE}`,
        boxShadow: 'none',
        transition: 'none',
      },
      '.dashboard-content': { transition: 'none' },
      // Pinned to the flat head tone rather than left transparent, so the
      // coral brand mark below is measured against a known ground (4.79)
      // instead of against wherever the gradient happens to be.
      '.sidebar-brand': {
        background: 'none',
        backgroundColor: RAIL_HEAD,
        borderBottom: `1px solid ${RAIL_EDGE}`,
      },
      '.sidebar-brand h2': {
        fontFamily: fonts.serif,
        fontWeight: 400,
        fontSize: '1.375rem',
        letterSpacing: '-0.01em',
        color: '#251F18',
      },
      // #70665C measured 4.20 on the foot tone — it passes on sunken and
      // stops passing at the deep end of the rail. Everything quiet on this
      // rail moves up to #64594F, which holds 5.24 / 4.60 across the whole
      // sweep (head / foot).
      '.sidebar-brand span': { color: '#64594F', letterSpacing: '0.14em' },
      '.sidebar-brand-icon': { color: inks.moss.text },

      // Section labels. #6B7280 is the shared default and would measure under
      // 4.5 at the rail's foot — the same near-miss the design system calls
      // out on tinted grounds. #64594F is the rail's documented resting-label
      // colour and holds 4.60 / 5.24 across the whole sweep.
      '.sidebar-section': { color: '#64594F' },
      '.sidebar-section-rule': { backgroundColor: RAIL_EDGE },

      '.sidebar-toggle': {
        backgroundColor: 'transparent',
        borderBottom: `1px solid ${RAIL_EDGE}`,
        color: '#64594F',
      },
      '.sidebar-toggle:hover': { backgroundColor: RAIL_HOVER, color: '#251F18' },

      // HOVER AND ACTIVE MOVE IN OPPOSITE DIRECTIONS ON THE TONAL AXIS.
      //
      // Hover presses IN: a translucent ink wash that deepens whatever the
      // gradient is doing at that point in the rail, so the step is the same
      // at the top as at the foot — a flat hover colour cannot be, over a
      // gradient. The label darkens #64594F → #251F18 with it.
      //
      // Active lifts OUT: the coral pill, a solid fill under white, carrying
      // its own ground regardless of the rail. Nothing about hover is coral
      // and nothing about hover is lighter, so the two can never be read for
      // each other — which is the whole job of the active state.
      //
      // Weight stays 500 in every state. The shared stylesheet bolds the
      // active link 500 → 600, which re-flows the label on every navigation.
      // The shared stylesheet uses the catch-all transition keyword on this
      // selector, which animates the border-left width and the font metrics
      // along with the colours. Named properties only here, and the border
      // colour is included so the active spine fades in rather than snapping.
      // (Spelling that keyword out in prose trips designLint -- it greps, it
      // does not parse.)
      '.sidebar-link': {
        color: '#64594F',
        borderLeftColor: 'transparent',
        fontWeight: 500,
        transition: [
          'background-color 120ms cubic-bezier(0, 0, 0.2, 1)',
          'color 120ms cubic-bezier(0, 0, 0.2, 1)',
          'border-left-color 120ms cubic-bezier(0, 0, 0.2, 1)',
        ].join(', '),
      },

      // Hover is CORAL's accent, not ink text. It was near-black at 10% before
      // the rail was green, which over any ground composites to grey — a grey
      // smudge under a coloured pill reads as damage, not as a state, and it
      // made hover look STRONGER than active because at least the smudge was
      // visible. Same family as active, lighter, so the two read as related
      // steps on one axis rather than as two unrelated effects.
      '.sidebar-link:hover': {
        backgroundColor: `${inks.moss.accent}24`,
        // Near-black, not coral. The wash carries the colour; the label just
        // gets darker.
        color: '#251F18',
        borderLeftColor: `${inks.moss.accent}80`,
      },
      // Active is a SOLID coral fill, white text — the fill clears 5.02:1
      // against white on its own, independent of whatever the rail gradient
      // is doing underneath. A fill cannot converge with its ground the way
      // the old pale tint did on a darkened rail.
      //
      // Weight stays 500. The shared stylesheet bumps it to 600 on this
      // selector, which re-flows the label on every navigation.
      '.sidebar-link.active': {
        background: inks.moss.fill,
        backgroundColor: inks.moss.fill,
        color: '#FFFFFF',
        fontWeight: 500,
        borderLeftColor: inks.moss.fill,
      },
      '.sidebar-link.active:hover': {
        backgroundColor: '#AF3216',
        color: '#FFFFFF',
      },
      '.sidebar-link.active .sidebar-icon': { color: '#FFFFFF' },
      '.sidebar-collapsed .sidebar-link.active': { background: inks.moss.fill },
      // #64594F holds 4.60 at the foot, where it sits — see the rail-tone
      // measurements above.
      '.sidebar-build': {
        borderTopColor: RAIL_EDGE,
        color: '#64594F',
      },
      '.sidebar-nav::-webkit-scrollbar-track': { background: 'transparent' },
      '.sidebar-nav::-webkit-scrollbar-thumb': { background: '#A4917C' },
      '.sidebar-nav::-webkit-scrollbar-thumb:hover': { background: '#87745E' },

      // ---- Header --------------------------------------------------------
      // It was the heaviest object on every screen: a 30px bold sans page
      // title over a breadcrumb, a name, a role and a 56px avatar — about
      // 155px of chrome carrying nothing the reader did not already know,
      // outweighing the serif headline beneath it. Chrome recedes.
      '.dashboard-header': {
        backgroundColor: surfaces.canvas,
        borderBottom: `1px solid ${surfaces.hairline}`,
        boxShadow: 'none',
        padding: '0.875rem 2.5rem',
      },
      '.dashboard-header h1': {
        fontFamily: fonts.serif,
        fontSize: '1.125rem',
        fontWeight: 400,
        letterSpacing: '-0.01em',
        color: '#64594F',
        margin: 0,
      },
      '.dashboard-breadcrumb': { display: 'none' },
      '.user-info': { padding: '0.25rem 0.5rem' },
      // Whose account it is ranks below what is on screen. It was bold
      // near-black, which made it the heaviest object in a quietened header.
      '.user-info .user-name': { fontSize: '0.875rem', fontWeight: 500, color: '#64594F' },
      '.user-info .user-role': { fontSize: '0.6875rem', fontWeight: 500, color: '#ABA39C', letterSpacing: '0.1em' },

      // The avatar was #FDE68A inside a #FEF3C7 ring — amber, set inline, so
      // no theme could reach it. Two class selectors beat the one-class
      // specificity of an sx rule, which is why this works without !important.
      '.dashboard-header .MuiAvatar-root': {
        width: 36,
        height: 36,
        fontSize: '0.875rem',
        fontWeight: 600,
        backgroundColor: inks.moss.tint,
        color: inks.moss.text,
        border: `1px solid ${surfaces.hairline}`,
        boxShadow: 'none',
      },
    }}
  />
);

export default function CSRThemeProvider({ children }) {
  return (
    <ThemeProvider theme={ttaTheme}>
      {csrDocumentStyles}
      {children}
    </ThemeProvider>
  );
}
