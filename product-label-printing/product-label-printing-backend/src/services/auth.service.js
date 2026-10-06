const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { pool } = require("../config/db");
const { APP_ROLES, appRoleForClientUser, legacyMd5Matches, looksLikeMobile } = require("./roles");

const INVALID = "Invalid email or password";

/** An expected sign-in failure (wrong password, inactive account). Safe to show the user. */
class AuthError extends Error {}

const sign = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });

const passwordMatches = async (password, stored) => {
  if (!stored) return false;
  if (stored.startsWith("$2")) return bcrypt.compare(password, stored);
  return legacyMd5Matches(password, stored);
};

/** zenx-pos super admins (`admins` table) sign in with their mobile number. */
const loginSuperAdmin = async (mobile, password) => {
  const [rows] = await pool.query(
    `
    SELECT id, name, mobile, password, status
    FROM admins
    WHERE mobile = ?
      AND trash = 0
    LIMIT 1
    `,
    [mobile]
  );

  const admin = rows[0];
  if (!admin || !(await passwordMatches(password, admin.password))) return null;
  if (Number(admin.status) !== 1) throw new AuthError("User account is inactive");

  const token = sign({ adminId: Number(admin.id), role: APP_ROLES.SUPER_ADMIN });

  return {
    token,
    user: {
      id: `admin-${admin.id}`,
      clientId: null,
      name: admin.name,
      email: "",
      mobile: admin.mobile,
      role: APP_ROLES.SUPER_ADMIN,
      roleTitle: "Super Admin",
      businessName: null,
      isAdmin: true,
      active: true,
    },
  };
};

const loginClientUser = async (identifier, password) => {
  const byMobile = looksLikeMobile(identifier);
  const [rows] = await pool.query(
    `
    SELECT
      cu.id,
      cu.client_id,
      cu.name,
      cu.email,
      cu.mobile,
      cu.password,
      cu.role_id,
      cu.is_admin,
      cu.status,
      cr.role_title,
      c.business_name,
      c.status AS client_status,
      c.trash AS client_trash
    FROM client_users cu
    LEFT JOIN client_roles cr
      ON cr.id = cu.role_id
      AND cr.client_id = cu.client_id
    LEFT JOIN users c
      ON c.id = cu.client_id
    WHERE ${byMobile ? "cu.mobile = ?" : "LOWER(cu.email) = ?"}
      AND cu.trash = 0
    LIMIT 1
    `,
    [identifier]
  );

  const user = rows[0];
  if (!user || !user.password || !(await passwordMatches(password, user.password))) {
    throw new AuthError(INVALID);
  }
  if (Number(user.status) !== 1) throw new AuthError("User account is inactive");
  if (user.client_trash === null || Number(user.client_trash) !== 0 || Number(user.client_status) !== 1) {
    throw new AuthError("This business account is inactive. Contact your administrator.");
  }

  const role = appRoleForClientUser({ isAdmin: user.is_admin, roleTitle: user.role_title });

  const token = sign({
    userId: user.id,
    clientId: user.client_id,
    roleId: user.role_id,
    role,
    roleTitle: user.role_title,
    isAdmin: Boolean(user.is_admin),
  });

  return {
    token,
    user: {
      id: user.id,
      clientId: user.client_id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      roleId: user.role_id,
      role,
      roleTitle: user.role_title,
      businessName: user.business_name,
      isAdmin: Boolean(user.is_admin),
      active: true,
    },
  };
};

/** `identifier` is an email (client users) or a mobile number (super admins, then client users). */
const login = async (identifier, password) => {
  const normalized = String(identifier).trim().toLowerCase();

  if (looksLikeMobile(normalized)) {
    const admin = await loginSuperAdmin(normalized, password);
    if (admin) return admin;
  }

  return loginClientUser(normalized, password);
};

module.exports = {
  AuthError,
  login,
};
