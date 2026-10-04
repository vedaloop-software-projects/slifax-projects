const { pool } = require("../config/db");

const listCategories = async (clientId) => {
  const [rows] = await pool.query(
    `SELECT id, category_name AS name
    FROM categories
    WHERE client_id = ?
      AND status = 1
      AND trash = 0
    ORDER BY category_name, id`,
    [clientId]
  );

  return rows.map((row) => ({ ...row, id: Number(row.id) }));
};

const listSubCategories = async (clientId) => {
  const [rows] = await pool.query(
    `SELECT id, sub_category_name AS name, category_id AS categoryId
    FROM sub_categories
    WHERE client_id = ?
      AND status = 1
      AND trash = 0
    ORDER BY sub_category_name, id`,
    [clientId]
  );

  return rows.map((row) => ({
    ...row,
    id: Number(row.id),
    categoryId: Number(row.categoryId),
  }));
};

const listBrands = async (clientId) => {
  const [rows] = await pool.query(
    `SELECT id, brand_name AS name
    FROM brands
    WHERE client_id = ?
      AND status = 1
      AND trash = 0
    ORDER BY brand_name, id`,
    [clientId]
  );

  return rows.map((row) => ({ ...row, id: Number(row.id) }));
};

const listUnitTypes = async (clientId) => {
  const [rows] = await pool.query(
    `SELECT id, unit_type_name AS name
    FROM unit_types
    WHERE client_id = ?
      AND status = 1
      AND trash = 0
    ORDER BY unit_type_name, id`,
    [clientId]
  );

  return rows.map((row) => ({ ...row, id: Number(row.id) }));
};

const listTaxes = async (clientId) => {
  const [rows] = await pool.query(
    `SELECT id, tax_name AS name, tax_percent AS percent
    FROM taxes
    WHERE client_id = ?
      AND status = 1
      AND trash = 0
    ORDER BY tax_name, id`,
    [clientId]
  );

  return rows.map((row) => ({
    ...row,
    id: Number(row.id),
    percent: Number(row.percent),
  }));
};

module.exports = {
  listCategories,
  listSubCategories,
  listBrands,
  listUnitTypes,
  listTaxes,
};
