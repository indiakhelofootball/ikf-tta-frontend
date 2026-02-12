// src/components/layout/DashboardLayout.jsx - BIGGER PROFILE
import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { IconButton, Avatar, Menu, MenuItem, Divider, ListItemIcon } from "@mui/material";
import { Logout, Person } from "@mui/icons-material";
import Sidebar from "./Sidebar";
import { useAuth } from "../../auth/AuthContext";
import "./DashboardLayout.css";

const pageTitles = {
  "/dashboard": "Dashboard",
  "/trial-cities": "Trial Cities",
  "/payments": "Payments",
  "/logistics": "Logistics",
  "/profile": "Profile",
};

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const title = pageTitles[location.pathname] || "Dashboard";

  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <div className="dashboard-content">
        {/* Header */}
        <div className="dashboard-header">
          <div className="dashboard-header-left">
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
                aria-controls={open ? 'account-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={open ? 'true' : undefined}
              >
                <Avatar 
                  src={profileImage}
                  sx={{ 
                    width: 56,  // BIGGER: 56px (was 40px)
                    height: 56, 
                    bgcolor: '#FBBF24',
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