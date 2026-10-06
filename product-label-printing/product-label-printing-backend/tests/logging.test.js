const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const { Writable } = require("stream");
const pino = require("pino");

// The app imports db.js, which reads the CA file at load; no query runs in these tests.
process.env.DB_SSL_CA ||= path.join(__dirname, "..", "certs", "ca.pem");
process.env.JWT_SECRET ||= "test-only-secret";
process.env.LOG_LEVEL = "silent";
process.env.LOG_PRETTY = "false";

const { errSerializer, loggerOptions } = require("../src/config/logger");
const { mask } = require("../src/controllers/auth.controller");

const capture = () => {
  const lines = [];
  const stream = new Writable({
    write(chunk, _enc, done) {
      lines.push(JSON.parse(chunk));
      done();
    },
  });
  const { transport, ...opts } = loggerOptions;
  return { lines, log: pino({ ...opts, level: "info" }, stream) };
};

test("passwords, tokens and auth headers never reach the log", () => {
  const { lines, log } = capture();
  log.info({ password: "Label@123", body: { adminPassword: "x", token: "abc" }, req: { headers: { authorization: "Bearer abc" } } }, "hi");
  const text = JSON.stringify(lines[0]);
  for (const secret of ["Label@123", "Bearer abc", '"abc"']) assert.ok(!text.includes(secret), `${secret} leaked`);
  assert.equal(lines[0].severity, "INFO");
  assert.equal(lines[0].message, "hi");
});

test("database errors are logged without their SQL text", () => {
  const err = Object.assign(new Error("Duplicate entry"), { code: "ER_DUP_ENTRY", sql: "INSERT INTO client_users SET password = '$2a$10$hash'" });
  const out = errSerializer(err);
  assert.equal(out.code, "ER_DUP_ENTRY");
  assert.equal(out.message, "Duplicate entry");
  assert.equal(out.sql, undefined);
});

test("logged sign-in identifiers are masked", () => {
  assert.equal(mask("owner@vijayadurga.seed.example"), "ow***@vijayadurga.seed.example");
  assert.equal(mask("9876543210"), "98******10");
  assert.equal(mask("abc"), "***");
});

test("HTTP: request ids, JSON 404s, bad JSON and login validation", async () => {
  const app = require("../src/app");
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const home = await fetch(base + "/", { headers: { "x-request-id": "trace-12345678" } });
    assert.equal(home.status, 200);
    assert.equal(home.headers.get("x-request-id"), "trace-12345678");
    assert.ok((await fetch(base + "/")).headers.get("x-request-id"), "an id is generated when none is sent");

    const missing = await fetch(base + "/api/nope");
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).message, "Not found");

    const badJson = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{bad" });
    assert.equal(badJson.status, 400);
    assert.equal((await badJson.json()).message, "Request body is not valid JSON");

    const empty = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    assert.equal(empty.status, 400);
    assert.equal((await empty.json()).message, "Email or mobile and password are required");
  } finally {
    server.close();
    require("../src/config/db").pool.end().catch(() => {});
  }
});
