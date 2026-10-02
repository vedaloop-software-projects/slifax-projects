const { pool } = require("../config/db");

const SORT_COLUMNS = {
  name: "p.product_full_name",
  productCode: "p.product_code",
  eanCode: "p.ean_code",
  qoh: "p.qoh",
  status: "p.status",
  createdAt: "p.created_at",
  updatedAt: "p.updated_at",
};

const PRODUCT_SELECT = `
  SELECT
    p.id,
    p.product_code AS productCode,
    p.product_short_name AS productShortName,
    p.product_full_name AS productFullName,
    p.ean_code AS eanCode,
    p.category_id AS categoryId,
    c.category_name AS categoryName,
    p.sub_category_id AS subCategoryId,
    sc.sub_category_name AS subCategoryName,
    p.brand_id AS brandId,
    b.brand_name AS brandName,
    p.unit_type_id AS unitTypeId,
    u.unit_type_name AS unitTypeName,
    p.qoh,
    p.hsn_code AS hsnCode,
    p.tax_id AS taxId,
    t.tax_name AS taxName,
    t.tax_percent AS taxPercent,
    p.product_image AS productImage,
    p.status,
    p.created_at AS createdAt,
    p.updated_at AS updatedAt
  FROM products p
  LEFT JOIN categories c
    ON c.id = p.category_id
    AND c.client_id = p.client_id
    AND c.status = 1
    AND c.trash = 0
  LEFT JOIN sub_categories sc
    ON sc.id = p.sub_category_id
    AND sc.category_id = p.category_id
    AND sc.client_id = p.client_id
    AND sc.status = 1
    AND sc.trash = 0
  LEFT JOIN brands b
    ON b.id = p.brand_id
    AND b.client_id = p.client_id
    AND b.status = 1
    AND b.trash = 0
  LEFT JOIN unit_types u
    ON u.id = p.unit_type_id
    AND u.client_id = p.client_id
    AND u.status = 1
    AND u.trash = 0
  LEFT JOIN taxes t
    ON t.id = p.tax_id
    AND t.client_id = p.client_id
    AND t.status = 1
    AND t.trash = 0
`;

const VARIANT_SELECT = `
  SELECT
    id,
    product_id AS productId,
    pack_size AS packSize,
    size_id AS sizeId,
    colour_id AS colourId,
    mrp,
    sale_price AS salePrice,
    variant_qty AS variantQty,
    status
  FROM product_variants
`;

const PRODUCT_CREATE_FIELDS = new Set([
  "productCode",
  "productShortName",
  "productFullName",
  "eanCode",
  "categoryId",
  "subCategoryId",
  "brandId",
  "unitTypeId",
  "hsnCode",
  "taxId",
  "productImage",
  "qoh",
  "status",
  "variant",
  "controls",
]);

const PRODUCT_TABLES = new Set(["products", "product_variants", "product_controls"]);
const PRODUCT_STATUS_CODES = Object.freeze({
  ACTIVE: 1,
  INACTIVE: 0,
  ARCHIVED: 2,
});

class ProductInputError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
  }
}

class ProductConflictError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 409;
  }
}

class ProductNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 404;
  }
}

const requireRecord = (value, field) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ProductInputError(`${field} must be an object`);
  }

  return value;
};

const requireText = (value, field, maxLength, optional = false) => {
  if (optional && (value === undefined || value === null || value === "")) {
    return null;
  }

  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new ProductInputError(`${field} is required and must be at most ${maxLength} characters`);
  }

  return value.trim();
};

const optionalId = (value, field) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ProductInputError(`${field} must be a positive integer`);
  }

  return value;
};

const requiredId = (value, field) => {
  const parsed = optionalId(value, field);
  if (parsed === null) {
    throw new ProductInputError(`${field} is required`);
  }

  return parsed;
};

const numericValue = (value, field, defaultValue = 0, { min, max, integer = false } = {}) => {
  const parsed = value === undefined ? defaultValue : value;
  if (
    typeof parsed !== "number" ||
    !Number.isFinite(parsed) ||
    (integer && !Number.isSafeInteger(parsed)) ||
    (min !== undefined && parsed < min) ||
    (max !== undefined && parsed > max)
  ) {
    throw new ProductInputError(`${field} must be a valid number`);
  }

  return parsed;
};

const binaryFlag = (value, field) => numericValue(value, field, 0, { min: 0, max: 1, integer: true });

const validateCreateInput = (rawInput) => {
  const input = requireRecord(rawInput, "Request body");
  const unsupportedFields = Object.keys(input).filter((key) => !PRODUCT_CREATE_FIELDS.has(key));
  if (unsupportedFields.length) {
    throw new ProductInputError(`Unsupported product field: ${unsupportedFields.join(", ")}`);
  }

  const variantInput = requireRecord(input.variant, "variant");
  const controlsInput = input.controls === undefined
    ? {}
    : requireRecord(input.controls, "controls");
  const unsupportedVariantFields = Object.keys(variantInput).filter((key) => !new Set([
    "packSize", "sizeId", "colourId", "basicCost", "costPrice", "mrp", "salePrice",
    "wholeSalePrice", "dineInPrice", "takeAwayPrice", "salonDuration", "variantQty", "priority",
  ]).has(key));
  const unsupportedControlFields = Object.keys(controlsInput).filter((key) => !new Set([
    "allowWeighingScale", "allowDecimals", "allowDiscount", "allowPriceOverride", "kotRequired", "kit",
  ]).has(key));
  if (unsupportedVariantFields.length || unsupportedControlFields.length) {
    throw new ProductInputError("Unsupported variant or control field");
  }

  const product = {
    productCode: requireText(input.productCode, "productCode", 255),
    productShortName: requireText(input.productShortName, "productShortName", 255),
    productFullName: requireText(input.productFullName, "productFullName", 255),
    eanCode: requireText(input.eanCode, "eanCode", 255, true),
    categoryId: requiredId(input.categoryId, "categoryId"),
    subCategoryId: optionalId(input.subCategoryId, "subCategoryId"),
    brandId: optionalId(input.brandId, "brandId"),
    unitTypeId: optionalId(input.unitTypeId, "unitTypeId"),
    hsnCode: requireText(input.hsnCode, "hsnCode", 8),
    taxId: requiredId(input.taxId, "taxId"),
    productImage: requireText(input.productImage, "productImage", 255, true),
    qoh: numericValue(input.qoh, "qoh"),
    status: numericValue(input.status, "status", 1, { min: 0, max: 255, integer: true }),
  };

  const variant = {
    packSize: requireText(variantInput.packSize, "variant.packSize", 255),
    sizeId: optionalId(variantInput.sizeId, "variant.sizeId"),
    colourId: optionalId(variantInput.colourId, "variant.colourId"),
    basicCost: numericValue(variantInput.basicCost, "variant.basicCost"),
    costPrice: numericValue(variantInput.costPrice, "variant.costPrice"),
    mrp: numericValue(variantInput.mrp, "variant.mrp", 0, { min: 0 }),
    salePrice: numericValue(variantInput.salePrice, "variant.salePrice", 0, { min: 0 }),
    wholeSalePrice: numericValue(variantInput.wholeSalePrice, "variant.wholeSalePrice"),
    dineInPrice: numericValue(variantInput.dineInPrice, "variant.dineInPrice"),
    takeAwayPrice: numericValue(variantInput.takeAwayPrice, "variant.takeAwayPrice"),
    salonDuration: variantInput.salonDuration === undefined || variantInput.salonDuration === null
      ? null
      : numericValue(variantInput.salonDuration, "variant.salonDuration", 0, { min: 0, max: 2147483647, integer: true }),
    variantQty: numericValue(variantInput.variantQty, "variant.variantQty"),
    priority: numericValue(variantInput.priority, "variant.priority", 1, { min: 0, max: 2147483647, integer: true }),
  };

  if (variant.salePrice > variant.mrp) {
    throw new ProductInputError("variant.salePrice must not exceed variant.mrp");
  }

  const controls = {
    allowWeighingScale: binaryFlag(controlsInput.allowWeighingScale, "controls.allowWeighingScale"),
    allowDecimals: binaryFlag(controlsInput.allowDecimals, "controls.allowDecimals"),
    allowDiscount: binaryFlag(controlsInput.allowDiscount, "controls.allowDiscount"),
    allowPriceOverride: binaryFlag(controlsInput.allowPriceOverride, "controls.allowPriceOverride"),
    kotRequired: binaryFlag(controlsInput.kotRequired, "controls.kotRequired"),
    kit: binaryFlag(controlsInput.kit, "controls.kit"),
  };

  return { product, variant, controls };
};

const validateUpdateInput = (rawInput) => {
  const input = requireRecord(rawInput, "Request body");
  const updateFields = new Set([...PRODUCT_CREATE_FIELDS].filter((field) => !["status", "qoh"].includes(field)));
  const unsupportedFields = Object.keys(input).filter((key) => !updateFields.has(key));
  if (unsupportedFields.length) {
    throw new ProductInputError(`Unsupported product field: ${unsupportedFields.join(", ")}`);
  }
  if (input.controls === undefined) {
    throw new ProductInputError("controls is required");
  }

  return validateCreateInput({ ...input, status: 1 });
};

const assertMasterRecord = async (connection, { table, id, clientId, extraCondition = "", extraValues = [], label }) => {
  const [rows] = await connection.query(
    `SELECT id FROM ${table}
    WHERE id = ?
      AND client_id = ?
      AND status = 1
      AND trash = 0
      ${extraCondition}
    LIMIT 1`,
    [id, clientId, ...extraValues]
  );

  if (rows.length === 0) {
    throw new ProductInputError(`Invalid ${label}`);
  }
};

const validateMasterRecords = async (connection, product, variant, clientId) => {
  await assertMasterRecord(connection, {
    table: "categories",
    id: product.categoryId,
    clientId,
    label: "categoryId",
  });

  if (product.subCategoryId !== null) {
    await assertMasterRecord(connection, {
      table: "sub_categories",
      id: product.subCategoryId,
      clientId,
      extraCondition: "AND category_id = ?",
      extraValues: [product.categoryId],
      label: "subCategoryId/categoryId relationship",
    });
  }

  if (product.brandId !== null) {
    await assertMasterRecord(connection, {
      table: "brands",
      id: product.brandId,
      clientId,
      label: "brandId",
    });
  }

  if (product.unitTypeId !== null) {
    await assertMasterRecord(connection, {
      table: "unit_types",
      id: product.unitTypeId,
      clientId,
      label: "unitTypeId",
    });
  }

  await assertMasterRecord(connection, {
    table: "taxes",
    id: product.taxId,
    clientId,
    label: "taxId",
  });

  if (variant.sizeId !== null) {
    await assertMasterRecord(connection, {
      table: "sizes",
      id: variant.sizeId,
      clientId,
      label: "variant.sizeId",
    });
  }

  if (variant.colourId !== null) {
    await assertMasterRecord(connection, {
      table: "colours",
      id: variant.colourId,
      clientId,
      label: "variant.colourId",
    });
  }
};

const nextId = async (connection, table) => {
  if (!PRODUCT_TABLES.has(table)) {
    throw new Error("Unsupported ID table");
  }

  const [rows] = await connection.query(
    `SELECT CAST(${table}.id AS CHAR) AS id FROM ${table} ORDER BY ${table}.id DESC LIMIT 1 FOR UPDATE`
  );
  return rows.length ? (BigInt(rows[0].id) + 1n).toString() : "1";
};

const createProduct = async ({ input, clientId, userId }) => {
  const { product, variant, controls } = validateCreateInput(input);
  if (!Number.isSafeInteger(Number(clientId)) || Number(clientId) <= 0 || !Number.isSafeInteger(Number(userId)) || Number(userId) <= 0) {
    throw new ProductInputError("Invalid authenticated user context");
  }

  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [clientRows] = await connection.query(
      "SELECT id FROM users WHERE id = ? FOR UPDATE",
      [clientId]
    );
    if (clientRows.length === 0) {
      throw new ProductInputError("Authenticated client was not found");
    }

    await validateMasterRecords(connection, product, variant, clientId);

    const [duplicates] = await connection.query(
      `SELECT id FROM products
      WHERE client_id = ?
        AND product_code = ?
      LIMIT 1`,
      [clientId, product.productCode]
    );
    if (duplicates.length) {
      throw new ProductConflictError("productCode already exists for this client");
    }

    const productId = await nextId(connection, "products");
    const variantId = await nextId(connection, "product_variants");
    const controlsId = await nextId(connection, "product_controls");

    await connection.query(
      `INSERT INTO products (
        id, client_id, product_code, product_short_name, product_full_name,
        ean_code, category_id, sub_category_id, brand_id, unit_type_id,
        qoh, hsn_code, tax_id, product_image, status, trash,
        created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        productId,
        clientId,
        product.productCode,
        product.productShortName,
        product.productFullName,
        product.eanCode,
        product.categoryId,
        product.subCategoryId,
        product.brandId,
        product.unitTypeId,
        product.qoh,
        product.hsnCode,
        product.taxId,
        product.productImage,
        product.status,
        userId,
        userId,
      ]
    );

    await connection.query(
      `INSERT INTO product_variants (
        id, product_id, client_id, pack_size, size_id, colour_id,
        basic_cost, cost_price, mrp, sale_price, whole_sale_price,
        dine_in_price, take_away_price, salon_duration, variant_qty,
        priority, status, trash, created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        variantId,
        productId,
        clientId,
        variant.packSize,
        variant.sizeId,
        variant.colourId,
        variant.basicCost,
        variant.costPrice,
        variant.mrp,
        variant.salePrice,
        variant.wholeSalePrice,
        variant.dineInPrice,
        variant.takeAwayPrice,
        variant.salonDuration,
        variant.variantQty,
        variant.priority,
        userId,
        userId,
      ]
    );

    await connection.query(
      `INSERT INTO product_controls (
        id, client_id, product_id, allow_weighing_scale, allow_decimals,
        allow_discount, allow_price_override, kot_required, kit,
        created_by, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        controlsId,
        clientId,
        productId,
        controls.allowWeighingScale,
        controls.allowDecimals,
        controls.allowDiscount,
        controls.allowPriceOverride,
        controls.kotRequired,
        controls.kit,
        userId,
        userId,
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return {
      product: {
        id: productId,
        clientId,
        ...product,
        trash: 0,
        createdBy: userId,
        updatedBy: userId,
      },
      variant: {
        id: variantId,
        productId,
        ...variant,
        status: 1,
        trash: 0,
        createdBy: userId,
        updatedBy: userId,
      },
      controls: {
        id: controlsId,
        productId,
        ...controls,
        createdBy: userId,
        updatedBy: userId,
      },
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch {
        console.error("Product transaction rollback failed");
      }
    }

    throw error;
  } finally {
    connection.release();
  }
};

const updateProduct = async ({ productId, input, clientId, userId }) => {
  const { product, variant, controls } = validateUpdateInput(input);
  if (
    !Number.isSafeInteger(Number(productId)) || Number(productId) <= 0 ||
    !Number.isSafeInteger(Number(clientId)) || Number(clientId) <= 0 ||
    !Number.isSafeInteger(Number(userId)) || Number(userId) <= 0
  ) {
    throw new ProductInputError("Invalid authenticated product context");
  }

  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [products] = await connection.query(
      `SELECT id FROM products
      WHERE id = ?
        AND client_id = ?
        AND trash = 0
      FOR UPDATE`,
      [productId, clientId]
    );
    if (products.length === 0) {
      throw new ProductNotFoundError("Product not found");
    }

    await validateMasterRecords(connection, product, variant, clientId);

    const [duplicates] = await connection.query(
      `SELECT id FROM products
      WHERE client_id = ?
        AND product_code = ?
        AND id <> ?
      LIMIT 1
      FOR UPDATE`,
      [clientId, product.productCode, productId]
    );
    if (duplicates.length) {
      throw new ProductConflictError("productCode already exists for this client");
    }

    const [variants] = await connection.query(
      `SELECT id, status, trash FROM product_variants
      WHERE client_id = ?
        AND product_id = ?
      ORDER BY id
      FOR UPDATE`,
      [clientId, productId]
    );
    if (variants.length !== 1) {
      throw new ProductConflictError("Product update requires exactly one variant; this product has multiple or no variants");
    }

    const [controlRows] = await connection.query(
      `SELECT id FROM product_controls
      WHERE client_id = ?
        AND product_id = ?
      ORDER BY id
      FOR UPDATE`,
      [clientId, productId]
    );
    if (controlRows.length !== 1) {
      throw new ProductConflictError("Product update requires exactly one controls row");
    }

    await connection.query(
      `UPDATE products SET
        product_code = ?,
        product_short_name = ?,
        product_full_name = ?,
        ean_code = ?,
        category_id = ?,
        sub_category_id = ?,
        brand_id = ?,
        unit_type_id = ?,
        hsn_code = ?,
        tax_id = ?,
        product_image = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND client_id = ?
        AND trash = 0`,
      [
        product.productCode,
        product.productShortName,
        product.productFullName,
        product.eanCode,
        product.categoryId,
        product.subCategoryId,
        product.brandId,
        product.unitTypeId,
        product.hsnCode,
        product.taxId,
        product.productImage,
        userId,
        productId,
        clientId,
      ]
    );

    const variantId = variants[0].id;
    await connection.query(
      `UPDATE product_variants SET
        pack_size = ?,
        size_id = ?,
        colour_id = ?,
        basic_cost = ?,
        cost_price = ?,
        mrp = ?,
        sale_price = ?,
        whole_sale_price = ?,
        dine_in_price = ?,
        take_away_price = ?,
        salon_duration = ?,
        variant_qty = ?,
        priority = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND product_id = ?
        AND client_id = ?`,
      [
        variant.packSize,
        variant.sizeId,
        variant.colourId,
        variant.basicCost,
        variant.costPrice,
        variant.mrp,
        variant.salePrice,
        variant.wholeSalePrice,
        variant.dineInPrice,
        variant.takeAwayPrice,
        variant.salonDuration,
        variant.variantQty,
        variant.priority,
        userId,
        variantId,
        productId,
        clientId,
      ]
    );

    const controlsId = controlRows[0].id;
    await connection.query(
      `UPDATE product_controls SET
        allow_weighing_scale = ?,
        allow_decimals = ?,
        allow_discount = ?,
        allow_price_override = ?,
        kot_required = ?,
        kit = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND product_id = ?
        AND client_id = ?`,
      [
        controls.allowWeighingScale,
        controls.allowDecimals,
        controls.allowDiscount,
        controls.allowPriceOverride,
        controls.kotRequired,
        controls.kit,
        userId,
        controlsId,
        productId,
        clientId,
      ]
    );

    const [updatedProducts] = await connection.query(
      `${PRODUCT_SELECT}
      WHERE p.id = ?
        AND p.client_id = ?
        AND p.trash = 0
      LIMIT 1`,
      [productId, clientId]
    );
    const [updatedProduct] = await attachVariants(updatedProducts, clientId, connection);

    await connection.commit();
    transactionStarted = false;

    return {
      product: updatedProduct,
      variant: {
        id: variantId,
        productId,
        ...variant,
        status: variants[0].status,
        trash: variants[0].trash,
        updatedBy: userId,
      },
      controls: {
        id: controlsId,
        productId,
        ...controls,
        updatedBy: userId,
      },
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch {
        console.error("Product update transaction rollback failed");
      }
    }

    throw error;
  } finally {
    connection.release();
  }
};

const updateProductStatus = async ({ productId, status, clientId, userId }) => {
  if (
    !Number.isSafeInteger(Number(productId)) || Number(productId) <= 0 ||
    !Number.isSafeInteger(Number(clientId)) || Number(clientId) <= 0 ||
    !Number.isSafeInteger(Number(userId)) || Number(userId) <= 0 ||
    !Object.prototype.hasOwnProperty.call(PRODUCT_STATUS_CODES, status)
  ) {
    throw new ProductInputError("Invalid product status request");
  }

  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [products] = await connection.query(
      `SELECT id FROM products
      WHERE id = ?
        AND client_id = ?
        AND trash = 0
      FOR UPDATE`,
      [productId, clientId]
    );
    if (products.length === 0) {
      throw new ProductNotFoundError("Product not found");
    }

    await connection.query(
      `UPDATE products SET
        status = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
        AND client_id = ?
        AND trash = 0`,
      [PRODUCT_STATUS_CODES[status], userId, productId, clientId]
    );

    const [updatedProducts] = await connection.query(
      `${PRODUCT_SELECT}
      WHERE p.id = ?
        AND p.client_id = ?
        AND p.trash = 0
      LIMIT 1`,
      [productId, clientId]
    );

    await connection.commit();
    transactionStarted = false;

    return updatedProducts[0];
  } catch (error) {
    if (transactionStarted) {
      try {
        await connection.rollback();
      } catch {
        console.error("Product status transaction rollback failed");
      }
    }

    throw error;
  } finally {
    connection.release();
  }
};

const buildFilters = ({ clientId, q, category, status }) => {
  const conditions = ["p.client_id = ?", "p.trash = 0"];
  const values = [clientId];

  if (q) {
    const search = `%${q}%`;
    conditions.push("(p.product_code LIKE ? OR p.product_short_name LIKE ? OR p.product_full_name LIKE ? OR p.ean_code LIKE ?)");
    values.push(search, search, search, search);
  }

  if (category !== undefined) {
    conditions.push("p.category_id = ?", "c.id IS NOT NULL");
    values.push(category);
  }

  if (status !== undefined) {
    conditions.push("p.status = ?");
    values.push(status);
  }

  return { where: conditions.join(" AND "), values };
};

const attachVariants = async (products, clientId, queryRunner = pool) => {
  if (products.length === 0) {
    return products;
  }

  const productIds = products.map((product) => product.id);
  const placeholders = productIds.map(() => "?").join(", ");
  const [variants] = await queryRunner.query(
    `${VARIANT_SELECT}
    WHERE client_id = ?
      AND status = 1
      AND trash = 0
      AND product_id IN (${placeholders})
    ORDER BY product_id, priority, id`,
    [clientId, ...productIds]
  );

  const variantsByProduct = new Map();
  for (const variant of variants) {
    const productVariants = variantsByProduct.get(variant.productId) ?? [];
    productVariants.push(variant);
    variantsByProduct.set(variant.productId, productVariants);
  }

  return products.map((product) => ({
    ...product,
    variants: variantsByProduct.get(product.id) ?? [],
  }));
};

const listProducts = async ({ clientId, q, category, status, page, pageSize, sort, order }) => {
  const { where, values } = buildFilters({ clientId, q, category, status });
  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total ${PRODUCT_SELECT.slice(PRODUCT_SELECT.indexOf("FROM products"))} WHERE ${where}`,
    values
  );
  const total = Number(countRows[0].total);
  const offset = (page - 1) * pageSize;
  const sortColumn = SORT_COLUMNS[sort];

  const [rows] = await pool.query(
    `${PRODUCT_SELECT}
    WHERE ${where}
    ORDER BY ${sortColumn} ${order}, p.id ASC
    LIMIT ? OFFSET ?`,
    [...values, pageSize, offset]
  );
  const data = await attachVariants(rows, clientId);

  return {
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

const getProductById = async (id, clientId) => {
  const [rows] = await pool.query(
    `${PRODUCT_SELECT}
    WHERE p.id = ?
      AND p.client_id = ?
      AND p.trash = 0
    LIMIT 1`,
    [id, clientId]
  );

  if (rows.length === 0) {
    return null;
  }

  const [product] = await attachVariants(rows, clientId);
  const [controls] = await pool.query(
    `
    SELECT
      allow_weighing_scale AS allowWeighingScale,
      allow_decimals AS allowDecimals,
      allow_discount AS allowDiscount,
      allow_price_override AS allowPriceOverride,
      kot_required AS kotRequired,
      kit
    FROM product_controls
    WHERE client_id = ?
      AND product_id = ?
    LIMIT 1
    `,
    [clientId, id]
  );

  return {
    ...product,
    controls: controls[0] ?? null,
  };
};

module.exports = {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  updateProductStatus,
  SORT_COLUMNS,
};