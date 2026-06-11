// src/auth/AuthContext.jsx
// Production-Ready: Works with unlimited users from backend
// NOW WITH PER-USER PROFILE SUPPORT!

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { ROLES, ROLE_PERMISSIONS } from "./roles";
import api, { permissionsAPI } from "../services/api";
import { refreshAllFromAPI } from "../utils/adminStorage";

const AuthContext = createContext(null);

const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours
const REMEMBER_ME_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(null);
  // Per-user module grants (from the backend) — drives grant-aware UI like the sidebar.
  const [perms, setPerms] = useState(null);
  const [permsSettled, setPermsSettled] = useState(false);
  // Derived, not effect-set: true from the instant a user exists until the
  // grants fetch settles, so guards never see a stale "not loading" window.
  // perms === null after settling means the fetch failed.
  const permsLoading = !!user?.email && !permsSettled;

  // Whenever the logged-in user changes, pull their effective grants, then
  // refresh the config dropdown cache only for users allowed to read config —
  // blind refreshes 403 for non-granted users and spam the console.
  useEffect(() => {
    let active = true;
    if (user?.email) {
      setPermsSettled(false);
      permissionsAPI.getMine()
        .then((d) => {
          if (!active) return;
          setPerms(d);
          if (d?.isSuperAdmin || d?.grants?.config?.can_view) {
            refreshAllFromAPI().catch(() => {});
          }
        })
        .catch(() => {
          if (!active) return;
          setPerms(null);
          // Grants unavailable (offline / pre-backfill server) — legacy behavior.
          if (user.role === ROLES.SUPER_ADMIN || user.role === ROLES.ADMIN) {
            refreshAllFromAPI().catch(() => {});
          }
        })
        .finally(() => { if (active) setPermsSettled(true); });
    } else {
      setPerms(null);
      setPermsSettled(false);
    }
    return () => { active = false; };
  }, [user?.email, user?.role]);

  // Grants and the config cache are otherwise only loaded at login, so a
  // grant change or dropdown edit never reaches an open session. Re-pull both
  // when the tab regains focus, at most once per REFETCH_MIN_GAP.
  const lastFocusRefetch = useRef(0);
  useEffect(() => {
    if (!user?.email) return undefined;
    const REFETCH_MIN_GAP = 30 * 1000;
    const refetch = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastFocusRefetch.current < REFETCH_MIN_GAP) return;
      lastFocusRefetch.current = now;
      permissionsAPI.getMine()
        .then((d) => {
          setPerms(d);
          if (d?.isSuperAdmin || d?.grants?.config?.can_view) {
            refreshAllFromAPI().catch(() => {});
          }
        })
        .catch(() => {}); // transient failure — keep the last known grants
    };
    window.addEventListener("focus", refetch);
    document.addEventListener("visibilitychange", refetch);
    return () => {
      window.removeEventListener("focus", refetch);
      document.removeEventListener("visibilitychange", refetch);
    };
  }, [user?.email]);

  // Check for stored user on mount
  useEffect(() => {
    async function initSession() {
      const token = localStorage.getItem("tta_token");
      const storedUser = localStorage.getItem("tta_user");
      const loginTime = localStorage.getItem("tta_login_time");
      const rememberMe = localStorage.getItem("tta_remember_me");

      if (token && storedUser && loginTime) {
        const elapsed = Date.now() - parseInt(loginTime);
        const timeout = rememberMe === "true" ? REMEMBER_ME_DURATION : SESSION_TIMEOUT;

        if (elapsed < timeout) {
          const parsedUser = JSON.parse(storedUser);

          const profileData = loadProfileData(parsedUser.email);
          const userWithProfile = {
            ...parsedUser,
            ...profileData,
          };

          setUser(userWithProfile);
          startSessionTimer(timeout - elapsed);
        } else {
          logout();
        }
      }
      setLoading(false);
    }
    initSession();
  }, []);

  // 👤 PROFILE SUPPORT: Load profile data for specific user email
  const loadProfileData = (userEmail) => {
    if (!userEmail) return {};
    
    try {
      // Create unique key for this user's profile
      const profileKey = `tta_profile_${userEmail}`;
      const storedProfile = localStorage.getItem(profileKey);
      
      if (storedProfile) {
        return JSON.parse(storedProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
    return {};
  };

  // 👤 PROFILE SUPPORT: Save profile data for specific user email
  const saveProfileData = (userEmail, profileData) => {
    if (!userEmail) return false;
    
    try {
      // Create unique key for this user's profile
      const profileKey = `tta_profile_${userEmail}`;
      localStorage.setItem(profileKey, JSON.stringify(profileData));
      return true;
    } catch (error) {
      console.error('Error saving profile:', error);
      return false;
    }
  };

  const startSessionTimer = (duration) => {
    if (sessionTimeout) clearTimeout(sessionTimeout);
    
    const timeout = setTimeout(() => {
      alert("Your session has expired. Please login again.");
      logout();
    }, duration);
    
    setSessionTimeout(timeout);
  };

  const resetActivityTimer = () => {
    const rememberMe = localStorage.getItem("tta_remember_me");
    const duration = rememberMe === "true" ? REMEMBER_ME_DURATION : SESSION_TIMEOUT;
    startSessionTimer(duration);
    localStorage.setItem("tta_login_time", Date.now().toString());
  };

  const login = async (email, password, rememberMe = false) => {
    try {
      // Call backend API
      const response = await api.login(email, password);

      // Check if login was successful
      if (!response.success) {
        return { 
          success: false, 
          message: response.message || "Invalid credentials" 
        };
      }

      // ✅ PRODUCTION-READY: Use whatever backend sends
      const userFromBackend = response.user;

      // Validate that backend sent required fields
      if (!userFromBackend || !userFromBackend.role) {
        return {
          success: false,
          message: "Invalid response from server. Please contact support."
        };
      }

      // Add permissions based on role from backend
      const userWithPermissions = {
        id: userFromBackend.id,
        email: userFromBackend.email,
        name: userFromBackend.name,
        role: userFromBackend.role,
        permissions: ROLE_PERMISSIONS[userFromBackend.role] || ROLE_PERMISSIONS.REP,
      };

      // 👤 PROFILE SUPPORT: Load profile for THIS user's email
      const profileData = loadProfileData(userFromBackend.email);
      const userWithProfile = {
        ...userWithPermissions,
        ...profileData, // Override with saved profile data if exists
      };

      // Store auth data (separate from profile)
      const accessToken = response.token || response.tokens?.access;
      localStorage.setItem("tta_token", accessToken);
      if (response.tokens?.refresh) {
        localStorage.setItem("tta_refresh", response.tokens.refresh);
      }
      localStorage.setItem("tta_user", JSON.stringify(userWithPermissions));
      localStorage.setItem("tta_login_time", Date.now().toString());
      localStorage.setItem("tta_remember_me", rememberMe.toString());
      
      setUser(userWithProfile);

      const duration = rememberMe ? REMEMBER_ME_DURATION : SESSION_TIMEOUT;
      startSessionTimer(duration);

      return { success: true };
      
    } catch (error) {
      return { 
        success: false, 
        message: error.message || "Login failed. Please check your connection." 
      };
    }
  };

  const otpLogin = async (phone, code) => {
    try {
      const response = await api.verifyOTP(phone, code);

      if (!response.success) {
        return { success: false, message: response.message || 'Verification failed.' };
      }

      const userFromBackend = response.user;
      if (!userFromBackend || !userFromBackend.role) {
        return { success: false, message: 'Invalid response from server.' };
      }

      const userWithPermissions = {
        id: userFromBackend.id,
        email: userFromBackend.email,
        name: userFromBackend.name,
        role: userFromBackend.role,
        permissions: ROLE_PERMISSIONS[userFromBackend.role] || ROLE_PERMISSIONS.REP,
      };

      const profileData = loadProfileData(userFromBackend.email);
      const userWithProfile = { ...userWithPermissions, ...profileData };

      const accessToken = response.tokens?.access;
      localStorage.setItem('tta_token', accessToken);
      if (response.tokens?.refresh) {
        localStorage.setItem('tta_refresh', response.tokens.refresh);
      }
      localStorage.setItem('tta_user', JSON.stringify(userWithPermissions));
      localStorage.setItem('tta_login_time', Date.now().toString());
      localStorage.setItem('tta_remember_me', 'false');

      setUser(userWithProfile);
      startSessionTimer(SESSION_TIMEOUT);

      return { success: true };
    } catch (error) {
      return { success: false, message: error.message || 'OTP verification failed.' };
    }
  };

  // 👤 PROFILE SUPPORT: Update user profile (backend + local cache)
  const updateUserProfile = async (profileData) => {
    if (!user || !user.email) {
      return { success: false, message: 'No user logged in' };
    }

    try {
      // Send to backend
      const backendData = {
        first_name: profileData.name?.split(' ')[0] || '',
        last_name: profileData.name?.split(' ').slice(1).join(' ') || '',
      };
      await api.updateProfile(backendData);

      // Also cache extended profile locally (designation, image, etc.)
      const profileToSave = {
        name: profileData.name,
        designation: profileData.designation,
        profileImage: profileData.profileImage,
        phone: profileData.phone,
        department: profileData.department,
        location: profileData.location,
        updatedAt: new Date().toISOString(),
      };

      saveProfileData(user.email, profileToSave);

      // Update current user state
      setUser(prev => ({
        ...prev,
        ...profileToSave,
      }));

      return { success: true };
    } catch (error) {
      return { success: false, message: error.message || 'Failed to update profile' };
    }
  };

  const logout = () => {
    localStorage.removeItem("tta_token");
    localStorage.removeItem("tta_refresh");
    localStorage.removeItem("tta_user");
    localStorage.removeItem("tta_login_time");
    localStorage.removeItem("tta_remember_me");
    // 👤 PROFILE SUPPORT: Profiles stay in localStorage (per-user keys)
    // Each user has their own profile key like: tta_profile_user@example.com
    if (sessionTimeout) clearTimeout(sessionTimeout);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        perms, // { isSuperAdmin, grants: { module: { can_view, can_edit } } }
        permsLoading,
        isAuthenticated: !!user,
        loading,
        login,
        otpLogin,
        logout,
        updateUserProfile, // 👤 PROFILE SUPPORT: Per-user profile updates
        resetActivityTimer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);