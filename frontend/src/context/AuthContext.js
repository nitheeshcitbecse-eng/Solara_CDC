import React, { createContext, useState, useEffect, useContext, useCallback } from "react";
import api, { setUnauthorizedHandler } from "../api/api";
import { getToken, saveToken, removeToken } from "../utils/storage";
import { InternetContext } from "./InternetContext";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { isConnected, checked } = useContext(InternetContext);

  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  // SIGN OUT WHEN THE SERVER REJECTS THE TOKEN (expired, logged out elsewhere, banned)
  useEffect(() => {
    setUnauthorizedHandler(async () => {
      await removeToken();
      setUser(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // AUTO LOGIN ON APP START
  useEffect(() => {
    if (!checked) return;

    const loadUserFromToken = async () => {
      if (!isConnected) return setLoading(false);
      try {
        const token = await getToken();
        if (!token) return;

        const { data } = await api.get("/auth/profile");
        if (data.success) {
          setUser(data.user);
        } else {
          await removeToken();
        }
      } catch (err) {
        console.log("Auto-login error:", err.message);
        await removeToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUserFromToken();
  }, [isConnected, checked]);

  // LOGIN (identifier = email address or mobile number)
  const login = async (identifier, password) => {
    if (!isConnected) {
      return { success: false, message: "No internet connection" };
    }
    try {
      const { data } = await api.post("/auth/login", { identifier, password });
      if (!data.success) {
        setError(data.message);
        return data;
      }
      await saveToken(data.token);
      setUser(data.user);
      setError("");
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Login failed. Please try again.";
      setError(message);
      return { success: false, message };
    }
  };

  // REGISTER (signs the new user in straight away)
  const register = async (form) => {
    if (!isConnected) {
      return { success: false, message: "No internet connection" };
    }
    try {
      const { data } = await api.post("/auth/register", form);
      if (!data.success) return data;
      await saveToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch (err) {
      const message = err.response?.data?.message || "Could not create your account. Please try again.";
      return { success: false, message };
    }
  };

  // RELOAD THE SIGNED-IN USER (after profile or verification changes)
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/profile");
      if (data.success) setUser(data.user);
    } catch (err) {
      console.log("Refresh user error:", err.message);
    }
  }, []);

  // LOGOUT
  const logout = async () => {
    try {
      await api.post("/auth/logout").catch(() => {});
      await removeToken();
      setUser(null);
      setError("");
    } catch (err) {
      console.log("Logout error:", err.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        setLoading,
        error,
        setError,
        login,
        register,
        refreshUser,
        logout,
        isConnected,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
