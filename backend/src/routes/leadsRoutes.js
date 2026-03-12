const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/leadsController');
const { protect, authorize } = require('../middleware/auth');

// Lecture — tous rôles
router.get('/',      protect, ctrl.getAllLeads);
router.get('/stats', protect, ctrl.getLeadStats);
router.get('/:id',   protect, ctrl.getLeadById);

// Création / import — sales_leader uniquement
router.post('/',       protect, authorize('sales_leader'), ctrl.createLead);
router.post('/import', protect, authorize('sales_leader'), ctrl.importLeads);

// Modification — sales_leader, salesman, CXP
router.put('/:id', protect, authorize('sales_leader', 'salesman', 'cxp'), ctrl.updateLead);

// Actions sales_leader
router.delete('/:id',     protect, authorize('sales_leader'), ctrl.deleteLead);
router.put('/:id/assign', protect, authorize('sales_leader'), ctrl.assignLead);

// Statut — salesman et CXP peuvent changer (sales_leader aussi)
router.put('/:id/status', protect, authorize('sales_leader', 'cxp', 'salesman'), ctrl.changeStatus);

// Notes — tous les rôles
router.post('/:id/note', protect, authorize( 'cxp', 'salesman'), ctrl.addNote);

// Signaler un problème — salesman et CXP
router.post('/report-problem', protect, authorize('salesman', 'cxp'), ctrl.reportProblem);

// Statut livraison — CXP uniquement
router.post('/report-delivery', protect, authorize('cxp'), ctrl.reportDelivery);

module.exports = router;
