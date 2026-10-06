/** Unknown /api route → JSON 404 instead of Express's HTML page. */
const notFound = (req, res) => {
  res.status(404).json({ success: false, message: "Not found" });
};

/**
 * Last-resort handler. Express 5 forwards thrown and rejected errors here.
 * Clients get a safe message; the details go to the log with the request id.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Request body is not valid JSON" });
  }
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Request body is too large" });
  }

  const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) {
    req.log?.error({ err }, "Unhandled error");
    res.err = err;
  }
  if (res.headersSent) return undefined;
  return res.status(status).json({
    success: false,
    message: status === 500 ? "Something went wrong. Please try again." : err.message,
    requestId: req.id,
  });
};

module.exports = { notFound, errorHandler };
