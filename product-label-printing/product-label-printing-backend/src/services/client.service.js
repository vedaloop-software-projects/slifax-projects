
const { pool } = require("../config/db");
const { appRoleForClientUser } = require("./roles");
const { validateNewClient } = require("./client.rules");
const { insertWithId } = require("./insert-with-id");
const { hashPassword } = require("./passwords");

class ClientError extends Error {
  constructor(message, status = 400, fields = undefined) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

const toIsoDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
};

const toClient = (row) => ({
  id: Number(row.id),
  businessName: row.business_name,
  businessTypeId: Number(row.business_type_id),
  businessType: row.business_type_display || row.business_type || null,
  contactPerson: row.contact_person,
  email: row.email,
  mobile: row.mobile,
  alternateMobile: row.alternate_mobile,
  stateId: Number(row.state_id),
  state: row.state_name ?? null,
  city: row.city,
  pincode: row.pincode ? Number(row.pincode) : null,
  address: row.address,
  websiteUrl: row.website_url,
  gstNumber: row.gst_number,
  panNumber: row.pan_number,
  fssaiNumber: row.fssai_number,
  tradeLicenseNumber: row.trade_license_number,
  amount: Number(row.amount ?? 0),
  finalAmount: Number(row.final_amount ?? 0),
  subscriptionDuration: Number(row.subscription_duration ?? 0),
  subscriptionAmount: Number(row.subscription_amount ?? 0),
  subscriptionFinalAmount: Number(row.subscription_final_amount ?? 0),
  paidAmount: Number(row.paid_amount ?? 0),
  startDate: toIsoDate(row.start_date),
  endDate: toIsoDate(row.end_date),
  status: Number(row.status) === 1 ? "ACTIVE" : "INACTIVE",
  userCount: row.user_count === undefined ? undefined : Number(row.user_count),
  createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
});

const CLIENT_COLUMNS = `
  u.id, u.business_name, u.business_type_id, u.contact_person, u.email, u.mobile,
  u.alternate_mobile, u.state_id, u.city, u.pincode, u.address, u.website_url,
  u.gst_number, u.pan_number, u.fssai_number, u.trade_license_number,
  u.amount, u.final_amount, u.subscription_duration, u.subscription_amount,
  u.subscription_final_amount, u.paid_amount, u.start_date, u.end_date,
  u.status, u.created_at,
  bt.business_type, bt.display_name AS business_type_display,
  s.state_name
`;

const listClients = async ({ search = "", status = "", businessTypeId = "", page = 1, pageSize = 25 } = {}) => {
  const where = ["u.trash = 0"];
  const values = [];

  const term = String(search).trim();
  if (term) {
    where.push("(u.business_name LIKE ? OR u.mobile LIKE ? OR u.contact_person LIKE ? OR u.email LIKE ?)");
    const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    values.push(like, like, like, like);
  }
  if (status === "ACTIVE" || status === "INACTIVE") {
    where.push("u.status = ?");
    values.push(status === "ACTIVE" ? 1 : 0);
  }
  if (/^[1-9]\d*$/.test(String(businessTypeId))) {
    where.push("u.business_type_id = ?");
    values.push(Number(businessTypeId));
  }

  const size = Math.min(100, Math.max(1, Number(pageSize) || 25));
  const offset = (Math.max(1, Number(page) || 1) - 1) * size;
  const whereSql = where.join(" AND ");

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM users u WHERE ${whereSql}`, values);
  const [rows] = await pool.query(
    `
    SELECT ${CLIENT_COLUMNS},
      (SELECT COUNT(*) FROM client_users cu WHERE cu.client_id = u.id AND cu.trash = 0) AS user_count
    FROM users u
    LEFT JOIN business_types bt ON bt.id = u.business_type_id
    LEFT JOIN states s ON s.id = u.state_id
    WHERE ${whereSql}
    ORDER BY u.id DESC
    LIMIT ? OFFSET ?
    `,
    [...values, size, offset]
  );

  // Totals across all clients, for the overview tiles (independent of filters).
  const [[summary]] = await pool.query(
    `
    SELECT
      COUNT(*) AS total,
      SUM(u.status = 1) AS active,
      SUM(u.status = 1 AND u.end_date IS NOT NULL AND u.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)) AS expiring,
      SUM(u.end_date IS NOT NULL AND u.end_date < CURDATE()) AS expired
    FROM users u
    WHERE u.trash = 0
    `
  );

  return {
    clients: rows.map(toClient),
    total: Number(total),
    page: Math.max(1, Number(page) || 1),
    pageSize: size,
    summary: {
      total: Number(summary.total ?? 0),
      active: Number(summary.active ?? 0),
      expiring: Number(summary.expiring ?? 0),
      expired: Number(summary.expired ?? 0),
    },
  };
};

const getClient = async (id) => {
  const [rows] = await pool.query(
    `
    SELECT ${CLIENT_COLUMNS}
    FROM users u
    LEFT JOIN business_types bt ON bt.id = u.business_type_id
    LEFT JOIN states s ON s.id = u.state_id
    WHERE u.id = ? AND u.trash = 0
    LIMIT 1
    `,
    [id]
  );
  if (!rows.length) throw new ClientError("Client not found", 404);

  const [users] = await pool.query(
    `
    SELECT cu.id, cu.name, cu.email, cu.mobile, cu.is_admin, cu.status, cr.role_title
    FROM client_users cu
    LEFT JOIN client_roles cr ON cr.id = cu.role_id AND cr.client_id = cu.client_id
    WHERE cu.client_id = ? AND cu.trash = 0
    ORDER BY cu.is_admin DESC, cu.id ASC
    `,
    [id]
  );

  const [features] = await pool.query(
    `
    SELECT f.id AS feature_id, f.feature, COALESCE(sf.id, 0) AS sub_feature_id, sf.sub_feature
    FROM client_features cf
    INNER JOIN features f ON f.id = cf.feature_id AND f.trash = 0
    LEFT JOIN sub_features sf ON sf.id = cf.sub_feature_id AND sf.trash = 0
    WHERE cf.client_id = ? AND cf.status = 1
    ORDER BY f.priority, f.id, sf.priority, sf.id
    `,
    [id]
  );

  return {
    ...toClient(rows[0]),
    users: users.map((u) => ({
      id: Number(u.id),
      name: u.name,
      email: u.email,
      mobile: u.mobile,
      roleTitle: u.role_title,
      role: appRoleForClientUser({ isAdmin: u.is_admin, roleTitle: u.role_title }),
      active: Number(u.status) === 1,
    })),
    features: features.map((f) => (f.sub_feature ? `${f.feature} · ${f.sub_feature}` : f.feature)),
  };
};

/** zenx-pos keeps one platform GST rate in `gsts`; onboarding applies it to both amounts. */
const currentGst = async (queryRunner = pool) => {
  const [rows] = await queryRunner.query("SELECT gst FROM gsts ORDER BY id DESC LIMIT 1");
  return rows.length ? Number(rows[0].gst) || 0 : 0;
};

const lookups = async () => {
  const [businessTypes] = await pool.query(
    "SELECT id, business_type, display_name FROM business_types WHERE status = 1 AND trash = 0 ORDER BY business_type"
  );
  const [states] = await pool.query("SELECT id, state_name FROM states WHERE status = 1 AND trash = 0 ORDER BY state_name");
  const [features] = await pool.query("SELECT id, feature FROM features WHERE status = 1 AND trash = 0 ORDER BY priority, id");
  const [subFeatures] = await pool.query(
    "SELECT id, feature_id, sub_feature FROM sub_features WHERE status = 1 AND trash = 0 ORDER BY priority, id"
  );

  return {
    gst: await currentGst(),
    businessTypes: businessTypes.map((b) => ({ id: Number(b.id), name: b.display_name || b.business_type })),
    states: states.map((s) => ({ id: Number(s.id), name: s.state_name })),
    features: features.map((f) => ({
      id: Number(f.id),
      name: f.feature,
      subFeatures: subFeatures
        .filter((s) => Number(s.feature_id) === Number(f.id))
        .map((s) => ({ id: Number(s.id), name: s.sub_feature })),
    })),
  };
};

/**
 * Same records zenx-pos writes when a super admin adds a client: the `users` row,
 * an "Admin" role, the admin `client_users` login, one `client_features` row per
 * active feature/sub-feature (enabled = selected) and full access for the Admin
 * role on every enabled one, plus an audit entry. All in one transaction.
 */
const createClient = async (input, adminId) => {
  const gst = await currentGst();
  const { value, errors, password, featureIds, subFeatureIds } = validateNewClient({ ...input, gst, subscriptionGst: gst });
  if (Object.keys(errors).length) throw new ClientError("Please fix the highlighted fields", 422, errors);

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [[type]] = await connection.query("SELECT id FROM business_types WHERE id = ? AND trash = 0", [value.business_type_id]);
    if (!type) throw new ClientError("Please fix the highlighted fields", 422, { businessTypeId: "Choose a business type" });
    const [[state]] = await connection.query("SELECT id FROM states WHERE id = ? AND trash = 0", [value.state_id]);
    if (!state) throw new ClientError("Please fix the highlighted fields", 422, { stateId: "Choose a state" });

    const [[emailTaken]] = await connection.query("SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1", [value.email]);
    if (emailTaken) throw new ClientError("Please fix the highlighted fields", 422, { email: "A client already uses this email" });
    const [[mobileTaken]] = await connection.query("SELECT id FROM users WHERE mobile = ? AND trash != 1 LIMIT 1", [value.mobile]);
    if (mobileTaken) throw new ClientError("Please fix the highlighted fields", 422, { mobile: "Client already exists with this mobile" });
    const [[loginTaken]] = await connection.query(
      "SELECT id FROM client_users WHERE (LOWER(email) = ? OR mobile = ?) AND trash = 0 LIMIT 1",
      [value.email, value.mobile]
    );
    if (loginTaken) throw new ClientError("Please fix the highlighted fields", 422, { email: "A user with this email or mobile already exists" });

    const now = new Date();
    const clientId = await insertWithId(connection, "users", { ...value, password: null, trash: 0, created_by: adminId, updated_by: 0, created_at: now, updated_at: now });

    const roleId = await insertWithId(connection, "client_roles", { client_id: clientId, role_title: "Admin", status: 1, trash: 0, created_by: 0, created_at: now, updated_at: now });

    const hash = await hashPassword(password);
    const clientUserId = await insertWithId(connection, "client_users", {
        client_id: clientId,
        name: value.contact_person,
        email: value.email,
        mobile: value.mobile,
        password: hash,
        role_id: roleId,
        max_discount_percentage: 0,
        is_admin: 1,
        status: 1,
        trash: 0,
        created_by: 0,
        created_at: now,
        updated_at: now,
      });
    await connection.query("UPDATE client_roles SET created_by = ? WHERE id = ?", [clientUserId, roleId]);
    await connection.query("UPDATE client_users SET created_by = ? WHERE id = ?", [clientUserId, clientUserId]);

    const [features] = await connection.query("SELECT id FROM features WHERE status = 1 AND trash = 0");
    const [subFeatures] = await connection.query("SELECT id, feature_id FROM sub_features WHERE status = 1 AND trash = 0");
    const pickedFeatures = new Set(featureIds);
    const pickedSubs = new Set(subFeatureIds);

    for (const feature of features) {
      const subs = subFeatures.filter((s) => Number(s.feature_id) === Number(feature.id));
      const rows = subs.length
        ? subs.map((s) => ({ subFeatureId: Number(s.id), enabled: pickedSubs.has(Number(s.id)) }))
        : [{ subFeatureId: 0, enabled: pickedFeatures.has(Number(feature.id)) }];

      for (const row of rows) {
        await insertWithId(connection, "client_features", {
            client_id: clientId,
            feature_id: feature.id,
            sub_feature_id: row.subFeatureId,
            status: row.enabled ? 1 : 0,
            created_by: adminId,
            created_at: now,
            updated_at: now,
          });
        if (row.enabled) {
          await insertWithId(connection, "client_role_features", {
              client_id: clientId,
              role_id: roleId,
              feature_id: feature.id,
              sub_feature_id: row.subFeatureId,
              is_add: 1,
              is_edit: 1,
              is_view: 1,
              status: 1,
              trash: 0,
              created_by: clientUserId,
              created_at: now,
              updated_at: now,
            });
        }
      }
    }

    await insertWithId(connection, "audits", { type: "add", description: "Admin role access levels added", client_id: clientId, user_id: clientUserId, created_at: now });

    await connection.commit();
    return getClient(clientId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

const setClientStatus = async (id, status, adminId) => {
  if (status !== "ACTIVE" && status !== "INACTIVE") throw new ClientError("Status must be ACTIVE or INACTIVE");
  const [result] = await pool.query(
    "UPDATE users SET status = ?, updated_by = ?, updated_at = ? WHERE id = ? AND trash = 0",
    [status === "ACTIVE" ? 1 : 0, adminId, new Date(), id]
  );
  if (!result.affectedRows) throw new ClientError("Client not found", 404);
  return getClient(id);
};

module.exports = {
  ClientError,
  listClients,
  getClient,
  lookups,
  createClient,
  setClientStatus,
};
