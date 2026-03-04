const express = require('express');
const { getUsers, approveUser } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

router.get('/',                 protect, authorize('sales_leader', 'cxp'), getUsers);
router.put('/:userId/approve',  protect, authorize('sales_leader'),        approveUser);

module.exports = router;