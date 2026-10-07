const crypto = require("crypto");
const pinoHttp = require("pino-http");

const { logger } = require("../config/logger");

const GCP_PROJECT = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;

/** Cloud Run sends `x-cloud-trace-context: TRACE_ID/SPAN_ID;o=1`. */
const traceIdOf = (req) => {
  const header = req.headers["x-cloud-trace-context"];
  return typeof header === "string" ? header.split("/")[0] || null : null;
};

const requestLogger = pinoHttp({
  logger,
  // Reuse the caller's / Cloud Run's id so one request can be followed across logs.
  genReqId: (req, res) => {
    const incoming = req.headers["x-request-id"];
    const id = (typeof incoming === "string" && /^[\w-]{8,100}$/.test(incoming) && incoming) || traceIdOf(req) || crypto.randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  customLogLevel: (req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res, ms) => `${req.method} ${req.originalUrl || req.url} ${res.statusCode} ${Math.round(ms)}ms`,
  customErrorMessage: (req, res) => `${req.method} ${req.originalUrl || req.url} ${res.statusCode} failed`,
  // Who made the request (set by authMiddleware), never the token itself.
  customProps: (req) => {
    const props = {};
    if (req.user) {
      props.user = {
        role: req.user.role,
        ...(req.user.userId ? { userId: req.user.userId, clientId: req.user.clientId } : {}),
        ...(req.user.adminId ? { adminId: req.user.adminId } : {}),
      };
    }
    const traceId = traceIdOf(req);
    if (traceId && GCP_PROJECT) props["logging.googleapis.com/trace"] = `projects/${GCP_PROJECT}/traces/${traceId}`;
    return props;
  },
  // Keep request lines small: no headers or bodies (they carry tokens and passwords).
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  autoLogging: {
    ignore: (req) => req.method === "OPTIONS",
  },
});

module.exports = requestLogger;
