import { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  login as apiLogin,
  register as apiRegister,
  getToken,
  setToken,
  clearToken,
  onAuthExpired,
} from "../services/api";

const AuthContext = createContext(null);

/**
 * Decode a JWT payload without verifying the signature — verification is
 * the backend's job. This is only used so the UI knows the username/role
 * to display, and the token's exp claim, without an extra round trip.
 */
function decodeJwt(token) {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken());
  const [user, setUser] = useState(() => {
    const existing = getToken();
    return existing ? decodeJwt(existing) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  useEffect(() => {
    // If a token expires or any request gets a 401, drop straight back to
    // the login screen instead of the app silently failing every call.
    return onAuthExpired(() => logout());
  }, [logout]);

  useEffect(() => {
    if (!user?.exp) return;
    const msUntilExpiry = user.exp * 1000 - Date.now();
    if (msUntilExpiry <= 0) {
      logout();
      return;
    }
    const timer = setTimeout(logout, msUntilExpiry);
    return () => clearTimeout(timer);
  }, [user, logout]);

  const login = async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiLogin(username, password);
      setToken(data.access_token);
      setTokenState(data.access_token);
      setUser(decodeJwt(data.access_token));
      return true;
    } catch (e) {
      setError(e.message || "Login failed");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, email, password) => {
    setLoading(true);
    setError(null);
    try {
      await apiRegister(username, email, password);
      return true;
    } catch (e) {
      setError(e.message || "Registration failed");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    token,
    user,
    role: user?.role || null,
    username: user?.sub || null,
    isAuthenticated: Boolean(token && user),
    loading,
    error,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
