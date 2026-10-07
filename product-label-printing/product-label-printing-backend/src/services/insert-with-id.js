// The zenx-pos tables in TiDB have no AUTO_INCREMENT on `id`, so every insert must
// supply one. Same approach as product.service.js nextId(): read the highest id with
// FOR UPDATE inside the caller's transaction, then insert id + 1.

const TABLES = new Set([
  "admins",
  "users",
  "client_roles",
  "client_users",
  "client_features",
  "client_role_features",
  "categories",
  "taxes",
  "audits",
  "client_role_billing_access",
  "sub_categories",
  "brands",
  "unit_types",
  "sizes",
  "colours",
  "products",
  "product_variants",
  "product_controls",
]);

const insertWithId = async (connection, table, row) => {
  if (!TABLES.has(table)) throw new Error(`insertWithId: unsupported table ${table}`);
  // ORDER BY must name the numeric column (table-qualified): an unqualified `id`
  // would sort the CHAR alias as text, so 9 would beat 12.
  const [rows] = await connection.query(
    `SELECT CAST(${table}.id AS CHAR) AS last_id FROM ${table} ORDER BY ${table}.id DESC LIMIT 1 FOR UPDATE`
  );
  const id = rows.length ? Number(BigInt(rows[0].last_id) + 1n) : 1;
  await connection.query(`INSERT INTO ${table} SET ?`, [{ id, ...row }]);
  return id;
};

module.exports = { insertWithId };
