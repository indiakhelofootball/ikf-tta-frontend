import React from "react";
import { NavLink } from "react-router-dom";
import {
  Dashboard as DashboardIcon,
  Business as BusinessIcon,
  EmojiEvents as EmojiEventsIcon,
  AddCircleOutline as AddIcon,
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
            Trial Creation
          </NavLink>
        )}

        {canAccessTrialManagement && (
          <NavLink to="/trials" className={linkClass} end>
            <EmojiEventsIcon fontSize="small" />
            Trials
          </NavLink>
        )}

        {canAccessREPManagement && (
          <NavLink to="/rep-management" className={linkClass}>
            <BusinessIcon fontSize="small" />
            REP Management
          </NavLink>
        )}
      </nav>
    </aside>
  );
}
