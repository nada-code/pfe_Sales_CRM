const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
    },

    lastName: {
      type: String,
      required: [true, 'Last name is required'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      index: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },

    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false,
    },

    role: {
      type: String,
      enum: ['sales_leader', 'cxp', 'salesman'],
      required: [true, 'Role is required'],
      default: 'salesman',
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isApproved: {
      type: Boolean,
      default: function() {
        return this.role !== 'salesman'; // salesman requires approval
      },
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    // 🔥 Reset password
    resetPasswordToken: String,
    resetPasswordExpire: Date,

    // 🔥 Refresh token (hashé pour sécurité)
    refreshToken: {
      type: String,
      select: false,
    },

  },
  { timestamps: true }
);

//////////////////////////////////////////////////////
// 🔐 HASH PASSWORD
//////////////////////////////////////////////////////

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(12); // 12 = plus sécurisé que 10
  this.password = await bcrypt.hash(this.password, salt);
});

//////////////////////////////////////////////////////
// 🔐 MATCH PASSWORD
//////////////////////////////////////////////////////

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

//////////////////////////////////////////////////////
// 🔐 HASH REFRESH TOKEN (OPTIONNEL MAIS PRO)
//////////////////////////////////////////////////////

userSchema.methods.setRefreshToken = function (token) {
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  this.refreshToken = hashed;
};

userSchema.methods.compareRefreshToken = function (token) {
  const hashed = crypto.createHash('sha256').update(token).digest('hex');
  return this.refreshToken === hashed;
};

module.exports = mongoose.model('User', userSchema);