// src/auth/RoleBasedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { expiredSessionLoginPath } from "./loginDoor";

const RoleBasedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();

  // Not logged in - redirect to login
  if (!isAuthenticated) {
    // Not always /login: three platforms share this bundle, so an unauthenticated
    // visitor is returned to the door that matches where they were headed.
    return <Navigate to={expiredSessionLoginPath()} replace />;
  }

  // Logged in but wrong role - show unauthorized
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Correct role - show content
  return children;
};

export default RoleBasedRoute;