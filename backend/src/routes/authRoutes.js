const express = require('express');
const {
  signup,
  login,
  logout,
  refreshToken,
  getMe,
  forgotPassword,
  resetPassword,
  getUsers
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Routes publiques
router.post('/signup', signup);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:resetToken', resetPassword);
  

// Routes protégées
router.get('/me', protect, getMe);
router.get('/', protect, getUsers);

module.exports = router;
