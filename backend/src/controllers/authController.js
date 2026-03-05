const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { sendPasswordResetEmail } = require("../services/emailService");

const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// ============================================================
// Helpers
// ============================================================

// const SAFE_RESPONSE = {
//   success: true,
//   message: 'If an account with that email exists, a reset link has been sent.',
// };

const generateAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

const generateRefreshToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
const generateResetToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  return { rawToken, hashedToken };
};

// ============================================================
// AUTH CONTROLLER
// ============================================================

// @route   POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    const userRole = role || "salesman";
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      role: userRole,
      // Salesmen need approval; others are auto-approved
      isApproved: userRole !== "salesman",
    });

    // For pending salesman, don't return tokens yet
    if (!user.isApproved) {
      return res.status(201).json({
        success: true,
        message: "Account created. Awaiting approval from sales leader.",
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isApproved: user.isApproved,
        },
      });
    }

    // For other roles, generate tokens
    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      token,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// ============================================================
// LOGIN
// ============================================================

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    // If no user found with that email, return specific message
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email",
      });
    }

    // If user exists but password doesn't match, return specific message
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect password",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "User account is deactivated",
      });
    }

    // Check if salesman is approved
    if (user.role === 'salesman' && !user.isApproved) {
      return res.status(403).json({
        success: false,
        message: "Your account is pending approval from a sales leader. Please wait for confirmation.",
        isApproved: false,
      });
    }

    const token = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: "Login successful you can now access your dashboard",
      token,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isApproved: user.isApproved,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: "Refresh token is required",
      });
    }

    const user = await User.findOne({ refreshToken });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      token: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

exports.logout = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (user) {
      user.refreshToken = null;
      await user.save({ validateBeforeSave: false });
    }

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
// ============================================================
// GET CURRENT USER
// ============================================================

exports.getMe = async (req, res) => {
  try {
     const user = await User.findById(req.user.id).select('-password -refreshToken');
    if (!user) return res.status(404).json({ message: 'User not found' });

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// ============================================================
// FORGOT PASSWORD
// ============================================================

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email address.",
      });
    }

    const user = await User.findOne({ email });

    // ❌ EMAIL NOT FOUND
    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "No account found with this email. Please enter a valid registered email.",
      });
    }

    // ✅ EMAIL FOUND
    const { rawToken, hashedToken } = generateResetToken();

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + RESET_TOKEN_EXPIRY_MS;

    await user.save({ validateBeforeSave: false });

    await sendPasswordResetEmail(user.email, rawToken);

    return res.status(200).json({
      success: true,
      message: "Password reset link sent successfully to your email. Please check your inbox.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to process request. Please try again.",
    });
  }
};

// ============================================================
// RESET PASSWORD
// ============================================================

exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const { resetToken } = req.params;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token ",
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();
    const token = generateAccessToken(user);


    return res.status(200).json({
      success: true,
      message: "Password reset successful now you can log in with your new password",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("🔥 RESET PASSWORD ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
      stack: error.stack,
    });
  }
};

// GET /users?role=salesman&isApproved=false
// exports.getUsers = async (req, res) => {
//   try {
//     const { role, isApproved } = req.query;
//     const query = {};
//     if (role) query.role = role;
//     if (isApproved !== undefined) query.isApproved = isApproved === 'true';
    
//     const users = await User.find(query).select("-password");
//     res.status(200).json({
//       success: true,
//       data: users,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch users",
//     });
//   }
// };

// // ============================================================
// // APPROVE USER (sales_leader only)
// // ============================================================
// exports.approveUser = async (req, res) => {
//   try {
//     const { userId }     = req.params;
//     const approverRole   = req.user.role;

//     if (approverRole !== 'sales_leader') {
//       return res.status(403).json({ success: false, message: 'Only sales leaders can approve users' });
//     }

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ success: false, message: 'User not found' });

//     if (user.role !== 'salesman') {
//       return res.status(400).json({ success: false, message: 'Only salesman accounts can be approved' });
//     }

//     if (user.isApproved) {
//       return res.status(400).json({ success: false, message: 'User is already approved' });
//     }

//     user.isApproved = true;
//     user.approvedBy = req.user._id;
//     user.approvedAt = new Date();
//     await user.save();

//     // Notify all connected clients that a new salesman was approved
//     req.app.get('io').emit('user:approved', {
//       userId:    user._id,
//       firstName: user.firstName,
//       lastName:  user.lastName,
//     });

//     res.status(200).json({
//       success: true,
//       message: 'User approved successfully',
//       data: {
//         id:         user._id,
//         email:      user.email,
//         firstName:  user.firstName,
//         lastName:   user.lastName,
//         role:       user.role,
//         isApproved: user.isApproved,
//         approvedAt: user.approvedAt,
//       },
//     });
//   } catch (error) {
//     console.error('🔥 APPROVE USER ERROR:', error);
//     return res.status(500).json({ success: false, message: 'Failed to approve user' });
//   }
// };
