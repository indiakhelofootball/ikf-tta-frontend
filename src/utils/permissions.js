// src/utils/permissions.js

import { ROLE_PERMISSIONS } from '../auth/roles';

/**
 * Check if user has a specific permission
 * @param {string} userRole - The user's role (SUPER_ADMIN, ADMIN, REP)
 * @param {string} permission - The permission to check
 * @returns {boolean} - True if user has permission
 */
export const hasPermission = (userRole, permission) => {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  return rolePermissions?.permissions?.includes(permission) || false;
};

/**
 * Check if user has any of the given permissions
 * @param {string} userRole - The user's role
 * @param {Array<string>} permissions - Array of permissions to check
 * @returns {boolean} - True if user has at least one permission
 */
export const hasAnyPermission = (userRole, permissions) => {
  return permissions.some(permission => hasPermission(userRole, permission));
};

/**
 * Check if user has all of the given permissions
 * @param {string} userRole - The user's role
 * @param {Array<string>} permissions - Array of permissions to check
 * @returns {boolean} - True if user has all permissions
 */
export const hasAllPermissions = (userRole, permissions) => {
  return permissions.every(permission => hasPermission(userRole, permission));
};

/**
 * Check if user has a specific role
 * @param {string} userRole - The user's current role
 * @param {Array<string>} allowedRoles - Array of allowed roles
 * @returns {boolean} - True if user's role is in allowed roles
 */
export const hasRole = (userRole, allowedRoles) => {
  return allowedRoles.includes(userRole);
};