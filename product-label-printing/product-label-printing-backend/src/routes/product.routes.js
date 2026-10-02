const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const { requirePermission } = require("../middleware/authorization.middleware");
const productController = require("../controllers/product.controller");

const router = express.Router();
const requireProductView = requirePermission({
  featureId: 5,
  subFeatureId: 2,
  action: "view",
});
const requireProductAdd = requirePermission({
  featureId: 5,
  subFeatureId: 2,
  action: "add",
});
const requireProductEdit = requirePermission({
  featureId: 5,
  subFeatureId: 2,
  action: "edit",
});

router.get("/", authMiddleware, requireProductView, productController.list);
router.get("/:id", authMiddleware, requireProductView, productController.getById);
router.post("/", authMiddleware, requireProductAdd, productController.create);
router.put("/:id", authMiddleware, requireProductEdit, productController.update);
router.patch("/:id/status", authMiddleware, requireProductEdit, productController.updateStatus);

module.exports = router;