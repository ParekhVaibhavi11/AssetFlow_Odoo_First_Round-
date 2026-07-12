/**
 * context/AuthContext.jsx
 *
 * Global authentication state management.
 * Provides: user, token, login, logout, isAuthenticated, isLoading
 *
 * Persists token and user to localStorage for session survival on refresh.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]         = useState(null);
  const [token, setToken]       = useState(null);
  const [isLoading, setIsLoading] = useState(true); // True while restoring session

  // ── Restore session from localStorage on mount ────────────
  useEffect(() => {
    const storedToken = localStorage.getItem('af_token');
    const storedUser  = localStorage.getItem('af_user');

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch {
        // Corrupted data — clear it
        localStorage.removeItem('af_token');
        localStorage.removeItem('af_user');
      }
    }
    setIsLoading(false);
  }, []);

  /**
   * Login — store token and user in state and localStorage.
   * @param {string} newToken
   * @param {object} newUser
   */
  const login = useCallback((newToken, newUser) => {
    localStorage.setItem('af_token', newToken);
    localStorage.setItem('af_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  /**
   * Logout — clear all auth state.
   */
  const logout = useCallback(async () => {
    localStorage.removeItem('af_token');
    localStorage.removeItem('af_user');
    setToken(null);
    setUser(null);
  }, []);

  /**
   * Update user in state + localStorage (e.g., after password change).
   * @param {object} updatedUser
   */
  const updateUser = useCallback((updatedUser) => {
    const merged = { ...user, ...updatedUser };
    localStorage.setItem('af_user', JSON.stringify(merged));
    setUser(merged);
  }, [user]);

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * useAuth hook — consume auth context anywhere.
 * Throws if used outside AuthProvider.
 */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export default AuthContext;
