const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: [true, 'First name is required'] },
    lastName:  { type: String, required: [true, 'Last name is required']  },

    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      index:     true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
    },

    password: {
      type:      String,
      required:  [true, 'Password is required'],
      minlength: 6,
      select:    false,
    },

    role: {
      type:     String,
      enum:     ['sales_leader', 'cxp', 'salesman'],
      required: [true, 'Role is required'],
      default:  'salesman',
    },

    // ── Profile extras ──────────────────────────────────────────────────────
    phone: { type: String, default: '' },
    bio:   { type: String, default: '', maxlength: 300 },

    // Avatar stored as base64 data-URL (e.g. "data:image/jpeg;base64,...")
    // Keep ≤ 200 KB recommended; resize client-side before upload
    avatar: { type: String, default: null },

    // ── Account state ────────────────────────────────────────────────────────
    isActive: { type: Boolean, default: true },

    isApproved: {
      type:    Boolean,
      default: function () { return this.role !== 'salesman'; },
    },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approvedAt: { type: Date, default: null },

    // ── Auth tokens ──────────────────────────────────────────────────────────
    resetPasswordToken:  String,
    resetPasswordExpire: Date,

    refreshToken: { type: String, select: false },
  },
  { timestamps: true }
);

// ── Hash password on save ─────────────────────────────────────────────────────
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// ── Instance methods ──────────────────────────────────────────────────────────
userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password);
};

userSchema.methods.setRefreshToken = function (token) {
  this.refreshToken = crypto.createHash('sha256').update(token).digest('hex');
};

userSchema.methods.compareRefreshToken = function (token) {
  return this.refreshToken === crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = mongoose.model('User', userSchema);