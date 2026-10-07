const authorizationService = require("../services/authorization.service");

const requirePermission = ({ featureId, subFeatureId = 0, action } = {}) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    try {
      const allowed = await authorizationService.hasPermission({
        clientId: req.user.clientId,
        roleId: req.user.roleId,
        featureId,
        subFeatureId,
        action,
      });

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: "Forbidden",
        });
      }

      return next();
    } catch (error) {
      req.log.error({ err: error }, "Authorization check failed");

      return res.status(500).json({
        success: false,
        message: "Authorization check failed",
      });
    }
  };
};

module.exports = {
  requirePermission,
};