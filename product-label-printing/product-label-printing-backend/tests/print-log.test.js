const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

process.env.DB_SSL_CA ||= path.join(__dirname, "..", "certs", "ca.pem");
const { toRow } = require("../src/services/print-log.service");

const ctx = { clientId: 10, userId: 15, now: Date.parse("2026-10-07T12:00:00Z") };
const log = (over = {}) => ({
  id: "3f1c2a9e-1111-4c4c-9d9d-abcdefabcdef",
  at: "2026-10-07T06:30:00.000Z",
  method: "PRN",
  status: "SPOOLED",
  printer: "TVS LP46",
  templateId: "tpl_1",
  templateName: "Grocery-50x25",
  productId: "1054",
  productCode: "10010415",
  productName: "Toor Dal 1 KG",
  quantity: 4,
  expiryDate: "2027-04-01",
  ...over,
});

test("a print record becomes a row owned by the signed-in business", () => {
  const row = toRow({ ...log(), clientId: 999 }, ctx);
  assert.equal(row[1], 10, "client comes from the token, not the browser");
  assert.equal(row[2], 15);
  assert.equal(row[3], "2026-10-07 06:30:00", "stored as UTC DATETIME");
  assert.equal(row[12], 4);
  assert.equal(row[13], "2027-04-01");
  assert.equal(toRow(log({ expiryDate: null }), ctx)[13], null, "expiry left off the label");
});

test("malformed records are skipped instead of blocking the batch", () => {
  for (const bad of [
    log({ id: "x" }),
    log({ method: "FAX" }),
    log({ status: "DONE" }),
    log({ quantity: 0 }),
    log({ quantity: 2.5 }),
    log({ at: "not a date" }),
    log({ at: "2030-01-01T00:00:00Z" }),
    log({ productId: "" }),
    log({ expiryDate: "01-04-2027" }),
    null,
  ]) {
    assert.equal(toRow(bad, ctx), null, JSON.stringify(bad));
  }
});

test("long names are clipped to the column size", () => {
  const row = toRow(log({ productName: "N".repeat(400) }), ctx);
  assert.equal(row[11].length, 255);
});
