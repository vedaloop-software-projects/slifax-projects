const crypto = require("crypto");

// The label-printing app has three roles. Super admins are zenx-pos `admins`
// (they onboard clients); everyone else is a `client_users` row of a client.
const APP_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMIN: "ADMIN",
  USER: "USER",
};

/**
 * Client admins (is_admin = 1, the account created at onboarding) and any role a
 * client named Admin or Manager adjust layouts and see analytics. Every other
 * client user only prints.
 */
const appRoleForClientUser = ({ isAdmin, roleTitle }) => {
  if (Number(isAdmin) === 1 || isAdmin === true) return APP_ROLES.ADMIN;
  if (typeof roleTitle === "string" && /\b(admin|manager)\b/i.test(roleTitle)) return APP_ROLES.ADMIN;
  return APP_ROLES.USER;
};

/** Legacy zenx-pos admin passwords are unsalted md5 hex (admin/Login.php). */
const legacyMd5Matches = (password, storedHash) => {
  if (typeof password !== "string" || typeof storedHash !== "string" || !/^[a-f0-9]{32}$/i.test(storedHash)) {
    return false;
  }
  const actual = crypto.createHash("md5").update(password).digest();
  return crypto.timingSafeEqual(actual, Buffer.from(storedHash.toLowerCase(), "hex"));
};

const looksLikeMobile = (value) => /^[6-9]\d{9}$/.test(String(value ?? "").trim());

module.exports = {
  APP_ROLES,
  appRoleForClientUser,
  legacyMd5Matches,
  looksLikeMobile,
};
