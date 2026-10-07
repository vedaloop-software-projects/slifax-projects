/*
 * Applies the label app's own SQL migrations (migrations/*.sql) in file-name order.
 * Every migration is written to be safe to re-run (CREATE TABLE IF NOT EXISTS …).
 * Only adds label-app tables; it never alters zenx-pos tables.
 *
 *   npm run db:migrate             apply
 *   npm run db:migrate -- --dry-run  list what would run
 */
require("dotenv").config({ quiet: true });

const fs = require("fs");
const path = require("path");

const DIR = path.join(__dirname, "..", "migrations");
const DRY_RUN = process.argv.includes("--dry-run");

(async () => {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
  if (DRY_RUN) {
    console.log(`Would apply: ${files.join(", ") || "(none)"}`);
    return;
  }
  const { pool } = require("../src/config/db");
  try {
    for (const file of files) {
      const sql = fs.readFileSync(path.join(DIR, file), "utf8");
      await pool.query(sql);
      console.log(`applied ${file}`);
    }
  } finally {
    await pool.end();
  }
})().catch((error) => {
  console.error(`Migration failed: ${error.message}`);
  process.exitCode = 1;
});
