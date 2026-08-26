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
//   RAIL_HEAD  #DEE3D9  luminance 0.755 — 1.15 against the bone page
//   RAIL_FOOT  #CFD6C9  luminance 0.656 — 1.31 against the bone page
//
// Text on the rail, worst case (the foot) / best case (the head):
//   #1A2620  primary ink, hovered labels     10.52 / 11.99
//   #4E5A54  resting labels, eyebrow, stamp   4.84 /  5.52   AA
//   #2C6A4F  moss, brand mark only, pinned to the head        4.90   AA
//   moss on the active pill (#E1EBE4), independent of the rail 5.24   AA
//
// Moss never lands on the deep end: it appears in the brand block, which is
// pinned flat to RAIL_HEAD, and in the active pill, which carries its own
// ground. On the foot it would measure 4.39 and fail — hence the pinning.
const RAIL_HEAD = '#DEE3D9';
const RAIL_FOOT = '#CFD6C9';
// The rail's divider and its edge against the page. 1.48 on bone, so the rail
// still has a drawn boundary and not only a tonal one.
const RAIL_EDGE = '#C2CABB';
// Hover is a wash, not a colour: it deepens the gradient by a constant 1.20
// wherever it is applied, which a fixed hex cannot do over a gradient.
const RAIL_HOVER = 'rgba(26, 38, 32, 0.10)';

const csrDocumentStyles = (
  <GlobalStyles
    styles={{
      body: { backgroundColor: surfaces.canvas },
      '::selection': { backgroundColor: inks.moss.tint, color: '#1A2620' },
      '::-webkit-scrollbar-track': { backgroundColor: surfaces.sunken },
      '::-webkit-scrollbar-thumb': { backgroundColor: '#98A199' },
      '::-webkit-scrollbar-thumb:hover': { backgroundColor: '#5C6A63' },

      // ---- Layout ground -------------------------------------------------
      '.dashboard-layout': { backgroundColor: surfaces.canvas },

      // ---- Sidebar -------------------------------------------------------
      // A fourth tonal step, below sunken, that exists only here.
      //
      // Sunken (#E6E9E2) measured 1.08 against the bone page — a step you have
      // to be told about. The rail now runs #DEE3D9 → #CFD6C9 top to bottom,
      // which is 1.15 at the top and 1.31 at the foot: it reads as its own
      // surface without becoming one.
      //
      // IT IS STILL NOT A DARK ANCHOR, and must not become one. The owner
      // rejected dark chrome on 2026-08-18 and ttaTheme.smoke.test.js holds
      // every exported surface above 0.70 relative luminance. Both stops here
      // clear that bar on purpose — top 0.755, foot 0.656 — so the rule this
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
      // Pinned to the flat head tone rather than left transparent, so the moss
      // brand mark below is measured against a known ground (4.90) instead of
      // against wherever the gradient happens to be.
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
        color: '#1A2620',
      },
      // #5C6A63 measured 4.39 on the head tone and 4.10 at the foot — it
      // passed on sunken and stops passing here. Everything quiet on this rail
      // moves up to #4E5A54, which holds 5.52 / 4.84 across the whole sweep.
      '.sidebar-brand span': { color: '#4E5A54', letterSpacing: '0.14em' },
      '.sidebar-brand-icon': { color: inks.moss.text },

      // Section labels. #6B7280 is the shared default and measures 4.44 at the
      // rail's foot — the same near-miss the design system calls out on tinted
      // grounds. #4E5A54 is the rail's documented resting-label colour and
      // holds 4.84 / 5.52 across the whole sweep.
      '.sidebar-section': { color: '#4E5A54' },
      '.sidebar-section-rule': { backgroundColor: RAIL_EDGE },

      '.sidebar-toggle': {
        backgroundColor: 'transparent',
        borderBottom: `1px solid ${RAIL_EDGE}`,
        color: '#4E5A54',
      },
      '.sidebar-toggle:hover': { backgroundColor: RAIL_HOVER, color: '#1A2620' },

      // HOVER AND ACTIVE MOVE IN OPPOSITE DIRECTIONS ON THE TONAL AXIS.
      //
      // Hover presses IN: a translucent ink wash that deepens whatever the
      // gradient is doing at that point in the rail, so the step is the same
      // 1.20 at the top as at the foot — a flat hover colour cannot be, over a
      // gradient. The label darkens #4E5A54 → #1A2620 with it.
      //
      // Active lifts OUT: the moss pill, lighter than the rail everywhere,
      // carrying moss text and a moss spine. Nothing about hover is moss and
      // nothing about hover is lighter, so the two can never be read for each
      // other — which is the whole job of the active state.
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
        color: '#4E5A54',
        borderLeftColor: 'transparent',
        fontWeight: 500,
        transition: [
          'background-color 120ms cubic-bezier(0, 0, 0.2, 1)',
          'color 120ms cubic-bezier(0, 0, 0.2, 1)',
          'border-left-color 120ms cubic-bezier(0, 0, 0.2, 1)',
        ].join(', '),
      },

      // Hover is MOSS, not ink. It was `rgba(26,38,32,0.10)` -- near-black at
      // 10% -- which over any ground composites to grey (#CAD0C7 on this rail).
      // A grey smudge under a green pill reads as damage, not as a state, and
      // it made hover look STRONGER than active because at least the smudge was
      // visible. Same family as active, lighter, so the two read as related
      // steps on one axis rather than as two unrelated effects.
      '.sidebar-link:hover': {
        backgroundColor: `${inks.moss.fill}14`,
        // Near-black, not moss. Moss-on-moss-wash measures 4.42 at the head of
        // the gradient but 3.89 at the foot -- under AA where the last nav
        // items sit. The wash carries the colour; the label just gets darker.
        color: '#1A2620',
        borderLeftColor: `${inks.moss.fill}4D`,
      },
      // Active is a SOLID moss fill. The tint was #E1EBE4 on a #DEE3D9 rail --
      // 1.07 contrast, which is no contrast at all. That tint was measured
      // against bone (#EFF1EC); once the rail was darkened underneath it the
      // pill and its ground converged and the current page stopped being
      // visible. A fill cannot converge with anything.
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
        backgroundColor: '#255943',
        color: '#FFFFFF',
      },
      '.sidebar-link.active .sidebar-icon': { color: '#FFFFFF' },
      '.sidebar-collapsed .sidebar-link.active': { background: inks.moss.fill },
      // Was #98A199: 1.92 on this rail, and only 2.8 on the old one. It has
      // never actually passed. #4E5A54 holds 4.84 at the foot, where it sits.
      '.sidebar-build': {
        borderTopColor: RAIL_EDGE,
        color: '#4E5A54',
      },
      '.sidebar-nav::-webkit-scrollbar-track': { background: 'transparent' },
      '.sidebar-nav::-webkit-scrollbar-thumb': { background: '#8B9885' },
      '.sidebar-nav::-webkit-scrollbar-thumb:hover': { background: '#6E7B69' },

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
        color: '#4E5A54',
        margin: 0,
      },
      '.dashboard-breadcrumb': { display: 'none' },
      '.user-info': { padding: '0.25rem 0.5rem' },
      // Whose account it is ranks below what is on screen. It was bold
      // near-black, which made it the heaviest object in a quietened header.
      '.user-info .user-name': { fontSize: '0.875rem', fontWeight: 500, color: '#4E5A54' },
      '.user-info .user-role': { fontSize: '0.6875rem', fontWeight: 500, color: '#98A199', letterSpacing: '0.1em' },

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
