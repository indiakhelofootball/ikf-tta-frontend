// src/auth/useGrants.js
// Single source of truth for grant-aware UI visibility. Backend
// ModulePermission remains the security boundary; this only decides what to
// render. SUPER_ADMIN sees everything; others need a grant on the module;
// if the grants fetch failed (offline, pre-backfill server) we fall back to
// the legacy role behavior so admins are never locked out.
import { useAuth } from "./AuthContext";
import { ROLES } from "./roles";

export default function useGrants() {
  const { user, perms, permsLoading } = useAuth();

  const isSuper = perms ? perms.isSuperAdmin : user?.role === ROLES.SUPER_ADMIN;
  const legacyAdmin =
    user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.ADMIN;
  const grants = perms?.grants || null;

  const canView = (mod) =>
    isSuper || (grants ? !!grants[mod]?.can_view : legacyAdmin);
  const canEdit = (mod) =>
    isSuper || (grants ? !!grants[mod]?.can_edit : legacyAdmin);

  return { isSuper, canView, canEdit, permsLoading };
}
