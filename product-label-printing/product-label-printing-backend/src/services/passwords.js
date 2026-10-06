const bcrypt = require("bcryptjs");

/**
 * Bcrypt hash that zenx-pos (Laravel 12) also accepts. Laravel verifies the algorithm and
 * only recognises the `$2y$` prefix, while bcryptjs writes `$2b$` — the same algorithm.
 * Without the rewrite, users created here could sign in to the label app but not to zenx-pos.
 */
const hashPassword = async (password) => {
  const hash = await bcrypt.hash(password, 10);
  return `$2y$${hash.slice(4)}`;
};

module.exports = { hashPassword };
