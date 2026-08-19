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
      // Sunken rather than white, so the rail reads as a tonal step down from
      // the page instead of a white panel floating on it. The drop shadow goes
      // with it — depth from tone is the whole premise of this system, and a
      // 2px grey shadow is the strongest ageing signal in current software.
      '.sidebar': {
        backgroundColor: surfaces.sunken,
        borderRight: `1px solid ${surfaces.hairline}`,
        boxShadow: 'none',
      },
      '.sidebar-brand': {
        background: 'none',
        backgroundColor: 'transparent',
        borderBottom: `1px solid ${surfaces.hairline}`,
      },
      '.sidebar-brand h2': {
        fontFamily: fonts.serif,
        fontWeight: 400,
        fontSize: '1.375rem',
        letterSpacing: '-0.01em',
        color: '#1A2620',
      },
      '.sidebar-brand span': { color: '#5C6A63', letterSpacing: '0.14em' },
      '.sidebar-brand-icon': { color: inks.moss.text },

      '.sidebar-toggle': {
        backgroundColor: 'transparent',
        borderBottom: `1px solid ${surfaces.hairline}`,
        color: '#5C6A63',
      },
      '.sidebar-toggle:hover': { backgroundColor: surfaces.hairlineSoft, color: '#1A2620' },

      // The active item is a moss pill. Deliberately NOT a left border and
      // NOT a weight change: the shared stylesheet bolds the active link from
      // 500 to 600, which re-flows the label on every navigation.
      '.sidebar-link': {
        color: '#4E5A54',
        borderLeftColor: 'transparent',
        fontWeight: 500,
        transition: 'background-color 120ms cubic-bezier(0, 0, 0.2, 1), color 120ms cubic-bezier(0, 0, 0.2, 1)',
      },
      '.sidebar-link:hover': {
        backgroundColor: surfaces.hairlineSoft,
        color: '#1A2620',
        borderLeftColor: 'transparent',
      },
      '.sidebar-link.active': {
        background: inks.moss.tint,
        backgroundColor: inks.moss.tint,
        color: inks.moss.text,
        fontWeight: 500,
        borderLeftColor: inks.moss.fill,
      },
      '.sidebar-collapsed .sidebar-link.active': { background: inks.moss.tint },
      '.sidebar-build': {
        borderTopColor: surfaces.hairline,
        color: '#98A199',
      },
      '.sidebar-nav::-webkit-scrollbar-track': { background: surfaces.sunken },
      '.sidebar-nav::-webkit-scrollbar-thumb': { background: '#C7CCC3' },

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
