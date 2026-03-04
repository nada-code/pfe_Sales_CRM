const jwt  = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized — no token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Chargement depuis la DB (avant: juste decode sans vérif)
    const user = await User.findById(decoded.id).select('-password -refreshToken');

    if (!user)        return res.status(401).json({ success: false, message: 'User no longer exists' });
    if (!user.isActive) return res.status(401).json({ success: false, message: 'Account has been deactivated' });

    // ✅ Vérif isApproved côté backend (pas uniquement frontend)
    if (user.role === 'salesman' && !user.isApproved) {
      return res.status(403).json({ success: false, message: 'Account pending approval from sales leader' });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Not authorized — invalid or expired token' });
  }
};

exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: `Access denied — role '${req.user.role}' is not allowed` });
  }
  next();
};

// const jwt = require('jsonwebtoken');
// const User = require('../models/User');

// //////////////////////////////////////////////////////
// // ✅ PROTECT (vérifie token)
// //////////////////////////////////////////////////////
// exports.protect = async (req, res, next) => {
//   try {
//     let token;

//     if (
//       req.headers.authorization &&
//       req.headers.authorization.startsWith('Bearer')
//     ) {
//       token = req.headers.authorization.split(' ')[1];
//     }

//     if (!token) {
//       return res.status(401).json({ message: 'Not authorized, no token' });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);

//     req.user = await User.findById(decoded.id).select('-password');

//     if (!req.user) {
//       return res.status(401).json({ message: 'User not found' });
//     }

//     next();
//   } catch (error) {
//     return res.status(401).json({ message: 'Not authorized' });
//   }
// };

// //////////////////////////////////////////////////////
// // 👑 SALES LEADER ONLY
// //////////////////////////////////////////////////////
// exports.salesLeaderOnly = (req, res, next) => {
//   if (req.user.role !== 'sales_leader') {
//     return res.status(403).json({ message: 'Access denied (Sales Leader only)' });
//   }
//   next();
// };

// //////////////////////////////////////////////////////
// // 👔 CXP ONLY
// //////////////////////////////////////////////////////
// exports.cxpOnly = (req, res, next) => {
//   if (req.user.role !== 'cxp') {
//     return res.status(403).json({ message: 'Access denied (CXP only)' });
//   }
//   next();
// };

// //////////////////////////////////////////////////////
// // 👨‍💼 SALESMAN ONLY
// //////////////////////////////////////////////////////
// exports.salesmanOnly = (req, res, next) => {
//   if (req.user.role !== 'salesman') {
//     return res.status(403).json({ message: 'Access denied (Salesman only)' });
//   }
//   next();
// };

// //////////////////////////////////////////////////////
// // 🎯 FLEXIBLE ROLE AUTHORIZATION
// //////////////////////////////////////////////////////
// exports.authorizeRoles = (...roles) => {
//   return (req, res, next) => {
//     if (!roles.includes(req.user.role)) {
//       return res.status(403).json({
//         message: `Access denied. Allowed roles: ${roles.join(', ')}`,
//       });
//     }
//     next();
//   };
// };

// Exemple d’utilisation dans les routes Lead
// 👑 Seul le Sales Leader peut assigner
// router.put(
//   '/:id/assign',
//   protect,
//   salesLeaderOnly,
//   controller.assignLead