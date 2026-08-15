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

export function NavItem({ to, icon, label, end, collapsed }) {
  const linkClass = ({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`;
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

export default function SidebarFrame({ collapsed, onToggle, title, subtitle, mark, children }) {
  return (
    <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="sidebar-brand">
        {collapsed ? (
          <div className="sidebar-brand-icon">{mark}</div>
        ) : (
          <>
            <h2>{title}</h2>
            <span>{subtitle}</span>
          </>
        )}
      </div>

      <button className="sidebar-toggle" onClick={onToggle} aria-label="Toggle sidebar">
        {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
      </button>

      <nav className="sidebar-nav">{children}</nav>

      {/* Build stamp — lets a bug report be tied to an exact bundle. Without it,
          "it went blank again" cannot be distinguished from a Cloudflare-cached
          old bundle still being served to that user. */}
      <Tooltip title={buildTime ? `Built ${buildTime}` : ''} placement="right">
        <div className="sidebar-build">{collapsed ? buildId.slice(0, 4) : `build ${buildId}`}</div>
      </Tooltip>
    </aside>
  );
}
