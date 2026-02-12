// src/auth/RoleBasedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const RoleBasedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated } = useAuth();

  // Not logged in - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but wrong role - show unauthorized
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Correct role - show content
  return children;
};

export default RoleBasedRoute;