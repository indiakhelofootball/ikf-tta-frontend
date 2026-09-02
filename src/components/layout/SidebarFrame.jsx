// src/components/layout/SidebarFrame.jsx
// Shared chrome for every sidebar: brand, collapse toggle, nav slot, build stamp.
//
// Extracted so a second sidebar (CSRSidebar) cannot drift from the first. Only
// the nav items differ between apps; everything around them is identical, and
// the collapsed widths (64 / 260) must match DashboardLayout's content margin.

import React from 'react';
import { NavLink } from 'react-router-dom';
import { Tooltip } from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import './Sidebar.css';

// Injected at build time by scripts/genBuildId.js (prebuild). 'dev' when running
// the dev server, where no production env file is loaded.
const buildId = process.env.REACT_APP_BUILD_ID || 'dev';
const buildTime = process.env.REACT_APP_BUILD_TIME || '';

// `forceActive` lets a sidebar claim a route that NavLink's own `to`/`end`
// matching cannot reach — a detail page such as /csr/:id or /trials/:id, which
// belongs to the list item the user navigated from but shares no matchable
// prefix with it once `end` is set. The caller decides ownership (see each
// sidebar's route table); NavItem stays generic and defaults to plain NavLink
// behaviour.
export function NavItem({ to, icon, label, end, collapsed, forceActive }) {
  const linkClass = ({ isActive }) =>
    `sidebar-link ${isActive || forceActive ? 'active' : ''}`;
  return (
    <Tooltip
      title={collapsed ? label : ''}
      placement="right"
      arrow
      slotProps={{
        tooltip: {
          sx: {
            bgcolor: '#1e293b',
            color: '#f8fafc',
            fontSize: '0.8rem',
            fontWeight: 600,
            px: 1.5,
            py: 0.75,
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            letterSpacing: '0.01em',
          },
        },
        arrow: { sx: { color: '#1e293b' } },
      }}
    >
      <span style={{ display: 'block' }}>
        <NavLink to={to} className={linkClass} end={end}>
          <span className="sidebar-icon">{icon}</span>
          {!collapsed && <span className="sidebar-label">{label}</span>}
        </NavLink>
      </span>
    </Tooltip>
  );
}

// A nav rail of flat peers has no shape. CSR's eight items put the five
// screens an operator lives in on the same footing as the three catalogs an
// admin edits once a quarter, so the rail reads as a bag of links rather than
// as a place with rooms. A section says which is which.
//
// It has to survive collapse, where there is no room for a word: at 64px the
// label is replaced by the rule alone, so the grouping is still drawn even when
// it cannot be named. Rendering nothing there would make the collapsed rail a
// flat list again — the state a user spends most of their day in.
export function NavSection({ label, collapsed }) {
  if (collapsed) return <div className="sidebar-section-rule" role="presentation" />;
  return <div className="sidebar-section">{label}</div>;
}

export default function SidebarFrame({
  collapsed, onToggle, title, subtitle, mark, children, variant, brandIcon, footer,
}) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${variant === 'csr' ? 'sidebar--csr' : ''}`}>
      <div className="sidebar-brand">
        {collapsed ? (
          <div className="sidebar-brand-icon">{mark}</div>
        ) : (
          <>
            {brandIcon && <span className="sidebar-brand-mark">{brandIcon}</span>}
            <span className="sidebar-brand-words">
              <h2>{title}</h2>
              <span>{subtitle}</span>
            </span>
          </>
        )}
      </div>

      <button className="sidebar-toggle" onClick={onToggle} aria-label="Toggle sidebar">
        {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
      </button>

      <nav className="sidebar-nav">{children}</nav>

      {footer && !collapsed && <div className="sidebar-footer">{footer}</div>}

      {/* Build stamp — lets a bug report be tied to an exact bundle. Without it,
          "it went blank again" cannot be distinguished from a Cloudflare-cached
          old bundle still being served to that user. */}
      <Tooltip title={buildTime ? `Built ${buildTime}` : ''} placement="right">
        <div className="sidebar-build">{collapsed ? buildId.slice(0, 4) : `build ${buildId}`}</div>
      </Tooltip>
    </aside>
  );
}
