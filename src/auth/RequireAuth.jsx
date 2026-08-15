// src/auth/RequireAuth.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { expiredSessionLoginPath } from "./loginDoor";

const RequireAuth = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    // Not always /login: three platforms share this bundle, so an unauthenticated
    // visitor is returned to the door that matches where they were headed.
    return <Navigate to={expiredSessionLoginPath()} state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default RequireAuth;
