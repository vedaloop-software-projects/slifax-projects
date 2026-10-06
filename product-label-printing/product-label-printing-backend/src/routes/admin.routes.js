const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const requireSuperAdmin = require("../middleware/super-admin.middleware");
const clientController = require("../controllers/client.controller");
const workspace = require("../controllers/workspace.controller");

// Super-admin only: the clients (businesses) onboarded in zenx-pos.
const router = express.Router();

router.use(authMiddleware, requireSuperAdmin);

router.get("/lookups", clientController.lookups);
router.get("/clients", clientController.list);
router.get("/clients/:id", clientController.getById);
router.post("/clients", clientController.create);
router.patch("/clients/:id/status", clientController.updateStatus);

// One client's data, managed by the super admin (zenx-pos rules: see workspace.service.js).
router.get("/clients/:id/masters", workspace.listMasters);
router.post("/clients/:id/masters/:type", workspace.createMaster);
router.get("/clients/:id/products", workspace.listProducts);
router.post("/clients/:id/products", workspace.createProduct);
router.get("/clients/:id/products/:productId", workspace.getProduct);
router.patch("/clients/:id/products/:productId/status", workspace.setProductStatus);
router.get("/clients/:id/roles", workspace.listRoles);
router.post("/clients/:id/roles", workspace.createRole);
router.get("/clients/:id/roles/:roleId/access", workspace.getAccess);
router.put("/clients/:id/roles/:roleId/access", workspace.saveAccess);
router.get("/clients/:id/users", workspace.listUsers);
router.post("/clients/:id/users", workspace.createUser);
router.put("/clients/:id/users/:userId", workspace.updateUser);

module.exports = router;
