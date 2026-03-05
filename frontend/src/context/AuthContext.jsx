import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe, logout as apiLogout } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    const token = sessionStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    try {
      const data = await getMe();
      setUser(data.user);
    } catch {
      sessionStorage.clear();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { restoreSession(); }, [restoreSession]);

  // Called after login / signup
  const setLoggedInUser = (userData) => setUser(userData);

  // Called after profile update — merges partial data into current user
  const updateUser = (partial) => setUser((prev) => ({ ...prev, ...partial }));

  const logout = async () => {
    try { await apiLogout(); } catch { /* noop */ }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setLoggedInUser, updateUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};