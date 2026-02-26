import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const leadsApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// === Token helpers ===
const getToken = () => localStorage.getItem("token");
const getRefreshToken = () => localStorage.getItem("refreshToken");
const saveTokens = (token, refreshToken) => {
  if (token) localStorage.setItem("token", token);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
};
const clearTokens = () => localStorage.removeItem("token") && localStorage.removeItem("refreshToken");

// === Request interceptor ===
leadsApi.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// === Response interceptor ===
leadsApi.interceptors.response.use(
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

        return leadsApi(originalRequest);
      } catch {
        clearTokens();
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// === Leads API ===
export const fetchLeads = (params = {}) => leadsApi.get("/leads", { params });
export const fetchStats = () => leadsApi.get("/leads/stats");
export const fetchLeadById = (id) => leadsApi.get(`/leads/${id}`);
export const createLead = (data) => leadsApi.post("/leads", data);
export const updateLead = (id, data) => leadsApi.put(`/leads/${id}`, data);
export const deleteLead = (id) => leadsApi.delete(`/leads/${id}`);
export const assignLead = (id, salesmanId) => leadsApi.put(`/leads/${id}/assign`, { salesmanId });
export const changeStatus = (id, status) => leadsApi.put(`/leads/${id}/status`, { status });
export const addNote = (id, content) => leadsApi.post(`/leads/${id}/note`, { content });
export const importLeads = (leadsArray) => leadsApi.post("/leads/import", leadsArray);

// === Users API ===
export const fetchSalesmen = () => leadsApi.get("/users", { params: { role: "salesman" } });

export default leadsApi;