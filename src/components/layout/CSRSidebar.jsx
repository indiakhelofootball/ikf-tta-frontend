// src/components/layout/CSRSidebar.jsx
// The CSR app's own menu — CSR_COMPLETE_REFERENCE.md §8 / CSR_ARCHITECTURE.md
// Phase 3, specified since the first plan and never built until now.
//
// What is deliberately ABSENT (CSR_IMPLEMENTATION.md §3.4, "owner was explicit"):
// no Payments, no Vendors, no REP Management, no Banking/TDS, no Courier. TTA
// objects stay reachable only from inside a CSR project — in the act of
// attaching one — never as a place to navigate to. The absence IS the spec.
//
// There is deliberately no "Back to TTA" link either: CSR is its own front door
// at /csr/login, not a room inside TTA. An internal admin who needs the ledger
// signs into it at /login.

import React from 'react';
import { matchRoutes, useLocation, useNavigate } from 'react-router-dom';
import {
  VolunteerActivism as CSRIcon,
  FolderSpecial as ProjectsIcon,
  EventNote as ActivitiesIcon,
  Description as ReportsIcon,
  ReceiptLong as UtilisationIcon,
  GroupAdd as FundersIcon,
  Category as CatalogIcon,
  Palette as BrandingIcon,
} from '@mui/icons-material';
import { Menu, MenuItem, ListItemIcon } from '@mui/material';
import {
  AccountCircleOutlined as AccountIcon,
  LogoutOutlined as LogoutIcon,
} from '@mui/icons-material';
import useGrants from '../../auth/useGrants';
import { useAuth } from '../../auth/AuthContext';
import { ROLES } from '../../auth/roles';
import SidebarFrame, { NavItem } from './SidebarFrame';
import './Sidebar.css';
import '../../styles/csrDesign.css';

// Mirrors App.js's /csr/* routes. A project detail page (/csr/:id) has to light
// up Projects — it is a row of that list — but /csr/:id also matches every
// sibling section by shape, so a bare useMatch('/csr/:id') would light Projects
// up on Funders and Branding too. Handing the whole set to matchRoutes lets
// react-router's own ranking (static segment beats dynamic) pick the one owner,
// which is the same rule the router used to choose the page being rendered.
//
// EVERY static /csr route must be listed. Activities, Reports and Utilisation
// were added to the rail without being added here, so `/csr/:id` was the best
// match for all three and Projects lit up beside the real active item on each
// of them.
const CSR_ROUTES = [
  { path: '/csr' },
  { path: '/csr/projects' },
  { path: '/csr/activities' },
  { path: '/csr/reports' },
  { path: '/csr/utilisation' },
  { path: '/csr/clients' },
  { path: '/csr/activity-types' },
  { path: '/csr/branding' },
  { path: '/csr/account' },
  { path: '/csr/:id' },
];

// The reference's brand lockup is a leaf mark beside the words, not words
// alone. Inline rather than an asset so it takes `currentColor` and cannot go
// stale against the palette.
const LeafMark = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 21v-8" />
    <path d="M12 13c0-3.9 2.9-7 6.5-7 0 3.9-2.9 7-6.5 7Z" />
    <path d="M12 15c0-3-2.2-5.5-5-5.5 0 3 2.2 5.5 5 5.5Z" />
  </svg>
);

const initials = (name) =>
  String(name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

// The rail ends on a card, not on a version string. It carries two things: the
// line the reference prints, and who is signed in — the identity chip used to
// sit in a top bar the reference does not have, so it comes down here rather
// than being dropped.
// The identity row is also the account control. CSR is its own front door at
// /csr/login, so signing out returns there rather than to TTA's /login.
function AccountRow({ user }) {
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.name || user?.email || '';
  const [anchor, setAnchor] = React.useState(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const signOut = () => {
    setAnchor(null);
    logout();
    navigate('/csr/login', { replace: true });
  };

  if (!name) return null;

  return (
    <>
      <button
        type="button"
        className="sidebar-who"
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        aria-label={`Account menu for ${name}`}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        <span className="sidebar-who-av">{initials(name)}</span>
        <span className="sidebar-who-txt">
          <span className="sidebar-who-name">{name}</span>
          <span className="sidebar-who-role">{user?.role}</span>
        </span>
        <span className="sidebar-who-cv" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </button>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MenuItem onClick={() => { setAnchor(null); navigate('/csr/account'); }}>
          <ListItemIcon><AccountIcon fontSize="small" /></ListItemIcon>
          Account
        </MenuItem>
        <MenuItem onClick={signOut}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>
    </>
  );
}

function PromoCard({ user }) {
  return (
    <div className="sidebar-promo">
      {/* The wave is the card's floor. It sits at z-index 0 with everything
          else above it, so it can run the full width without cutting through
          the line or the name the way it did when the name sat over it. */}
      <svg className="sidebar-promo-wave" viewBox="0 0 200 44" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 41 C 70 41, 112 12, 200 5 L200 44 L0 44 Z" opacity=".55" />
        <path d="M0 44 C 84 44, 126 24, 200 17 L200 44 L0 44 Z" opacity=".85" />
      </svg>

      <div className="sidebar-promo-body">
        <span className="sidebar-promo-icon">{LeafMark}</span>
        <p>Building a better tomorrow through meaningful action today.</p>
        <AccountRow user={user} />
      </div>
    </div>
  );
}

export default function CSRSidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const matchedPath = matchRoutes(CSR_ROUTES, location)?.[0]?.route?.path;
  const onProjectDetail = matchedPath === '/csr/:id';
  const { canView } = useGrants();
  const { user } = useAuth();
  const isAdminOrSuper = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;

  const item = (props) => <NavItem {...props} collapsed={collapsed} />;

  // ONE flat column. The approved reference screen draws the rail as a single
  // undifferentiated list with a card at its foot, and that is the design the
  // owner signed off. The Delivery/Setup split that used to be here was an
  // internal judgement about which items are "places" and which are
  // "settings"; it is not in the reference, so it is gone. The admin gate on
  // the last three is unchanged — it was never what the headings were for.
  const showSetup = isAdminOrSuper;

  return (
    <SidebarFrame
      collapsed={collapsed}
      onToggle={onToggle}
      title="CSR"
      subtitle="Project Delivery"
      mark="CSR"
      variant="csr"
      brandIcon={LeafMark}
      footer={<PromoCard user={user} />}
    >
      {item({ to: '/csr', icon: <CSRIcon fontSize="small" />, label: 'Dashboard', end: true })}
      {canView('csr') && item({ to: '/csr/projects', icon: <ProjectsIcon fontSize="small" />, label: 'Projects', forceActive: onProjectDetail })}
      {canView('csr') && item({ to: '/csr/activities', icon: <ActivitiesIcon fontSize="small" />, label: 'Activities' })}
      {canView('csr') && item({ to: '/csr/reports', icon: <ReportsIcon fontSize="small" />, label: 'Reports' })}
      {(canView('csr_certificate') || canView('csr')) && item({ to: '/csr/utilisation', icon: <UtilisationIcon fontSize="small" />, label: 'Utilisation' })}
      {showSetup && <div className="sidebar-divider" role="presentation" />}
      {showSetup && item({ to: '/csr/clients', icon: <FundersIcon fontSize="small" />, label: 'Funders' })}
      {showSetup && item({ to: '/csr/activity-types', icon: <CatalogIcon fontSize="small" />, label: 'Activity Types' })}
      {showSetup && item({ to: '/csr/branding', icon: <BrandingIcon fontSize="small" />, label: 'Branding' })}
    </SidebarFrame>
  );
}
