const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

const { validateProduct, validateMaster, validateRole, validateUser, validateAccess } = require("../src/services/workspace.rules");
const { hashPassword } = require("../src/services/passwords");

const product = (over = {}) => ({
  productDetails: { productCode: "1001", productShortName: "TOOR DAL", productFullName: "Toor Dal 1 KG", categoryId: 3, taxId: 4, hsnCode: "0713", status: 1, ...over.productDetails },
  variants: over.variants ?? [{ packSize: "1 KG", mrp: 195, salePrice: 168, priority: 1, status: 1 }],
  productControl: { allowWeighingScale: 0, allowDecimals: 0, allowDiscount: 1, allowPriceOverride: 0, kotRequired: 0, kit: 0, ...over.productControl },
});

const message = (fn) => {
  try {
    fn();
  } catch (e) {
    return e.message;
  }
  return null;
};

test("a product maps onto zenx-pos columns with zenx-pos defaults", () => {
  const { product: p, variants, controls } = validateProduct(product({ productDetails: { qoh: 25, eanCode: "" } }));
  assert.equal(p.qoh, 0, "stock always starts at 0, as Products::addProduct");
  assert.equal(p.ean_code, null);
  assert.equal(p.sub_category_id, null);
  assert.equal(variants[0].variant_qty, 0);
  assert.equal(variants[0].basic_cost, 0);
  assert.equal(variants[0].salon_duration, 0);
  assert.equal(controls.allow_discount, 1);
})

test("product rules match Products::addProduct", () => {
  assert.equal(message(() => validateProduct({ ...product(), variants: [] })), "At least one product variant is required.");
  assert.match(message(() => validateProduct(product({ productDetails: { hsnCode: "7" } }))), /between 2 and 8 digits/);
  assert.match(message(() => validateProduct(product({ productDetails: { hsnCode: "12AB" } }))), /between 2 and 8 digits/);
  assert.match(message(() => validateProduct(product({ productDetails: { productFullName: "x".repeat(201) } }))), /200 characters/);
  assert.match(message(() => validateProduct(product({ variants: [{ packSize: "1 KG", priority: 0, status: 1 }] }))), /^Variant 1: .*priority/);
  assert.equal(message(() => validateProduct(product({ variants: [{ packSize: "1 KG", priority: 1, status: 1 }, { packSize: "1 kg", priority: 2, status: 1 }] }))), "1 kg pack size already exists.");
  assert.equal(
    message(() => validateProduct(product({ productControl: { kit: 1 }, variants: [{ packSize: "A", priority: 1, status: 1 }, { packSize: "B", priority: 2, status: 1 }] }))),
    "Only one variant is allowed when kit is enabled."
  );
  assert.match(message(() => validateProduct(product({ productControl: { kotRequired: undefined } }))), /kotRequired/);
});

test("master data rules match Master::add*", () => {
  assert.deepEqual(validateMaster("tax", { taxCode: "GST5", taxName: "GST 5%", taxPercent: 5, status: 1 }).row, { tax_code: "GST5", tax_name: "GST 5%", tax_percent: 5, status: 1 });
  assert.match(message(() => validateMaster("tax", { taxCode: "Z", taxName: "Zero", taxPercent: 0, status: 1 })), /between 1 and 100/);
  assert.equal(validateMaster("subCategory", { subCategoryCode: "D", subCategoryName: "Dal", categoryId: "7", status: 1 }).row.category_id, 7);
  assert.match(message(() => validateMaster("subCategory", { subCategoryCode: "D", subCategoryName: "Dal", status: 1 })), /category id/);
  assert.equal(validateMaster("category", { categoryCode: "G", categoryName: "Grocery", status: 0 }).row.printer_path, null);
  assert.match(message(() => validateMaster("brand", { brandCode: "B", brandName: "", status: 1 })), /brand name field is required/);
  assert.equal(message(() => validateMaster("nope", {})), "Unknown master type.");
});

test("user rules match Master::addUser / updateUser", () => {
  const ok = { roleId: 3, name: "Ravi Kumar", email: " Ravi@Shop.IN ", mobile: "9876543210", password: "secret1", maxDiscountPercentage: 10, status: 1 };
  const { row } = validateUser(ok);
  assert.equal(row.email, "ravi@shop.in");
  assert.equal(message(() => validateUser({ ...ok, mobile: "5876543210" })), "Please enter valid Indian mobile number.");
  assert.match(message(() => validateUser({ ...ok, password: "12345" })), /at least 6/);
  assert.match(message(() => validateUser({ ...ok, password: "x".repeat(21) })), /20 characters/);
  assert.match(message(() => validateUser({ ...ok, name: "Al" })), /at least 3/);
  assert.match(message(() => validateUser({ ...ok, maxDiscountPercentage: 101 })), /between 0 and 100/);
  assert.equal(validateUser({ ...ok, password: "" }, { update: true }).password, "", "update keeps the old password when empty");
});

test("roles need a title and a 0/1 status", () => {
  assert.deepEqual(validateRole({ roleTitle: " Cashier ", status: 1 }), { role_title: "Cashier", status: 1 });
  assert.match(message(() => validateRole({ roleTitle: "", status: 1 })), /required/);
});

test("access levels: switched-off rows save with no permissions, like saveRoleAccessLevels", () => {
  const { rows, billing } = validateAccess({
    billingAccess: { allowDiscount: 1, allowPriceOverride: 0, allowRefund: 0 },
    features: [
      { featureId: 5, status: 1, isAdd: 0, isEdit: 0, isView: 0, subFeatures: [{ subFeatureId: 2, status: 1, isAdd: 0, isEdit: 0, isView: 1 }, { subFeatureId: 3, status: 0, isAdd: 1, isEdit: 1, isView: 1 }] },
      { featureId: 8, status: 1, isAdd: 1, isEdit: 1, isView: 1, subFeatures: [] },
    ],
  });
  assert.deepEqual(rows, [
    { feature_id: 5, sub_feature_id: 2, status: 1, is_add: 0, is_edit: 0, is_view: 1 },
    { feature_id: 5, sub_feature_id: 3, status: 0, is_add: 0, is_edit: 0, is_view: 0 },
    { feature_id: 8, sub_feature_id: 0, status: 1, is_add: 1, is_edit: 1, is_view: 1 },
  ]);
  assert.deepEqual(billing, { allow_discount: 1, allow_price_override: 0, allow_refund: 0 });
});

test("passwords use the $2y$ bcrypt prefix that Laravel (zenx-pos) accepts", async () => {
  const hash = await hashPassword("Label@123");
  assert.match(hash, /^\$2y\$10\$/);
  assert.equal(await bcrypt.compare("Label@123", hash), true);
  assert.equal(await bcrypt.compare("wrong", hash), false);
});
