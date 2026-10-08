// The /client route in the staff bundle. Signed in, it is exactly the old
// RoleBasedRoute: a funder gets the portal, staff get /unauthorized. Signed out,
// it is the funder's own landing (ClientSignedOut) rather than RequireAuth's
// door, which reads a role that sign-out has already cleared and answers /login.
import React from 'react';

import { useAuth } from './AuthContext';
import RoleBasedRoute from './RoleBasedRoute';
import { ROLES } from './roles';
import ClientSignedOut from '../components/client/ClientSignedOut';

export default function FunderRoute({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <ClientSignedOut />;
  return <RoleBasedRoute allowedRoles={[ROLES.CSR_CLIENT]}>{children}</RoleBasedRoute>;
}
