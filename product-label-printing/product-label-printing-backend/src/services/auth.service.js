const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { pool } = require("../config/db");

const login = async (email, password) => {
  const normalizedEmail = email.trim().toLowerCase();

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
      cu.trash,
      cr.role_title
    FROM client_users cu
    LEFT JOIN client_roles cr
      ON cr.id = cu.role_id
      AND cr.client_id = cu.client_id
    WHERE LOWER(cu.email) = ?
      AND cu.trash = 0
    LIMIT 1
    `,
    [normalizedEmail]
  );

  if (rows.length === 0) {
    throw new Error("Invalid email or password");
  }

  const user = rows[0];

  if (user.status !== 1) {
    throw new Error("User account is inactive");
  }

  if (!user.password) {
    throw new Error("User password is not configured");
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    throw new Error("Invalid email or password");
  }

  const tokenPayload = {
    userId: user.id,
    clientId: user.client_id,
    roleId: user.role_id,
    role: user.role_title,
    isAdmin: Boolean(user.is_admin),
  };

  const token = jwt.sign(
    tokenPayload,
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    }
  );

  return {
    token,
    user: {
      id: user.id,
      clientId: user.client_id,
      name: user.name,
      email: user.email,
      mobile: user.mobile,
      roleId: user.role_id,
      role: user.role_title,
      isAdmin: Boolean(user.is_admin),
      active: user.status === 1,
    },
  };
};

module.exports = {
  login,
};