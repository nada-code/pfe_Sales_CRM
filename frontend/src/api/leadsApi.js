import api from './axiosInstance';

// ── Leads CRUD ────────────────────────────────────────────────────────────────
export const fetchLeads    = (params = {}) => api.get('/leads', { params });
export const fetchLeadById = (id)          => api.get(`/leads/${id}`);
export const createLead    = (data)        => api.post('/leads', data);
export const updateLead    = (id, data)    => api.put(`/leads/${id}`, data);
export const deleteLead    = (id)          => api.delete(`/leads/${id}`);
export const importLeads   = (arr)         => api.post('/leads/import', arr);

// ── Actions ───────────────────────────────────────────────────────────────────
export const assignLead    = (id, salesmanId) => api.put(`/leads/${id}/assign`, { salesmanId });
export const changeStatus  = (id, status)     => api.put(`/leads/${id}/status`, { status });
export const addNote       = (id, content)    => api.post(`/leads/${id}/note`, { content });
export const scheduleCall  = (id, nextCallAt) => api.put(`/leads/${id}/schedule-call`, { nextCallAt });

// ── Lecture ───────────────────────────────────────────────────────────────────
export const fetchStats       = ()     => api.get('/leads/stats');
export const fetchLeadHistory = (id)   => api.get(`/leads/${id}/history`);
export const fetchDailyCalls  = (date) => api.get('/leads/daily-calls', { params: { date } });

// ── Users ─────────────────────────────────────────────────────────────────────
export const fetchSalesmen = () =>
  api.get('/users', { params: { role: 'salesman', isApproved: true } }).then(r => r.data);
export const fetchTeam     = () => api.get('/users/team').then(r => r.data);