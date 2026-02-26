const jwt = require('jsonwebtoken');

exports.protect = async (req, res, next) => {
  let token;

  // Récupérer le token du header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Vérifier que le token existe
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    // Vérifier le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
};

// Vérifier les rôles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: `User role '${req.user.role}' is not authorized to access this route` 
      });
    }
    next();
  };
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