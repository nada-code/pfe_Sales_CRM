// frontend/src/api/authApi.js
import api from './axiosInstance';  // ✅ instance centralisée

// ── Auth ────────────────────────────────────────────────────
export const login = async (data) => {
  const res = await api.post('/auth/login', data);
  // Sauvegarder les tokens seulement s'ils existent (pas pour pending approval)
  if (res.token && res.refreshToken) {
    sessionStorage.setItem('token', res.token);
    sessionStorage.setItem('refreshToken', res.refreshToken);
  }
  return res;
};

export const signup          = (data)         => api.post('/auth/signup', data);
export const logout          = async ()       => { await api.post('/auth/logout'); localStorage.clear(); };
export const forgotPassword  = (data)         => api.post('/auth/forgot-password', data);
export const resetPassword   = (token, data)  => api.post(`/auth/reset-password/${token}`, data);
export const getMe           = ()             => api.get('/auth/me');

export const getUsers = ({ role, isApproved } = {}) => {
  const params = new URLSearchParams();
  if (role       !== undefined) params.append('role', role);
  if (isApproved !== undefined) params.append('isApproved', String(isApproved));
  return api.get(`/users?${params.toString()}`);
};

export const approveUser      = (userId) => api.put(`/users/${userId}/approve`);
export const getSalesmanStats = ()       => api.get('/users/salesman-stats');