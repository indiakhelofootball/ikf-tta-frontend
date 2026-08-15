// src/components/layout/CSRSidebar.jsx
// The CSR app's own menu — CSR_COMPLETE_REFERENCE.md §8 / CSR_ARCHITECTURE.md
// Phase 3, specified since the first plan and never built until now.
//
// What is deliberately ABSENT (CSR_IMPLEMENTATION.md §3.4, "owner was explicit"):
// no Payments, no Vendors, no REP Management, no Banking/TDS, no Courier. TTA
// objects stay reachable only from inside a CSR project — in the act of
// attaching one — never as a place to navigate to. The absence IS the spec.
//
// "Back to TTA" points at /dashboard, which carries no grant gate, so it cannot
// become a door into the ledger. Without it an admin who enters CSR has no way
// out.

import React from 'react';
import {
  VolunteerActivism as CSRIcon,
  FolderSpecial as ProjectsIcon,
  GroupAdd as FundersIcon,
  Category as CatalogIcon,
  Palette as BrandingIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import useGrants from '../../auth/useGrants';
import { useAuth } from '../../auth/AuthContext';
import { ROLES } from '../../auth/roles';
import SidebarFrame, { NavItem } from './SidebarFrame';
import './Sidebar.css';

export default function CSRSidebar({ collapsed, onToggle }) {
  const { canView } = useGrants();
  const { user } = useAuth();
  const isAdminOrSuper = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;

  const item = (props) => <NavItem {...props} collapsed={collapsed} />;

  return (
    <SidebarFrame
      collapsed={collapsed}
      onToggle={onToggle}
      title="CSR"
      subtitle="Project Delivery"
      mark="CSR"
    >
      {item({ to: '/csr', icon: <CSRIcon fontSize="small" />, label: 'Dashboard', end: true })}
      {canView('csr') && item({ to: '/csr/projects', icon: <ProjectsIcon fontSize="small" />, label: 'Projects' })}
      {isAdminOrSuper && item({ to: '/csr/clients', icon: <FundersIcon fontSize="small" />, label: 'Funders' })}
      {isAdminOrSuper && item({ to: '/csr/activity-types', icon: <CatalogIcon fontSize="small" />, label: 'Activity Types' })}
      {isAdminOrSuper && item({ to: '/csr/branding', icon: <BrandingIcon fontSize="small" />, label: 'Branding' })}
      {item({ to: '/dashboard', icon: <BackIcon fontSize="small" />, label: 'Back to TTA' })}
    </SidebarFrame>
  );
}
