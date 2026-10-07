const express = require("express");
const { pool } = require("../config/db");

const router = express.Router();

router.get("/tables", async (req, res) => {
  try {
    const [tables] = await pool.query("SHOW TABLES");

    res.status(200).json({
      success: true,
      count: tables.length,
      tables,
    });
  } catch (error) {
    req.log.error({ err: error }, "Failed to fetch tables");

    res.status(500).json({
      success: false,
      message: "Failed to fetch database tables",
    });
  }
});


router.get("/table/:tableName", async (req, res) => {
  try {
    const { tableName } = req.params;

    // Allow only existing tables to avoid arbitrary SQL injection
    const [tables] = await pool.query("SHOW TABLES");

    const exists = tables.some((table) => {
      const tableKey = Object.keys(table)[0];
      return table[tableKey] === tableName;
    });

    if (!exists) {
      return res.status(404).json({
        success: false,
        message: `Table '${tableName}' does not exist`,
      });
    }

    const [columns] = await pool.query(
      `DESCRIBE \`${tableName}\``
    );

    res.status(200).json({
      success: true,
      table: tableName,
      columns,
    });
  } catch (error) {
    req.log.error({ err: error }, "Failed to inspect table");

    res.status(500).json({
      success: false,
      message: "Failed to inspect table",
    });
  }
});

module.exports = router;