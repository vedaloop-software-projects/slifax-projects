const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const authorization = req.get("Authorization");

  if (!authorization) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const [scheme, token, ...extraParts] = authorization.trim().split(/\s+/);

  if (scheme.toLowerCase() !== "bearer") {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (!token || extraParts.length > 0) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;