import React from "react";
import { matchRoutes, useLocation } from "react-router-dom";
import {
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  EmojiEvents as EmojiEventsIcon,
  AddCircleOutline as AddIcon,
  Store as StoreIcon,
  Payment as PaymentIcon,
  Settings as SettingsIcon,
  Assignment as WorkOrderIcon,
  AccountBalance as BankIcon,
  Assessment as ReportsIcon,
  LocalShipping as CourierIcon,
  AdminPanelSettings as AccessIcon,
  LockOpen as RequestAccessIcon,
  VolunteerActivism as CSRIcon,
} from "@mui/icons-material";
import useGrants from "../../auth/useGrants";
import { REPORT_KEYS } from "../../auth/roles";
import SidebarFrame, { NavItem } from "./SidebarFrame";
import "./Sidebar.css";

// Mirrors App.js's /trials* routes. Projects is pinned with `end` so it does not
// steal /trials/create from Project Setup, which also leaves a trial detail page
// (/trials/:id) with nothing highlighted. matchRoutes ranks the three the way the
// router already ranked them, so /trials/create still resolves to Project Setup
// and only a real detail page hands Projects the highlight.
const TRIAL_ROUTES = [
  { path: "/trials" },
  { path: "/trials/create" },
  { path: "/trials/:id" },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const matchedPath = matchRoutes(TRIAL_ROUTES, location)?.[0]?.route?.path;
  const onTrialDetail = matchedPath === "/trials/:id";
  const { isSuper, canView, canEdit } = useGrants();

  const canAccessTrialManagement = canView('trials');
  const canAccessREPManagement = canView('reps');
  const canAccessVendorManagement = canView('vendors');
  const canAccessPayments = canView('payments');
  const canAccessWorkOrders = canView('workorders');
  // Banking is a payments-operations screen (mark paid/bounced, TDS deposit), so
  // it lives under the payments grant — the person who handles payments does it.
  const canAccessBank = canView('payments');
  const canAccessReports = REPORT_KEYS.some((k) => canView(k));
  const canAccessCourier = canView('courier');
  const canAccessCSR = canView('csr');
  const canManageConfig = canEdit('config'); // Admin = config management
  const canAccessControl = isSuper;

  const item = (props) => <NavItem {...props} collapsed={collapsed} />;

  return (
    <SidebarFrame
      collapsed={collapsed}
      onToggle={onToggle}
      title="India Khelo Football"
      subtitle="TTA System"
      mark="IKF"
    >
      {item({ to: "/dashboard", icon: <DashboardIcon fontSize="small" />, label: "Dashboard" })}
      {canAccessControl && item({ to: "/user-management", icon: <AccessIcon fontSize="small" />, label: "User Management" })}
      {canManageConfig && item({ to: "/admin", icon: <SettingsIcon fontSize="small" />, label: "Admin" })}
      {canEdit('trials') && item({ to: "/trials/create", icon: <AddIcon fontSize="small" />, label: "Project Setup" })}
      {canAccessTrialManagement && item({ to: "/trials", icon: <EmojiEventsIcon fontSize="small" />, label: "Projects", end: true, forceActive: onTrialDetail })}
      {canAccessREPManagement && item({ to: "/rep-management", icon: <BusinessIcon fontSize="small" />, label: "REP Management" })}
      {canAccessVendorManagement && item({ to: "/vendors", icon: <StoreIcon fontSize="small" />, label: "Vendors" })}
      {canAccessWorkOrders && item({ to: "/work-orders", icon: <WorkOrderIcon fontSize="small" />, label: "Work Orders" })}
      {canAccessPayments && item({ to: "/payments", icon: <PaymentIcon fontSize="small" />, label: "Payments" })}
      {canAccessBank && item({ to: "/bank-tds", icon: <BankIcon fontSize="small" />, label: "Banking" })}
      {canAccessReports && item({ to: "/reports", icon: <ReportsIcon fontSize="small" />, label: "Reports" })}
      {canAccessCourier && item({ to: "/courier", icon: <CourierIcon fontSize="small" />, label: "Courier" })}
      {/* One door into the CSR app, per CSR_PRODUCT_DESIGN.md:39 — "give an
          existing staff user the csr grant and the CSR app appears in their
          sidebar". Previously two flat items (CSR Projects + CSR Clients), which
          read as peers and caused the "why are there two CSRs" confusion; funder
          onboarding now lives inside the CSR app's own menu. */}
      {canAccessCSR && item({ to: "/csr", icon: <CSRIcon fontSize="small" />, label: "CSR" })}
      {!isSuper && item({ to: "/request-access", icon: <RequestAccessIcon fontSize="small" />, label: "Request Access" })}
    </SidebarFrame>
  );
}
