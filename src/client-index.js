// Entry point for the SEPARATE client build (see craco.config.js + the
// `build:client` script). Mirrors index.js but mounts ClientApp instead of the
// internal App, so the produced bundle contains no staff-app code.
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import ClientApp from './ClientApp';
import { AuthProvider } from './auth/AuthContext';
import muiTheme from './styles/muiTheme';
import './styles/globals.css';

window.addEventListener('error', (e) => {
  if (e.message?.includes('ResizeObserver')) e.stopImmediatePropagation();
});

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <React.StrictMode>
    <BrowserRouter>
      {/* Base theme only; each client re-skins per-page via clientThemeFrom. */}
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <AuthProvider>
          <ClientApp />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
