// Super admin managing one client's data: products, master data, roles, access levels and
// users. Every write follows the zenx-pos source in dev/app/Http/Controllers/Api (columns,
// defaults, duplicate checks, audit rows), so records created here behave exactly like
// records created in zenx-pos.
//
// Who is "the user" in created_by / audits.user_id? zenx-pos always records a client user.
// A super admin is not one, so — as zenx-pos itself does when a super admin onboards a
// client (admin/Clients.php) — we record the client's admin login and say "by super admin"
// in the audit description.

const { pool } = require("../config/db");
const { insertWithId } = require("./insert-with-id");
const { hashPassword } = require("./passwords");
const productService = require("./product.service");
const { appRoleForClientUser } = require("./roles");
const { MASTERS, RuleError, validateAccess, validateMaster, validateProduct, validateRole, validateUser } = require("./workspace.rules");

class WorkspaceError extends Error {
  constructor(message, status = 400, field = undefined) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

const BY_ADMIN = " by super admin";

/** Turns validation failures into HTTP 422s with the offending field. */
const run = (fn) => {
  try {
    return fn();
  } catch (error) {
    if (error instanceof RuleError) throw new WorkspaceError(error.message, 422, error.field);
    throw error;
  }
};

const withTransaction = async (work) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    connection.release();
  }
};

/** The client must exist (not trashed). Returns the id of its admin login, the audit actor. */
const clientActor = async (clientId, queryRunner = pool) => {
  const [[client]] = await queryRunner.query("SELECT id FROM users WHERE id = ? AND trash = 0 LIMIT 1", [clientId]);
  if (!client) throw new WorkspaceError("Client not found", 404);
  const [[admin]] = await queryRunner.query(
    "SELECT id FROM client_users WHERE client_id = ? AND is_admin = 1 AND trash = 0 ORDER BY id LIMIT 1",
    [clientId]
  );
  return admin ? Number(admin.id) : 0;
};

const audit = (connection, { clientId, actor, type, description }) =>
  insertWithId(connection, "audits", { type, description, client_id: clientId, user_id: actor, created_at: new Date() });

/* ─── Master data ─────────────────────────────────────────────────────────── */

const listMasters = async (clientId) => {
  await clientActor(clientId);
  const pick = async (table, cols) => {
    const [rows] = await pool.query(`SELECT ${cols} FROM ${table} WHERE client_id = ? AND trash = 0 ORDER BY id`, [clientId]);
    return rows.map((r) => ({ ...r, id: Number(r.id), status: Number(r.status) }));
  };
  const [categories, subCategories, brands, unitTypes, taxes, sizes, colours] = await Promise.all([
    pick("categories", "id, category_code AS code, category_name AS name, status"),
    pick("sub_categories", "id, category_id AS categoryId, sub_category_code AS code, sub_category_name AS name, status"),
    pick("brands", "id, brand_code AS code, brand_name AS name, status"),
    pick("unit_types", "id, unit_type_code AS code, unit_type_name AS name, status"),
    pick("taxes", "id, tax_code AS code, tax_name AS name, tax_percent AS taxPercent, status"),
    pick("sizes", "id, size_code AS code, size_name AS name, status"),
    pick("colours", "id, colour_code AS code, colour_name AS name, status"),
  ]);
  return {
    categories,
    subCategories: subCategories.map((s) => ({ ...s, categoryId: Number(s.categoryId) })),
    brands,
    unitTypes,
    taxes: taxes.map((t) => ({ ...t, taxPercent: Number(t.taxPercent) })),
    sizes,
    colours,
  };
};

/** Master::addCategory / addSubCategory / addBrand / addUnitType / addTax / addSize / addColour. */
const createMaster = async (clientId, type, body) => {
  const { meta, row } = run(() => validateMaster(type, body));
  return withTransaction(async (connection) => {
    const actor = await clientActor(clientId, connection);
    if (type === "subCategory") {
      // zenx-pos checks `exists:categories,id`; we also require it to be this client's.
      const [[cat]] = await connection.query("SELECT id FROM categories WHERE id = ? AND client_id = ? AND trash = 0", [row.category_id, clientId]);
      if (!cat) throw new WorkspaceError("The selected category id is invalid.", 422, "categoryId");
    }
    const scope = type === "subCategory" ? " AND category_id = ?" : "";
    const scopeValues = type === "subCategory" ? [row.category_id] : [];
    const extra = type === "tax" ? " OR tax_percent = ?" : "";
    const [[dup]] = await connection.query(
      `SELECT ${meta.code} AS code, ${meta.name} AS name${type === "tax" ? ", tax_percent AS pct" : ""}
       FROM ${meta.table} WHERE client_id = ?${scope} AND trash = 0 AND (${meta.code} = ? OR ${meta.name} = ?${extra}) LIMIT 1`,
      [clientId, ...scopeValues, row[meta.code], row[meta.name], ...(type === "tax" ? [row.tax_percent] : [])]
    );
    if (dup) {
      if (dup.code === row[meta.code]) throw new WorkspaceError(`${meta.label} code already exists.`, 400, meta.codeKey);
      if (dup.name === row[meta.name]) throw new WorkspaceError(`${meta.label} name already exists.`, 400, meta.nameKey);
      if (type === "tax") throw new WorkspaceError("Tax Percent already exists.", 400, "taxPercent");
      throw new WorkspaceError(`${meta.label} already exists.`, 400);
    }
    const id = await insertWithId(connection, meta.table, { ...row, trash: 0, client_id: clientId, created_by: actor, updated_by: 0, created_at: new Date() });
    const label = type === "subCategory" ? "sub category" : type === "unitType" ? "unit type" : meta.label.toLowerCase();
    await audit(connection, { clientId, actor, type: "add", description: `${row[meta.name]} ${label} added${BY_ADMIN}` });
    return { id, type, ...row };
  });
};

/* ─── Products ────────────────────────────────────────────────────────────── */

const listProducts = async (clientId, { q, page = 1, pageSize = 25 } = {}) => {
  await clientActor(clientId);
  return productService.listProducts({
    clientId,
    q: typeof q === "string" && q.trim() ? q.trim() : undefined,
    page: Math.max(1, Number(page) || 1),
    pageSize: Math.min(100, Math.max(1, Number(pageSize) || 25)),
    sort: "createdAt",
    order: "DESC",
  });
};

const getProduct = async (clientId, productId) => {
  await clientActor(clientId);
  const product = await productService.getProductById(productId, clientId);
  if (!product) throw new WorkspaceError("Product not found", 404);
  return product;
};

/** Every master id must be one of this client's active records (zenx-pos trusts the app here). */
const assertOwned = async (connection, clientId, table, id, field, extra = "", extraValues = []) => {
  if (id === null || id === undefined) return;
  const [[row]] = await connection.query(`SELECT id FROM ${table} WHERE id = ? AND client_id = ? AND status = 1 AND trash = 0${extra} LIMIT 1`, [id, clientId, ...extraValues]);
  if (!row) throw new WorkspaceError(`The selected ${field} is invalid.`, 422, field);
};

/** Products::addProduct — product + all variants + controls + audit, in one transaction. */
const createProduct = async (clientId, body) => {
  const { product, variants, controls } = run(() => validateProduct(body));
  return withTransaction(async (connection) => {
    const actor = await clientActor(clientId, connection);
    await assertOwned(connection, clientId, "categories", product.category_id, "categoryId");
    await assertOwned(connection, clientId, "sub_categories", product.sub_category_id, "subCategoryId", " AND category_id = ?", [product.category_id]);
    await assertOwned(connection, clientId, "brands", product.brand_id, "brandId");
    await assertOwned(connection, clientId, "unit_types", product.unit_type_id, "unitTypeId");
    await assertOwned(connection, clientId, "taxes", product.tax_id, "taxId");
    for (const v of variants) {
      await assertOwned(connection, clientId, "sizes", v.size_id, "sizeId");
      await assertOwned(connection, clientId, "colours", v.colour_id, "colourId");
    }

    const [[dup]] = await connection.query(
      "SELECT product_code, product_full_name FROM products WHERE client_id = ? AND trash = 0 AND (product_code = ? OR product_full_name = ?) LIMIT 1",
      [clientId, product.product_code, product.product_full_name]
    );
    if (dup) {
      if (dup.product_code === product.product_code) throw new WorkspaceError("Product code already exists.", 400, "productCode");
      if (String(dup.product_full_name).toLowerCase() === product.product_full_name.toLowerCase()) throw new WorkspaceError("Product full name already exists.", 400, "productFullName");
    }

    const now = new Date();
    const stamp = { trash: 0, created_by: actor, updated_by: 0, created_at: now };
    const productId = await insertWithId(connection, "products", { client_id: clientId, ...product, ...stamp });
    for (const v of variants) {
      await insertWithId(connection, "product_variants", { product_id: productId, client_id: clientId, ...v, ...stamp });
    }
    await insertWithId(connection, "product_controls", { client_id: clientId, product_id: productId, ...controls, created_by: actor, updated_by: 0, created_at: now });
    await audit(connection, { clientId, actor, type: "add", description: `${product.product_code} product added${BY_ADMIN}` });
    return productId;
  }).then((productId) => getProduct(clientId, productId));
};

/** Status only; zenx-pos changes it through updateProduct with the same audit type. */
const setProductStatus = async (clientId, productId, status) => {
  if (status !== 0 && status !== 1) throw new WorkspaceError("The selected status is invalid.", 422, "status");
  await withTransaction(async (connection) => {
    const actor = await clientActor(clientId, connection);
    const [result] = await connection.query(
      "UPDATE products SET status = ?, updated_by = ?, updated_at = ? WHERE id = ? AND client_id = ? AND trash = 0",
      [status, actor, new Date(), productId, clientId]
    );
    if (!result.affectedRows) throw new WorkspaceError("Product not found", 404);
    const [[p]] = await connection.query("SELECT product_code FROM products WHERE id = ?", [productId]);
    await audit(connection, { clientId, actor, type: "edit", description: `${p.product_code} product updated${BY_ADMIN}` });
  });
  return getProduct(clientId, productId);
};

/* ─── Roles & access levels ───────────────────────────────────────────────── */

const listRoles = async (clientId) => {
  await clientActor(clientId);
  const [rows] = await pool.query(
    `SELECT r.id, r.role_title, r.status,
       (SELECT COUNT(*) FROM client_users u WHERE u.client_id = r.client_id AND u.role_id = r.id AND u.trash = 0) AS users
     FROM client_roles r WHERE r.client_id = ? AND r.trash = 0 ORDER BY r.id`,
    [clientId]
  );
  return rows.map((r) => ({ id: Number(r.id), roleTitle: r.role_title, status: Number(r.status), users: Number(r.users) }));
};

/** Master::addRole. A new role has no access until its access levels are saved. */
const createRole = async (clientId, body) => {
  const row = run(() => validateRole(body));
  return withTransaction(async (connection) => {
    const actor = await clientActor(clientId, connection);
    const [[dup]] = await connection.query("SELECT id FROM client_roles WHERE client_id = ? AND trash = 0 AND role_title = ? LIMIT 1", [clientId, row.role_title]);
    if (dup) throw new WorkspaceError("Role already exists.", 400, "roleTitle");
    const id = await insertWithId(connection, "client_roles", { ...row, trash: 0, client_id: clientId, created_by: actor, updated_by: 0, created_at: new Date() });
    await audit(connection, { clientId, actor, type: "add", description: `${row.role_title} role added${BY_ADMIN}` });
    return { id, roleTitle: row.role_title, status: row.status, users: 0 };
  });
};

const activeRole = async (queryRunner, clientId, roleId) => {
  const [[role]] = await queryRunner.query("SELECT id, role_title FROM client_roles WHERE id = ? AND client_id = ? AND status = 1 AND trash = 0", [roleId, clientId]);
  if (!role) throw new WorkspaceError("Invalid role.", 404);
  return role;
};

/**
 * Access_levels::getRoleAccessLevels. Lists the features this client is subscribed to.
 * Sub-features are limited to the ones enabled for the client: permissions on anything else
 * would never take effect (authorisation also requires the client feature).
 */
const getAccess = async (clientId, roleId) => {
  await clientActor(clientId);
  await activeRole(pool, clientId, roleId);
  const [enabled] = await pool.query("SELECT feature_id, sub_feature_id FROM client_features WHERE client_id = ? AND status = 1", [clientId]);
  const enabledFeatures = new Set(enabled.map((e) => Number(e.feature_id)));
  const enabledSubs = new Set(enabled.map((e) => `${Number(e.feature_id)}_${Number(e.sub_feature_id)}`));
  const [features] = await pool.query("SELECT id, feature FROM features WHERE status = 1 AND trash = 0 ORDER BY priority, id");
  const [subs] = await pool.query("SELECT id, feature_id, sub_feature FROM sub_features WHERE status = 1 AND trash = 0 ORDER BY priority, id");
  const [perms] = await pool.query("SELECT feature_id, sub_feature_id, status, is_add, is_edit, is_view FROM client_role_features WHERE client_id = ? AND role_id = ? AND trash = 0", [clientId, roleId]);
  const byKey = new Map(perms.map((p) => [`${Number(p.feature_id)}_${Number(p.sub_feature_id)}`, p]));
  const shape = (p) => ({ status: p ? Number(p.status) : 0, isAdd: p ? Number(p.is_add) : 0, isEdit: p ? Number(p.is_edit) : 0, isView: p ? Number(p.is_view) : 0 });

  const list = features
    .filter((f) => enabledFeatures.has(Number(f.id)))
    .map((f) => {
      const fid = Number(f.id);
      const subFeatures = subs
        .filter((s) => Number(s.feature_id) === fid && enabledSubs.has(`${fid}_${Number(s.id)}`))
        .map((s) => ({ subFeatureId: Number(s.id), subFeatureName: s.sub_feature, ...shape(byKey.get(`${fid}_${Number(s.id)}`)) }));
      const main = shape(byKey.get(`${fid}_0`));
      // As zenx-pos: the feature shows ON when any of its sub-features is on.
      if (subFeatures.some((s) => s.status === 1)) main.status = 1;
      return { featureId: fid, featureName: f.feature, ...main, subFeatures };
    });

  const [[billing]] = await pool.query("SELECT allow_discount, allow_price_override, allow_refund FROM client_role_billing_access WHERE client_id = ? AND role_id = ? LIMIT 1", [clientId, roleId]);
  return {
    billingAccess: {
      allowDiscount: billing ? Number(billing.allow_discount) : 0,
      allowPriceOverride: billing ? Number(billing.allow_price_override) : 0,
      allowRefund: billing ? Number(billing.allow_refund) : 0,
    },
    features: list,
  };
};

/** Access_levels::saveRoleAccessLevels — updateOrCreate per (feature, sub-feature), then billing access. */
const saveAccess = async (clientId, roleId, body) => {
  const { rows, billing } = run(() => validateAccess(body));
  await withTransaction(async (connection) => {
    const actor = await clientActor(clientId, connection);
    const role = await activeRole(connection, clientId, roleId);
    const now = new Date();
    for (const r of rows) {
      const [[existing]] = await connection.query(
        "SELECT id FROM client_role_features WHERE client_id = ? AND role_id = ? AND feature_id = ? AND sub_feature_id = ? LIMIT 1",
        [clientId, roleId, r.feature_id, r.sub_feature_id]
      );
      const values = { status: r.status, is_add: r.is_add, is_edit: r.is_edit, is_view: r.is_view, trash: 0, created_by: actor, updated_by: actor };
      if (existing) {
        await connection.query("UPDATE client_role_features SET ?, updated_at = ? WHERE id = ?", [values, now, existing.id]);
      } else {
        await insertWithId(connection, "client_role_features", { client_id: clientId, role_id: roleId, feature_id: r.feature_id, sub_feature_id: r.sub_feature_id, ...values, created_at: now, updated_at: now });
      }
    }
    await audit(connection, { clientId, actor, type: "add/update", description: `${role.role_title} roles access levels added or updated${BY_ADMIN}` });
    const [[existingBilling]] = await connection.query("SELECT id FROM client_role_billing_access WHERE client_id = ? AND role_id = ? LIMIT 1", [clientId, roleId]);
    const billingValues = { ...billing, created_by: actor, updated_by: actor };
    if (existingBilling) await connection.query("UPDATE client_role_billing_access SET ?, updated_at = ? WHERE id = ?", [billingValues, now, existingBilling.id]);
    else await insertWithId(connection, "client_role_billing_access", { client_id: clientId, role_id: roleId, ...billingValues, created_at: now, updated_at: now });
    await audit(connection, { clientId, actor, type: "add/update", description: `${roleId} roles billing access  added or updated${BY_ADMIN}` });
  });
  return getAccess(clientId, roleId);
};

/* ─── Users ───────────────────────────────────────────────────────────────── */

const listUsers = async (clientId) => {
  await clientActor(clientId);
  const [rows] = await pool.query(
    `SELECT u.id, u.name, u.email, u.mobile, u.role_id, u.max_discount_percentage, u.is_admin, u.status, r.role_title
     FROM client_users u LEFT JOIN client_roles r ON r.id = u.role_id AND r.client_id = u.client_id
     WHERE u.client_id = ? AND u.trash = 0 ORDER BY u.is_admin DESC, u.id`,
    [clientId]
  );
  return rows.map((u) => ({
    id: Number(u.id),
    name: u.name,
    email: u.email,
    mobile: u.mobile,
    roleId: Number(u.role_id),
    roleTitle: u.role_title,
    maxDiscountPercentage: Number(u.max_discount_percentage),
    isAdmin: Number(u.is_admin) === 1,
    status: Number(u.status),
    appRole: appRoleForClientUser({ isAdmin: u.is_admin, roleTitle: u.role_title }),
  }));
};

/**
 * Same duplicate rule as Master::addUser (mobile or email within the client), plus one
 * extra: no other client may use it either. zenx-pos and this app both sign users in by
 * email/mobile alone, so a login shared by two businesses could only ever reach one of them.
 */
const assertLoginFree = async (connection, clientId, row, exceptId = 0) => {
  const [[dup]] = await connection.query(
    "SELECT client_id, mobile, email FROM client_users WHERE trash = 0 AND id != ? AND (mobile = ? OR LOWER(email) = ?) ORDER BY client_id = ? DESC LIMIT 1",
    [exceptId, row.mobile, row.email, clientId]
  );
  if (!dup) return;
  const sameClient = Number(dup.client_id) === Number(clientId);
  if (dup.mobile === row.mobile) throw new WorkspaceError(sameClient ? "Mobile already exists." : "Mobile already exists for another business.", 400, "mobile");
  throw new WorkspaceError(sameClient ? "Email already exists." : "Email already exists for another business.", 400, "email");
};

/** Master::addUser. New users are never admins (is_admin = 0), as in zenx-pos. */
const createUser = async (clientId, body) => {
  const { row, password } = run(() => validateUser(body));
  const hash = await hashPassword(password);
  const id = await withTransaction(async (connection) => {
    const actor = await clientActor(clientId, connection);
    const [[role]] = await connection.query("SELECT id FROM client_roles WHERE id = ? AND client_id = ? AND trash = 0", [row.role_id, clientId]);
    if (!role) throw new WorkspaceError("Role not found.", 422, "roleId");
    await assertLoginFree(connection, clientId, row);
    const userId = await insertWithId(connection, "client_users", {
      ...row,
      password: hash,
      is_admin: 0,
      otp: 0,
      otp_status: 0,
      trash: 0,
      client_id: clientId,
      created_by: actor,
      updated_by: 0,
      created_at: new Date(),
    });
    await audit(connection, { clientId, actor, type: "add", description: `${row.name} user added${BY_ADMIN}` });
    return userId;
  });
  return (await listUsers(clientId)).find((u) => u.id === id);
};

/** Master::updateUser. Password changes only when a new one is given. */
const updateUser = async (clientId, userId, body) => {
  const { row, password } = run(() => validateUser(body, { update: true }));
  const hash = password ? await hashPassword(password) : null;
  await withTransaction(async (connection) => {
    const actor = await clientActor(clientId, connection);
    const [[existing]] = await connection.query("SELECT id FROM client_users WHERE id = ? AND client_id = ? AND trash = 0", [userId, clientId]);
    if (!existing) throw new WorkspaceError("User not found.", 422);
    const [[role]] = await connection.query("SELECT id FROM client_roles WHERE id = ? AND client_id = ? AND trash = 0", [row.role_id, clientId]);
    if (!role) throw new WorkspaceError("Role not found.", 422, "roleId");
    await assertLoginFree(connection, clientId, row, userId);
    await connection.query("UPDATE client_users SET ? WHERE id = ?", [{ ...row, ...(hash ? { password: hash } : {}), updated_by: actor, updated_at: new Date() }, userId]);
    await audit(connection, { clientId, actor, type: "edit", description: `${row.name} user updated${BY_ADMIN}` });
  });
  return (await listUsers(clientId)).find((u) => u.id === Number(userId));
};

module.exports = {
  WorkspaceError,
  MASTER_TYPES: Object.keys(MASTERS),
  listMasters,
  createMaster,
  listProducts,
  getProduct,
  createProduct,
  setProductStatus,
  listRoles,
  createRole,
  getAccess,
  saveAccess,
  listUsers,
  createUser,
  updateUser,
};
