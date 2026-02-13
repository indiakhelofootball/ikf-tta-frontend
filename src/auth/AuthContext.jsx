// src/auth/AuthContext.jsx
// Production-Ready: Works with unlimited users from backend
// NOW WITH PER-USER PROFILE SUPPORT!

import { createContext, useContext, useState, useEffect } from "react";
import { ROLE_PERMISSIONS } from "./roles";
import api from "../services/api";

const AuthContext = createContext(null);

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const REMEMBER_ME_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(null);

  // Check for stored user on mount
  useEffect(() => {
    const token = localStorage.getItem("tta_token");
    const storedUser = localStorage.getItem("tta_user");
    const loginTime = localStorage.getItem("tta_login_time");
    const rememberMe = localStorage.getItem("tta_remember_me");

    if (token && storedUser && loginTime) {
      const elapsed = Date.now() - parseInt(loginTime);
      const timeout = rememberMe === "true" ? REMEMBER_ME_DURATION : SESSION_TIMEOUT;

      if (elapsed < timeout) {
        const parsedUser = JSON.parse(storedUser);
        
        // 👤 PROFILE SUPPORT: Load profile data for THIS specific user
        const profileData = loadProfileData(parsedUser.email);
        const userWithProfile = {
          ...parsedUser,
          ...profileData, // Merge profile data (name, designation, profileImage)
        };
        
        setUser(userWithProfile);
        startSessionTimer(timeout - elapsed);
      } else {
        logout();
      }
    }
    setLoading(false);
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
        isAuthenticated: !!user,
        loading,
        login,
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