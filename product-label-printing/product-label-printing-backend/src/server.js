require("dotenv").config({ quiet: true });

const { logger } = require("./config/logger");
const app = require("./app");

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception, shutting down");
  // Give the log line a moment to flush, then let Cloud Run restart the container.
  setTimeout(() => process.exit(1), 100).unref();
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info({ port: Number(PORT), env: process.env.NODE_ENV || "development" }, `Server running on port ${PORT}`);
});
