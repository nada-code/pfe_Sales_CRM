import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const authApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

const saveTokens = (token, refreshToken) => {
  localStorage.setItem("token", token);
  localStorage.setItem("refreshToken", refreshToken);
};

const getToken = () => localStorage.getItem("token");
const getRefreshToken = () => localStorage.getItem("refreshToken");

authApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

authApi.interceptors.response.use(
  (res) => res.data,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = getRefreshToken();
        if (!refreshToken) throw new Error("No refresh token");

        const res = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
        const { token, refreshToken: newRefreshToken } = res.data;

        saveTokens(token, newRefreshToken);
        originalRequest.headers.Authorization = `Bearer ${token}`;

        return authApi(originalRequest);
      } catch {
        localStorage.clear();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// === Endpoints ===
export const login = async (data) => {
    const res = await authApi.post("/auth/login", data);
    // Only save tokens if they exist (not for pending approval cases)
    if (res.token && res.refreshToken) {
      saveTokens(res.token, res.refreshToken);
    }
    return res;
  
};

// authApi.js
export const signup = async (data) => {
  const response = await authApi.post('/auth/signup', data);
  return response; // ← interceptor already returns { success, message, user }
};
export const getUsers = async ({ role, isApproved } = {}) => {
  const params = new URLSearchParams();
  if (role !== undefined) params.append('role', role);
  if (isApproved !== undefined) params.append('isApproved', String(isApproved));
  return await authApi.get(`/auth?${params.toString()}`);
};

export const approveUser = async (userId) =>
  (await authApi.put(`/auth/users/${userId}/approve`)).data;

export const logout = async () => {
  await authApi.post("/auth/logout");
  localStorage.clear();
};

export const forgotPassword = (data) => authApi.post("/auth/forgot-password", data);
export const resetPassword = (token, data) => authApi.post(`/auth/reset-password/${token}`, data);
export const getMe = () => authApi.get("/auth/me");


export default authApi;