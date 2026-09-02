// src/components/layout/DashboardLayout.jsx - BIGGER PROFILE
import React from "react";
import { Outlet, Navigate, useLocation, useNavigate } from "react-router-dom";
import { IconButton, Avatar, Menu, MenuItem, Divider, ListItemIcon } from "@mui/material";
import { Logout, Person } from "@mui/icons-material";
import Sidebar from "./Sidebar";
import { useAuth } from "../../auth/AuthContext";
import { ROLES } from "../../auth/roles";
import { expiredSessionLoginPath } from "../../auth/loginDoor";
import "./DashboardLayout.css";

// Every route that renders inside this layout needs an entry, or its header and
// breadcrumb silently read "Dashboard". Twelve routes were missing until
// 2026-08-15 — including every /csr page, Vendors, Work Orders and Banking.
const pageTitles = {
  "/dashboard": "Dashboard",
  "/trials/create": "Project Setup",
  "/trials": "Projects",
  "/rep-management": "REP Management",
  "/vendors": "Vendors",
  "/work-orders": "Work Orders",
  "/payments": "Payments",
  "/bank-tds": "Banking",
  "/reports": "Reports",
  "/courier": "Courier",
  "/logistics": "Logistics",
  "/profile": "Profile",
  "/admin": "Admin",
  "/user-management": "User Management",
  "/request-access": "Request Access",
  "/reports/social-media": "REP Report",
  "/reports/trials": "Trials Report",
  "/reports/payment-audit": "Payment Audit",
  "/reports/vendor-audit": "Vendor Audit",
  "/reports/trial-spend": "Trial Spend",
  // Header shows WHERE you are; the page renders its own title. Keep the two
  // distinct — TTA's convention (header "Vendors" / page "Vendor Management").
  "/csr": "CSR Dashboard",
  "/csr/projects": "Projects",
  "/csr/activities": "Activities",
  "/csr/reports": "Reports",
  "/csr/utilisation": "Work Utilisation",
  "/csr/clients": "Funders",
  "/csr/activity-types": "Activity Types",
  "/csr/branding": "Branding",
  // Without this, /csr/account falls through to the /csr/:id pattern below
  // and the strip reads "Project" on the account page.
  "/csr/account": "Account",
};

// Dynamic routes (App.js path params) can't live in the exact-match map above
// — no key is ever equal to "/trials/17" or "/csr/42". Checked only after an
// exact match fails, so every static /csr/... route above still wins over the
// /csr/:id pattern. DashboardLayout only has the pathname at render time (no
// project fetch here — out of scope), so the label is the honest static noun
// for "you opened one of these", not the project's own name.
const dynamicRoutePatterns = [
  { pattern: /^\/trials\/[^/]+$/, title: "Project" },
  { pattern: /^\/csr\/[^/]+$/, title: "Project" },
];

function resolveTitle(pathname) {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const match = dynamicRoutePatterns.find(({ pattern }) => pattern.test(pathname));
  return match ? match.title : "Dashboard";
}

// `sidebar` takes a COMPONENT, not an element. The collapse state lives here and
// is passed down as collapsed/onToggle, which an element could not receive
// without cloneElement — CSR_IMPLEMENTATION.md §3.3 wrote it as an element, and
// following that literally would silently break the toggle. Defaulting to
// Sidebar keeps every existing call site unchanged.
export default function DashboardLayout({ sidebar: SidebarComponent = Sidebar }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const title = resolveTitle(location.pathname);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Signing out returns you to the door you came in through, the same rule an
  // expired session uses. The destination must be resolved BEFORE logout(),
  // which clears the stored user the rule reads.
  const handleLogout = () => {
    const target = expiredSessionLoginPath();
    logout();
    navigate(target);
  };

  const handleProfile = () => {
    handleClose();
    navigate('/profile');
  };

  // Get display name from profile or email
  const displayName = user?.name || user?.email?.split('@')[0] || 'User';
  const designation = user?.designation || user?.role || 'User';
  const userEmail = user?.email || '';
  const profileImage = user?.profileImage;

  // Get initials for avatar
  const getInitials = () => {
    if (user?.name) {
      return user.name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  // External funders belong to the /client portal, never the internal shell.
  // Route-gating already blocks the data; this keeps them out of the internal
  // layout (sidebar/module names) if they land on an internal URL directly.
  // Placed after all hooks so hook order stays stable across renders.
  if (user?.role === ROLES.CSR_CLIENT) {
    return <Navigate to="/client" replace />;
  }

  return (
    <div className="dashboard-layout">
      <SidebarComponent collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(v => !v)} />

      {/* The rail's width is a variable so a shell can set its own without an
          !important fight against this inline style. TTA sets nothing and
          falls back to 64 / 260; CSR narrows it to match its reference. */}
      <div
        className="dashboard-content"
        style={{
          marginLeft: sidebarCollapsed ? 'var(--rail-w-collapsed, 64px)' : 'var(--rail-w, 260px)',
          transition: 'margin-left 0.25s ease',
        }}
      >
        {/* Header */}
        <div className="dashboard-header">
          <div className="dashboard-header-left">
            {/* CSR has no top-level nav other than the rail, so a detail page
                is a dead end without this. Gated to /csr so TTA's header is
                unchanged, and hidden on the CSR root, which has nowhere to go
                back TO. */}
            {location.pathname.startsWith('/csr') && location.pathname !== '/csr' && (
              <button
                type="button"
                className="header-back"
                aria-label="Go back"
                onClick={() => navigate(-1)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
              </button>
            )}
            <h1>{title}</h1>
            <div className="dashboard-breadcrumb">
              Home / {title}
            </div>
          </div>

          {/* User Menu - BIGGER */}
          <div className="dashboard-header-right">
            <div className="user-info">
              <div className="user-info-text">
                <span className="user-name">{displayName}</span>
                <span className="user-role">{designation}</span>
              </div>
              <IconButton
                onClick={handleClick}
                size="small"
                aria-label="Open account menu"
                aria-controls={open ? 'account-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
              >
                <Avatar 
                  src={profileImage}
                  sx={{ 
                    width: 56,  // BIGGER: 56px (was 40px)
                    height: 56, 
                    bgcolor: '#FDE68A',
                    color: '#111827',
                    fontWeight: 700,
                    fontSize: '1.5rem', // BIGGER font inside avatar
                    border: '3px solid #FEF3C7', // Thicker border with lighter yellow
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  }}
                >
                  {!profileImage && getInitials()}
                </Avatar>
              </IconButton>
            </div>

            <Menu
              anchorEl={anchorEl}
              id="account-menu"
              open={open}
              onClose={handleClose}
              onClick={handleClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                elevation: 3,
                sx: {
                  minWidth: 220,
                  mt: 1,
                  borderRadius: 2,
                },
              }}
            >
              <div style={{ padding: '12px 16px' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#111827' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#6B7280', marginTop: '2px' }}>
                  {userEmail}
                </div>
              </div>
              <Divider />
              <MenuItem onClick={handleProfile}>
                <ListItemIcon>
                  <Person fontSize="small" />
                </ListItemIcon>
                Profile
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout} sx={{ color: '#EF4444' }}>
                <ListItemIcon>
                  <Logout fontSize="small" sx={{ color: '#EF4444' }} />
                </ListItemIcon>
                Logout
              </MenuItem>
            </Menu>
          </div>
        </div>

        {/* Page Content */}
        <div className="dashboard-page">
          <Outlet />
        </div>
      </div>
    </div>
  );
}