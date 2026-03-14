/**
 * cxpApi.js — 4 modèles : Lead → Deal → Commande → Delivery
 * L'axiosInstance retourne déjà res.data — pas de .then(r => r.data)
 */
import api from './axiosInstance';

// ── Stats ─────────────────────────────────────────────────────────────────────
export const fetchCxpStats = () => api.get('/cxp/stats');

// ── Deals (leads DealClosed + leur deal) ──────────────────────────────────────
export const fetchDeals    = (params = {}) => api.get('/cxp/deals', { params });
export const fetchDealById = (leadId)      => api.get(`/cxp/deals/${leadId}`);
// → retourne { lead, deal, commande, delivery }

// ── Deal ──────────────────────────────────────────────────────────────────────
// Confirmer le deal → crée automatiquement une Commande (En_Attente)
export const confirmDeal = (leadId)             => api.post(`/cxp/deals/${leadId}/confirm`);
// Annuler le deal
export const cancelDeal  = (leadId, note = '')  => api.put(`/cxp/deals/${leadId}/cancel`, { note });

// ── Commande ──────────────────────────────────────────────────────────────────
// Changer le statut : 'En_Attente'|'Confirmé'|'En_Preparation'|'En_Transit'|'Livré'
export const updateCommandeStatus = (leadId, status) =>
  api.put(`/cxp/deals/${leadId}/commande/status`, { status });

// Régénérer le code de recharge
export const regenRechargeCode = (leadId) =>
  api.post(`/cxp/deals/${leadId}/commande/regen-code`);

// ── Delivery ──────────────────────────────────────────────────────────────────
// Créer une livraison (commande doit être Confirmée)
export const createDelivery = (leadId, company) =>
  api.post(`/cxp/deals/${leadId}/delivery`, { company });

// Tracker / mettre à jour (sans body = auto-track, avec status = override manuel)
export const trackDelivery = (leadId, status = null) =>
  api.put(`/cxp/deals/${leadId}/delivery/track`, status ? { status } : {});

// ── Vue globale livraisons ────────────────────────────────────────────────────
export const fetchDeliveries = (params = {}) => api.get('/cxp/deliveries', { params });