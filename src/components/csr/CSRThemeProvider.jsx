import React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import ttaTheme from '../../styles/ttaTheme';

// Scopes the merged DESIGN.md + Cal.com theme to the CSR module ONLY.
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
export default function CSRThemeProvider({ children }) {
  return <ThemeProvider theme={ttaTheme}>{children}</ThemeProvider>;
}
