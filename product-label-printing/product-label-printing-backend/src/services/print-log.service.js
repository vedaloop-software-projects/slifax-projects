// Print analytics sent by the label app at logout / end of day (see frontend lib/printLog.ts).

const { pool } = require("../config/db");

const METHODS = new Set(["PRN", "BROWSER", "PDF"]);
const STATUSES = new Set(["SPOOLED", "UNCONFIRMED", "SENT_TO_BROWSER"]);
const MAX_BATCH = 500;
const DAY = 24 * 60 * 60 * 1000;

class PrintLogError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const text = (v, max) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** MySQL DATETIME in UTC. */
const toUtcDatetime = (d) => d.toISOString().slice(0, 19).replace("T", " ");

/**
 * Turns one browser record into a row, or null when it cannot be stored (it is then
 * skipped, not retried: a malformed record must not block the rest of the outbox).
 */
const toRow = (log, { clientId, userId, now = Date.now() }) => {
  if (!log || typeof log !== "object") return null;
  if (typeof log.id !== "string" || !/^[\w-]{8,64}$/.test(log.id)) return null;
  const at = new Date(log.at);
  if (Number.isNaN(at.getTime()) || at.getTime() > now + DAY || at.getTime() < now - 400 * DAY) return null;
  if (!METHODS.has(log.method) || !STATUSES.has(log.status)) return null;
  const quantity = Number(log.quantity);
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100000) return null;
  const productRef = text(String(log.productId ?? ""), 64);
  if (!productRef) return null;
  const expiry = log.expiryDate === null || log.expiryDate === undefined ? null : log.expiryDate;
  if (expiry !== null && (typeof expiry !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(expiry))) return null;
  return [
    log.id,
    clientId,
    userId,
    toUtcDatetime(at),
    log.method,
    log.status,
    text(log.printer, 255),
    text(log.templateId, 64),
    text(log.templateName, 255),
    productRef,
    text(log.productCode, 255),
    text(log.productName, 255),
    quantity,
    expiry,
  ];
};

/** Stores a batch. Rows always belong to the signed-in user's business (from the token). */
const record = async ({ clientId, userId }, logs) => {
  if (!Array.isArray(logs) || logs.length === 0) throw new PrintLogError("logs must be a non-empty array");
  if (logs.length > MAX_BATCH) throw new PrintLogError(`Send at most ${MAX_BATCH} logs at a time`);
  const rows = logs.map((l) => toRow(l, { clientId, userId })).filter(Boolean);
  const rejected = logs.length - rows.length;
  if (!rows.length) return { accepted: 0, duplicates: 0, rejected };
  try {
    const [result] = await pool.query(
      `INSERT IGNORE INTO label_print_logs
        (log_uid, client_id, client_user_id, printed_at, method, status, printer_name, template_ref, template_name, product_ref, product_code, product_name, quantity, expiry_date)
       VALUES ?`,
      [rows]
    );
    return { accepted: result.affectedRows, duplicates: rows.length - result.affectedRows, rejected };
  } catch (error) {
    if (error.code === "ER_NO_SUCH_TABLE") throw new PrintLogError("Print log storage is not set up yet. Run npm run db:migrate.", 503);
    throw error;
  }
};

module.exports = { PrintLogError, record, toRow, MAX_BATCH };
