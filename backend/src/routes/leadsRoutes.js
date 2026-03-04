const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/leadsController');
const { protect, authorize } = require('../middleware/auth');

// Lecture — tous rôles (controller filtre par user.id pour les salesmen)
router.get('/',      protect, ctrl.getAllLeads);
router.get('/stats', protect, ctrl.getLeadStats);
router.get('/:id',   protect, ctrl.getLeadById);

// Création / import — sales_leader uniquement
router.post('/',       protect, authorize('sales_leader'), ctrl.createLead);
router.post('/import', protect, authorize('sales_leader'), ctrl.importLeads);

// Modification — sales_leader uniquement
router.put('/:id',        protect, authorize('sales_leader'), ctrl.updateLead);
router.delete('/:id',     protect, authorize('sales_leader'), ctrl.deleteLead);
router.put('/:id/assign', protect, authorize('sales_leader'), ctrl.assignLead);

// Statut + Notes — sales_leader ET salesman
router.put('/:id/status', protect, authorize('CXP', 'salesman'), ctrl.changeStatus);
router.post('/:id/note',  protect, authorize('CXP', 'salesman'), ctrl.addNote);

module.exports = router;