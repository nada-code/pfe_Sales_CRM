import api from './axiosInstance';

export const getProfile      = ()       => api.get('/users/profile');
export const updateProfile   = (data)   => api.put('/users/profile', data);
export const changePassword  = (data)   => api.put('/users/change-password', data);
export const getProfiles     = ()       => api.get('/users');
export const getTeamProfiles = ()       => api.get('/users/team');
export const getUserProfile  = (userId) => api.get(`/users/${userId}`);

