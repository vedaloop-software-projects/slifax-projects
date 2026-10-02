const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/authorization.middleware");

const router = express.Router();

router.get("/", authMiddleware, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authentication successful",
    user: req.user,
  });
});

router.get(
  "/permissions",
  authMiddleware,
  requirePermission({ featureId: 10, subFeatureId: 44, action: "view" }),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Permission granted",
      user: req.user,
    });
  }
);

module.exports = router;