import React from "react";
import { NavLink } from "react-router-dom";
import {
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  EmojiEvents as EmojiEventsIcon,
  AddCircleOutline as AddIcon,
  Store as StoreIcon,
  Payment as PaymentIcon,
} from "@mui/icons-material";
import { useAuth } from "../../auth/AuthContext";
import { ROLES } from "../../auth/roles";
import "./Sidebar.css";

export default function Sidebar() {
  const { user } = useAuth();

  const canAccessREPManagement =
    user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;

  const canAccessTrialManagement =
    user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;

  const canAccessVendorManagement =
    user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;

  const canAccessPayments =
    user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;

  const linkClass = ({ isActive }) =>
    `sidebar-link ${isActive ? "active" : ""}`;

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <h2>India Khelo Football</h2>
        <span>TTA System</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={linkClass}>
          <DashboardIcon fontSize="small" />
          Dashboard
        </NavLink>

        {canAccessTrialManagement && (
          <NavLink to="/trials/create" className={linkClass}>
            <AddIcon fontSize="small" />
            Project Setup
          </NavLink>
        )}

        {canAccessTrialManagement && (
          <NavLink to="/trials" className={linkClass} end>
            <EmojiEventsIcon fontSize="small" />
            Projects
          </NavLink>
        )}

        {canAccessREPManagement && (
          <NavLink to="/rep-management" className={linkClass}>
            <BusinessIcon fontSize="small" />
            REP Management
          </NavLink>
        )}


        {canAccessVendorManagement && (
          <NavLink to="/vendors" className={linkClass}>
            <StoreIcon fontSize="small" />
            Service Providers
          </NavLink>
        )}

        {canAccessPayments && (
          <NavLink to="/payments" className={linkClass}>
            <PaymentIcon fontSize="small" />
            Payments
          </NavLink>
        )}
      </nav>
    </aside>
  );
}
