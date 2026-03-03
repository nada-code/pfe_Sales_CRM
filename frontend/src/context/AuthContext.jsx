import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getMe, logout as apiLogout } from "../api/authApi";

/**
 * AuthContext
 * ──────────
 * • restoreSession() → appelle getMe() si un token est présent (l'interceptor axios
 *   ajoute automatiquement le Bearer header et gère le refresh 401).
 * • setLoggedInUser(userData) → appelé depuis LoginPage juste après login()
 * • logout() → appelle apiLogout() qui vide localStorage, puis remet user à null
 */

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }

    try {
      const data = await getMe();   // authApi interceptor gère le header + refresh
      setUser(data.user);
    } catch {
      localStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { restoreSession(); }, [restoreSession]);

  // Appelé depuis LoginPage après succès du login
  const setLoggedInUser = (userData) => setUser(userData);

  const logout = async () => {
    try { await apiLogout(); } catch (err_) {
      console.error("Logout error:", err_);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setLoggedInUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
};