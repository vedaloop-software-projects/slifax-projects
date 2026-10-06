const { APP_ROLES } = require("../services/roles");

/** Must run after authMiddleware. Only zenx-pos super admins pass. */
const requireSuperAdmin = (req, res, next) => {
  const adminId = req.user?.adminId;
  if (req.user?.role !== APP_ROLES.SUPER_ADMIN || !Number.isSafeInteger(adminId) || adminId <= 0) {
    return res.status(403).json({
      success: false,
      message: "Forbidden",
    });
  }
  return next();
};

module.exports = requireSuperAdmin;
