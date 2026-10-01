require("dotenv").config();

const express = require("express");
const cors = require("cors");
const debugRoutes = require("./routes/debug.routes");

const { testConnection } = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/debug", debugRoutes);

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
    console.error("Database connection error:", error.message);

    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});