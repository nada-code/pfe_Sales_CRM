const User   = require('../models/User');
const bcrypt = require('bcryptjs');

// ── Safe user shape returned to client ───────────────────────────────────────
const safeUser = (u) => ({
  id:         u._id,
  firstName:  u.firstName,
  lastName:   u.lastName,
  email:      u.email,
  phone:      u.phone  || '',
  bio:        u.bio    || '',
  avatar:     u.avatar || null,
  role:       u.role,
  isApproved: u.isApproved,
  createdAt:  u.createdAt,
});

// ============================================================
// GET /api/users/profile  — own profile
// ============================================================
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: safeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// PUT /api/users/profile  — update own profile
// Body: { firstName, lastName, email, phone, bio, avatar }
// ============================================================
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, bio, avatar } = req.body;

    // Check email uniqueness if changed
    if (email && email !== req.user.email) {
      const existing = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (existing) return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName, email, phone, bio, avatar },
      { new: true, runValidators: true }
    );

    // Broadcast so DashboardLayout / other pages reflect the new name instantly
    req.app.get('io')?.emit('user:profileUpdated', { userId: req.user.id });

    res.json({ success: true, message: 'Profile updated', data: safeUser(updated) });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ============================================================
// PUT /api/users/change-password
// Body: { currentPassword, newPassword }
// ============================================================
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Both fields are required' });

    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });

    const user = await User.findById(req.user.id).select('+password');
    const ok   = await user.matchPassword(currentPassword);
    if (!ok) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// GET /api/users  — list users (sales_leader + cxp)
// ============================================================
exports.getUsers = async (req, res) => {
  try {
    const { role, isApproved } = req.query;
    const query = {};
    if (role)                    query.role       = role;
    if (isApproved !== undefined) query.isApproved = isApproved === 'true';

    const users = await User.find(query).select('-password');
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

// ============================================================
// GET /api/users/team  — sales_leader sees their salesmen et CXP
// ============================================================
exports.getTeam = async (req, res) => {
  try {
    
    const members = await User.find({  role: { $in: ['salesman' , 'cxp'] }, isApproved: true } )
      .select('-password -refreshToken -resetPasswordToken -resetPasswordExpire')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: members.map(safeUser) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// GET /api/users/:userId  — sales_leader views a salesman profile
// ============================================================
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password -refreshToken');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Sales leader can only view salesmen
    if (req.user.role === 'sales_leader' && user.role !== 'salesman') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: safeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ============================================================
// PUT /api/users/:userId/approve  — approve a salesman
// ============================================================
exports.approveUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user)                  return res.status(404).json({ success: false, message: 'User not found' });
    if (user.role !== 'salesman') return res.status(400).json({ success: false, message: 'Only salesman accounts can be approved' });
    if (user.isApproved)        return res.status(400).json({ success: false, message: 'User is already approved' });

    user.isApproved = true;
    user.approvedBy = req.user._id;
    user.approvedAt = new Date();
    await user.save();

    req.app.get('io')?.emit('user:approved', {
      userId: user._id, firstName: user.firstName, lastName: user.lastName,
    });

    res.json({ success: true, message: 'User approved successfully', data: safeUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to approve user' });
  }
};
