// src/auth/GrantedRoute.jsx
// Grant-based route guard — the route-level counterpart of the sidebar's
// grant-aware visibility. Backend ModulePermission remains the security
// boundary; this only decides whether to render the page.
import { Navigate } from "react-router-dom";
import { Box, CircularProgress, Typography } from "@mui/material";
import { useAuth } from "./AuthContext";
import { ROLES } from "./roles";
import { expiredSessionLoginPath } from "./loginDoor";

const GrantedRoute = ({ children, module, anyOf, edit = false, fallbackRoles = [ROLES.SUPER_ADMIN, ROLES.ADMIN] }) => {
  const { user, isAuthenticated, perms, permsLoading } = useAuth();

  if (!isAuthenticated) {
    // Not always /login: three platforms share this bundle, so an unauthenticated
    // visitor is returned to the door that matches where they were headed.
    return <Navigate to={expiredSessionLoginPath()} replace />;
  }

  const isSuper = perms ? perms.isSuperAdmin : user.role === ROLES.SUPER_ADMIN;
  if (isSuper) {
    return children;
  }

  // Grants still loading. Rendering null here still avoids the /unauthorized
  // flash, but an empty return is indistinguishable from a crashed page — it is
  // how "courier went completely blank" presented. Show that we are waiting.
  if (permsLoading) {
    return (
      <Box
        role="status"
        aria-live="polite"
        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: '60vh' }}
      >
        <CircularProgress size={32} />
        <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
          Checking your access…
        </Typography>
      </Box>
    );
  }

  if (perms) {
    // anyOf: allow when the user has a view grant on ANY listed module — used
    // by the Reports hub, which opens with a single per-report grant.
    if (anyOf) {
      const allowed = anyOf.some((m) => perms.grants?.[m]?.can_view);
      return allowed ? children : <Navigate to="/unauthorized" replace />;
    }
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
