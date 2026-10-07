// Validation for the super admin's "manage a client" screens. Each rule mirrors the
// zenx-pos API it replaces (dev/app/Http/Controllers/Api):
//   products → Products::addProduct   users → Master::addUser / updateUser
//   roles    → Master::addRole        access levels → Access_levels::saveRoleAccessLevels
//   masters  → Master::addCategory / addSubCategory / addBrand / addUnitType / addTax / addSize / addColour
// Field names and messages follow zenx-pos so both apps report the same problems.
// Only additions: max lengths from the column sizes (zenx-pos would fail at the database).

const MOBILE = /^[6-9][0-9]{9}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isInt = (v) => Number.isSafeInteger(typeof v === "string" && v.trim() !== "" ? Number(v) : v) && !(typeof v === "boolean");
const isNum = (v) => v !== "" && v !== null && v !== undefined && typeof v !== "boolean" && Number.isFinite(Number(v));
const blank = (v) => v === undefined || v === null || v === "";
const flag = (v) => v === 0 || v === 1 || v === "0" || v === "1";
const str = (v) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const optionalId = (v) => (blank(v) ? null : Number(v));

class RuleError extends Error {
  constructor(message, field) {
    super(message);
    this.field = field;
  }
}

const fail = (message, field) => {
  throw new RuleError(message, field);
};

/* ─── Products (Products::addProduct) ─────────────────────────────────────── */

const PRICE_FIELDS = ["basicCost", "costPrice", "mrp", "salePrice", "wholeSalePrice", "dineInPrice", "takeAwayPrice"];
const CONTROL_FIELDS = ["allowWeighingScale", "allowDecimals", "allowDiscount", "allowPriceOverride", "kotRequired", "kit"];

/** Returns { product, variants, controls } with zenx-pos column values, or throws RuleError. */
const validateProduct = (body = {}) => {
  const d = body.productDetails;
  const variants = body.variants;
  const c = body.productControl;
  if (!d || typeof d !== "object" || Array.isArray(d)) fail("Product details are required.");
  if (!Array.isArray(variants) || variants.length < 1) fail("At least one product variant is required.");
  if (!c || typeof c !== "object" || Array.isArray(c)) fail("Product control details are required.");

  const code = str(d.productCode);
  const shortName = str(d.productShortName);
  const fullName = str(d.productFullName);
  if (!code) fail("The product code field is required.", "productCode");
  if (code.length > 100) fail("The product code field must not be greater than 100 characters.", "productCode");
  if (!shortName) fail("The product short name field is required.", "productShortName");
  if (shortName.length > 100) fail("The product short name field must not be greater than 100 characters.", "productShortName");
  if (!fullName) fail("The product full name field is required.", "productFullName");
  if (fullName.length > 200) fail("The product full name field must not be greater than 200 characters.", "productFullName");
  if (!blank(d.eanCode) && str(d.eanCode).length > 100) fail("The ean code field must not be greater than 100 characters.", "eanCode");
  if (!isInt(d.categoryId)) fail("The category id field is required.", "categoryId");
  for (const k of ["subCategoryId", "brandId", "unitTypeId"]) if (!blank(d[k]) && !isInt(d[k])) fail(`The ${k} field must be an integer.`, k);
  if (!blank(d.qoh) && !(isNum(d.qoh) && Number(d.qoh) >= 0)) fail("The qoh field must be at least 0.", "qoh");
  if (!/^\d{2,8}$/.test(str(d.hsnCode))) fail("The hsn code field must be between 2 and 8 digits.", "hsnCode");
  if (!isInt(d.taxId)) fail("The tax id field is required.", "taxId");
  if (!flag(d.status)) fail("The selected status is invalid.", "status");

  const seen = new Set();
  const outVariants = variants.map((v, i) => {
    const label = `Variant ${i + 1}: `;
    if (!v || typeof v !== "object") fail(`${label}The pack size field is required.`);
    const packSize = str(v.packSize);
    if (!packSize) fail(`${label}The pack size field is required.`, "packSize");
    if (packSize.length > 100) fail(`${label}The pack size field must not be greater than 100 characters.`, "packSize");
    for (const k of ["sizeId", "colourId"]) if (!blank(v[k]) && !isInt(v[k])) fail(`${label}The ${k} field must be an integer.`, k);
    for (const k of PRICE_FIELDS) if (!blank(v[k]) && !(isNum(v[k]) && Number(v[k]) >= 0)) fail(`${label}The ${k} field must be at least 0.`, k);
    if (!blank(v.salonDuration) && !(isInt(v.salonDuration) && Number(v.salonDuration) >= 0)) fail(`${label}The salon duration field must be at least 0.`, "salonDuration");
    if (blank(v.priority) || !(isNum(v.priority) && Number(v.priority) >= 1)) fail(`${label}The priority field must be at least 1.`, "priority");
    if (!flag(v.status)) fail(`${label}The selected status is invalid.`, "status");
    const key = packSize.toLowerCase();
    if (seen.has(key)) fail(`${v.packSize} pack size already exists.`, "packSize");
    seen.add(key);
    return {
      pack_size: v.packSize,
      size_id: optionalId(v.sizeId),
      colour_id: optionalId(v.colourId),
      basic_cost: blank(v.basicCost) ? 0 : Number(v.basicCost),
      cost_price: blank(v.costPrice) ? 0 : Number(v.costPrice),
      mrp: blank(v.mrp) ? 0 : Number(v.mrp),
      sale_price: blank(v.salePrice) ? 0 : Number(v.salePrice),
      variant_qty: 0,
      whole_sale_price: blank(v.wholeSalePrice) ? 0 : Number(v.wholeSalePrice),
      dine_in_price: blank(v.dineInPrice) ? 0 : Number(v.dineInPrice),
      take_away_price: blank(v.takeAwayPrice) ? 0 : Number(v.takeAwayPrice),
      salon_duration: blank(v.salonDuration) ? 0 : Number(v.salonDuration),
      status: Number(v.status),
      priority: Number(v.priority),
    };
  });

  for (const k of CONTROL_FIELDS) if (!flag(c[k])) fail(`The ${k} field is required.`, k);
  if (Number(c.kit) === 1 && variants.length > 1) fail("Only one variant is allowed when kit is enabled.");

  return {
    product: {
      product_code: code,
      product_short_name: shortName,
      product_full_name: fullName,
      ean_code: blank(d.eanCode) ? null : d.eanCode,
      category_id: Number(d.categoryId),
      sub_category_id: optionalId(d.subCategoryId),
      brand_id: optionalId(d.brandId),
      unit_type_id: optionalId(d.unitTypeId),
      qoh: 0, // zenx-pos always starts stock at 0; stock comes from transfers/adjustments
      hsn_code: str(d.hsnCode),
      tax_id: Number(d.taxId),
      product_image: null,
      status: Number(d.status),
    },
    variants: outVariants,
    controls: {
      allow_weighing_scale: Number(c.allowWeighingScale),
      allow_decimals: Number(c.allowDecimals),
      allow_discount: Number(c.allowDiscount),
      allow_price_override: Number(c.allowPriceOverride),
      kot_required: Number(c.kotRequired),
      kit: Number(c.kit),
    },
  };
};

/* ─── Master data (Master::add*) ──────────────────────────────────────────── */

/** API type → table, columns and zenx-pos wording. */
const MASTERS = {
  category: { table: "categories", code: "category_code", name: "category_name", label: "Category", codeKey: "categoryCode", nameKey: "categoryName" },
  subCategory: { table: "sub_categories", code: "sub_category_code", name: "sub_category_name", label: "Sub category", codeKey: "subCategoryCode", nameKey: "subCategoryName" },
  brand: { table: "brands", code: "brand_code", name: "brand_name", label: "Brand", codeKey: "brandCode", nameKey: "brandName" },
  unitType: { table: "unit_types", code: "unit_type_code", name: "unit_type_name", label: "Unit Type", codeKey: "unitTypeCode", nameKey: "unitTypeName" },
  tax: { table: "taxes", code: "tax_code", name: "tax_name", label: "Tax", codeKey: "taxCode", nameKey: "taxName" },
  size: { table: "sizes", code: "size_code", name: "size_name", label: "Size", codeKey: "sizeCode", nameKey: "sizeName" },
  colour: { table: "colours", code: "colour_code", name: "colour_name", label: "Colour", codeKey: "colourCode", nameKey: "colourName" },
};

const validateMaster = (type, body = {}) => {
  const m = MASTERS[type];
  if (!m) fail("Unknown master type.");
  const code = str(body[m.codeKey]);
  const name = str(body[m.nameKey]);
  if (!code) fail(`The ${m.label.toLowerCase()} code field is required.`, m.codeKey);
  if (!name) fail(`The ${m.label.toLowerCase()} name field is required.`, m.nameKey);
  if (code.length > 100) fail(`The ${m.label.toLowerCase()} code field must not be greater than 100 characters.`, m.codeKey);
  if (name.length > 100) fail(`The ${m.label.toLowerCase()} name field must not be greater than 100 characters.`, m.nameKey);
  if (!flag(body.status)) fail("The selected status is invalid.", "status");
  const row = { [m.code]: code, [m.name]: name, status: Number(body.status) };
  if (type === "category") row.printer_path = blank(body.printerPath) ? null : str(body.printerPath).slice(0, 255);
  if (type === "subCategory") {
    if (!isInt(body.categoryId)) fail("The category id field is required.", "categoryId");
    row.category_id = Number(body.categoryId);
  }
  if (type === "tax") {
    if (!isNum(body.taxPercent) || Number(body.taxPercent) < 1 || Number(body.taxPercent) > 100) fail("The tax percent field must be between 1 and 100.", "taxPercent");
    row.tax_percent = Number(body.taxPercent);
  }
  return { meta: m, row };
};

/* ─── Roles and users (Master::addRole / addUser / updateUser) ────────────── */

const validateRole = (body = {}) => {
  const title = str(body.roleTitle);
  if (!title) fail("The role title field is required.", "roleTitle");
  if (title.length > 255) fail("The role title field must not be greater than 255 characters.", "roleTitle");
  if (!flag(body.status)) fail("The selected status is invalid.", "status");
  return { role_title: title, status: Number(body.status) };
};

/** `update`: password optional (kept when empty), as in updateUser. */
const validateUser = (body = {}, { update = false } = {}) => {
  if (!isInt(body.roleId)) fail("The role id field is required.", "roleId");
  const name = str(body.name);
  if (name.length < 3) fail("The name field must be at least 3 characters.", "name");
  if (name.length > 100) fail("The name field must not be greater than 100 characters.", "name");
  const email = str(body.email).toLowerCase();
  if (!EMAIL.test(email)) fail("The email field must be a valid email address.", "email");
  if (email.length > 100) fail("The email field must not be greater than 100 characters.", "email");
  const mobile = str(body.mobile);
  if (!MOBILE.test(mobile)) fail("Please enter valid Indian mobile number.", "mobile");
  const password = typeof body.password === "string" ? body.password : "";
  if (!update || password) {
    if (password.length < 6) fail("The password field must be at least 6 characters.", "password");
    if (password.length > 20) fail("The password field must not be greater than 20 characters.", "password");
  }
  if (!isNum(body.maxDiscountPercentage) || Number(body.maxDiscountPercentage) < 0 || Number(body.maxDiscountPercentage) > 100) {
    fail("The max discount percentage field must be between 0 and 100.", "maxDiscountPercentage");
  }
  if (!flag(body.status)) fail("The selected status is invalid.", "status");
  return {
    password,
    row: {
      role_id: Number(body.roleId),
      name,
      mobile,
      email,
      max_discount_percentage: Number(body.maxDiscountPercentage),
      status: Number(body.status),
    },
  };
};

/* ─── Access levels (Access_levels::saveRoleAccessLevels) ─────────────────── */

/**
 * Flattens the zenx-pos access payload into client_role_features rows.
 * As in zenx-pos: a switched-off feature or sub-feature saves with add/edit/view = 0.
 */
const validateAccess = (body = {}) => {
  const billing = body.billingAccess;
  if (!billing || typeof billing !== "object") fail("Invalid billing access keys.");
  for (const k of ["allowDiscount", "allowPriceOverride", "allowRefund"]) if (!flag(billing[k] ?? 0)) fail("Invalid billing access keys.");
  if (!Array.isArray(body.features)) fail("Invalid feature keys provided.");
  const rows = [];
  for (const f of body.features) {
    if (!f || !isInt(f.featureId)) fail("Invalid feature keys provided.");
    const subs = Array.isArray(f.subFeatures) ? f.subFeatures : [];
    const perms = (x) => {
      const on = Number(x.status ?? 0) === 1;
      return { status: on ? 1 : 0, is_add: on && Number(x.isAdd) === 1 ? 1 : 0, is_edit: on && Number(x.isEdit) === 1 ? 1 : 0, is_view: on && Number(x.isView) === 1 ? 1 : 0 };
    };
    if (subs.length) {
      for (const s of subs) {
        if (!s || !isInt(s.subFeatureId)) fail("Invalid subfeature keys provided.");
        rows.push({ feature_id: Number(f.featureId), sub_feature_id: Number(s.subFeatureId), ...perms(s) });
      }
    } else {
      rows.push({ feature_id: Number(f.featureId), sub_feature_id: 0, ...perms(f) });
    }
  }
  return {
    rows,
    billing: {
      allow_discount: Number(billing.allowDiscount ?? 0),
      allow_price_override: Number(billing.allowPriceOverride ?? 0),
      allow_refund: Number(billing.allowRefund ?? 0),
    },
  };
};

module.exports = {
  RuleError,
  MASTERS,
  validateProduct,
  validateMaster,
  validateRole,
  validateUser,
  validateAccess,
};
