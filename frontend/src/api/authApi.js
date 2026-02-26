import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL ;

const authApi = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// === Auth API ===

export const login = async (data) => {
  return authApi.post('/auth/login', data); // { email, password }
};

export const forgotPassword = async (data) => {
  return authApi.post('/auth/forgot-password', data); // { email }
};

export const resetPassword = async (token, data) => {
  return authApi.post(`/auth/reset-password/${token}`, data); // { password }
};