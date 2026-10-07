const express = require("express");
const cors = require("cors");

const { testConnection } = require("./config/db");
const requestLogger = require("./middleware/request-logger");
const { notFound, errorHandler } = require("./middleware/error-handler");
const debugRoutes = require("./routes/debug.routes");
const authRoutes = require("./routes/auth.routes");
const testAuthRoutes = require("./routes/test-auth.routes");
const productRoutes = require("./routes/product.routes");
const masterDataRoutes = require("./routes/master-data.routes");
const adminRoutes = require("./routes/admin.routes");
const printLogRoutes = require("./routes/print-log.routes");
const authMiddleware = require("./middleware/auth.middleware");
const requireSuperAdmin = require("./middleware/super-admin.middleware");

const app = express();

app.use(requestLogger);
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Slifax Product Label Printing API is running",
  });
});

app.get("/api/health", async (req, res) => {
  try {
    await testConnection();

    res.status(200).json({
      success: true,
      message: "Backend and TiDB are connected",
      database: process.env.DB_NAME,
    });
  } catch (error) {
    req.log.error({ err: error }, "Database health check failed");

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// Debug routes can read any table (including password hashes) — super admins only.
app.use("/api/debug", authMiddleware, requireSuperAdmin, debugRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/test-auth", testAuthRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/print-logs", printLogRoutes);
app.use("/api", masterDataRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
