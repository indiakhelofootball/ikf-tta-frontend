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
import { matchRoutes, useLocation } from 'react-router-dom';
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
import useGrants from '../../auth/useGrants';
import { useAuth } from '../../auth/AuthContext';
import { ROLES } from '../../auth/roles';
import SidebarFrame, { NavItem, NavSection } from './SidebarFrame';
import './Sidebar.css';
import '../../styles/csrDesign.css';

// Mirrors App.js's /csr/* routes. A project detail page (/csr/:id) has to light
// up Projects — it is a row of that list — but /csr/:id also matches every
// sibling section by shape, so a bare useMatch('/csr/:id') would light Projects
// up on Funders and Branding too. Handing the whole set to matchRoutes lets
// react-router's own ranking (static segment beats dynamic) pick the one owner,
// which is the same rule the router used to choose the page being rendered.
const CSR_ROUTES = [
  { path: '/csr' },
  { path: '/csr/projects' },
  { path: '/csr/clients' },
  { path: '/csr/activity-types' },
  { path: '/csr/branding' },
  { path: '/csr/:id' },
];

export default function CSRSidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const matchedPath = matchRoutes(CSR_ROUTES, location)?.[0]?.route?.path;
  const onProjectDetail = matchedPath === '/csr/:id';
  const { canView } = useGrants();
  const { user } = useAuth();
  const isAdminOrSuper = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;

  const item = (props) => <NavItem {...props} collapsed={collapsed} />;
  const section = (label) => <NavSection label={label} collapsed={collapsed} />;

  // Two groups, and the split is the one the source draws. The visual flow's
  // §2 sidebar lists exactly five CSR screens — Dashboard, Projects,
  // Activities, Reports, Util. Cert — which is the work. Funders, Activity
  // Types and Branding were added afterwards and are admin-gated already; they
  // are things you configure once, not places you go. Putting all eight in one
  // column said they were peers, which is why the rail read as unsorted.
  const showSetup = isAdminOrSuper;

  return (
    <SidebarFrame
      collapsed={collapsed}
      onToggle={onToggle}
      title="CSR"
      subtitle="Project Delivery"
      mark="CSR"
      variant="csr"
    >
      {section('Delivery')}
      {item({ to: '/csr', icon: <CSRIcon fontSize="small" />, label: 'Dashboard', end: true })}
      {canView('csr') && item({ to: '/csr/projects', icon: <ProjectsIcon fontSize="small" />, label: 'Projects', forceActive: onProjectDetail })}
      {canView('csr') && item({ to: '/csr/activities', icon: <ActivitiesIcon fontSize="small" />, label: 'Activities' })}
      {(canView('csr_certificate') || canView('csr')) && item({ to: '/csr/utilisation', icon: <UtilisationIcon fontSize="small" />, label: 'Utilisation' })}
      {canView('csr') && item({ to: '/csr/reports', icon: <ReportsIcon fontSize="small" />, label: 'Reports' })}
      {showSetup && section('Setup')}
      {showSetup && item({ to: '/csr/clients', icon: <FundersIcon fontSize="small" />, label: 'Funders' })}
      {showSetup && item({ to: '/csr/activity-types', icon: <CatalogIcon fontSize="small" />, label: 'Activity Types' })}
      {showSetup && item({ to: '/csr/branding', icon: <BrandingIcon fontSize="small" />, label: 'Branding' })}
    </SidebarFrame>
  );
}
