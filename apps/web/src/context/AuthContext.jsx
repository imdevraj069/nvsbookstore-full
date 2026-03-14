"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authAPI } from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem("nvs_token");
    if (token) {
      authAPI
        .getProfile()
        .then((res) => setUser(res.data))
        .catch(() => {
          localStorage.removeItem("nvs_token");
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem("nvs_token", res.data.token);
    setUser(res.data.user);
    return res.data;
  }, []);

  const signup = useCallback(async (data) => {
    const res = await authAPI.signup(data);
    localStorage.setItem("nvs_token", res.data.token);
    setUser(res.data.user);
    return res.data;
  }, []);

  const googleLogin = useCallback(async (credential) => {
    const res = await authAPI.googleLogin(credential);
    localStorage.setItem("nvs_token", res.data.token);
    setUser(res.data.user);
    return res.data;
  }, []);

  const requestOTP = useCallback(async (email) => {
    const res = await authAPI.requestOTP(email);
    return res.data;
  }, []);

  const verifyOTP = useCallback(async (email, otp) => {
    const res = await authAPI.verifyOTP({ email, otp });
    localStorage.setItem("nvs_token", res.data.token);
    setUser(res.data.user);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("nvs_token");
    setUser(null);
  }, []);

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, googleLogin, requestOTP, verifyOTP, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
