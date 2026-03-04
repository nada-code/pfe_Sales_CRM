import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({ baseURL: API_URL, withCredentials: true });

const getToken        = () => sessionStorage.getItem('token');
const getRefreshToken = () => sessionStorage.getItem('refreshToken');
const saveTokens      = (t, rt) => { if (t) sessionStorage.setItem('token', t); if (rt) sessionStorage.setItem('refreshToken', rt); };
const clearTokens     = () => { sessionStorage.removeItem('token'); sessionStorage.removeItem('refreshToken'); };

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res.data,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const rt = getRefreshToken();
        if (!rt) throw new Error('No refresh token');
        const { data } = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken: rt });
        saveTokens(data.token, data.refreshToken);
        original.headers.Authorization = `Bearer ${data.token}`;
        return api(original);
      } catch {
        clearTokens();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;