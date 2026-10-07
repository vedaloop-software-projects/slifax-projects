const express = require("express");

const authMiddleware = require("../middleware/auth.middleware");
const printLogs = require("../services/print-log.service");

const router = express.Router();

/** POST /api/print-logs { logs: [...] } — client users only (rows go to their own business). */
router.post("/", authMiddleware, async (req, res) => {
  const { clientId, userId } = req.user ?? {};
  if (!clientId || !userId) return res.status(403).json({ success: false, message: "Only shop users record prints" });
  try {
    const data = await printLogs.record({ clientId, userId }, req.body?.logs);
    req.log.info({ ...data, clientId }, "Print logs received");
    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (error instanceof printLogs.PrintLogError) return res.status(error.status).json({ success: false, message: error.message });
    req.log.error({ err: error }, "Failed to store print logs");
    return res.status(500).json({ success: false, message: "Failed to store print logs" });
  }
});

module.exports = router;
