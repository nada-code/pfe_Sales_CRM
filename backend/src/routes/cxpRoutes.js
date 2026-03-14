const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/cxpController');
const { protect, authorize } = require('../middleware/auth');

const cxpOnly = [protect, authorize('cxp')];

// ── Stats dashboard ───────────────────────────────────────────────────────────
router.get('/stats', ...cxpOnly, ctrl.getCxpStats);

// ── Deals (leads DealClosed) ──────────────────────────────────────────────────
router.get ('/deals',          ...cxpOnly, ctrl.getDeals);
router.get ('/deals/:leadId',  ...cxpOnly, ctrl.getDealById);
router.post('/deals/:leadId/confirm', ...cxpOnly, ctrl.confirmDeal);      // Deal En_Attente → Confirmé + crée Commande
router.put ('/deals/:leadId/cancel',  ...cxpOnly, ctrl.cancelDeal);       // Deal → Annulé

// ── Commande ──────────────────────────────────────────────────────────────────
router.put ('/deals/:leadId/commande/status',     ...cxpOnly, ctrl.updateCommandeStatus);
router.post('/deals/:leadId/commande/regen-code', ...cxpOnly, ctrl.regenRechargeCode);

// ── Delivery ──────────────────────────────────────────────────────────────────
router.post('/deals/:leadId/delivery',       ...cxpOnly, ctrl.createDelivery); // crée la livraison
router.put ('/deals/:leadId/delivery/track', ...cxpOnly, ctrl.trackDelivery);  // track / update statut

// ── Vue globale livraisons ────────────────────────────────────────────────────
router.get('/deliveries', ...cxpOnly, ctrl.getDeliveries);

module.exports = router;
