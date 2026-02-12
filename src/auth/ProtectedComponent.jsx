// src/auth/ProtectedComponent.jsx
import { useAuth } from "./AuthContext";
import { hasPermission, hasRole } from "../utils/permissions";

/**
 * Component that only renders if user has permission
 * Usage: <ProtectedByPermission permission={PERMISSIONS.CREATE_USER}>...</ProtectedByPermission>
 */
export const ProtectedByPermission = ({ children, permission, fallback = null }) => {
  const { user } = useAuth();

  if (!user) return fallback;

  const allowed = hasPermission(user.role, permission);
  return allowed ? children : fallback;
};

/**
 * Component that only renders if user has role
 * Usage: <ProtectedByRole allowedRoles={[ROLES.ADMIN]}>...</ProtectedByRole>
 */
export const ProtectedByRole = ({ children, allowedRoles, fallback = null }) => {
  const { user } = useAuth();

  if (!user) return fallback;

  const allowed = hasRole(user.role, allowedRoles);
  return allowed ? children : fallback;
};

/**
 * Hook to check permissions in your component
 * Usage: const canEdit = usePermission(PERMISSIONS.EDIT_TRIAL);
 */
export const usePermission = (permission) => {
  const { user } = useAuth();
  return hasPermission(user?.role, permission);
};

/**
 * Hook to check role in your component
 * Usage: const isAdmin = useRole([ROLES.ADMIN, ROLES.SUPER_ADMIN]);
 */
export const useRole = (allowedRoles) => {
  const { user } = useAuth();
  return hasRole(user?.role, allowedRoles);
};