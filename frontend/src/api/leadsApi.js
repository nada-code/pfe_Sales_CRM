import api from './axiosInstance';

export const fetchLeads    = (params = {}) => api.get('/leads', { params });
export const fetchStats    = ()            => api.get('/leads/stats');
export const fetchLeadById = (id)          => api.get(`/leads/${id}`);
export const createLead    = (data)        => api.post('/leads', data);
export const updateLead    = (id, data)    => api.put(`/leads/${id}`, data);
export const deleteLead    = (id)          => api.delete(`/leads/${id}`);
export const assignLead    = (id, sid)     => api.put(`/leads/${id}/assign`, { salesmanId: sid });
export const changeStatus  = (id, status) => api.put(`/leads/${id}/status`, { status });
export const addNote       = (id, content) => api.post(`/leads/${id}/note`, { content });
export const importLeads   = (arr)         => api.post('/leads/import', arr);
export const fetchSalesmen = ()            => api.get('/users', { params: { role: 'salesman', isApproved: true } });
export const fetchTeam = ()            => api.get('/users/team');