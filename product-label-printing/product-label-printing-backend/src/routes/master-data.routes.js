const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const masterDataController = require("../controllers/master-data.controller");

const router = express.Router();

router.get("/categories", authMiddleware, masterDataController.listCategories);
router.get("/sub-categories", authMiddleware, masterDataController.listSubCategories);
router.get("/brands", authMiddleware, masterDataController.listBrands);
router.get("/unit-types", authMiddleware, masterDataController.listUnitTypes);
router.get("/taxes", authMiddleware, masterDataController.listTaxes);

module.exports = router;
