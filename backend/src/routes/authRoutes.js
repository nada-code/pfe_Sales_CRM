const express = require('express');
const {
  signup,
  login,
  logout,
  refreshToken,
  getMe,
  forgotPassword,
  resetPassword,
  getUsers,
  approveUser
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Routes publiques
router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:resetToken', resetPassword);

// Routes protégées
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.get('/', protect, getUsers);

// Routes pour les sales_leader
router.put('/users/:userId/approve', protect, authorize('sales_leader'), approveUser);

module.exports = router;
