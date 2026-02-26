const express = require('express');
const router = express.Router();
const controller = require('../controllers/leadsController');
const { protect } = require('../middleware/auth');

router.post('/', protect, controller.createLead);
router.post('/import', protect, controller.importLeads);
router.get('/', protect, controller.getAllLeads);
router.get('/stats', protect, controller.getLeadStats);
router.get('/:id', protect, controller.getLeadById);
router.put('/:id', protect, controller.updateLead);
router.delete('/:id', protect, controller.deleteLead);
router.put('/:id/assign', protect, controller.assignLead);
router.put('/:id/status', protect, controller.changeStatus);
router.post('/:id/note', protect, controller.addNote);

module.exports = router;