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
  saveTokens(res.token, res.refreshToken);
  return res;
};

export const logout = async () => {
  await authApi.post("/auth/logout");
  localStorage.clear();
};

export const forgotPassword = (data) => authApi.post("/auth/forgot-password", data);
export const resetPassword = (token, data) => authApi.post(`/auth/reset-password/${token}`, data);
export const getMe = () => authApi.get("/auth/me");

export default authApi;