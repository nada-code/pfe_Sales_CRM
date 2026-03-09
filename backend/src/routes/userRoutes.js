const express  = require('express');
const ctrl     = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// ── Own profile (any authenticated user) ─────────────────────────────────────
router.get('/profile',         protect, ctrl.getProfile);
router.put('/profile',         protect, ctrl.updateProfile);
router.put('/change-password', protect, ctrl.changePassword);

// ── Team (sales_leader only) ─────────────────────────────────────────────────
router.get('/team', protect, authorize('sales_leader'), ctrl.getTeam);

// ── List + approve (sales_leader + cxp) ──────────────────────────────────────
router.get('/',                  protect, authorize('sales_leader', 'cxp'), ctrl.getUsers);
router.put('/:userId/approve',   protect, authorize('sales_leader'),        ctrl.approveUser);

// ── Salesman stats (approvals KPIs) ──────────────────────────────────────────
router.get('/salesman-stats', protect, authorize('sales_leader'), ctrl.getSalesmanStats);

// ── View one user (sales_leader views their salesmen) ────────────────────────
router.get('/:userId', protect, authorize('sales_leader'), ctrl.getUserById);

module.exports = router;