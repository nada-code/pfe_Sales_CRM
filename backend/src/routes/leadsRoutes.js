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

// Modification — sales_leader , salesman ET CXP
// (le controller filtre les champs selon le rôle)
router.put('/:id', protect, authorize('sales_leader', 'salesman', 'CXP'), ctrl.updateLead);

// Actions sales_leader uniquement
router.delete('/:id',     protect, authorize('sales_leader'), ctrl.deleteLead);
router.put('/:id/assign', protect, authorize('sales_leader'), ctrl.assignLead);

// Statut + Notes — sales_leader, salesman ET CXP
router.put('/:id/status', protect, authorize('sales_leader', 'CXP', 'salesman'), ctrl.changeStatus);
router.post('/:id/note',  protect, authorize('sales_leader', 'CXP', 'salesman'), ctrl.addNote);


module.exports = router;