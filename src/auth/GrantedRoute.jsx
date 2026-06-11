// src/auth/GrantedRoute.jsx
// Grant-based route guard — the route-level counterpart of the sidebar's
// grant-aware visibility. Backend ModulePermission remains the security
// boundary; this only decides whether to render the page.
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { ROLES } from "./roles";

const GrantedRoute = ({ children, module, edit = false, fallbackRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN] }) => {
  const { user, isAuthenticated, perms, permsLoading } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const isSuper = perms ? perms.isSuperAdmin : user.role === ROLES.SUPER_ADMIN;
  if (isSuper) {
    return children;
  }

  // Grants still loading — render nothing rather than flash /unauthorized.
  if (permsLoading) {
    return null;
  }

  if (perms) {
    const grant = perms.grants?.[module];
    const allowed = edit ? grant?.can_edit : grant?.can_view;
    return allowed ? children : <Navigate to="/unauthorized" replace />;
  }

  // Grants fetch failed (offline, pre-backfill server) — preserve the legacy
  // role behavior so admins are never locked out by a missing /permissions/me.
  return fallbackRoles.includes(user.role)
    ? children
    : <Navigate to="/unauthorized" replace />;
};

export default GrantedRoute;
