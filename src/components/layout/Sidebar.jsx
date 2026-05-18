import React from "react";
import { NavLink } from "react-router-dom";
import { Tooltip } from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  EmojiEvents as EmojiEventsIcon,
  AddCircleOutline as AddIcon,
  Store as StoreIcon,
  Payment as PaymentIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Assignment as WorkOrderIcon,
  AccountBalance as BankIcon,
  Assessment as ReportsIcon,
  LocalShipping as CourierIcon,
} from "@mui/icons-material";
import { useAuth } from "../../auth/AuthContext";
import { ROLES } from "../../auth/roles";
import "./Sidebar.css";

export default function Sidebar({ collapsed, onToggle }) {
  const { user } = useAuth();

  const canAccessREPManagement =
    user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;
  const canAccessTrialManagement =
    user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;
  const canAccessVendorManagement =
    user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;
  const canAccessPayments =
    user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;
  const canAccessWorkOrders =
    user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;
  const canAccessBank =
    user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;
  const canAccessReports =
    user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;

  const linkClass = ({ isActive }) =>
    `sidebar-link ${isActive ? "active" : ""}`;

  const NavItem = ({ to, icon, label, end }) => (
    <Tooltip
      title={collapsed ? label : ""}
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
        arrow: {
          sx: { color: '#1e293b' },
        },
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

  return (
    <aside className={`sidebar ${collapsed ? "sidebar-collapsed" : ""}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        {collapsed ? (
          <div className="sidebar-brand-icon">IKF</div>
        ) : (
          <>
            <h2>India Khelo Football</h2>
            <span>TTA System</span>
          </>
        )}
      </div>

      {/* Toggle button */}
      <button className="sidebar-toggle" onClick={onToggle} aria-label="Toggle sidebar">
        {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
      </button>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <NavItem to="/dashboard" icon={<DashboardIcon fontSize="small" />} label="Dashboard" />
        {canAccessTrialManagement && <NavItem to="/admin" icon={<SettingsIcon fontSize="small" />} label="Admin" />}
        {canAccessTrialManagement && <NavItem to="/trials/create" icon={<AddIcon fontSize="small" />} label="Project Setup" />}
        {canAccessTrialManagement && <NavItem to="/trials" icon={<EmojiEventsIcon fontSize="small" />} label="Projects" end />}
        {canAccessREPManagement && <NavItem to="/rep-management" icon={<BusinessIcon fontSize="small" />} label="REP Management" />}
        {canAccessVendorManagement && <NavItem to="/vendors" icon={<StoreIcon fontSize="small" />} label="Vendors" />}
        {canAccessWorkOrders && <NavItem to="/work-orders" icon={<WorkOrderIcon fontSize="small" />} label="Work Orders" />}
        {canAccessPayments && <NavItem to="/payments" icon={<PaymentIcon fontSize="small" />} label="Payments" />}
        {canAccessBank && <NavItem to="/bank-tds" icon={<BankIcon fontSize="small" />} label="Banking" />}
        {canAccessReports && <NavItem to="/reports" icon={<ReportsIcon fontSize="small" />} label="Reports" />}
        {canAccessReports && <NavItem to="/courier" icon={<CourierIcon fontSize="small" />} label="Courier" />}
      </nav>
    </aside>
  );
}
