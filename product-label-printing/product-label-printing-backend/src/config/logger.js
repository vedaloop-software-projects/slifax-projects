const pino = require("pino");

// Cloud Run / Cloud Logging read JSON lines from stdout. They expect `severity`
// (not pino's numeric `level`) and `message`, so map those. Locally, logs are
// pretty-printed when pino-pretty (a dev dependency) is installed.

const SEVERITY = {
  trace: "DEBUG",
  debug: "DEBUG",
  info: "INFO",
  warn: "WARNING",
  error: "ERROR",
  fatal: "CRITICAL",
};

const isProduction = process.env.NODE_ENV === "production";

const prettyAvailable = () => {
  try {
    require.resolve("pino-pretty");
    return true;
  } catch {
    return false;
  }
};

const usePretty = !isProduction && process.env.LOG_PRETTY !== "false" && prettyAvailable();

/**
 * Errors from mysql2 carry the full SQL text in `sql`. With client-side value
 * formatting that text includes inserted values (e.g. password hashes), so it
 * is never logged. Message, code and stack are enough to debug.
 */
const errSerializer = (err) => {
  if (!err || typeof err !== "object") return err;
  const out = pino.stdSerializers.err(err);
  delete out.sql;
  delete out.parameters;
  return out;
};

const REDACT = [
  "password",
  "*.password",
  "adminPassword",
  "*.adminPassword",
  "token",
  "*.token",
  "authorization",
  "*.authorization",
  "req.headers.authorization",
  "req.headers.cookie",
];

const options = {
  level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),
  base: { service: "product-label-printing-backend" },
  redact: { paths: REDACT, censor: "[redacted]" },
  serializers: { err: errSerializer, error: errSerializer },
  ...(usePretty
    ? {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss.l", ignore: "pid,hostname,service" },
        },
      }
    : {
        messageKey: "message",
        timestamp: pino.stdTimeFunctions.isoTime,
        formatters: {
          level: (label) => ({ severity: SEVERITY[label] || "DEFAULT" }),
        },
      }),
};

const logger = pino(options);

module.exports = { logger, errSerializer, loggerOptions: options };
