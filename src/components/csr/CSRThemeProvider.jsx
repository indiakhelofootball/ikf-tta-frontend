import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import GlobalStyles from '@mui/material/GlobalStyles';
import ttaTheme, { surfaces, inks } from '../../styles/ttaTheme';

// Scopes the Ledger theme to the CSR module ONLY.
//
// A nested ThemeProvider replaces the theme for its subtree, so everything
// rendered inside the CSR route group picks this up and the rest of TTA — the
// trials, vendors, work orders, payments and courier screens — keeps
// muiTheme.js untouched. That containment is the point: CSR is where the new
// system is being proven, and a global swap would restyle screens nobody asked
// to change.
//
// This is the seam a plain token file could never provide. Tokens imported by a
// component cannot reach MuiButton or MuiTableCell — the theme wins on every MUI
// component regardless — so an earlier CSR-scoped token module sat unused until
// its values moved into ttaTheme.js and this provider put them in force.
//
// The funder portal at /client is deliberately NOT wrapped: it carries its own
// white-label theme per client, and pushing this one over it would override a
// funder's brand colours.

// WHY THIS EXISTS: three things live on the document, not on a component, and a
// nested ThemeProvider cannot reach any of them.
//
// CssBaseline is mounted once at the root of src/index.js against muiTheme, so
// the BODY is painted #F9FAFB — the amber system's ground — on every CSR screen
// too. Bone only appeared where a page happened to paint a full-height Box over
// the top; anywhere it did not, the superseded ground showed through. Selection
// and scrollbar are worse, because globals.css styles both with TTA's brand
// yellow (#FDE68A, #FCD34D, #F59E0B). Drag-select any text on a CSR page and it
// highlighted amber — a colour this module has retired.
//
// None of that is visible in a screenshot of a clean page load, which is why it
// survived the theme swap.
//
// These rules are document-wide while CSR is mounted, and that is correct: when
// CSR is on screen, the document IS CSR. They unmount with the route, so TTA
// gets its own ground and its own brand back untouched. globals.css is left
// exactly as it is — those yellow tokens are TTA's identity, not dead code.
const csrDocumentStyles = (
  <GlobalStyles
    styles={{
      body: { backgroundColor: surfaces.canvas },
      // Moss tint behind near-black ink: 12.82:1, and it reads as the same
      // system as the rest of the module rather than as the OS default.
      '::selection': { backgroundColor: inks.moss.tint, color: '#1A2620' },
      '::-webkit-scrollbar-track': { backgroundColor: surfaces.sunken },
      // A scrollbar is chrome, not an accent. It takes a neutral from the
      // green-grey ramp and darkens on hover, rather than putting a saturated
      // brand colour down the side of every long table.
      '::-webkit-scrollbar-thumb': { backgroundColor: '#98A199' },
      '::-webkit-scrollbar-thumb:hover': { backgroundColor: '#5C6A63' },
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
